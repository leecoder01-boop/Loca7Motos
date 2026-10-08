import { z } from 'zod';
import { parsePrice } from './motos';
export const periodicidades={diaria:'Diária',semanal:'Semanal',mensal:'Mensal'} as const;
export const contratoStatuses={ativo:'Ativo',vencendo:'Vencendo',vencendo_hoje:'Vencendo hoje',atrasado:'Atrasado',finalizado:'Finalizado',cancelado:'Cancelado'} as const;
const isoDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Informe uma data válida.').refine(v=>{const d=new Date(`${v}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;},'Informe uma data válida.');
const price=z.string().trim().max(30).transform(parsePrice).refine(v=>Number.isFinite(v)&&v>=0&&v<=9999999999.99,'Informe um valor não negativo com até duas casas decimais.');
export const contratoInputSchema=z.object({cliente_id:z.uuid('Selecione um cliente.'),moto_id:z.uuid('Selecione uma moto.'),data_inicio:isoDate,data_vencimento:isoDate,valor:price,periodicidade:z.enum(['diaria','semanal','mensal']),caucao:z.string().transform(v=>v.trim()||'0').pipe(price),observacoes:z.string().trim().max(5000)}).refine(v=>v.data_vencimento>=v.data_inicio,{path:['data_vencimento'],message:'O vencimento deve ser igual ou posterior ao início.'});
export const contratoRecordSchema=z.object({id:z.uuid(),cliente_id:z.uuid(),moto_id:z.uuid(),data_inicio:isoDate,data_vencimento:isoDate,valor:z.number(),status:z.enum(['ativo','vencendo','vencendo_hoje','atrasado','finalizado','cancelado']),periodicidade:z.enum(['diaria','semanal','mensal']).default('semanal'),caucao:z.number().default(0),observacoes:z.string().default(''),created_at:z.string().datetime({offset:true}),updated_at:z.string().datetime({offset:true}).optional()});
export type Contrato=z.infer<typeof contratoRecordSchema>;
export type ContratoResult={ok:boolean;message:string;errors?:Record<string,string[]|undefined>};
export const isClosed=(status:string)=>status==='finalizado'||status==='cancelado';
export function contratoError(code?:string){
  if(code==='P0001')return 'A moto não está mais disponível ou o contrato já foi encerrado. Atualize a lista.';
  if(code==='23505')return 'Esta moto já possui uma locação em aberto.';
  if(code==='23503')return 'O cliente ou a moto não existe mais. Atualize a lista.';
  if(code==='42501')return 'Sua conta não tem permissão para esta operação.';
  return 'Não foi possível salvar. Confira os dados e sua conexão e tente novamente.';
}
