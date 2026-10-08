"use server";
import { refresh } from 'next/cache';
import { z } from 'zod';
import { requirePanelUser } from '@/lib/auth';
import { paymentInputSchema,paymentError,type PaymentResult } from '@/lib/pagamentos';
const reference=z.object({id:z.uuid(),version:z.string().datetime({offset:true})});
export async function savePayment(form:FormData):Promise<PaymentResult>{
  const {supabase,profile}=await requirePanelUser();
  const parsed=paymentInputSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success)return {ok:false,message:'Revise os campos destacados.',errors:parsed.error.flatten().fieldErrors};
  const id=String(form.get('id')??'');
  if(id&&profile.role!=='admin')return {ok:false,message:'Acesso negado: somente administrador pode editar pagamentos existentes.'};
  const ref=id?reference.safeParse({id,version:form.get('version')}):null;
  const creation=z.uuid().safeParse(form.get('creation_id'));
  if((ref&&!ref.success)||(!id&&!creation.success))return {ok:false,message:'Registro inválido. Feche o formulário e atualize a página.'};
  try{
    if(!id){
      const {data:existing,error:lookupError}=await supabase.from('pagamentos').select('id').eq('contrato_id',parsed.data.contrato_id).eq('data_vencimento',parsed.data.data_vencimento).neq('status','cancelado').limit(1).maybeSingle();
      if(lookupError)return {ok:false,message:'Não foi possível conferir se já existe uma cobrança para esse vencimento. Tente novamente.'};
      if(existing)return {ok:false,message:'Já existe uma cobrança ativa para esse contrato e vencimento. Atualize a lista para conferi-la.'};
    }
    const request=ref?.success?supabase.from('pagamentos').update(parsed.data).eq('id',ref.data.id).eq('updated_at',ref.data.version):supabase.from('pagamentos').insert({...parsed.data,id:creation.data});
    const {data,error}=await request.select('id').maybeSingle();
    if(error)return {ok:false,message:paymentError(error.code)};
    if(!data)return {ok:false,message:'O pagamento foi alterado por outra sessão. Feche o formulário e atualize a lista.'};
  }catch{return {ok:false,message:paymentError()};}
  refresh();return {ok:true,message:id?'Pagamento atualizado com sucesso.':'Pagamento registrado com sucesso.'};
}
