begin;

-- Publicação do catálogo: campos editáveis por usuários autenticados do painel.
alter table public.motos
  add column foto_url text,
  add column publicado boolean not null default true,
  add constraint motos_foto_url_https_check
    check (foto_url is null or (length(foto_url) <= 2048 and foto_url ~* '^https://[^[:space:]]+$'));

create index motos_catalogo_publicado_idx
  on public.motos (marca, modelo)
  where publicado is true and deleted_at is null;

-- Visitantes recebem acesso somente de leitura e somente às colunas públicas.
-- A política mantém status alugada/manutenção visíveis, mas esconde registros arquivados.
revoke all on table public.motos from public, anon;
grant select (id, marca, modelo, ano, cor, valor_locacao, tipo_valor, status, foto_url, publicado)
  on table public.motos to anon;

drop policy if exists motos_catalogo_publico on public.motos;
create policy motos_catalogo_publico
  on public.motos for select to anon
  using (publicado is true and deleted_at is null);

notify pgrst, 'reload schema';
commit;
