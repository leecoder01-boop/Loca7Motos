import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('atendentes podem abrir Atendimento, mas páginas administrativas exigem admin',async()=>{
  const panel=await readFile(new URL('../src/components/panel-page.tsx',import.meta.url),'utf8');
  const shell=await readFile(new URL('../src/components/admin-shell.tsx',import.meta.url),'utf8');
  assert.match(panel,/\['configuracoes','usuarios','auditoria'\]\.includes\(kind\)\?await requireAdmin\(\):await requirePanelUser\(\)/);
  assert.match(shell,/href:"\/auditoria\/", label:"Histórico de auditoria", icon:History,adminOnly:true/);
  assert.match(panel,/<AtendimentoPage canAdmin=\{profile\.role==='admin'\}\/>/);
  assert.match(shell,/item\.href!=='\/configuracoes\//);
  assert.doesNotMatch(shell,/\['\/configuracoes\/','\/atendimento\/'\]/);
});

test('API de atendimento aceita usuários do painel, mas mantém toggle de IA admin-only',async()=>{
  const route=await readFile(new URL('../src/app/api/atendimento/route.ts',import.meta.url),'utf8');
  assert.equal((route.match(/await requirePanelUser\(\)/g)??[]).length,2);
  assert.match(route,/if\(profile\.role!=='admin'\)/);
  assert.match(route,/status:403/);
  assert.match(route,/rpc\('consumir_limite_atendimento_ia'\)/);
  assert.match(route,/status:429/);
});

test('políticas do simulador incluem atendentes e preservam alteração da configuração para admins',async()=>{
  const migration=await readFile(new URL('../supabase/migrations/202610080012_atendimento_atendentes.sql',import.meta.url),'utf8');
  assert.match(migration,/atendimento_ia_config_panel_select[\s\S]*public\.is_panel_user\(\)/);
  assert.match(migration,/atendimento_conversas_panel_insert[\s\S]*canal='simulador'/);
  assert.match(migration,/atendimento_mensagens_panel_insert[\s\S]*canal='simulador'/);
  assert.doesNotMatch(migration,/atendimento_ia_config_admin_update/);
  assert.doesNotMatch(migration,/create policy atendimento_ia_config_panel_update/);
});
