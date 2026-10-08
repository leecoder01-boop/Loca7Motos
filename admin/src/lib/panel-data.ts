import { z } from "zod";
import { clienteRecordSchema } from "./clientes";
import { motoRecordSchema, motoStatuses } from "./motos";
import { contratoRecordSchema } from './contratos';
import { paymentRecordSchema, sumMoney } from './pagamentos';
import { buildOperationAlerts } from './alertas';
import {empresaRecordSchema} from './empresa';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.string().uuid();
const created = z.string().datetime({offset:true});
export const snapshotSchema = z.object({
  referenceDate:isoDate,
  clientes:z.array(clienteRecordSchema),
  motos:z.array(motoRecordSchema),
  contratos:z.array(contratoRecordSchema),
  pagamentos:z.array(paymentRecordSchema),
  empresa:empresaRecordSchema.nullable().optional(),
  resolucoes:z.array(z.object({alerta_id:z.string(),versao:z.string(),data_referencia:isoDate,resolvido_por:id,observacao:z.string(),created_at:created})).optional(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export const money = (value:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value);
export const date = (value:string) => new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC"}).format(new Date(`${value.slice(0,10)}T12:00:00Z`));
export const initials = (name:string) => name.trim().split(/\s+/).slice(0,2).map(part => part[0] ?? "").join("");
export function presentSnapshot(snapshot:Snapshot) {
  const daysUntil = (value:string) => Math.round((Date.parse(`${value}T12:00:00Z`) - Date.parse(`${snapshot.referenceDate}T12:00:00Z`))/86400000);
  const allClients = snapshot.clientes.map(item => ({...item,id:item.id,name:item.nome,cpf:item.cpf,cnh:item.cnh,phone:item.telefone,address:item.endereco,since:item.created_at.slice(0,10),status:item.status === 'bloqueado' ? 'Bloqueado' : 'Ativo'}));
  const allMotorcycles = snapshot.motos.map(item => ({...item,id:item.id,model:`${item.marca} ${item.modelo}`,brand:item.marca,plate:item.placa,year:item.ano,daily:item.valor_locacao,mileage:item.quilometragem,status:motoStatuses[item.status]}));
  const clients=allClients.filter(item=>!item.deleted_at);
  const motorcycles=allMotorcycles.filter(item=>!item.deleted_at);
  const rentals = snapshot.contratos.map(item => ({id:item.id,clientId:item.cliente_id,motoId:item.moto_id,start:item.data_inicio,end:item.data_vencimento,amount:item.valor,cancelled:item.status === 'cancelado',closed:item.status === "finalizado"||item.status === 'cancelado'}));
  const payments = snapshot.pagamentos.map(item => ({id:item.id,rentalId:item.contrato_id,amount:item.valor,due:item.data_vencimento,received:item.data_pagamento ?? undefined,status:item.status === 'cancelado' ? 'Cancelado' : item.status === "pago" ? "Pago" : item.status === 'atrasado' || daysUntil(item.data_vencimento)<0 ? "Atrasado" : "Pendente"}));
  const clientsById=new Map(allClients.map(item=>[item.id,item]));
  const motorcyclesById=new Map(allMotorcycles.map(item=>[item.id,item]));
  const rentalsById=new Map(rentals.map(item=>[item.id,item]));
  const clientFor = (rental:typeof rentals[number]) => {
    const client = clientsById.get(rental.clientId);
    if(!client) throw new Error("Cliente do contrato não encontrado.");
    return client;
  };
  const motoFor = (rental:typeof rentals[number]) => {
    const moto = motorcyclesById.get(rental.motoId);
    if(!moto) throw new Error("Moto do contrato não encontrada.");
    return moto;
  };
  const rentalFor = (payment:typeof payments[number]) => {
    const rental = rentalsById.get(payment.rentalId);
    if(!rental) throw new Error("Contrato do pagamento não encontrado.");
    return rental;
  };
  function rentalStatus(rental:typeof rentals[number]) {
    if(rental.cancelled) return 'Cancelado';
    if(rental.closed) return "Finalizado";
    const days = daysUntil(rental.end);
    return days<0 ? "Atrasado" : days===0 ? "Vencendo hoje" : days<=3 ? "Vencendo" : "Ativo";
  }
  const pendingPayments = payments.filter(item => item.status === 'Pendente' || item.status === 'Atrasado');
  const receivedPayments = payments.filter(item => item.status === "Pago");
  const receivedThisMonth=receivedPayments.filter(item=>item.received?.slice(0,7)===snapshot.referenceDate.slice(0,7)&&item.received<=snapshot.referenceDate);
  const latePayments=pendingPayments.filter(item=>item.status==='Atrasado');
  const dueTodayPayments=pendingPayments.filter(item=>daysUntil(item.due)===0);
  const totalPending=sumMoney(pendingPayments.map(item=>item.amount));
  const totalReceivedMonth=sumMoney(receivedThisMonth.map(item=>item.amount));
  const rentalAlerts = rentals.filter(item => !item.closed && daysUntil(item.end)<=3).map(rental => ({
    id:`contrato-${rental.id}`,rentalId:rental.id,due:rental.end,status:rentalStatus(rental),kind:"contrato" as const,amount:rental.amount,
  }));
  // Pagamentos continuam exigíveis mesmo se o contrato já foi finalizado.
  const paymentAlerts = pendingPayments.filter(item => item.status==='Atrasado' || daysUntil(item.due)<=7).map(payment => ({
    id:`pagamento-${payment.id}`,rentalId:payment.rentalId,due:payment.due,status:payment.status === "Atrasado" ? "Pagamento atrasado" : daysUntil(payment.due)===0 ? "Pagamento vence hoje" : "Pagamento a vencer",kind:"pagamento" as const,amount:payment.amount,
  }));
  const alerts = [...rentalAlerts,...paymentAlerts].sort((a,b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
  const operationAlerts=buildOperationAlerts(snapshot);
  const activeAlerts=operationAlerts.filter(a=>!a.resolved);
  return {empresa:snapshot.empresa,clients,motorcycles,rentals,payments,alerts,operationAlerts,activeAlerts,alertResolutionAvailable:snapshot.resolucoes!==undefined,pendingPayments,receivedPayments,receivedThisMonth,latePayments,dueTodayPayments,totalPending,totalReceivedMonth,clientFor,motoFor,rentalFor,rentalStatus,daysUntil,referenceDate:snapshot.referenceDate};
}
export type PanelData = ReturnType<typeof presentSnapshot>;
