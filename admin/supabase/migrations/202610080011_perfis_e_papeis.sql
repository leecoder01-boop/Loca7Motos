begin;

create table public.perfis_usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 120),
  email text not null,
  role text not null default 'atendente' check (role in ('admin','atendente')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index perfis_usuario_email_lower_idx on public.perfis_usuario(lower(email));
create index perfis_usuario_role_ativo_idx on public.perfis_usuario(role,ativo);

-- Mantém como admin todas as contas que já tinham acesso administrativo.
insert into public.perfis_usuario(id,nome,email,role,ativo,created_at)
select u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'name'),''),split_part(coalesce(u.email,''),'@',1),'Administrador'),
  lower(coalesce(u.email,'')), 'admin', true, coalesce(u.created_at,now())
from auth.users u
join public.admin_users a on a.user_id=u.id
on conflict(id) do update set role='admin',ativo=true;

create function public.novo_perfil_auth_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.perfis_usuario(id,nome,email,role,ativo)
  values(
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(coalesce(new.email,''),'@',1),'Atendente'),
    lower(coalesce(new.email,'')),
    case when exists(select 1 from public.admin_users where user_id=new.id) then 'admin' else 'atendente' end,
    true
  ) on conflict(id) do update set email=excluded.email;
  return new;
end;
$$;
revoke all on function public.novo_perfil_auth_user() from public,anon,authenticated;
create trigger auth_user_criar_perfil after insert on auth.users
for each row execute function public.novo_perfil_auth_user();
create function public.sincronizar_email_perfil_auth_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.perfis_usuario set email=lower(coalesce(new.email,'')) where id=new.id;
  return new;
end;
$$;
revoke all on function public.sincronizar_email_perfil_auth_user() from public,anon,authenticated;
create trigger auth_user_sincronizar_email after update of email on auth.users
for each row execute function public.sincronizar_email_perfil_auth_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.perfis_usuario p where p.id=(select auth.uid()) and p.role='admin' and p.ativo);
$$;
create or replace function public.is_panel_user() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.perfis_usuario p where p.id=(select auth.uid()) and p.role in ('admin','atendente') and p.ativo);
$$;
revoke all on function public.is_admin(),public.is_panel_user() from public,anon;
grant execute on function public.is_admin(),public.is_panel_user() to authenticated;

alter table public.perfis_usuario enable row level security;
revoke all on public.perfis_usuario from public,anon,authenticated;
grant select on public.perfis_usuario to authenticated;
create policy perfil_proprio_ou_admin_ler on public.perfis_usuario for select to authenticated
  using (id=(select auth.uid()) or (select public.is_admin()));

create function public.admin_atualizar_perfil(p_user_id uuid,p_nome text,p_role text,p_ativo boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare atual public.perfis_usuario; resultado jsonb; admins_ativos integer;
begin
  if not public.is_admin() then raise exception 'Acesso exclusivo de administrador.' using errcode='42501'; end if;
  if p_role not in ('admin','atendente') or p_nome is null or length(trim(p_nome)) not between 2 and 120 or p_ativo is null then
    raise exception 'Dados do perfil inválidos.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(740011);
  select * into atual from public.perfis_usuario where id=p_user_id for update;
  if not found then raise exception 'Usuário não encontrado.' using errcode='P0002'; end if;
  if p_user_id=(select auth.uid()) and (p_role<>'admin' or not p_ativo) then
    raise exception 'Não é permitido remover o próprio acesso administrativo.' using errcode='42501';
  end if;
  if atual.role='admin' and atual.ativo and (p_role<>'admin' or not p_ativo) then
    select count(*) into admins_ativos from public.perfis_usuario where role='admin' and ativo;
    if admins_ativos<=1 then raise exception 'Mantenha pelo menos um administrador ativo.' using errcode='23514'; end if;
  end if;
  update public.perfis_usuario set nome=trim(p_nome),role=p_role,ativo=p_ativo where id=p_user_id
  returning jsonb_build_object('id',id,'nome',nome,'email',email,'role',role,'ativo',ativo,'created_at',created_at) into resultado;
  return resultado;
end;
$$;
revoke all on function public.admin_atualizar_perfil(uuid,text,text,boolean) from public,anon;
grant execute on function public.admin_atualizar_perfil(uuid,text,text,boolean) to authenticated;

-- O painel de operação fica disponível aos dois papéis; configuração e mutações críticas continuam admin-only.
drop policy if exists clientes_admin on public.clientes;
create policy clientes_ler_painel on public.clientes for select to authenticated using((select public.is_panel_user()));
create policy clientes_criar_painel on public.clientes for insert to authenticated with check((select public.is_panel_user()));
create policy clientes_editar_painel on public.clientes for update to authenticated using((select public.is_panel_user())) with check((select public.is_panel_user()));
create policy clientes_excluir_admin on public.clientes for delete to authenticated using((select public.is_admin()));

drop policy if exists motos_admin on public.motos;
create policy motos_ler_painel on public.motos for select to authenticated using((select public.is_panel_user()));
create policy motos_criar_painel on public.motos for insert to authenticated with check((select public.is_panel_user()));
create policy motos_editar_painel on public.motos for update to authenticated using((select public.is_panel_user())) with check((select public.is_panel_user()));
create policy motos_excluir_admin on public.motos for delete to authenticated using((select public.is_admin()));

create policy contratos_ler_painel on public.contratos for select to authenticated using((select public.is_panel_user()));
create policy pagamentos_ler_painel on public.pagamentos for select to authenticated using((select public.is_panel_user()));

create function public.proteger_alteracoes_criticas_atendente() returns trigger
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
    if tg_op='UPDATE' and (new.status is distinct from old.status or new.valor_locacao is distinct from old.valor_locacao or new.tipo_valor is distinct from old.tipo_valor) then
      raise exception 'Alterar status ou preço de locação exige administrador.' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_alteracoes_criticas_atendente() from public,anon,authenticated;
create trigger cliente_proteger_alteracoes_criticas before update on public.clientes
for each row execute function public.proteger_alteracoes_criticas_atendente();
create trigger moto_proteger_alteracoes_criticas before insert or update on public.motos
for each row execute function public.proteger_alteracoes_criticas_atendente();

drop policy if exists alertas_leitura_admin on public.alertas_resolucoes;
create policy alertas_ler_painel on public.alertas_resolucoes for select to authenticated using((select public.is_panel_user()));
drop policy if exists alertas_registro_admin on public.alertas_resolucoes;
create policy alertas_registrar_painel on public.alertas_resolucoes for insert to authenticated with check(
  (select public.is_panel_user()) and resolvido_por=(select auth.uid()) and data_referencia=(now() at time zone 'America/Sao_Paulo')::date
);

create or replace function public.painel_dados() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_panel_user() then raise exception 'Acesso ao painel necessário.' using errcode='42501'; end if;
  return jsonb_build_object(
    'referenceDate',hoje,
    'empresa',case when public.is_admin() then (select to_jsonb(e) from public.configuracoes_empresa e where e.id=1) else null end,
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
