import type { Snapshot } from './panel-data';

export const alertGroups={contratos:'Contratos',pagamentos:'Pagamentos',clientes:'Clientes',motos:'Motos'} as const;
export type AlertGroup=keyof typeof alertGroups;
export type AlertPriority='informativo'|'atencao'|'urgente';
export type OperationAlert={
  id:string;version:string;group:AlertGroup;title:string;priority:AlertPriority;
  clientId?:string;motoId?:string;contractId?:string;paymentId?:string;
  due:string|null;days:number|null;recommendation:string;resolved:boolean;
};
export const priorityLabels={informativo:'Informativo',atencao:'Atenção',urgente:'Urgente'} as const;
export function buildOperationAlerts(snapshot:Snapshot):OperationAlert[]{
  const days=(value:string)=>Math.round((Date.parse(`${value}T12:00:00Z`)-Date.parse(`${snapshot.referenceDate}T12:00:00Z`))/86400000);
  const result:OperationAlert[]=[];
  const add=(alert:Omit<OperationAlert,'resolved'>)=>{
    const resolved=(snapshot.resolucoes??[]).some(r=>r.alerta_id===alert.id&&r.versao===alert.version&&r.data_referencia===snapshot.referenceDate);
    result.push({...alert,resolved});
  };
  for(const contract of snapshot.contratos){
    const d=days(contract.data_vencimento);
    if(['finalizado','cancelado'].includes(contract.status)||d>3)continue;
    const phase=d<0?'atrasado':d===0?'hoje':'proximo';
    add({id:`contrato-${contract.id}`,version:JSON.stringify([contract.updated_at??contract.created_at,contract.data_vencimento,phase]),group:'contratos',title:d<0?'Contrato atrasado':d===0?'Contrato vencendo hoje':'Contrato vencendo em até 3 dias',priority:d<0?'urgente':'atencao',clientId:contract.cliente_id,motoId:contract.moto_id,contractId:contract.id,due:contract.data_vencimento,days:d,recommendation:d<0?'Confira a devolução e trate o atraso com o cliente.':d===0?'Confirme a devolução prevista para hoje.':'Combine a devolução ou revise o período da locação.'});
  }
  for(const payment of snapshot.pagamentos){
    const d=days(payment.data_vencimento);
    const late=payment.status==='atrasado'||d<0;
    if(['pago','cancelado'].includes(payment.status)||(!late&&d!==0))continue;
    const contract=snapshot.contratos.find(c=>c.id===payment.contrato_id);
    if(!contract)continue;
    add({id:`pagamento-${payment.id}`,version:JSON.stringify([payment.updated_at??payment.created_at,payment.data_vencimento,late?'atrasado':'hoje',payment.status_registrado??payment.status]),group:'pagamentos',title:late?'Pagamento atrasado':'Pagamento vencendo hoje',priority:late?'urgente':'atencao',clientId:contract.cliente_id,motoId:contract.moto_id,contractId:contract.id,paymentId:payment.id,due:payment.data_vencimento,days:d,recommendation:late?'Confira o recebimento e registre o pagamento quando confirmado.':'Confira se o valor foi recebido e registre a quitação integral.'});
  }
  for(const client of snapshot.clientes){
    if(!client.validade_cnh)continue;
    const d=days(client.validade_cnh);
    if(d>30)continue;
    add({id:`cliente-${client.id}`,version:JSON.stringify([client.updated_at??client.created_at,client.validade_cnh,d<0?'vencida':d===0?'hoje':'proxima']),group:'clientes',title:d<0?'CNH vencida':d===0?'CNH vencendo hoje':'CNH próxima do vencimento',priority:d<0?'urgente':'atencao',clientId:client.id,due:client.validade_cnh,days:d,recommendation:'Confira a validade com o cliente e atualize o cadastro após a renovação. Nenhum bloqueio é aplicado automaticamente.'});
  }
  for(const moto of snapshot.motos){
    if(moto.status!=='manutencao')continue;
    add({id:`moto-${moto.id}`,version:JSON.stringify([moto.updated_at??moto.created_at,moto.status]),group:'motos',title:'Moto em manutenção',priority:'informativo',motoId:moto.id,due:null,days:null,recommendation:'Acompanhe o serviço e atualize a disponibilidade apenas quando a moto estiver pronta.'});
  }
  const rank={urgente:0,atencao:1,informativo:2};
  return [...new Map(result.map(a=>[a.id,a])).values()].sort((a,b)=>rank[a.priority]-rank[b.priority]||(a.due??'9999').localeCompare(b.due??'9999')||a.id.localeCompare(b.id));
}
export function alertTiming(alert:OperationAlert):string{
  if(alert.days===null)return 'Sem prazo cadastrado';
  if(alert.days<0)return `${Math.abs(alert.days)} dia(s) em atraso`;
  if(alert.days===0)return 'Vence hoje';
  return alert.title==='Pagamento atrasado'?`Atraso registrado manualmente · vencimento em ${alert.days} dia(s)`:`Faltam ${alert.days} dia(s)`;
}
