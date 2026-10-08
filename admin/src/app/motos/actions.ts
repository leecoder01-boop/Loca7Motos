"use server";
import { refresh } from 'next/cache';
import { z } from 'zod';
import { requireAdmin,requirePanelUser } from '@/lib/auth';
import { motoInputSchema,motoError,type MotoResult } from '@/lib/motos';
const referenceSchema=z.object({id:z.uuid(),version:z.string().datetime({offset:true})});

export async function saveMoto(form:FormData):Promise<MotoResult> {
  const {supabase}=await requirePanelUser();
  const parsed=motoInputSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success) return {ok:false,message:'Revise os campos destacados.',errors:parsed.error.flatten().fieldErrors};
  const id=String(form.get('id') ?? '');
  const reference=id ? referenceSchema.safeParse({id,version:form.get('version')}) : null;
  if(reference && !reference.success) return {ok:false,message:'Registro inválido. Recarregue a página.'};
  try {
    const request=reference?.success ? supabase.from('motos').update(parsed.data).eq('id',reference.data.id).eq('updated_at',reference.data.version).is('deleted_at',null) : supabase.from('motos').insert(parsed.data);
    const {data,error}=await request.select('id').maybeSingle();
    if(error) return {ok:false,message:motoError(error.code)};
    if(!data) return {ok:false,message:'A moto foi alterada ou removida por outra sessão. Feche o formulário, atualize a lista e tente novamente.'};
  } catch {return {ok:false,message:motoError()};}
  refresh();
  return {ok:true,message:id ? 'Moto atualizada com sucesso.' : 'Moto cadastrada com sucesso.'};
}
export async function deleteMoto(form:FormData):Promise<MotoResult> {
  const {supabase}=await requireAdmin();
  const parsed=referenceSchema.safeParse({id:form.get('id'),version:form.get('version')});
  if(!parsed.success || form.get('confirm') !== 'arquivar') return {ok:false,message:'Confirme o arquivamento da moto.'};
  try {
    const {data,error}=await supabase.from('motos').update({deleted_at:new Date().toISOString()}).eq('id',parsed.data.id).eq('updated_at',parsed.data.version).is('deleted_at',null).select('id').maybeSingle();
    if(error) return {ok:false,message:motoError(error.code)};
    if(!data) return {ok:false,message:'A moto foi alterada ou já está arquivada. Atualize a lista antes de continuar.'};
  } catch {return {ok:false,message:motoError()};}
  refresh();
  return {ok:true,message:'Moto arquivada. Os dados e contratos antigos foram preservados.'};
}

export async function restoreMoto(form:FormData):Promise<MotoResult> {
  const {supabase}=await requireAdmin();
  const parsed=referenceSchema.safeParse({id:form.get('id'),version:form.get('version')});
  if(!parsed.success || form.get('confirm') !== 'restaurar') return {ok:false,message:'Confirme a restauração da moto.'};
  try {
    const {data,error}=await supabase.from('motos').update({deleted_at:null}).eq('id',parsed.data.id).eq('updated_at',parsed.data.version).not('deleted_at','is',null).select('id').maybeSingle();
    if(error) return {ok:false,message:motoError(error.code)};
    if(!data) return {ok:false,message:'A moto foi alterada ou já está ativa. Atualize a lista antes de continuar.'};
  } catch {return {ok:false,message:motoError()};}
  refresh();
  return {ok:true,message:'Moto restaurada e disponível novamente.'};
}
