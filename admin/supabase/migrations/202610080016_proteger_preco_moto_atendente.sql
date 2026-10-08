begin;

-- A exceção permite somente a atualização de status disparada pela sincronização
-- de um contrato aberto. Ela não pode servir para alterar preço junto com status.
create or replace function public.proteger_alteracoes_criticas_atendente() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if public.is_admin() then return new; end if;

  if tg_table_name='clientes' and tg_op='UPDATE' and new.status is distinct from old.status then
    raise exception 'Alterar o acesso operacional do cliente exige administrador.' using errcode='42501';
  end if;

  if tg_table_name='motos' then
    if tg_op='INSERT' and new.status<>'disponivel' then
      raise exception 'Cadastrar moto fora do status disponível exige administrador.' using errcode='42501';
    end if;

    if tg_op='UPDATE'
      and new.status is distinct from old.status
      and new.status='alugada'
      and exists(select 1 from public.contratos where moto_id=new.id and status not in ('finalizado','cancelado')) then
      if (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then
        raise exception 'A sincronização da locação não pode alterar outros dados da moto.' using errcode='42501';
      end if;
      return new;
    end if;

    if tg_op='UPDATE' and (new.status is distinct from old.status or new.valor_locacao is distinct from old.valor_locacao or new.tipo_valor is distinct from old.tipo_valor) then
      raise exception 'Alterar status ou preço de locação exige administrador.' using errcode='42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.proteger_alteracoes_criticas_atendente() from public,anon,authenticated;

commit;
