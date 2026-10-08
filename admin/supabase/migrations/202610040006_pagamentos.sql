begin;
alter table public.pagamentos
  add column forma_pagamento text check(forma_pagamento in ('pix','dinheiro','cartao','transferencia','outro')),
  add column observacoes text not null default '' check(length(observacoes)<=5000),
  add column updated_at timestamptz not null default now();
alter table public.pagamentos drop constraint pagamentos_status_check;
alter table public.pagamentos add constraint pagamentos_status_check check(status in ('pendente','pago','atrasado','cancelado'));
-- Mantém o método desconhecido de registros antigos, sem inventar recebimentos.
alter table public.pagamentos add constraint pagamento_metodo_recebido check(status<>'pago' or forma_pagamento is not null) not valid;
drop index public.pagamentos_vencimento_idx;
create index pagamentos_vencimento_idx on public.pagamentos(data_vencimento) where status not in ('pago','cancelado');
create index pagamentos_recebimento_idx on public.pagamentos(data_pagamento) where status='pago';
create function public.atualizar_pagamento() returns trigger
language plpgsql set search_path='' as $$
begin
  new.updated_at:=clock_timestamp();
  return new;
end;
$$;
create trigger pagamentos_updated_at before update on public.pagamentos for each row execute function public.atualizar_pagamento();
revoke all on function public.atualizar_pagamento() from public,anon,authenticated;
create or replace function public.painel_dados() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode='42501'; end if;
  return jsonb_build_object(
    'referenceDate',hoje,
    'clientes',coalesce((select jsonb_agg(to_jsonb(c) order by c.nome) from public.clientes c),'[]'::jsonb),
    'motos',coalesce((select jsonb_agg(to_jsonb(m) order by m.marca,m.modelo) from public.motos m),'[]'::jsonb),
    'contratos',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('status',case
      when c.status in ('finalizado','cancelado') then c.status
      when c.data_vencimento<hoje then 'atrasado'
      when c.data_vencimento=hoje then 'vencendo_hoje'
      when c.data_vencimento<=hoje+3 then 'vencendo' else 'ativo' end) order by c.data_vencimento,c.id) from public.contratos c),'[]'::jsonb),
    'pagamentos',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('status_registrado',p.status,'status',case
      when p.status in ('pago','cancelado') then p.status
      when p.status='atrasado' or p.data_vencimento<hoje then 'atrasado' else 'pendente' end) order by p.data_vencimento,p.id) from public.pagamentos p),'[]'::jsonb)
  );
end;
$$;
commit;
