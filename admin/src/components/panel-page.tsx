import { requireAdmin,requirePanelUser } from "@/lib/auth";
import { supabaseConfig } from "@/lib/supabase/config";
import { snapshotSchema } from "@/lib/panel-data";
import { AdminShell } from "./admin-shell";
import { PanelProvider } from "./panel-provider";
import { Dashboard } from "./dashboard";
import { RecordsPage } from "./records-page";
import { LoginForm } from "./login-form";
import { ClientesPage } from "./clientes-page";
import { MotosPage } from "./motos-page";
import { ContratosPage } from './contratos-page';
import { PaymentsPage } from './payments-page';
import { SalesPage } from './sales-page';
import { AlertsPage } from './alerts-page';
import {EmpresaPage} from './empresa-page';
import {AtendimentoPage} from './atendimento-page';
import {UsersPage} from './users-page';
import {AuditPage} from './audit-page';
import {auditLogSchema} from '@/lib/auditoria';
import {hasSupabaseAdminCredential} from '@/lib/supabase/admin';

export async function PanelPage({kind="dashboard"}: {kind?:"dashboard"|"clientes"|"motos"|"contratos"|"pagamentos"|"alertas"|"vendas"|"configuracoes"|"atendimento"|"usuarios"|"auditoria"}) {
  if(!supabaseConfig()) return <LoginForm configured={false} accessDenied={false}/>;
  const {supabase,user,profile} = ['configuracoes','usuarios','auditoria'].includes(kind)?await requireAdmin():await requirePanelUser();
  const {data,error} = await supabase.rpc("painel_dados");
  if(error) throw new Error("Não foi possível carregar o banco. Confira a migração e tente novamente.");
  const snapshot = snapshotSchema.parse(data);
  const users=kind==='usuarios'?await supabase.from('perfis_usuario').select('id,nome,email,role,ativo,created_at').order('created_at',{ascending:false}):null;
  const usersMigrationReady=!users?.error;
  const audit=kind==='auditoria'?await supabase.from('logs_auditoria').select('id,usuario_id,usuario_nome,role,acao,entidade,registro_id,resumo,created_at').order('created_at',{ascending:false}).limit(200):null;
  const auditParsed=audit?.data?auditLogSchema.array().safeParse(audit.data):null;
  const auditLoadError=audit?.error?(['42P01','PGRST205'].includes(audit.error.code??'')?'A migração do histórico ainda não foi aplicada no Supabase. Aplique 202610080014_logs_auditoria.sql para habilitar os registros.':'Não foi possível carregar o histórico agora. Verifique a conexão e tente novamente.'):auditParsed&&!auditParsed.success?'O histórico retornou dados inválidos. Verifique a migração aplicada.':undefined;
  const auditLogs=auditParsed?.success?auditParsed.data:[];
  return <PanelProvider snapshot={snapshot}><AdminShell email={user.email ?? "Administrador"} role={profile.role}>{kind === "dashboard" ? <Dashboard/> : kind === 'clientes' ? <ClientesPage canAdmin={profile.role==='admin'}/> : kind === 'motos' ? <MotosPage canAdmin={profile.role==='admin'}/> : kind === 'contratos' ? <ContratosPage canAdmin={profile.role==='admin'}/> : kind === 'pagamentos' ? <PaymentsPage canAdmin={profile.role==='admin'}/> : kind === 'vendas' ? <SalesPage/> : kind === 'configuracoes' ? <EmpresaPage/> : kind === 'atendimento' ? <AtendimentoPage canAdmin={profile.role==='admin'}/> : kind==='usuarios' ? <UsersPage users={users?.data??[]} migrationReady={usersMigrationReady} canCreate={usersMigrationReady&&hasSupabaseAdminCredential()} currentUserId={user.id}/> : kind==='auditoria' ? <AuditPage logs={auditLogs} loadError={auditLoadError}/> : <AlertsPage canAdmin={profile.role==='admin'}/>}</AdminShell></PanelProvider>;
}
