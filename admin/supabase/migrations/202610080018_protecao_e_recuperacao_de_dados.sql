begin;

-- Remoções operacionais passam a ser reversíveis; a linha fica disponível para
-- contratos antigos, auditoria e restauração administrativa.
alter table public.clientes add column deleted_at timestamptz;
alter table public.motos add column deleted_at timestamptz;
comment on column public.clientes.deleted_at is 'Arquivamento reversível do cadastro; não apaga dados nem histórico contratual.';
comment on column public.motos.deleted_at is 'Arquivamento reversível da moto; não apaga dados nem histórico contratual.';

-- Desativar uma conta é o caminho normal. Excluir auth.users não pode apagar o
-- perfil e quebrar a trilha de auditoria por cascata.
alter table public.perfis_usuario drop constraint if exists perfis_usuario_id_fkey;
alter table public.perfis_usuario add constraint perfis_usuario_id_auth_fkey
  foreign key (id) references auth.users(id) on delete restrict;

create function public.bloquear_exclusao_permanente() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Exclusão permanente bloqueada. Arquive o cadastro ou mantenha o registro histórico.'
    using errcode='42501';
end;
$$;
revoke all on function public.bloquear_exclusao_permanente() from public,anon,authenticated;

create trigger clientes_sem_exclusao_permanente before delete on public.clientes
for each row execute function public.bloquear_exclusao_permanente();
create trigger motos_sem_exclusao_permanente before delete on public.motos
for each row execute function public.bloquear_exclusao_permanente();
create trigger contratos_sem_exclusao_permanente before delete on public.contratos
for each row execute function public.bloquear_exclusao_permanente();
create trigger pagamentos_sem_exclusao_permanente before delete on public.pagamentos
for each row execute function public.bloquear_exclusao_permanente();
create trigger perfis_sem_exclusao_permanente before delete on public.perfis_usuario
for each row execute function public.bloquear_exclusao_permanente();

create function public.proteger_arquivamento_operacional() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.deleted_at is not distinct from old.deleted_at then return new; end if;
  if not public.is_admin() then
    raise exception 'Arquivar ou restaurar registros exige administrador.' using errcode='42501';
  end if;
  if new.deleted_at is not null and exists (
    select 1 from public.contratos c
    where c.status not in ('finalizado','cancelado')
      and (case when tg_table_name='clientes' then c.cliente_id else null end)=old.id
  ) then
    raise exception 'Finalize ou cancele os contratos ativos antes de arquivar o cadastro.' using errcode='23503';
  end if;
  if new.deleted_at is not null and tg_table_name='motos' and exists (
    select 1 from public.contratos c where c.moto_id=old.id and c.status not in ('finalizado','cancelado')
  ) then
    raise exception 'Finalize ou cancele os contratos ativos antes de arquivar a moto.' using errcode='23503';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_arquivamento_operacional() from public,anon,authenticated;
create trigger clientes_proteger_arquivamento before update of deleted_at on public.clientes
for each row execute function public.proteger_arquivamento_operacional();
create trigger motos_proteger_arquivamento before update of deleted_at on public.motos
for each row execute function public.proteger_arquivamento_operacional();

create function public.validar_referencias_contrato_ativas() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.status not in ('finalizado','cancelado') then
    if exists(select 1 from public.clientes c where c.id=new.cliente_id and c.deleted_at is not null) then
      raise exception 'Não é possível criar ou alterar uma locação com cliente arquivado.' using errcode='23503';
    end if;
    if exists(select 1 from public.motos m where m.id=new.moto_id and m.deleted_at is not null) then
      raise exception 'Não é possível criar ou alterar uma locação com moto arquivada.' using errcode='23503';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validar_referencias_contrato_ativas() from public,anon,authenticated;
create trigger contrato_referencias_nao_arquivadas before insert or update on public.contratos
for each row execute function public.validar_referencias_contrato_ativas();

-- Logs são append-only também contra chamadas diretas via API autenticada.
create trigger logs_auditoria_append_only before update or delete on public.logs_auditoria
for each row execute function public.bloquear_exclusao_permanente();

create function public.registrar_arquivamento_operacional() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  ator uuid := auth.uid();
  nome_ator text;
  papel_ator text;
  entidade text := case when tg_table_name='clientes' then 'cliente' else 'moto' end;
  acao text;
begin
  if old.deleted_at is not distinct from new.deleted_at then return new; end if;
  select p.nome,p.role into nome_ator,papel_ator from public.perfis_usuario p where p.id=ator and p.ativo;
  acao:=entidade||case when new.deleted_at is null then '_restaurado' else '_arquivado' end;
  insert into public.logs_auditoria(usuario_id,usuario_nome,role,acao,entidade,registro_id,resumo)
  values(ator,coalesce(nome_ator,'Sistema'),coalesce(papel_ator,'sistema'),acao,entidade,new.id::text,
    case when new.deleted_at is null then 'Cadastro restaurado do arquivo.' else 'Cadastro arquivado sem exclusão de dados.' end);
  return new;
end;
$$;
revoke all on function public.registrar_arquivamento_operacional() from public,anon,authenticated;
create trigger auditoria_arquivamento_clientes after update of deleted_at on public.clientes
for each row execute function public.registrar_arquivamento_operacional();
create trigger auditoria_arquivamento_motos after update of deleted_at on public.motos
for each row execute function public.registrar_arquivamento_operacional();

commit;
