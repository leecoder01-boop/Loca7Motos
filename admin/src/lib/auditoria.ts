import {z} from 'zod';

export const auditLogSchema=z.object({
  id:z.uuid(),
  usuario_id:z.uuid().nullable(),
  usuario_nome:z.string(),
  role:z.enum(['admin','atendente','sistema']),
  acao:z.string(),
  entidade:z.enum(['cliente','moto','contrato','pagamento','usuario','empresa']),
  registro_id:z.string().nullable(),
  resumo:z.string(),
  created_at:z.string().datetime({offset:true}),
});
export type AuditLog=z.infer<typeof auditLogSchema>;
