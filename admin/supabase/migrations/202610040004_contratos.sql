begin;
alter table public.motos drop constraint motos_tipo_valor_check;
alter table public.motos add constraint motos_tipo_valor_check check(tipo_valor in ('diaria','semanal','mensalidade'));
alter table public.contratos
  add column periodicidade text not null default 'semanal' check(periodicidade in ('diaria','semanal','mensal')),
  add column caucao numeric(12,2) not null default 0 check(caucao >= 0),
  add column observacoes text not null default '' check(length(observacoes)<=5000),
  add column updated_at timestamptz not null default now();
alter table public.contratos drop constraint contratos_status_check;
alter table public.contratos add constraint contratos_status_check check(status in ('ativo','vencendo','vencendo_hoje','atrasado','finalizado','cancelado'));
drop index public.uma_locacao_aberta_por_moto;
create unique index uma_locacao_aberta_por_moto on public.contratos(moto_id) where status not in ('finalizado','cancelado');
drop index public.contratos_vencimento_idx;
create index contratos_vencimento_idx on public.contratos(data_vencimento) where status not in ('finalizado','cancelado');

create or replace function public.validar_moto_contrato() returns trigger
language plpgsql security definer set search_path='' as $$
declare alvo uuid; estado text; nova_alocacao boolean;
begin
  if tg_op='UPDATE' and old.status in ('finalizado','cancelado') then
    raise exception 'Contratos encerrados são somente leitura.';
  end if;
  for alvo in select distinct id from unnest(array[new.moto_id,case when tg_op='UPDATE' then old.moto_id end]) ids(id) where id is not null order by id loop
    perform 1 from public.motos where id=alvo for update;
  end loop;
  nova_alocacao := tg_op='INSERT';
  if tg_op='UPDATE' then nova_alocacao := new.moto_id<>old.moto_id; end if;
  if new.status not in ('finalizado','cancelado') and nova_alocacao then
    select status into estado from public.motos where id=new.moto_id;
    if estado is distinct from 'disponivel' then raise exception 'Selecione uma moto disponível.'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create or replace function public.validar_status_moto() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.contratos where moto_id=new.id and status not in ('finalizado','cancelado')) and new.status<>'alugada' then
    raise exception 'Finalize ou cancele o contrato antes de liberar a moto.';
  end if;
  return new;
end;
$$;
create or replace function public.sincronizar_frota() returns trigger
language plpgsql security definer set search_path='' as $$
declare alvo uuid;
begin
  for alvo in select distinct id from unnest(array[case when tg_op<>'INSERT' then old.moto_id end,case when tg_op<>'DELETE' then new.moto_id end]) ids(id) where id is not null order by id loop
    perform 1 from public.motos where id=alvo for update;
    update public.motos set status=case
      when exists(select 1 from public.contratos where moto_id=alvo and status not in ('finalizado','cancelado')) then 'alugada'
      when status in ('manutencao','indisponivel') then status else 'disponivel' end where id=alvo;
  end loop;
  return null;
end;
$$;
revoke all on function public.validar_moto_contrato(),public.validar_status_moto(),public.sincronizar_frota() from public,anon,authenticated;

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
    'pagamentos',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('status',case when p.status='pago' then 'pago' when p.data_vencimento<hoje then 'atrasado' else 'pendente' end) order by p.data_vencimento,p.id) from public.pagamentos p),'[]'::jsonb)
  );
end;
$$;
commit;
