begin;

-- A inscrição pública do Supabase nunca deve conceder acesso ao painel por padrão.
create or replace function public.novo_perfil_auth_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.perfis_usuario(id,nome,email,role,ativo)
  values(
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(coalesce(new.email,''),'@',1),'Atendente'),
    lower(coalesce(new.email,'')),
    case when exists(select 1 from public.admin_users where user_id=new.id) then 'admin' else 'atendente' end,
    false
  ) on conflict(id) do update set email=excluded.email;
  return new;
end;
$$;
revoke all on function public.novo_perfil_auth_user() from public,anon,authenticated;

-- Atendentes podem operar contratos, mas não encerrar/cancelar nem forjar status.
create policy contratos_criar_painel on public.contratos
  for insert to authenticated with check((select public.is_panel_user()));
create policy contratos_editar_painel on public.contratos
  for update to authenticated using((select public.is_panel_user())) with check((select public.is_panel_user()));

create or replace function public.proteger_status_contrato_atendente() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if public.is_admin() then return new; end if;
  if new.status<>'ativo' then
    raise exception 'Somente administrador pode definir ou encerrar o status do contrato.' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_status_contrato_atendente() from public,anon,authenticated;
create trigger contrato_status_admin_only before insert or update of status on public.contratos
for each row execute function public.proteger_status_contrato_atendente();

-- Preserva a proteção de status/preço de motos, permitindo apenas a sincronização
-- automática de uma locação recém-criada para o estado correto "alugada".
create or replace function public.proteger_alteracoes_criticas_atendente() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if public.is_admin() then return new; end if;
  if tg_table_name='clientes' and tg_op='UPDATE' and new.status is distinct from old.status then
    raise exception 'Alterar o acesso operacional do cliente exige administrador.' using errcode='42501';
  end if;
  if tg_table_name='motos' then
    if tg_op='INSERT' and new.status<>'disponivel' then
      raise exception 'Cadastrar moto fora do status disponível exige administrador.' using errcode='42501';
    end if;
    if tg_op='UPDATE' and new.status='alugada' and exists(
      select 1 from public.contratos where moto_id=new.id and status not in ('finalizado','cancelado')
    ) then return new; end if;
    if tg_op='UPDATE' and (new.status is distinct from old.status or new.valor_locacao is distinct from old.valor_locacao or new.tipo_valor is distinct from old.tipo_valor) then
      raise exception 'Alterar status ou preço de locação exige administrador.' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_alteracoes_criticas_atendente() from public,anon,authenticated;

-- Atendente registra lançamentos, mas não edita/exclui histórico financeiro existente.
create policy pagamentos_criar_painel on public.pagamentos
  for insert to authenticated with check((select public.is_panel_user()));

-- O atendente precisa dos dados de recebimento para a cobrança manual no WhatsApp/Pix.
-- A página de edição e a política de UPDATE permanecem admin-only.
drop policy if exists empresa_leitura_admin on public.configuracoes_empresa;
create policy empresa_leitura_painel on public.configuracoes_empresa
  for select to authenticated using((select public.is_panel_user()));

create or replace function public.painel_dados() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_panel_user() then raise exception 'Acesso ao painel necessário.' using errcode='42501'; end if;
  return jsonb_build_object(
    'referenceDate',hoje,
    'empresa',(select to_jsonb(e) from public.configuracoes_empresa e where e.id=1),
    'clientes',coalesce((select jsonb_agg(to_jsonb(c) order by c.nome) from public.clientes c),'[]'::jsonb),
    'motos',coalesce((select jsonb_agg(to_jsonb(m) order by m.marca,m.modelo) from public.motos m),'[]'::jsonb),
    'contratos',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('status',case
      when c.status in ('finalizado','cancelado') then c.status
      when c.data_vencimento<hoje then 'atrasado'
      when c.data_vencimento=hoje then 'vencendo_hoje'
      when c.data_vencimento<=hoje+3 then 'vencendo' else 'ativo' end) order by c.data_vencimento,c.id) from public.contratos c),'[]'::jsonb),
    'pagamentos',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('status_registrado',p.status,'status',case
      when p.status in ('pago','cancelado') then p.status
      when p.status='atrasado' or p.data_vencimento<hoje then 'atrasado' else 'pendente' end) order by p.data_vencimento,p.id) from public.pagamentos p),'[]'::jsonb),
    'resolucoes',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.alertas_resolucoes r where r.data_referencia=hoje),'[]'::jsonb)
  );
end;
$$;

commit;
