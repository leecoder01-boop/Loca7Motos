begin;
create table if not exists public.configuracoes_empresa (
 id smallint primary key default 1 check(id=1),
 nome text not null default 'Loca7Moto' check(length(trim(nome)) between 2 and 150),
 telefone text not null default '' check(length(telefone)<=30),
 chave_pix text not null default '' check(length(chave_pix)<=150),
 tipo_chave_pix text not null default '' check(tipo_chave_pix in ('','cpf','cnpj','email','telefone','aleatoria')),
 nome_recebedor text not null default '' check(length(nome_recebedor)<=150),
 cidade text not null default '' check(length(cidade)<=100),
 updated_at timestamptz not null default now(),
 check(chave_pix='' or (tipo_chave_pix<>'' and length(trim(nome_recebedor))>0))
);
insert into public.configuracoes_empresa(id) values(1) on conflict(id) do nothing;
alter table public.configuracoes_empresa enable row level security;
revoke all on public.configuracoes_empresa from public,anon,authenticated;
grant select,update on public.configuracoes_empresa to authenticated;
drop policy if exists empresa_leitura_admin on public.configuracoes_empresa;
create policy empresa_leitura_admin on public.configuracoes_empresa for select to authenticated using(public.is_admin());
drop policy if exists empresa_edicao_admin on public.configuracoes_empresa;
create policy empresa_edicao_admin on public.configuracoes_empresa for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop trigger if exists empresa_atualizar_timestamp on public.configuracoes_empresa;
create trigger empresa_atualizar_timestamp before update on public.configuracoes_empresa for each row execute function public.cliente_atualizar_timestamp();
comment on table public.configuracoes_empresa is 'Configurações da locadora para cobranças manuais. Não altera os snapshots de documentos antigos.';
create or replace function public.painel_dados() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode='42501'; end if;
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
