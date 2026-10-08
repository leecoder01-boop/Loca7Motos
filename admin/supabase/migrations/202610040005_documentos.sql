begin;
create table public.modelos_contrato(id integer primary key check(id=1),conteudo jsonb not null check(jsonb_typeof(conteudo)='object'),updated_at timestamptz not null default clock_timestamp());
create table public.documentos_contrato(id uuid primary key default gen_random_uuid(),contrato_id uuid not null references public.contratos(id) on delete restrict,versao integer not null check(versao>0),conteudo jsonb not null check(jsonb_typeof(conteudo)='object'),created_at timestamptz not null default clock_timestamp(),unique(contrato_id,versao));
alter table public.modelos_contrato enable row level security;
alter table public.documentos_contrato enable row level security;
create policy modelos_admin on public.modelos_contrato for select to authenticated using((select public.is_admin()));
create policy documentos_admin on public.documentos_contrato for select to authenticated using((select public.is_admin()));
revoke all on public.modelos_contrato,public.documentos_contrato from anon,authenticated;
grant select on public.modelos_contrato,public.documentos_contrato to authenticated;
create function public.documento_imutavel() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Versões emitidas não podem ser alteradas ou excluídas. Gere uma nova versão.'; end; $$;
create trigger documento_imutavel before update or delete on public.documentos_contrato for each row execute function public.documento_imutavel();
revoke all on function public.documento_imutavel() from public,anon,authenticated;

create function public.salvar_modelo_contrato(p_conteudo jsonb,p_version timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare atual timestamptz; nova timestamptz;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(740005);
  select updated_at into atual from public.modelos_contrato where id=1 for update;
  if atual is distinct from p_version then raise exception 'O modelo foi alterado. Atualize a página.'; end if;
  if jsonb_typeof(p_conteudo) is distinct from 'object' or octet_length(p_conteudo::text)>150000 then raise exception 'Modelo inválido.'; end if;
  insert into public.modelos_contrato(id,conteudo) values(1,p_conteudo) on conflict(id) do update set conteudo=excluded.conteudo,updated_at=clock_timestamp() returning updated_at into nova;
  return nova;
end; $$;
create function public.gerar_documento_contrato(p_contrato uuid,p_conteudo jsonb,p_parent uuid,p_locacao_version timestamptz,p_modelo_version timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare locacao public.contratos; cliente jsonb; moto jsonb; anterior uuid; numero integer; modelo_version timestamptz; novo uuid;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode='42501'; end if;
  select * into locacao from public.contratos where id=p_contrato for update;
  if not found then raise exception 'Locação não encontrada.'; end if;
  if locacao.updated_at is distinct from p_locacao_version then raise exception 'A locação mudou. Atualize a página.'; end if;
  select id,versao into anterior,numero from public.documentos_contrato where contrato_id=p_contrato order by versao desc limit 1;
  if anterior is distinct from p_parent then raise exception 'Já foi gerada outra versão. Atualize a página.'; end if;
  select updated_at into modelo_version from public.modelos_contrato where id=1;
  if modelo_version is distinct from p_modelo_version then raise exception 'O modelo mudou. Atualize a página.'; end if;
  if jsonb_typeof(p_conteudo) is distinct from 'object' or octet_length(p_conteudo::text)>150000 then raise exception 'Documento inválido.'; end if;
  select to_jsonb(c) into cliente from public.clientes c where id=locacao.cliente_id;
  select to_jsonb(m) into moto from public.motos m where id=locacao.moto_id;
  insert into public.documentos_contrato(contrato_id,versao,conteudo) values(p_contrato,coalesce(numero,0)+1,p_conteudo||jsonb_build_object('cliente',cliente,'moto',moto,'locacao',to_jsonb(locacao),'modelo_version',modelo_version,'registrado_por',auth.uid(),'minuta',true)) returning id into novo;
  return novo;
end; $$;
revoke all on function public.salvar_modelo_contrato(jsonb,timestamptz),public.gerar_documento_contrato(uuid,jsonb,uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.salvar_modelo_contrato(jsonb,timestamptz),public.gerar_documento_contrato(uuid,jsonb,uuid,timestamptz,timestamptz) to authenticated;
commit;
