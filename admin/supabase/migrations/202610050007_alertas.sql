begin;
create table if not exists public.alertas_resolucoes (
  alerta_id text not null check(alerta_id ~ '^(contrato|pagamento|cliente|moto)-[0-9a-f-]{36}$'),
  versao text not null check(length(versao) between 1 and 500),
  data_referencia date not null,
  resolvido_por uuid not null references auth.users(id),
  observacao text not null check(length(trim(observacao)) between 3 and 1000),
  created_at timestamptz not null default now(),
  primary key(alerta_id,versao,data_referencia)
);
alter table public.alertas_resolucoes enable row level security;
revoke all on public.alertas_resolucoes from public,anon,authenticated;
grant select,insert on public.alertas_resolucoes to authenticated;
drop policy if exists alertas_leitura_admin on public.alertas_resolucoes;
create policy alertas_leitura_admin on public.alertas_resolucoes for select to authenticated using(public.is_admin());
drop policy if exists alertas_registro_admin on public.alertas_resolucoes;
create policy alertas_registro_admin on public.alertas_resolucoes for insert to authenticated with check(
  public.is_admin() and resolvido_por=auth.uid() and data_referencia=(now() at time zone 'America/Sao_Paulo')::date
);
comment on table public.alertas_resolucoes is 'Registro imutável de tratamento administrativo por versão e dia. Não altera contrato, pagamento, CNH nem moto.';
create or replace function public.painel_dados() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode='42501'; end if;
  return jsonb_build_object(
    'referenceDate',hoje,
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

