begin;

-- Amplia a tabela existente sem apagar clientes nem mudar as políticas RLS.
alter table public.clientes
  add column whatsapp text not null default '',
  add column email text not null default '',
  add column cidade text not null default '',
  add column estado text not null default '' check (estado in ('','AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  add column cep text not null default '' check (cep = '' or cep ~ '^[0-9]{8}$'),
  add column categoria_cnh text not null default '' check (categoria_cnh in ('','ACC','A','B','AB','C','AC','D','AD','E','AE')),
  add column validade_cnh date,
  add column data_nascimento date,
  add column observacoes text not null default '' check (length(observacoes) <= 5000),
  add column status text not null default 'ativo' check (status in ('ativo','bloqueado')),
  add column updated_at timestamptz not null default now();

create function public.cliente_atualizar_timestamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger cliente_atualizar_timestamp before update on public.clientes
  for each row execute function public.cliente_atualizar_timestamp();
revoke all on function public.cliente_atualizar_timestamp() from public, anon, authenticated;

commit;
