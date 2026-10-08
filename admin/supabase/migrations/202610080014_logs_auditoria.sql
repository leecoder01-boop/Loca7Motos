begin;

create table public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  usuario_nome text not null,
  role text not null check(role in ('admin','atendente','sistema')),
  acao text not null check(length(acao) between 1 and 80),
  entidade text not null check(entidade in ('cliente','moto','contrato','pagamento','usuario','empresa')),
  registro_id text,
  resumo text not null check(length(resumo) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index logs_auditoria_created_at_idx on public.logs_auditoria(created_at desc,id desc);
create index logs_auditoria_entidade_idx on public.logs_auditoria(entidade,created_at desc);
create index logs_auditoria_usuario_idx on public.logs_auditoria(usuario_id,created_at desc);

alter table public.logs_auditoria enable row level security;
revoke all on public.logs_auditoria from public,anon,authenticated;
grant select on public.logs_auditoria to authenticated;
create policy logs_auditoria_ler_admin on public.logs_auditoria
  for select to authenticated using((select public.is_admin()));

create function public.registrar_auditoria_mutacao() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  actor_id uuid := auth.uid();
  actor_name text := 'Sistema';
  actor_role text := 'sistema';
  entity_name text;
  record_id text;
  action_name text;
  summary text;
  old_row jsonb;
  new_row jsonb;
  field_spec text;
  field_name text;
  field_label text;
  fields_changed text[] := array[]::text[];
begin
  if tg_op='DELETE' then old_row:=to_jsonb(old);record_id:=old_row->>'id';
  else new_row:=to_jsonb(new);record_id:=new_row->>'id'; end if;
  entity_name:=case tg_table_name
    when 'clientes' then 'cliente'
    when 'motos' then 'moto'
    when 'contratos' then 'contrato'
    when 'pagamentos' then 'pagamento'
    when 'configuracoes_empresa' then 'empresa'
    else 'usuario' end;
  select p.nome,p.role into actor_name,actor_role from public.perfis_usuario p where p.id=actor_id and p.ativo;
  actor_name:=coalesce(actor_name,'Sistema');
  actor_role:=coalesce(actor_role,'sistema');

  if tg_op='INSERT' then
    action_name:=entity_name||'_criado';
    summary:='Registro criado.';
  elsif tg_op='DELETE' then
    action_name:=entity_name||'_excluido';
    summary:='Registro excluído.';
  else
    field_spec:=case tg_table_name
      when 'clientes' then 'nome: nome|cpf: CPF|cnh: CNH|telefone: telefone|whatsapp: WhatsApp|email: e-mail|endereco: endereço|cidade: cidade|estado: estado|cep: CEP|categoria_cnh: categoria da CNH|validade_cnh: validade da CNH|data_nascimento: data de nascimento|observacoes: observações|status: status'
      when 'motos' then 'marca: marca|modelo: modelo|ano: ano|placa: placa|cor: cor|quilometragem: quilometragem|valor_locacao: valor da locação|tipo_valor: periodicidade|status: status|observacoes: observações'
      when 'contratos' then 'cliente_id: cliente|moto_id: moto|data_inicio: início|data_vencimento: vencimento|valor: valor|periodicidade: periodicidade|caucao: caução|observacoes: observações|status: status'
      when 'pagamentos' then 'contrato_id: contrato|valor: valor|data_vencimento: vencimento|data_pagamento: data do pagamento|forma_pagamento: forma de pagamento|status: status|observacoes: observações'
      when 'perfis_usuario' then 'nome: nome|email: e-mail|role: cargo|ativo: acesso'
      else 'nome: nome|telefone: telefone|chave_pix: chave Pix|tipo_chave_pix: tipo da chave Pix|nome_recebedor: recebedor|cidade: cidade' end;
    foreach field_spec in array string_to_array(field_spec,'|') loop
      field_name:=split_part(field_spec,':',1);
      field_label:=trim(split_part(field_spec,':',2));
      if old_row->field_name is distinct from new_row->field_name then
        fields_changed:=array_append(fields_changed,field_label);
      end if;
    end loop;
    if coalesce(array_length(fields_changed,1),0)=0 then return new; end if;

    if tg_table_name='contratos' and old_row->>'status' is distinct from new_row->>'status' and new_row->>'status'='finalizado' then
      action_name:='contrato_finalizado';summary:='Locação finalizada.';
    elsif tg_table_name='contratos' and old_row->>'status' is distinct from new_row->>'status' and new_row->>'status'='cancelado' then
      action_name:='contrato_cancelado';summary:='Locação cancelada.';
    elsif tg_table_name='perfis_usuario' and (old_row->>'role' is distinct from new_row->>'role' or old_row->>'ativo' is distinct from new_row->>'ativo') then
      action_name:='usuario_permissoes_alteradas';summary:='Campos de acesso alterados: '||array_to_string(fields_changed,', ')||'.';
    elsif tg_table_name='configuracoes_empresa' then
      action_name:='empresa_configuracao_alterada';summary:='Configurações alteradas: '||array_to_string(fields_changed,', ')||'.';
    elsif old_row ? 'status' and old_row->>'status' is distinct from new_row->>'status' then
      action_name:=entity_name||'_status_alterado';summary:='Status alterado de '||coalesce(old_row->>'status','vazio')||' para '||coalesce(new_row->>'status','vazio')||'.';
    elsif tg_table_name='perfis_usuario' and old_row->>'ativo' is distinct from new_row->>'ativo' then
      action_name:='usuario_acesso_alterado';summary:='Acesso da conta alterado.';
    else
      action_name:=entity_name||'_alterado';summary:='Campos alterados: '||array_to_string(fields_changed,', ')||'.';
    end if;
  end if;

  insert into public.logs_auditoria(usuario_id,usuario_nome,role,acao,entidade,registro_id,resumo)
  values(actor_id,actor_name,actor_role,action_name,entity_name,record_id,summary);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.registrar_auditoria_mutacao() from public,anon,authenticated;

create trigger auditoria_clientes after insert or update or delete on public.clientes
for each row execute function public.registrar_auditoria_mutacao();
create trigger auditoria_motos after insert or update or delete on public.motos
for each row execute function public.registrar_auditoria_mutacao();
create trigger auditoria_contratos after insert or update or delete on public.contratos
for each row execute function public.registrar_auditoria_mutacao();
create trigger auditoria_pagamentos after insert or update or delete on public.pagamentos
for each row execute function public.registrar_auditoria_mutacao();
create trigger auditoria_perfis after insert or update or delete on public.perfis_usuario
for each row execute function public.registrar_auditoria_mutacao();
create trigger auditoria_empresa after insert or update or delete on public.configuracoes_empresa
for each row execute function public.registrar_auditoria_mutacao();

comment on table public.logs_auditoria is 'Histórico imutável de operações. Resumos registram nomes de campos e status, nunca valores pessoais ou credenciais.';

commit;
