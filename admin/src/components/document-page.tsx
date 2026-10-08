import { z } from 'zod';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { snapshotSchema } from '@/lib/panel-data';
import { blankModel,modelSchema,documentRecordSchema } from '@/lib/documentos';
import { AdminShell } from './admin-shell';
import { PanelProvider } from './panel-provider';
import { DocumentEditor } from './document-editor';
export async function DocumentPage({id}:{id?:string}){
  const {supabase,user,profile}=await requireAdmin();
  if(id&&!z.uuid().safeParse(id).success)notFound();
  const [{data:snapshotData,error:snapshotError},{data:modelData,error:modelError}]=await Promise.all([supabase.rpc('painel_dados'),supabase.from('modelos_contrato').select('conteudo,updated_at').eq('id',1).maybeSingle()]);
  if(snapshotError||modelError)throw new Error('Não foi possível carregar o documento. Confira a migração e a conexão.');
  const snapshot=snapshotSchema.parse(snapshotData);const contract=id?snapshot.contratos.find(c=>c.id===id):null;
  if(id&&!contract)notFound();
  const model=modelData?modelSchema.parse(modelData.conteudo):blankModel();
  const {data:documents,error}=id?await supabase.from('documentos_contrato').select('*').eq('contrato_id',id).order('versao',{ascending:false}):{data:[],error:null};
  if(error)throw new Error('Não foi possível carregar o histórico.');
  const records=z.array(documentRecordSchema).parse(documents);
  return <PanelProvider snapshot={snapshot}><AdminShell email={user.email??'Administrador'} role={profile.role}><DocumentEditor key={id??'model'} contract={contract??null} model={model} modelVersion={modelData?.updated_at??null} documents={records}/></AdminShell></PanelProvider>;
}
