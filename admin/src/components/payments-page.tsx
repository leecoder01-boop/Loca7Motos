"use client";
import {PixCharge} from "./pix-charge";
import {WhatsAppCharge} from "./whatsapp-charge";
import { OperationBrief } from "./operation-brief";
import { useEffect,useRef,useState,useTransition } from 'react';
import { Search,Plus,Pencil,Eye,CheckCheck,Clock,TriangleAlert } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from './ui/dialog';
import { PageHeading,Status,DetailDialog,type Detail } from './page-parts';
import { usePanelData } from './panel-provider';
import { money,date } from '@/lib/panel-data';
import { paymentStatuses,paymentMethods,type Payment,type PaymentResult } from '@/lib/pagamentos';
import { savePayment } from '@/app/pagamentos/actions';

const notifyPanelDataChanged=()=>{
  window.dispatchEvent(new Event('loca7moto:panel-data-updated'));
  try{window.localStorage.setItem('loca7moto:panel-data-updated',String(Date.now()));}catch{/* A atualização da aba atual continua funcionando sem armazenamento local. */}
};

export type Editor={contractId?:string;record?:Payment;status?:Payment['status'];token:string};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function PaymentsPage({canAdmin=true}:{canAdmin?:boolean}){
  const panel=usePanelData();
  const {paymentRecords,payments,rentals,clientFor,motoFor,referenceDate,totalPending,totalReceivedMonth,latePayments,dueTodayPayments}=panel;
  const [query,setQuery]=useState('');const [status,setStatus]=useState('Todos');
  const [editor,setEditor]=useState<Editor|null>(null);const [detail,setDetail]=useState<Detail|null>(null);const [notice,setNotice]=useState('');
  const open=(record?:Payment,target?:Payment['status'])=>setEditor({record,status:target,token:crypto.randomUUID()});
  const rows=payments.filter(p=>{
    const rental=rentals.find(r=>r.id===p.rentalId)!;
    return (status==='Todos'||p.status===status)&&normalize(`${clientFor(rental).name} ${motoFor(rental).model} ${motoFor(rental).plate} ${rental.id} ${p.id}`).includes(normalize(query));
  });
  return <>
    <PageHeading title="Pagamentos" description="Registre recebimentos integrais e acompanhe os valores em aberto."><Button onClick={()=>open()} disabled={!rentals.length}><Plus size={16}/>Registrar pagamento</Button></PageHeading>
    {notice&&<p role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
    {!rentals.length&&<p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Cadastre uma locação antes de registrar um pagamento.</p>}
    <section aria-label="Resumo de pagamentos" className="module-summary mb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-0">{[['Recebido no mês',money(totalReceivedMonth)],['Valor pendente',money(totalPending)],['Pagamentos atrasados',String(latePayments.length)],['Vencendo hoje',String(dueTodayPayments.length)]].map(([label,value])=><div key={label} className="metric-card"><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="metric-value mt-3">{value}</p></div>)}</section>
    <OperationBrief kind="pagamentos"/>
    <Card className="module-table-panel gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Histórico de pagamentos</h2><span className="text-[10px] text-slate-500">Registro manual</span></div>
      <div className="flex flex-wrap gap-3 p-5"><div className="relative min-w-0 flex-1 basis-[220px]"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><Input aria-label="Buscar pagamentos" placeholder="Buscar por cliente, contrato, moto ou placa…" value={query} onChange={e=>setQuery(e.target.value)} className="h-10 pl-9 text-xs"/></div><select className="filter-select" aria-label="Filtrar por situação" value={status} onChange={e=>setStatus(e.target.value)}><option value="Todos">Todas as situações</option>{Object.values(paymentStatuses).map(s=><option key={s}>{s}</option>)}</select></div>
      <div className="table-scroll" role="region" aria-label="Histórico de pagamentos" tabIndex={0}><table><caption className="sr-only">Pagamentos vinculados a contratos</caption><thead><tr>{['Cliente / moto','Valor','Vencimento','Recebimento','Forma','Situação','Ações'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(p=>{
        const rental=rentals.find(r=>r.id===p.rentalId)!;const client=clientFor(rental);const moto=motoFor(rental);const record=paymentRecords.find(r=>r.id===p.id)!;
        return <tr key={p.id}><td><p className="font-semibold">{client.name}</p><p className="mt-1 text-[10px] text-slate-500">{moto.model} · {moto.plate}</p><p className="mt-1 text-[10px] text-slate-500">Contrato {rental.id.slice(0,8)}</p></td><td className="font-semibold tabular-nums">{money(p.amount)}</td><td>{date(p.due)}</td><td>{p.received?date(p.received):'Não recebido'}</td><td>{record.forma_pagamento?paymentMethods[record.forma_pagamento]:'Não informada'}</td><td><Status value={p.status}/></td><td><div className="flex items-center gap-1">{(p.status==='Pendente'||p.status==='Atrasado')&&<PixCharge paymentId={p.id}/ >}{(p.status==='Pendente'||p.status==='Atrasado')&&<WhatsAppCharge contractId={rental.id} paymentId={p.id}/>}{canAdmin&&<><Button variant="ghost" size="icon" aria-label={`Editar pagamento de ${client.name}`} onClick={()=>open(record)}><Pencil size={16}/></Button>{p.status!=='Pago'&&<Button variant="ghost" size="icon" aria-label={`Marcar como pago: ${client.name}`} onClick={()=>open(record,'pago')}><CheckCheck size={16}/></Button>}{p.status!=='Pendente'&&<Button variant="ghost" size="icon" aria-label={`Marcar como pendente: ${client.name}`} onClick={()=>open(record,'pendente')}><Clock size={16}/></Button>}{p.status!=='Atrasado'&&<Button variant="ghost" size="icon" aria-label={`Marcar como atrasado: ${client.name}`} onClick={()=>open(record,'atrasado')}><TriangleAlert size={16}/></Button>}</>}
          <Button variant="ghost" size="icon" aria-label={`Ver pagamento de ${client.name}`} onClick={()=>setDetail({title:'Detalhes do pagamento',subtitle:client.name,fields:[['Pagamento',p.id],['Contrato',rental.id],['Cliente',client.name],['Moto',moto.model],['Placa',moto.plate],['Valor integral',money(p.amount)],['Vencimento',date(p.due)],['Recebimento',p.received?date(p.received):'Não recebido'],['Forma',record.forma_pagamento?paymentMethods[record.forma_pagamento]:'Não informada'],['Situação',p.status],['Observações',record.observacoes||'—']]})}><Eye size={16}/></Button>
        </div></td></tr>;
      })}{!rows.length&&<tr><td colSpan={7} className="py-12! text-center text-slate-500">{paymentRecords.length?'Nenhum pagamento corresponde aos filtros.':'Nenhum pagamento registrado. Use “Registrar pagamento” para começar.'}</td></tr>}</tbody></table></div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500"><span role="status">{rows.length} de {payments.length} pagamentos</span><span>Referência: {date(referenceDate)}</span></div>
    </Card>
    {editor&&<PaymentEditor key={editor.token} editor={editor} close={()=>setEditor(null)} saved={message=>{setEditor(null);setNotice(message);}}/>}
    <DetailDialog detail={detail} onClose={()=>setDetail(null)}/>
  </>;
}
export function PaymentEditor({editor,close,saved}:{editor:Editor;close:()=>void;saved:(message:string)=>void}){
  const {rentals,clientFor,motoFor,referenceDate,daysUntil}=usePanelData();
  const record=editor.record;const [status,setStatus]=useState(editor.status??record?.status_registrado??record?.status??'pendente');
  const [contract,setContract]=useState(record?.contrato_id??editor.contractId??'');
  const [result,setResult]=useState<PaymentResult|null>(null);const [pending,start]=useTransition();const inFlight=useRef(false);
  useEffect(()=>{if(result&&!result.ok)document.getElementById('payment-error')?.focus();},[result]);
  const input=(name:string,label:string,type='text',value:string|number='',required=false)=><label className="grid gap-2 text-xs font-medium" htmlFor={`pay-${name}`}>{label}<Input id={`pay-${name}`} name={name} type={type} defaultValue={value} required={required} max={name==='data_pagamento'?referenceDate:undefined} inputMode={name==='valor'?'decimal':undefined} aria-invalid={!!result?.errors?.[name]} aria-describedby={result?.errors?.[name]?`pay-${name}-error`:undefined}/>{result?.errors?.[name]&&<span id={`pay-${name}-error`} className="text-rose-700">{result.errors[name]?.join(' ')}</span>}</label>;
  const selected=rentals.find(r=>r.id===contract);
  return <Dialog open onOpenChange={open=>{if(!open&&!pending)close();}}><DialogContent showCloseButton={!pending} className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editor.status?`Marcar como ${paymentStatuses[editor.status].toLowerCase()}`:record?'Editar pagamento':'Registrar pagamento'}</DialogTitle><DialogDescription>Controle manual da locadora. Este registro não cobra nem transfere dinheiro.</DialogDescription></DialogHeader>
    <form noValidate onSubmit={event=>{event.preventDefault();if(inFlight.current)return;const form=new FormData(event.currentTarget);inFlight.current=true;start(async()=>{try{const response=await savePayment(form);setResult(response);if(response.ok){notifyPanelDataChanged();saved(response.message);}}catch{setResult({ok:false,message:'Falha na conexão. Atualize a lista antes de tentar novamente.'});}finally{inFlight.current=false;}});}} className="space-y-5">
      <input type="hidden" name="id" value={record?.id??''}/><input type="hidden" name="version" value={record?.updated_at??''}/><input type="hidden" name="creation_id" value={editor.token}/>
      <fieldset disabled={pending} className="space-y-5 min-w-0">
      <label className="grid gap-2 text-xs font-medium" htmlFor="pay-contract">Contrato<select id="pay-contract" name="contrato_id" required value={contract} onChange={e=>setContract(e.target.value)} className="filter-select w-full min-w-0" aria-invalid={!!result?.errors?.contrato_id}><option value="">Selecione uma locação</option>{rentals.map(r=><option key={r.id} value={r.id}>{clientFor(r).name} · {motoFor(r).plate} · {r.id.slice(0,8)}{r.closed?' (encerrado)':''}</option>)}</select>{result?.errors?.contrato_id&&<span className="text-rose-700">{result.errors.contrato_id.join(' ')}</span>}</label>
      {selected&&<div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"><p>{clientFor(selected).name} · {motoFor(selected).model} · {motoFor(selected).plate}</p><p className="mt-1">Valor da locação: {money(selected.amount)}. O lançamento não altera o contrato nem a disponibilidade da moto.</p></div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{input('valor','Valor integral (R$)','text',record?record.valor.toFixed(2).replace('.',','):'',true)}{input('data_vencimento','Data de vencimento','date',record?.data_vencimento??referenceDate,true)}
        <label className="grid gap-2 text-xs font-medium" htmlFor="pay-status">Status<select id="pay-status" name="status" className="filter-select w-full" value={status} onChange={e=>setStatus(e.target.value as Payment['status'])}>{Object.entries(paymentStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="grid gap-2 text-xs font-medium" htmlFor="pay-method">Forma de pagamento<select id="pay-method" name="forma_pagamento" className="filter-select w-full" defaultValue={record?.forma_pagamento??''} aria-invalid={!!result?.errors?.forma_pagamento}><option value="">Não informada</option>{Object.entries(paymentMethods).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>{result?.errors?.forma_pagamento&&<span className="text-rose-700">{result.errors.forma_pagamento.join(' ')}</span>}</label>
        {status==='pago'?input('data_pagamento','Data do recebimento integral','date',record?.data_pagamento??referenceDate,true):<input type="hidden" name="data_pagamento" value=""/>}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">{status==='pago'?'Ao salvar, todo o valor deste lançamento será registrado como recebido. Não há pagamento parcial nesta etapa.':status==='cancelado'?'O cancelamento preserva o histórico, mas remove este lançamento dos totais e alertas. Não realiza estorno.':'Pagamentos pendentes com vencimento passado aparecem automaticamente como atrasados. Também é possível registrar atraso manualmente.'}</p>
      {record?.status==='pago'&&status!=='pago'&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Esta alteração retirará o valor dos recebidos e limpará a data de pagamento. Não devolve dinheiro ao cliente.</p>}
      {record&&status==='pendente'&&daysUntil(record.data_vencimento)<0&&<p className="text-xs text-amber-900">Com a data atual de vencimento, a listagem continuará mostrando “Atrasado”.</p>}
      <label htmlFor="pay-notes" className="grid gap-2 text-xs font-medium">Observações<textarea id="pay-notes" name="observacoes" defaultValue={record?.observacoes??''} maxLength={5000} rows={3} className="w-full rounded-md border border-input p-3 text-sm"/>{result?.errors?.observacoes&&<span className="text-rose-700">{result.errors.observacoes.join(' ')}</span>}</label>
      </fieldset>
      {result&&!result.ok&&<p id="payment-error" tabIndex={-1} role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{result.message}</p>}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white pt-4"><Button type="button" variant="outline" disabled={pending} onClick={close}>Voltar</Button><Button type="submit" disabled={pending}>{pending?'Salvando…':'Salvar pagamento'}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
