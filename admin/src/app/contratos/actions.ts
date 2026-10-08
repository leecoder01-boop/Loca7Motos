"use server";
import { refresh } from 'next/cache';
import { z } from 'zod';
import { requireAdmin,requirePanelUser } from '@/lib/auth';
import { contratoInputSchema,contratoError,type ContratoResult } from '@/lib/contratos';
const referenceSchema=z.object({id:z.uuid(),version:z.string().datetime({offset:true})});
const openStatuses=['ativo','vencendo','vencendo_hoje','atrasado'];
export async function saveContrato(form:FormData):Promise<ContratoResult>{
  const {supabase}=await requirePanelUser();
  const parsed=contratoInputSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success)return {ok:false,message:'Revise os campos destacados.',errors:parsed.error.flatten().fieldErrors};
  const id=String(form.get('id')??'');
  const ref=id?referenceSchema.safeParse({id,version:form.get('version')}):null;
  if(ref&&!ref.success)return {ok:false,message:'Registro inválido. Recarregue a página.'};
  try{
    const values={...parsed.data,status:'ativo'};
    const request=ref?.success?supabase.from('contratos').update(values).eq('id',ref.data.id).eq('updated_at',ref.data.version).in('status',openStatuses):supabase.from('contratos').insert(values);
    const {data,error}=await request.select('id').maybeSingle();
    if(error)return {ok:false,message:contratoError(error.code)};
    if(!data)return {ok:false,message:'O contrato foi alterado ou encerrado por outra sessão. Feche o formulário e atualize a lista.'};
  }catch{return {ok:false,message:contratoError()};}
  refresh();return {ok:true,message:id?'Contrato atualizado com sucesso.':'Locação criada. A moto está alugada.'};
}
export async function encerrarContrato(form:FormData):Promise<ContratoResult>{
  const {supabase}=await requireAdmin();
  const parsed=referenceSchema.safeParse({id:form.get('id'),version:form.get('version')});
  const status=form.get('status');
  if(!parsed.success||(status!=='finalizado'&&status!=='cancelado')||form.get('confirm')!==status)return {ok:false,message:'Confirme o encerramento do contrato.'};
  try{
    const {data,error}=await supabase.from('contratos').update({status}).eq('id',parsed.data.id).eq('updated_at',parsed.data.version).in('status',openStatuses).select('id').maybeSingle();
    if(error)return {ok:false,message:contratoError(error.code)};
    if(!data)return {ok:false,message:'O contrato foi alterado ou já foi encerrado. Atualize a lista.'};
  }catch{return {ok:false,message:contratoError()};}
  refresh();return {ok:true,message:`Contrato ${status}. A moto está disponível novamente.`};
}
