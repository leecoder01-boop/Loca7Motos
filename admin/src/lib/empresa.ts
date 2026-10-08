import {z} from 'zod';
export const pixTypes={cpf:'CPF',cnpj:'CNPJ',email:'E-mail',telefone:'Telefone',aleatoria:'Aleatória'};
export const empresaRecordSchema=z.object({id:z.literal(1),nome:z.string(),telefone:z.string(),chave_pix:z.string(),tipo_chave_pix:z.enum(['','cpf','cnpj','email','telefone','aleatoria']),nome_recebedor:z.string(),cidade:z.string(),updated_at:z.string().datetime({offset:true})});
export type Empresa=z.infer<typeof empresaRecordSchema>;
export function whatsappNumber(value:string):string|null{
  if(!/^[+\d\s().-]+$/.test(value))return null;
  const digits=value.replace(/\D/g,'');
  if(value.trim().startsWith('+')&&!digits.startsWith('55'))return null;
  const national=digits.length===10||digits.length===11?digits:digits.startsWith('55')&&(digits.length===12||digits.length===13)?digits.slice(2):'';
  if(!/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(national))return null;
  return `55${national}`;
}
export const empresaInputSchema=empresaRecordSchema.omit({id:true,updated_at:true}).extend({nome:z.string().trim().min(2,'Informe o nome da empresa com pelo menos 2 caracteres.').max(150,'Use até 150 caracteres.'),telefone:z.string().trim().max(30,'Use até 30 caracteres.'),chave_pix:z.string().trim().max(150,'Use até 150 caracteres.'),nome_recebedor:z.string().trim().max(150,'Use até 150 caracteres.'),cidade:z.string().trim().max(100,'Use até 100 caracteres.')}).superRefine((v,ctx)=>{
  const error=(path:string,message:string)=>ctx.addIssue({code:'custom',path:[path],message});
  if(v.telefone&&!whatsappNumber(v.telefone))error('telefone','Informe telefone brasileiro com DDD.');
  if(v.chave_pix){
    if(!v.tipo_chave_pix)error('tipo_chave_pix','Selecione o tipo da chave.');
    if(!v.nome_recebedor)error('nome_recebedor','Informe o nome do recebedor.');
    const valid=v.tipo_chave_pix==='email'?z.email().safeParse(v.chave_pix).success:v.tipo_chave_pix==='telefone'?/^\+55\d{10,11}$/.test(v.chave_pix)&&!!whatsappNumber(v.chave_pix):v.tipo_chave_pix==='cpf'?/^\d{11}$/.test(v.chave_pix):v.tipo_chave_pix==='cnpj'?/^[A-Z0-9]{12}\d{2}$/.test(v.chave_pix):v.tipo_chave_pix==='aleatoria'?z.uuid().safeParse(v.chave_pix).success:false;
    if(!valid)error('chave_pix','Revise o formato da chave. CPF/CNPJ sem pontuação (letras do CNPJ em maiúsculas); telefone +55 e DDD; aleatória no formato UUID.');
  }
});
