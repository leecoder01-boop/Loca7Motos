"use server";
import {refresh} from 'next/cache';
import {z} from 'zod';
import {requirePanelUser} from '@/lib/auth';
import {snapshotSchema} from '@/lib/panel-data';
import {buildOperationAlerts} from '@/lib/alertas';

const input=z.object({id:z.string().regex(/^(contrato|pagamento|cliente|moto)-[0-9a-f-]{36}$/),version:z.string().max(500),referenceDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),note:z.string().trim().min(3,'Informe o que foi tratado.').max(1000)});
export async function resolveAlert(values:unknown):Promise<{ok:boolean;message:string}>{
  const {supabase,user}=await requirePanelUser();
  const parsed=input.safeParse(values);
  if(!parsed.success)return {ok:false,message:'Informe o tratamento realizado (3 a 1.000 caracteres).'};
  try{
    const {data,error}=await supabase.rpc('painel_dados');
    if(error)return {ok:false,message:'Não foi possível conferir os dados atuais. Tente novamente.'};
    const snapshot=snapshotSchema.parse(data);
    if(!snapshot.resolucoes)return {ok:false,message:'Aplique a migração de alertas no Supabase antes de registrar resoluções.'};
    const alert=buildOperationAlerts(snapshot).find(a=>a.id===parsed.data.id);
    if(!alert||alert.version!==parsed.data.version||snapshot.referenceDate!==parsed.data.referenceDate)return {ok:false,message:'O alerta mudou ou deixou de estar ativo. Atualize a página antes de continuar.'};
    if(!alert.resolved){
      const {error:writeError}=await supabase.from('alertas_resolucoes').insert({alerta_id:alert.id,versao:alert.version,data_referencia:snapshot.referenceDate,resolvido_por:user.id,observacao:parsed.data.note});
      if(writeError&&writeError.code!=='23505')return {ok:false,message:'Não foi possível registrar a resolução. Confira a conexão e suas permissões.'};
    }
    refresh();return {ok:true,message:'Tratamento registrado. Se a pendência persistir, o alerta volta amanhã ou após uma alteração no cadastro.'};
  }catch{return {ok:false,message:'Falha ao registrar a resolução. Atualize a lista antes de tentar novamente.'};}
}
