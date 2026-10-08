"use client";
import {WhatsAppCharge} from "./whatsapp-charge";
import { OperationBrief } from "./operation-brief";
import { useRef,useState,useTransition,type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus,Search,Eye,Pencil,CheckCircle,XCircle,FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from './ui/dialog';
import { PageHeading,Status } from './page-parts';
import { usePanelData } from './panel-provider';
import { date,money } from '@/lib/panel-data';
import { periodicidades,contratoStatuses,isClosed,type Contrato,type ContratoResult } from '@/lib/contratos';
import { saveContrato,encerrarContrato } from '@/app/contratos/actions';
const control='h-10 w-full rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring aria-invalid:border-destructive';
const currency=(v:number)=>v.toFixed(2).replace('.',',');
type Kind='new'|'edit'|'detail'|'finalizado'|'cancelado';

function ContractForm({contract,kind,onCancel,onSaved,onBusy}:{contract:Contrato|null;kind:Kind;onCancel:()=>void;onSaved:(v:string)=>void;onBusy:(v:boolean)=>void}){
  const {clientRecords:clients,motoRecords:motos,referenceDate}=usePanelData();
  const [selectedMoto,setSelectedMoto]=useState(contract?.moto_id??'');
  const [period,setPeriod]=useState(contract?.periodicidade??'semanal');
  const [value,setValue]=useState(contract?currency(contract.valor):'');
  const [result,setResult]=useState<ContratoResult|null>(null);
  const [pending,startTransition]=useTransition();
  const inFlight=useRef(false);const summary=useRef<HTMLDivElement>(null);
  const closing=kind==='finalizado'||kind==='cancelado';
  const available=motos.filter(m=>!m.deleted_at&&(m.status==='disponivel'||m.id===contract?.moto_id));
  const eligibleClients=clients.filter(c=>!c.deleted_at||c.id===contract?.cliente_id);
  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(inFlight.current)return;inFlight.current=true;onBusy(true);
    const form=new FormData(event.currentTarget);
    startTransition(async()=>{
      try{const response=await (closing?encerrarContrato(form):saveContrato(form));if(response.ok)onSaved(response.message);else {setResult(response);requestAnimationFrame(()=>summary.current?.focus());}}
      catch{setResult({ok:false,message:'Não foi possível salvar. Recarregue a página e tente novamente.'});requestAnimationFrame(()=>summary.current?.focus());}
      finally{inFlight.current=false;onBusy(false);}
    });
  }
  function field(name:string,label:string,content:React.ReactNode){const error=result?.errors?.[name]?.[0];return <div><label htmlFor={`contrato-${name}`} className="mb-1.5 block text-xs font-medium text-slate-700">{label}</label>{content}{error&&<p id={`contrato-${name}-error`} className="mt-1 text-xs text-rose-700">{error}</p>}</div>;}
  const attrs=(name:string)=>({id:`contrato-${name}`,name,'aria-invalid':!!result?.errors?.[name],'aria-describedby':result?.errors?.[name]?`contrato-${name}-error`:undefined});
  return <form onSubmit={submit} className="space-y-5">
    {contract&&<><input type="hidden" name="id" value={contract.id}/><input type="hidden" name="version" value={contract.updated_at??''}/></>}
    {result&&<div ref={summary} tabIndex={-1} role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{result.message}</div>}
    {closing?<><input type="hidden" name="status" value={kind}/><input type="hidden" name="confirm" value={kind}/><p className="text-sm leading-relaxed text-slate-600">{kind==='cancelado'?'Cancelar':'Finalizar'} a locação de <strong>{clients.find(c=>c.id===contract?.cliente_id)?.nome}</strong>, moto <strong>{motos.find(m=>m.id===contract?.moto_id)?.placa}</strong>? A moto ficará disponível novamente. O contrato permanecerá no histórico e não poderá ser reaberto. Nenhum pagamento será criado ou alterado.</p></>:
      <><p className="text-xs leading-relaxed text-slate-500">Campos com * são obrigatórios. Somente motos disponíveis podem iniciar uma locação. O valor é o valor acordado da locação, sem cálculo automático por quantidade de períodos.</p>
      {(!clients.length||!available.length)&&<p role="status" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{!clients.length?'Cadastre um cliente antes de criar a locação.':'Não há motos disponíveis. Cadastre uma moto ou encerre sua locação atual.'}</p>}
      <fieldset disabled={pending} className="grid grid-cols-1 gap-4 sm:grid-cols-2 disabled:opacity-70">
        {field('cliente_id','Cliente *',<select {...attrs('cliente_id')} defaultValue={contract?.cliente_id??''} required className={control}><option value="">Selecione um cliente</option>{eligibleClients.map(c=><option key={c.id} value={c.id}>{c.nome} · CPF {c.cpf}{c.deleted_at?' · arquivado':''}</option>)}</select>)}
        {field('moto_id','Moto *',<select {...attrs('moto_id')} required value={selectedMoto} onChange={e=>{setSelectedMoto(e.target.value);const moto=motos.find(m=>m.id===e.target.value);if(moto){setValue(currency(moto.valor_locacao));setPeriod(moto.tipo_valor==='mensalidade'?'mensal':moto.tipo_valor);}}} className={control}><option value="">Selecione uma moto disponível</option>{available.map(m=><option key={m.id} value={m.id}>{m.marca} {m.modelo} · {m.placa}{m.id===contract?.moto_id?' (moto deste contrato)':''}</option>)}</select>)}
        {field('data_inicio','Data de início *',<Input {...attrs('data_inicio')} type="date" required defaultValue={contract?.data_inicio??referenceDate} className={control}/>)}
        {field('data_vencimento','Data de vencimento *',<Input {...attrs('data_vencimento')} type="date" required defaultValue={contract?.data_vencimento??''} className={control}/>)}
        {field('periodicidade','Periodicidade *',<select {...attrs('periodicidade')} value={period} onChange={e=>setPeriod(e.target.value as typeof period)} className={control}>{Object.entries(periodicidades).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>)}
        {field('valor','Valor da locação (R$) *',<Input {...attrs('valor')} inputMode="decimal" required maxLength={30} placeholder="350,00" value={value} onChange={e=>setValue(e.target.value)} className={control}/>)}
        {field('caucao','Caução (R$), opcional',<Input {...attrs('caucao')} inputMode="decimal" maxLength={30} defaultValue={contract?currency(contract.caucao):''} placeholder="0,00" className={control}/>)}
        <div className="sm:col-span-2">{field('observacoes','Observações, opcional',<textarea {...attrs('observacoes')} rows={3} maxLength={5000} defaultValue={contract?.observacoes??''} className={`${control} h-auto min-h-24 py-2`}/>)}</div>
      </fieldset></>}
    <div className="sticky -bottom-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white py-4"><Button type="button" autoFocus={closing} variant="outline" disabled={pending} onClick={onCancel}>Voltar</Button><Button type="submit" variant={kind==='cancelado'?'destructive':'default'} disabled={pending||(!closing&&(!clients.length||!available.length))}>{pending?'Salvando…':closing?kind==='cancelado'?'Cancelar locação':'Finalizar locação':contract?'Salvar alterações':'Criar locação'}</Button></div>
  </form>;
}

export function ContratosPage({canAdmin=true}:{canAdmin?:boolean}){
  const {contractRecords:contracts,clientRecords:clients,motoRecords:motos}=usePanelData();
  const router=useRouter();const [query,setQuery]=useState('');const [status,setStatus]=useState('todos');
  const [modal,setModal]=useState<{kind:Kind;contract:Contrato|null}|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const newButton=useRef<HTMLButtonElement>(null);const origin=useRef<HTMLButtonElement|null>(null);
  const client=(c:Contrato)=>clients.find(v=>v.id===c.cliente_id)!;const moto=(c:Contrato)=>motos.find(v=>v.id===c.moto_id)!;
  const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const rows=contracts.filter(c=>(status==='todos'||c.status===status)&&normalize(`${client(c).nome} ${moto(c).modelo} ${moto(c).placa}`).includes(normalize(query.trim())));
  function open(kind:Kind,contract:Contrato|null,button:HTMLButtonElement){origin.current=button;setMessage('');setModal({kind,contract});}
  const done=(v:string)=>{setMessage(v);setModal(null);router.refresh();};const detail=modal?.contract;
  return <>
    <PageHeading title="Contratos / Locações" description="Clientes, motos e vencimentos conectados à operação.">{canAdmin&&<Link href="/contratos/modelo/" className="text-sm font-medium text-blue-700">Editar modelo de contrato</Link>}<Button ref={newButton} onClick={e=>open('new',null,e.currentTarget)}><Plus size={16}/>Nova locação</Button></PageHeading>
    {message&&<p role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <section aria-label="Resumo das locações" className="module-summary mb-6 grid grid-cols-1 gap-0 sm:grid-cols-3">{[['Em aberto',contracts.filter(c=>!isClosed(c.status)).length],['Vencendo hoje',contracts.filter(c=>c.status==='vencendo_hoje').length],['Atrasados',contracts.filter(c=>c.status==='atrasado').length]].map(([label,value])=><div className="metric-card" key={label}><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="metric-value mt-3">{value}</p></div>)}</section>
    <OperationBrief kind="contratos"/>
    <Card className="module-table-panel gap-0 overflow-hidden py-0 shadow-none"><div className="flex justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Locações cadastradas</h2><span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Dados cadastrados</span></div>
      <div className="flex flex-wrap items-center gap-3 p-5"><div className="relative w-full sm:min-w-[220px] sm:flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><Input aria-label="Buscar por cliente, modelo ou placa" placeholder="Buscar por cliente, modelo ou placa…" value={query} onChange={e=>setQuery(e.target.value)} className="h-10 bg-white pl-9 text-xs shadow-none"/></div><select aria-label="Filtrar contratos por status" className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}><option value="todos">Todos os status</option>{Object.entries(contratoStatuses).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></div>
      {rows.length?<div className="table-scroll" role="region" aria-label="Lista de contratos" tabIndex={0}><table><caption className="sr-only">Contratos cadastrados: {rows.length} resultados</caption><thead><tr>{['Cliente','Moto','Placa','Início','Vencimento','Valor','Status','Ações'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(c=><tr key={c.id}><td className="font-semibold">{client(c).nome}</td><td>{moto(c).marca} {moto(c).modelo}</td><td className="font-mono">{moto(c).placa}</td><td>{date(c.data_inicio)}</td><td>{date(c.data_vencimento)}</td><td className="tabular-nums">{money(c.valor)}<p className="mt-1 text-[10px] text-slate-500">{periodicidades[c.periodicidade]}</p></td><td><Status value={contratoStatuses[c.status]}/></td><td><div className="flex items-center gap-1">{['vencendo','vencendo_hoje','atrasado'].includes(c.status)&&<WhatsAppCharge contractId={c.id}/>}<Button variant="ghost" size="icon" aria-label={`Ver detalhes: ${client(c).nome}, ${moto(c).placa}`} onClick={e=>open('detail',c,e.currentTarget)}><Eye size={16}/></Button>{canAdmin&&<Link href={`/contratos/${c.id}/documento/`} className="whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-2" aria-label={`Gerar contrato: ${client(c).nome}, ${moto(c).placa}`}>Gerar contrato</Link>}{!isClosed(c.status)&&<Button variant="ghost" size="icon" aria-label={`Editar contrato: ${client(c).nome}, ${moto(c).placa}`} onClick={e=>open('edit',c,e.currentTarget)}><Pencil size={16}/></Button>}{canAdmin&&!isClosed(c.status)&&([{kind:'finalizado',label:'Finalizar locação',icon:CheckCircle},{kind:'cancelado',label:'Cancelar locação',icon:XCircle}] as const).map(({kind,label,icon:Icon})=><Button key={kind} variant="ghost" size="icon" aria-label={`${label}: ${client(c).nome}, ${moto(c).placa}`} className={kind==='cancelado'?'text-rose-700':''} onClick={e=>open(kind,c,e.currentTarget)}><Icon size={16}/></Button>)}</div></td></tr>)}</tbody></table></div>:<div className="border-t border-slate-100 px-5 py-16 text-center"><FileText size={26} className="mx-auto mb-4 text-slate-300"/><h3 className="text-sm font-semibold">{contracts.length?'Nenhum contrato encontrado':'Nenhuma locação cadastrada'}</h3><p className="mt-2 text-xs text-slate-500">{contracts.length?'Tente outro termo ou remova o filtro.':'Selecione um cliente e uma moto disponível para começar.'}</p>{contracts.length>0&&<Button variant="outline" className="mt-5" onClick={()=>{setQuery('');setStatus('todos');}}>Limpar filtros</Button>}{!contracts.length&&<Button variant="outline" className="mt-5" onClick={e=>open('new',null,e.currentTarget)}>Nova locação</Button>}</div>}
      <p role="status" className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">{rows.length} de {contracts.length} contratos · Vencendo: até 3 dias antes da data</p>
    </Card>
    <Dialog open={!!modal} onOpenChange={v=>{if(!v&&!busy)setModal(null);}}><DialogContent showCloseButton={!busy} onEscapeKeyDown={e=>{if(busy)e.preventDefault();}} onInteractOutside={e=>e.preventDefault()} onCloseAutoFocus={e=>{e.preventDefault();(origin.current?.isConnected?origin.current:newButton.current)?.focus();}} className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{modal?.kind==='new'?'Nova locação':modal?.kind==='edit'?'Editar contrato':modal?.kind==='detail'?'Detalhes do contrato':modal?.kind==='cancelado'?'Cancelar locação':'Finalizar locação'}</DialogTitle><DialogDescription>{modal?.kind==='detail'?'Dados da locação cadastrada.':modal?.kind==='new'||modal?.kind==='edit'?'Preencha o cliente, a moto e as condições da locação.':'Confirme o encerramento e a liberação da moto.'}</DialogDescription></DialogHeader>
      {modal?.kind==='detail'&&detail?<dl className="divide-y divide-slate-100">{[['Cliente',client(detail).nome],['Moto',`${moto(detail).marca} ${moto(detail).modelo}`],['Placa',moto(detail).placa],['Início',date(detail.data_inicio)],['Vencimento',date(detail.data_vencimento)],['Valor',money(detail.valor)],['Periodicidade',periodicidades[detail.periodicidade]],['Caução',money(detail.caucao)],['Status',contratoStatuses[detail.status]],['Observações',detail.observacoes||'Nenhuma'],['Cadastrado em',date(detail.created_at)]].map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="max-w-full break-words whitespace-pre-wrap font-medium">{value}</dd></div>)}</dl>:modal&&<ContractForm key={`${modal.kind}-${detail?.id??'new'}`} contract={detail??null} kind={modal.kind} onCancel={()=>setModal(null)} onSaved={done} onBusy={setBusy}/>}
    </DialogContent></Dialog>
  </>;
}
