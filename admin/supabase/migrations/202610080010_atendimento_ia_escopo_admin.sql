begin;

-- Conversas da visão geral do administrador não pertencem a um cliente.
alter table public.atendimento_conversas
  alter column cliente_id drop not null;

alter table public.atendimento_conversas
  add constraint atendimento_conversas_geral_apenas_simulador
  check (cliente_id is not null or canal = 'simulador');

drop index if exists public.atendimento_conversa_aberta_por_cliente_canal;
create unique index atendimento_conversa_aberta_por_cliente_canal
  on public.atendimento_conversas(cliente_id, canal)
  where cliente_id is not null and status in ('ia','humano');

create unique index atendimento_conversa_aberta_geral_por_canal
  on public.atendimento_conversas(canal)
  where cliente_id is null and status in ('ia','humano');

commit;
