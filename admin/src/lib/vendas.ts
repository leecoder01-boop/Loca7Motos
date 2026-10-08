import type { Payment } from './pagamentos';
import { sumMoney,paymentMethods } from './pagamentos';

export function addDays(day:string,offset:number){
  const value=new Date(`${day}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);
}
// Recebimentos manuais integrais; nunca usa o valor contratado como receita.
export function salesSummary(payments:Payment[],today:string,days:7|30){
  const paid=payments.filter(p=>p.status==='pago'&&p.data_pagamento&&p.data_pagamento<=today);
  const start=addDays(today,1-days),previousStart=addDays(start,-days);
  const current=paid.filter(p=>p.data_pagamento!>=start);
  const previous=paid.filter(p=>p.data_pagamento!>=previousStart&&p.data_pagamento!<start);
  const total=sumMoney(current.map(p=>p.valor)),previousTotal=sumMoney(previous.map(p=>p.valor));
  const receivedToday=sumMoney(paid.filter(p=>p.data_pagamento===today).map(p=>p.valor));
  const yesterday=sumMoney(paid.filter(p=>p.data_pagamento===addDays(today,-1)).map(p=>p.valor));
  const daily=Array.from({length:days},(_,i)=>{
    const day=addDays(start,i),previousDay=addDays(previousStart,i);
    return {day,previousDay,amount:sumMoney(current.filter(p=>p.data_pagamento===day).map(p=>p.valor)),previous:sumMoney(previous.filter(p=>p.data_pagamento===previousDay).map(p=>p.valor))};
  });
  const methods:{key:string;label:string;amount:number}[]=Object.entries(paymentMethods).map(([key,label])=>({key,label,amount:sumMoney(current.filter(p=>p.forma_pagamento===key).map(p=>p.valor))}));
  const unknown=sumMoney(current.filter(p=>!p.forma_pagamento).map(p=>p.valor));
  if(unknown)methods.push({key:'nao_informada',label:'Não informada',amount:unknown});
  return {start,end:today,previousStart,previousEnd:addDays(start,-1),current:current.sort((a,b)=>b.data_pagamento!.localeCompare(a.data_pagamento!)||a.id.localeCompare(b.id)),daily,methods,total,previousTotal,receivedToday,yesterday,count:current.length,average:current.length?Math.round(total*100/current.length)/100:0,change:previousTotal>0?(total-previousTotal)/previousTotal*100:null};
}
