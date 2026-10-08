begin;

-- Cobranças integrais: um lançamento não cancelado por contrato e vencimento.
-- Falha sem modificar dados se existirem duplicidades antigas; revise-as
-- manualmente antes de aplicar, preservando o histórico financeiro.
do $$
begin
  if exists (
    select 1
    from public.pagamentos
    where status <> 'cancelado'
    group by contrato_id, data_vencimento
    having count(*) > 1
  ) then
    raise exception 'Existem pagamentos duplicados por contrato e vencimento. Revise-os antes de aplicar esta migração.'
      using errcode = '23505';
  end if;
end;
$$;

create unique index if not exists pagamentos_unicos_contrato_vencimento
  on public.pagamentos(contrato_id, data_vencimento)
  where status <> 'cancelado';

commit;
