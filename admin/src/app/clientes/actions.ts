"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin,requirePanelUser } from "@/lib/auth";
import { clienteInputSchema, clientError, type ClienteResult } from "@/lib/clientes";

const referenceSchema = z.object({id:z.uuid(),version:z.string().datetime({offset:true})});

export async function saveCliente(form:FormData):Promise<ClienteResult> {
  const {supabase} = await requirePanelUser();
  const parsed = clienteInputSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success) return {ok:false,message:'Revise os campos destacados.',errors:parsed.error.flatten().fieldErrors};
  const id=String(form.get('id') ?? '');
  const reference=id ? referenceSchema.safeParse({id,version:form.get('version')}) : null;
  if(reference && !reference.success) return {ok:false,message:'Registro inválido. Recarregue a página.'};
  try {
    const request = reference?.success
      ? supabase.from('clientes').update(parsed.data).eq('id',reference.data.id).eq('updated_at',reference.data.version).is('deleted_at',null)
      : supabase.from('clientes').insert(parsed.data);
    const {data,error} = await request.select('id').maybeSingle();
    if(error) return {ok:false,message:clientError(error.code)};
    if(!data) return {ok:false,message:'O cliente foi alterado ou removido por outra sessão. Feche o formulário, atualize a lista e tente novamente.'};
  } catch { return {ok:false,message:clientError()}; }
  refresh();
  return {ok:true,message:id ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.'};
}

export async function deleteCliente(form:FormData):Promise<ClienteResult> {
  const {supabase} = await requireAdmin();
  const parsed=referenceSchema.safeParse({id:form.get('id'),version:form.get('version')});
  if(!parsed.success || form.get('confirm') !== 'arquivar') return {ok:false,message:'Confirme o arquivamento do cliente.'};
  try {
    const {data,error}=await supabase.from('clientes').update({deleted_at:new Date().toISOString()}).eq('id',parsed.data.id).eq('updated_at',parsed.data.version).is('deleted_at',null).select('id').maybeSingle();
    if(error) return {ok:false,message:clientError(error.code)};
    if(!data) return {ok:false,message:'O cliente foi alterado ou já está arquivado. Atualize a lista antes de continuar.'};
  } catch { return {ok:false,message:clientError()}; }
  refresh();
  return {ok:true,message:'Cliente arquivado. Os dados e contratos antigos foram preservados.'};
}

export async function restoreCliente(form:FormData):Promise<ClienteResult> {
  const {supabase}=await requireAdmin();
  const parsed=referenceSchema.safeParse({id:form.get('id'),version:form.get('version')});
  if(!parsed.success || form.get('confirm') !== 'restaurar') return {ok:false,message:'Confirme a restauração do cliente.'};
  try {
    const {data,error}=await supabase.from('clientes').update({deleted_at:null}).eq('id',parsed.data.id).eq('updated_at',parsed.data.version).not('deleted_at','is',null).select('id').maybeSingle();
    if(error) return {ok:false,message:clientError(error.code)};
    if(!data) return {ok:false,message:'O cliente foi alterado ou já está ativo. Atualize a lista antes de continuar.'};
  } catch { return {ok:false,message:clientError()}; }
  refresh();
  return {ok:true,message:'Cliente restaurado e disponível novamente.'};
}
