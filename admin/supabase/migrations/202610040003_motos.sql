begin;

alter table public.motos
  add column cor text not null default '' check (length(cor) <= 80),
  add column tipo_valor text not null default 'diaria' check (tipo_valor in ('diaria','mensalidade')),
  add column observacoes text not null default '' check (length(observacoes) <= 5000),
  add column updated_at timestamptz not null default now();
alter table public.motos drop constraint motos_status_check;
alter table public.motos add constraint motos_status_check check (status in ('disponivel','alugada','manutencao','indisponivel'));

create function public.moto_atualizar_timestamp() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end;
$$;
create trigger moto_atualizar_timestamp before update on public.motos
  for each row execute function public.moto_atualizar_timestamp();
revoke all on function public.moto_atualizar_timestamp() from public, anon, authenticated;

-- Permite gerenciar uma frota já em operação, mesmo antes do módulo de contratos.
-- Um contrato aberto existente continua impedindo liberação/manutenção manual.
create or replace function public.validar_status_moto() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.contratos where moto_id = new.id and status <> 'finalizado') and new.status <> 'alugada' then
    raise exception 'Finalize o contrato antes de liberar a moto ou alterar sua disponibilidade.';
  end if;
  return new;
end;
$$;

create or replace function public.validar_moto_contrato() returns trigger
language plpgsql security definer set search_path = '' as $$
declare estado text;
begin
  if new.status <> 'finalizado' then
    select status into estado from public.motos where id = new.moto_id for update;
    if estado in ('manutencao','indisponivel') then raise exception 'Moto em manutenção ou indisponível não pode ser alugada.'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.sincronizar_frota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare alvo uuid;
begin
  for alvo in select distinct id from unnest(array[
    case when tg_op <> 'INSERT' then old.moto_id end,
    case when tg_op <> 'DELETE' then new.moto_id end
  ]) as ids(id) where id is not null order by id loop
    perform 1 from public.motos where id = alvo for update;
    update public.motos set status = case
      when exists(select 1 from public.contratos where moto_id = alvo and status <> 'finalizado') then 'alugada'
      when status in ('manutencao','indisponivel') then status
      else 'disponivel' end where id = alvo;
  end loop;
  return null;
end;
$$;
revoke all on function public.validar_status_moto(), public.validar_moto_contrato(), public.sincronizar_frota() from public, anon, authenticated;

commit;
