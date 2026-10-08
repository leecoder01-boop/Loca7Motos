begin;

create table if not exists public.atendimento_ia_config (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.atendimento_ia_config(id) values (1) on conflict (id) do nothing;
alter table public.atendimento_ia_config enable row level security;
revoke all on public.atendimento_ia_config from public, anon, authenticated;
grant select, update on public.atendimento_ia_config to authenticated;
create policy atendimento_ia_config_admin_select on public.atendimento_ia_config
  for select to authenticated using (public.is_admin());
create policy atendimento_ia_config_admin_update on public.atendimento_ia_config
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.atendimento_conversas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  canal text not null default 'simulador' check (canal in ('simulador','whatsapp')),
  status text not null default 'ia' check (status in ('ia','humano','encerrada')),
  criada_por uuid references auth.users(id) on delete set null,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create unique index if not exists atendimento_conversa_aberta_por_cliente_canal
  on public.atendimento_conversas(cliente_id, canal) where status in ('ia','humano');
create index if not exists atendimento_conversas_cliente_data_idx
  on public.atendimento_conversas(cliente_id, atualizada_em desc);
alter table public.atendimento_conversas enable row level security;
revoke all on public.atendimento_conversas from public, anon, authenticated;
grant select, insert, update on public.atendimento_conversas to authenticated;
create policy atendimento_conversas_admin_select on public.atendimento_conversas
  for select to authenticated using (public.is_admin());
create policy atendimento_conversas_admin_insert on public.atendimento_conversas
  for insert to authenticated with check (public.is_admin() and (criada_por is null or criada_por=auth.uid()));
create policy atendimento_conversas_admin_update on public.atendimento_conversas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.atendimento_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.atendimento_conversas(id) on delete cascade,
  autor text not null check (autor in ('cliente','ia','humano','sistema')),
  conteudo text not null check (length(trim(conteudo)) between 1 and 8000),
  criada_em timestamptz not null default now()
);
create index if not exists atendimento_mensagens_conversa_data_idx
  on public.atendimento_mensagens(conversa_id, criada_em, id);
alter table public.atendimento_mensagens enable row level security;
revoke all on public.atendimento_mensagens from public, anon, authenticated;
grant select, insert on public.atendimento_mensagens to authenticated;
create policy atendimento_mensagens_admin_select on public.atendimento_mensagens
  for select to authenticated using (
    public.is_admin() and exists (
      select 1 from public.atendimento_conversas c where c.id=conversa_id
    )
  );
create policy atendimento_mensagens_admin_insert on public.atendimento_mensagens
  for insert to authenticated with check (
    public.is_admin() and exists (
      select 1 from public.atendimento_conversas c where c.id=conversa_id
    )
  );

commit;
