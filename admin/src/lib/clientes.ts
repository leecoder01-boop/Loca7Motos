import { z } from "zod";

export const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;
export const categorias = ['ACC','A','B','AB','C','AC','D','AD','E','AE'] as const;
export const digits = (value:string) => value.replace(/\D/g, '');
export function validCpf(value:string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  return [9,10].every(length => {
    const sum = [...value.slice(0,length)].reduce((total,n,index) => total+Number(n)*(length+1-index),0);
    const digit = (sum*10)%11;
    return Number(value[length]) === (digit === 10 ? 0 : digit);
  });
}
const text = (max:number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`);
const phone = text(30).transform(digits).refine(value => /^\d{10,13}$/.test(value), 'Informe um telefone com DDD (10 a 13 dígitos).');
const optionalDate = z.string().transform(value => value || null).refine(value => value === null || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value && value >= '1900-01-01' && value <= '2100-12-31'), 'Informe uma data válida.');
export const clienteInputSchema = z.object({
  nome:text(200).min(3,'Informe o nome completo.'),
  cpf:text(20).transform(digits).refine(validCpf,'Informe um CPF válido.'),
  telefone:phone,
  whatsapp:text(30).transform(digits).refine(value => !value || /^\d{10,13}$/.test(value),'Informe um WhatsApp com DDD.'),
  email:text(254).refine(value => !value || z.email().safeParse(value).success,'Informe um e-mail válido.'),
  endereco:text(500).min(3,'Informe o endereço.'),
  cidade:text(120), estado:z.enum(['',...estados]),
  cep:text(12).transform(digits).refine(value => !value || /^\d{8}$/.test(value),'Informe um CEP com 8 dígitos.'),
  cnh:text(20).transform(digits).refine(value => /^\d{11}$/.test(value),'Informe a CNH com 11 dígitos.'),
  categoria_cnh:z.enum(['',...categorias]),
  validade_cnh:optionalDate, data_nascimento:optionalDate.refine(value => !value || value <= new Date().toISOString().slice(0,10),'A data de nascimento não pode ser futura.'),
  observacoes:text(5000), status:z.enum(['ativo','bloqueado']),
});

// Defaults permitem ler clientes anteriores à ampliação sem inventar dados pessoais.
export const clienteRecordSchema = z.object({
  id:z.uuid(), nome:z.string(), cpf:z.string(), cnh:z.string(), telefone:z.string(), endereco:z.string(),
  created_at:z.string().datetime({offset:true}),
  whatsapp:z.string().default(''), email:z.string().default(''), cidade:z.string().default(''), estado:z.string().default(''), cep:z.string().default(''),
  categoria_cnh:z.string().default(''), validade_cnh:z.string().nullable().default(null), data_nascimento:z.string().nullable().default(null),
  observacoes:z.string().default(''), status:z.enum(['ativo','bloqueado']).default('ativo'), updated_at:z.string().datetime({offset:true}).optional(),
  deleted_at:z.string().datetime({offset:true}).nullable().default(null),
});
export type Cliente = z.infer<typeof clienteRecordSchema>;
export type ClienteValues = z.input<typeof clienteInputSchema>;
export type ClienteResult = {ok:boolean; message:string; errors?:Partial<Record<keyof ClienteValues,string[]>>};
export function clientError(code?:string) {
  if(code === '23505') return 'Já existe um cliente com este CPF.';
  if(code === '23503') return 'Finalize ou cancele os contratos em aberto antes de arquivar este cliente.';
  if(code === '42501') return 'Sua conta não tem permissão para esta operação.';
  if(code === '23514' || code === '22007' || code === '22008') return 'Confira os campos e as datas informadas.';
  return 'Não foi possível salvar a alteração. Confira sua conexão e tente novamente.';
}
export function matchesCliente(cliente:Cliente, query:string) {
  const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const q=normalize(query.trim());
  if(!q) return true;
  return normalize(cliente.nome).includes(q) || (/^[\d\s().+\-]+$/.test(q) && !!digits(q) && (digits(cliente.cpf).includes(digits(q)) || digits(cliente.telefone).includes(digits(q))));
}
export const cpfDisplay = (value:string) => value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
