import { z } from 'zod';

export const motoStatuses = {disponivel:'Disponível',alugada:'Alugada',manutencao:'Manutenção',indisponivel:'Indisponível'} as const;
export const priceTypes = {diaria:'Diária',semanal:'Semanal',mensalidade:'Mensalidade'} as const;
export const normalizePlate = (value:string) => value.trim().toUpperCase().replace(/[\s-]/g,'');
const text=(max:number)=>z.string().trim().max(max,`Use no máximo ${max} caracteres.`);
// Aceita 85,90, 85.90 ou 1.250,00 sem arredondar silenciosamente centavos extras.
export function parsePrice(value:string):number {
  const raw=value.trim();
  if(!/^(?:\d+(?:[.,]\d{1,2})?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)$/.test(raw)) return NaN;
  return Number(raw.includes(',') ? raw.replace(/\./g,'').replace(',','.') : /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g,'') : raw);
}
const integer=(max:number,message:string)=>z.string().trim().regex(/^\d+$/,message).transform(Number).refine(value=>Number.isSafeInteger(value)&&value<=max,message);
export const motoInputSchema=z.object({
  marca:text(100).min(1,'Informe a marca.'),
  modelo:text(150).min(1,'Informe o modelo.'),
  ano:integer(new Date().getFullYear()+1,'Informe um ano inteiro entre 1900 e o próximo ano.').refine(value=>value>=1900,'Informe um ano a partir de 1900.'),
  placa:text(15).transform(normalizePlate).refine(value=>/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value),'Informe uma placa válida: ABC1234 ou ABC1D23.'),
  cor:text(80),
  quilometragem:integer(2147483647,'Informe uma quilometragem inteira e não negativa.'),
  valor_locacao:text(30).transform(parsePrice).refine(value=>Number.isFinite(value)&&value>=0&&value<=9999999999.99,'Informe um valor não negativo com até duas casas decimais.'),
  tipo_valor:z.enum(['diaria','semanal','mensalidade']),
  status:z.enum(['disponivel','alugada','manutencao','indisponivel']),
  observacoes:text(5000),
});
export const motoRecordSchema=z.object({
  id:z.uuid(),marca:z.string(),modelo:z.string(),ano:z.number(),placa:z.string(),quilometragem:z.number(),valor_locacao:z.number(),
  status:z.enum(['disponivel','alugada','manutencao','indisponivel']),created_at:z.string().datetime({offset:true}),
  cor:z.string().default(''),tipo_valor:z.enum(['diaria','semanal','mensalidade']).default('diaria'),observacoes:z.string().default(''),updated_at:z.string().datetime({offset:true}).optional(),deleted_at:z.string().datetime({offset:true}).nullable().default(null),
});
export type Moto=z.infer<typeof motoRecordSchema>;
export type MotoValues=z.input<typeof motoInputSchema>;
export type MotoResult={ok:boolean;message:string;errors?:Partial<Record<keyof MotoValues,string[]>>};
export function motoError(code?:string) {
  if(code === '23505') return 'Já existe uma moto cadastrada com esta placa.';
  if(code === '23503') return 'Finalize ou cancele os contratos em aberto antes de arquivar esta moto.';
  if(code === 'P0001') return 'Esta moto possui um contrato aberto. Finalize o contrato antes de alterar sua disponibilidade.';
  if(code === '42501') return 'Sua conta não tem permissão para esta operação.';
  if(code === '23514' || code === '22003') return 'Confira os campos, os valores e o status informados.';
  return 'Não foi possível salvar a alteração. Confira sua conexão e tente novamente.';
}
export function matchesMoto(moto:Moto,query:string) {
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const q=query.trim();
  return !q || normalize(moto.modelo).includes(normalize(q)) || normalize(moto.marca).includes(normalize(q)) || moto.placa.includes(normalizePlate(q));
}
