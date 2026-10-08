begin;

create table public.atendimento_ia_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count smallint not null check(request_count between 1 and 21)
);
alter table public.atendimento_ia_rate_limits enable row level security;
revoke all on public.atendimento_ia_rate_limits from public,anon,authenticated;

-- Limite global por usuário (20 mensagens por minuto), atômico entre instâncias.
-- Um usuário não consegue escolher o próprio limite nem ler/resetar o contador.
create function public.consumir_limite_atendimento_ia() returns boolean
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  used_count smallint;
begin
  if actor is null or not public.is_panel_user() then
    raise exception 'Acesso ao painel necessário.' using errcode='42501';
  end if;

  insert into public.atendimento_ia_rate_limits as limits(user_id,window_started_at,request_count)
  values(actor,v_now,1)
  on conflict(user_id) do update set
    window_started_at=case
      when limits.window_started_at <= v_now - interval '1 minute' then v_now
      else limits.window_started_at
    end,
    request_count=case
      when limits.window_started_at <= v_now - interval '1 minute' then 1
      else least(21,limits.request_count+1)
    end
  returning request_count into used_count;

  return used_count <= 20;
end;
$$;
revoke all on function public.consumir_limite_atendimento_ia() from public,anon;
grant execute on function public.consumir_limite_atendimento_ia() to authenticated;

commit;
