'use server';
import {refresh} from 'next/cache';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {empresaInputSchema} from '@/lib/empresa';
export async function saveEmpresa(form:FormData){
  const {supabase}=await requireAdmin();
  const parsed=empresaInputSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success)return {ok:false,message:'Revise os campos destacados.',errors:parsed.error.flatten().fieldErrors};
  const version=z.string().datetime({offset:true}).safeParse(form.get('version'));
  if(!version.success)return {ok:false,message:'Atualize a página e confira a migração de configurações.'};
  try{
    const {data,error}=await supabase.from('configuracoes_empresa').update(parsed.data).eq('id',1).eq('updated_at',version.data).select('updated_at').maybeSingle();
    if(error)return {ok:false,message:'Não foi possível salvar as configurações. Tente novamente.'};
    if(!data)return {ok:false,message:'Configurações alteradas por outra sessão. Atualize a página antes de salvar.'};
    refresh();return {ok:true,message:'Configurações salvas.',version:String(data.updated_at)};
  }catch{return {ok:false,message:'Falha de conexão. Confira os dados antes de tentar novamente.'};}
}
