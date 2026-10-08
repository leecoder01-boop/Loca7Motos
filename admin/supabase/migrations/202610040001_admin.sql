begin;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  cpf text not null unique check (cpf ~ '^[0-9]{11}$'),
  cnh text not null check (cnh ~ '^[0-9]{11}$'),
  telefone text not null check (length(trim(telefone)) > 0),
  endereco text not null check (length(trim(endereco)) > 0),
  created_at timestamptz not null default now()
);

create table public.motos (
  id uuid primary key default gen_random_uuid(),
  marca text not null check (length(trim(marca)) > 0),
  modelo text not null check (length(trim(modelo)) > 0),
  ano integer not null check (ano between 1900 and 2100),
  placa text not null unique check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  valor_locacao numeric(12,2) not null check (valor_locacao >= 0),
  status text not null default 'disponivel' check (status in ('disponivel','alugada','manutencao')),
  quilometragem integer not null default 0 check (quilometragem >= 0),
  created_at timestamptz not null default now()
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  moto_id uuid not null references public.motos(id) on delete restrict,
  data_inicio date not null,
  data_vencimento date not null check (data_vencimento >= data_inicio),
  valor numeric(12,2) not null check (valor >= 0),
  status text not null default 'ativo' check (status in ('ativo','vencendo','atrasado','finalizado')),
  created_at timestamptz not null default now()
);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete restrict,
  valor numeric(12,2) not null check (valor > 0),
  data_vencimento date not null,
  data_pagamento date,
  status text not null default 'pendente' check (status in ('pendente','pago','atrasado')),
  created_at timestamptz not null default now(),
  constraint pagamento_data_coerente check ((status = 'pago') = (data_pagamento is not null))
);

create index contratos_cliente_idx on public.contratos(cliente_id);
create index contratos_vencimento_idx on public.contratos(data_vencimento) where status <> 'finalizado';
create unique index uma_locacao_aberta_por_moto on public.contratos(moto_id) where status <> 'finalizado';
create index pagamentos_contrato_idx on public.pagamentos(contrato_id);
create index pagamentos_vencimento_idx on public.pagamentos(data_vencimento) where status <> 'pago';

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
create policy admin_ver_proprio_acesso on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

alter table public.clientes enable row level security;
alter table public.motos enable row level security;
alter table public.contratos enable row level security;
alter table public.pagamentos enable row level security;
create policy clientes_admin on public.clientes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy motos_admin on public.motos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy contratos_admin on public.contratos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy pagamentos_admin on public.pagamentos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.clientes, public.motos, public.contratos, public.pagamentos from anon, authenticated;
grant select, insert, update, delete on public.clientes, public.motos, public.contratos, public.pagamentos to authenticated;

-- O bloqueio da linha da moto serializa locação/finalização e manutenção concorrentes.
create function public.validar_moto_contrato() returns trigger
language plpgsql security definer set search_path = '' as $$
declare estado text;
begin
  if new.status <> 'finalizado' then
    select status into estado from public.motos where id = new.moto_id for update;
    if estado = 'manutencao' then raise exception 'Moto em manutenção não pode ser alugada.'; end if;
  end if;
  return new;
end;
$$;
create trigger contrato_validar_moto before insert or update on public.contratos
  for each row execute function public.validar_moto_contrato();

create function public.sincronizar_frota() returns trigger
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
      when status = 'manutencao' then 'manutencao'
      else 'disponivel' end where id = alvo;
  end loop;
  return null;
end;
$$;
create trigger contrato_sincronizar_frota after insert or update or delete on public.contratos
  for each row execute function public.sincronizar_frota();

create function public.validar_status_moto() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.contratos where moto_id = new.id and status <> 'finalizado') then
    if new.status <> 'alugada' then raise exception 'Finalize o contrato antes de liberar a moto ou iniciar manutenção.'; end if;
  elsif new.status = 'alugada' then
    raise exception 'Cadastre um contrato em aberto para alugar a moto.';
  end if;
  return new;
end;
$$;
create trigger moto_validar_status before insert or update on public.motos
  for each row execute function public.validar_status_moto();
revoke all on function public.validar_moto_contrato(), public.sincronizar_frota(), public.validar_status_moto() from public, anon, authenticated;

-- Uma leitura atômica: o fuso, os indicadores e as quatro listas usam a mesma data.
-- SECURITY INVOKER mantém todas as regras RLS também dentro desta função.
create function public.painel_dados() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'referenceDate', hoje,
    'clientes', coalesce((select jsonb_agg(to_jsonb(c) order by c.nome) from public.clientes c), '[]'::jsonb),
    'motos', coalesce((select jsonb_agg(to_jsonb(m) order by m.marca, m.modelo) from public.motos m), '[]'::jsonb),
    'contratos', coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('status', case
      when c.status = 'finalizado' then 'finalizado'
      when c.data_vencimento < hoje then 'atrasado'
      when c.data_vencimento <= hoje + 7 then 'vencendo'
      else 'ativo' end) order by c.data_vencimento, c.id) from public.contratos c), '[]'::jsonb),
    'pagamentos', coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object('status', case
      when p.status = 'pago' then 'pago'
      when p.data_vencimento < hoje then 'atrasado'
      else 'pendente' end) order by p.data_vencimento, p.id) from public.pagamentos p), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.painel_dados() from public, anon;
grant execute on function public.painel_dados() to authenticated;

commit;
