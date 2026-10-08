import { z } from 'zod';
import { parsePrice } from './motos';

export const paymentStatuses={pendente:'Pendente',pago:'Pago',atrasado:'Atrasado',cancelado:'Cancelado'} as const;
export const paymentMethods={pix:'Pix',dinheiro:'Dinheiro',cartao:'Cartão',transferencia:'Transferência',outro:'Outro'} as const;
const status=z.enum(['pendente','pago','atrasado','cancelado']);
const method=z.enum(['pix','dinheiro','cartao','transferencia','outro']);
const civilDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Informe uma data válida.').refine(value=>!Number.isNaN(Date.parse(value))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value,'Informe uma data válida.');
export function operationDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export const paymentInputSchema=z.object({
  contrato_id:z.uuid('Selecione um contrato.'),
  valor:z.string().transform(parsePrice).refine(value=>Number.isFinite(value)&&value>0&&value<=9999999999.99,'Informe um valor maior que zero, com até duas casas decimais.'),
  data_vencimento:civilDate,
  data_pagamento:z.union([civilDate,z.literal('')]).transform(value=>value||null),
  forma_pagamento:z.union([method,z.literal('')]).transform(value=>value||null),
  status,
  observacoes:z.string().trim().max(5000,'Use no máximo 5000 caracteres.'),
}).superRefine((value,ctx)=>{
  if(value.status==='pago'){
    if(!value.data_pagamento)ctx.addIssue({code:'custom',path:['data_pagamento'],message:'Informe a data do recebimento integral.'});
    if(!value.forma_pagamento)ctx.addIssue({code:'custom',path:['forma_pagamento'],message:'Informe a forma de pagamento.'});
    if(value.data_pagamento&&value.data_pagamento>operationDate())ctx.addIssue({code:'custom',path:['data_pagamento'],message:'O recebimento não pode estar no futuro.'});
  }
}).transform(value=>({...value,data_pagamento:value.status==='pago'?value.data_pagamento:null}));
export const paymentRecordSchema=z.object({
  id:z.uuid(),contrato_id:z.uuid(),valor:z.number(),data_vencimento:civilDate,data_pagamento:civilDate.nullable(),status,
  status_registrado:status.optional(),forma_pagamento:method.nullable().default(null),observacoes:z.string().default(''),
  created_at:z.string().datetime({offset:true}),updated_at:z.string().datetime({offset:true}).optional(),
});
export type Payment=z.infer<typeof paymentRecordSchema>;
export type PaymentResult={ok:boolean;message:string;errors?:Record<string,string[]|undefined>};
export const sumMoney=(values:number[])=>values.reduce((total,value)=>total+Math.round(value*100),0)/100;
export function paymentError(code?:string){
  if(code==='23505')return 'Este lançamento já foi registrado. Atualize a lista antes de tentar novamente.';
  if(code==='23503')return 'O contrato selecionado não está mais disponível. Atualize a lista.';
  if(code==='42501')return 'Sua conta não tem permissão para esta operação.';
  if(code==='23514'||code==='22003')return 'Confira o valor, as datas e o status informados.';
  return 'Não foi possível salvar. Confira sua conexão e atualize a lista antes de tentar novamente.';
}
