"use server";
import { z } from 'zod';
import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { documentInputSchema,modelSchema,type DocResult } from '@/lib/documentos';
const timestamp=z.string().datetime({offset:true}).nullable();
export async function salvarDocumento(input:unknown,reference:unknown):Promise<DocResult>{
  const {supabase}=await requireAdmin();
  const value=documentInputSchema.safeParse(input);const ref=z.object({id:z.uuid(),parent:z.uuid().nullable(),locacaoVersion:timestamp,modeloVersion:timestamp}).safeParse(reference);
  if(!value.success)return {ok:false,message:value.error.issues.map(i=>`${i.path.join(' / ')}: ${i.message}`).join('; ')};
  if(!ref.success)return {ok:false,message:'Referência inválida. Atualize a página.'};
  try{const {data,error}=await supabase.rpc('gerar_documento_contrato',{p_contrato:ref.data.id,p_conteudo:value.data,p_parent:ref.data.parent,p_locacao_version:ref.data.locacaoVersion,p_modelo_version:ref.data.modeloVersion});
    if(error)return {ok:false,message:error.code==='P0001'?'A locação, o modelo ou a versão mudou. Atualize a página antes de gerar novamente.':'Não foi possível gerar o documento. Confira sua conexão e as permissões.'};
    refresh();return {ok:true,message:'Nova versão da minuta salva. As versões anteriores foram preservadas.',id:String(data)};
  }catch{return {ok:false,message:'Falha na conexão. Verifique o histórico antes de tentar novamente.'};}
}
export async function salvarModelo(input:unknown,version:unknown):Promise<DocResult>{
  const {supabase}=await requireAdmin();const value=modelSchema.safeParse(input);const ref=timestamp.safeParse(version);
  if(!value.success||!ref.success)return {ok:false,message:'Confira os dados do modelo e seus limites de texto.'};
  try{const {error}=await supabase.rpc('salvar_modelo_contrato',{p_conteudo:value.data,p_version:ref.data});if(error)return {ok:false,message:error.code==='P0001'?'O modelo mudou em outra sessão. Atualize a página.':'Não foi possível salvar o modelo.'};refresh();return {ok:true,message:'Modelo salvo. Documentos já gerados não foram alterados.'};}catch{return {ok:false,message:'Não foi possível salvar. Confira sua conexão.'};}
}
