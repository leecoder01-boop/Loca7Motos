begin;

-- Atendentes podem trabalhar no simulador interno, mas a configuração continua exclusiva de admin.
drop policy if exists atendimento_ia_config_admin_select on public.atendimento_ia_config;
create policy atendimento_ia_config_panel_select on public.atendimento_ia_config
  for select to authenticated using (public.is_panel_user());

drop policy if exists atendimento_conversas_admin_select on public.atendimento_conversas;
drop policy if exists atendimento_conversas_admin_insert on public.atendimento_conversas;
drop policy if exists atendimento_conversas_admin_update on public.atendimento_conversas;
create policy atendimento_conversas_panel_select on public.atendimento_conversas
  for select to authenticated using (public.is_panel_user() and canal='simulador');
create policy atendimento_conversas_panel_insert on public.atendimento_conversas
  for insert to authenticated with check (
    public.is_panel_user() and canal='simulador' and (criada_por is null or criada_por=(select auth.uid()))
  );
create policy atendimento_conversas_panel_update on public.atendimento_conversas
  for update to authenticated using (public.is_panel_user() and canal='simulador')
  with check (public.is_panel_user() and canal='simulador');

drop policy if exists atendimento_mensagens_admin_select on public.atendimento_mensagens;
drop policy if exists atendimento_mensagens_admin_insert on public.atendimento_mensagens;
create policy atendimento_mensagens_panel_select on public.atendimento_mensagens
  for select to authenticated using (
    public.is_panel_user() and exists (
      select 1 from public.atendimento_conversas c where c.id=conversa_id and c.canal='simulador'
    )
  );
create policy atendimento_mensagens_panel_insert on public.atendimento_mensagens
  for insert to authenticated with check (
    public.is_panel_user() and exists (
      select 1 from public.atendimento_conversas c where c.id=conversa_id and c.canal='simulador'
    )
  );

commit;
