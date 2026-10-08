"use client";
import {WhatsAppCharge} from "./whatsapp-charge";

import Link from "next/link";
import {alertTiming} from "@/lib/alertas";
import { useState } from "react";
import { Bike, FileClock, FileWarning, Wallet, CheckCheck, ArrowUpRight, ArrowRight, CalendarDays, CircleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeading, Status, DetailDialog, type Detail } from "./page-parts";
import { date, money, initials } from "@/lib/panel-data";
import { usePanelData } from "./panel-provider";

export function Dashboard() {
  const {motorcycles,rentals,activeAlerts:alerts,clientRecords,motoRecords,pendingPayments,receivedThisMonth,latePayments,dueTodayPayments,totalPending,totalReceivedMonth,clientFor,motoFor,daysUntil,referenceDate} = usePanelData();
  const occupancy = motorcycles.length ? Math.round(motorcycles.filter(item => item.status === "Alugada").length/motorcycles.length*100) : 0;
  const [detail,setDetail] = useState<Detail|null>(null);
  const available = motorcycles.filter(item => item.status === "Disponível").length;
  const rented = motorcycles.filter(item => item.status === "Alugada").length;
  const today = rentals.filter(item => !item.closed && daysUntil(item.end) === 0).length;
  const late = rentals.filter(item => !item.closed && daysUntil(item.end) < 0).length;
  const metrics = [
    {label:"Motos disponíveis",value:String(available).padStart(2,"0"),note:"Prontas para a próxima rota",icon:Bike,href:"/motos/",color:"text-emerald-700 bg-emerald-50"},
    {label:"Motos alugadas",value:String(rented).padStart(2,"0"),note:`${occupancy}% de ocupação da frota`,icon:Bike,href:"/motos/",color:"text-blue-700 bg-blue-50"},
    {label:"Contratos vencendo hoje",value:String(today).padStart(2,"0"),note:"Confira a devolução prevista",icon:FileClock,href:"/contratos/",color:"text-amber-700 bg-amber-50"},
    {label:"Contratos atrasados",value:String(late).padStart(2,"0"),note:"Precisam da sua atenção",icon:FileWarning,href:"/alertas/",color:"text-rose-700 bg-rose-50"},
    {label:"Pagamentos pendentes",value:money(totalPending),note:`${pendingPayments.length} pagamentos · inclui atrasados`,icon:Wallet,href:"/pagamentos/",color:"text-amber-700 bg-amber-50"},
    {label:"Recebido no mês",value:money(totalReceivedMonth),note:`${receivedThisMonth.length} pagamentos · mês ${referenceDate.slice(5,7)}/${referenceDate.slice(0,4)}`,icon:CheckCheck,href:"/pagamentos/",color:"text-emerald-700 bg-emerald-50"},
    {label:"Pagamentos atrasados",value:String(latePayments.length).padStart(2,"0"),note:"Cobranças em aberto",icon:FileWarning,href:"/pagamentos/",color:"text-rose-700 bg-rose-50"},
    {label:"Pagamentos vencendo hoje",value:String(dueTodayPayments.length).padStart(2,"0"),note:"Confira os recebimentos do dia",icon:FileClock,href:"/pagamentos/",color:"text-amber-700 bg-amber-50"},
  ];
  return <>
    <section className="operation-welcome"><div><p className="eyebrow">LOCA7MOTO / VISÃO GERAL</p><h1>Sua operação,<br/>em movimento<span>.</span></h1><p>Frota, devoluções e recebimentos. Tudo no mesmo trajeto.</p><Link href="/vendas/" className="welcome-link">Acompanhar vendas <ArrowUpRight size={16}/></Link></div><div className="welcome-route" aria-hidden="true"><Bike size={54} strokeWidth={1.1}/><span>07</span></div><span className="welcome-date"><CalendarDays size={14}/>{date(referenceDate)}</span></section>
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200/70 bg-[#fffbf2] px-4 py-3.5"><CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-700"/><p className="text-xs leading-relaxed text-amber-900"><strong>{alerts.length} alertas ativos</strong> · <strong>{alerts.filter(a=>a.priority==="urgente").length} urgentes</strong> · <strong>{alerts.filter(a=>a.days===0).length} vencem hoje.</strong> Confira a próxima ação da operação.</p><Link href="/alertas/" className="ml-auto shrink-0 self-center text-xs font-bold text-amber-900"><span className="hidden sm:inline">Ver alertas </span><ArrowRight size={16} className="inline"/></Link></div>
    <section aria-label="Indicadores da operação" className="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map(({label,value,note,icon:Icon,href,color}) => <Link key={label} href={href} className="metric-card"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-slate-500">{label}</span><span className={`rounded-lg p-2 ${color}`}><Icon size={18} strokeWidth={1.7}/></span></div><p className={`metric-value mt-3 ${value.length > 6 ? "text-[25px]! sm:text-[29px]!" : ""}`}>{value}</p><div className="mt-3 flex items-center justify-between gap-2"><p className="text-[10px] text-slate-500 leading-relaxed">{note}</p><ArrowUpRight size={14} className="shrink-0 text-slate-400"/></div></Link>)}
    </section>
    <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
      <Card className="gap-0 overflow-hidden py-0 shadow-none"><div className="flex items-center justify-between gap-2 p-5"><div><h2 className="text-sm font-semibold">Atenção aos vencimentos</h2><p className="mt-1 text-[11px] text-slate-500">Contratos, pagamentos, CNH e manutenção · alertas ativos</p></div><Link href="/alertas/" className="text-[11px] font-semibold text-[#1565c0]">Ver todos <ArrowUpRight size={13} className="inline"/></Link></div>
        <div className="table-scroll"><table><caption className="sr-only">Alertas ativos da operação</caption><thead><tr><th scope="col">Cliente / moto</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col"><span className="sr-only">Detalhes</span></th></tr></thead><tbody>{alerts.slice(0,5).map(alert => {
          const client=clientRecords.find(c=>c.id===alert.clientId);const moto=motoRecords.find(m=>m.id===alert.motoId);
          const tone=alert.priority==='urgente'?'red':alert.priority==='atencao'?'amber':'green';
          const fields:[string,string][]=[['Tipo',alert.title],['Cliente',client?.nome??'Não se aplica'],['Moto',moto?`${moto.marca} ${moto.modelo}`:'Não se aplica'],['Placa',moto?.placa??'Não se aplica'],['Contrato',alert.contractId??'Não vinculado'],['Vencimento',alert.due?date(alert.due):'Não se aplica'],['Prazo',alertTiming(alert)],['Ação recomendada',alert.recommendation]];
          return <tr key={alert.id}><td><div className="flex items-center gap-3"><span className="avatar">{client?initials(client.nome):'MT'}</span><div><p className="font-semibold">{client?.nome??(moto?`${moto.marca} ${moto.modelo}`:'Operação')}</p><p className="mt-1 text-[10px] text-slate-500">{alert.title}</p></div></div></td><td><p>{alert.due?date(alert.due):'Sem prazo'}</p><p className="mt-1 text-[10px] text-slate-500">{alertTiming(alert)}</p></td><td><span className={`status status-${tone}`}>{alert.priority==='urgente'?'Urgente':alert.priority==='atencao'?'Atenção':'Informativo'}</span></td><td><div className="flex items-center gap-1">{alert.contractId&&(alert.group==='pagamentos'||alert.group==='contratos')&&<WhatsAppCharge contractId={alert.contractId} paymentId={alert.paymentId}/>}<Button variant="ghost" size="icon" aria-label={`Ver alerta: ${alert.title}`} onClick={()=>setDetail({title:alert.title,subtitle:client?.nome??moto?.placa??'Operação',fields})}><ArrowUpRight size={16}/></Button></div></td></tr>;
        })}{alerts.length === 0 && <tr><td colSpan={4} className="text-center text-slate-500">Nenhum alerta ativo exige atenção.</td></tr>}</tbody></table></div><div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">Exibindo {Math.min(5,alerts.length)} de {alerts.length} alertas</div>
      </Card>
      <div className="space-y-6 min-w-0"><Card className="gap-0 p-5 shadow-none"><div className="flex justify-between"><div><h2 className="text-sm font-semibold">Sua frota, agora</h2><p className="mt-1 text-[11px] text-slate-500">{motorcycles.length} motos cadastradas</p></div><Bike size={20} className="text-slate-400"/></div><div className="mt-6 flex items-baseline gap-2"><span className="display text-4xl font-semibold tracking-[-.05em]">{occupancy}%</span><span className="text-xs text-slate-500">de ocupação</span></div><div className="mt-4 flex h-3 overflow-hidden rounded-full" aria-hidden="true"><div className="bg-[#1565c0]" style={{width:`${(motorcycles.length ? rented/motorcycles.length*100 : 0)}%`}}/><div className="bg-emerald-500" style={{width:`${(motorcycles.length ? available/motorcycles.length*100 : 0)}%`}}/><div className="flex-1 bg-slate-300"/></div><div className="mt-5 space-y-3">{[["Alugadas",rented,"bg-[#1565c0]"],["Disponíveis",available,"bg-emerald-500"],["Manutenção / indisponíveis",motorcycles.length-rented-available,"bg-slate-300"]].map(([label,count,color]) => <div key={label} className="flex items-center gap-2 text-xs"><span className={`size-2 rounded-sm ${color}`}/><span className="text-slate-500">{label}</span><span className="ml-auto font-bold">{count}</span></div>)}</div><Link href="/motos/" className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] font-semibold text-[#1565c0]">Explorar a frota <ArrowRight size={14}/></Link></Card>
        <div className="rounded-xl bg-[#0e1520] p-5 text-white"><span className="eyebrow text-[#42a5f5]">RECEBIMENTOS</span><h2 className="mt-2 text-base font-semibold">Da locação ao caixa.</h2><p className="mt-2 text-xs leading-relaxed text-slate-400">Veja o ritmo dos recebimentos e acompanhe o faturamento da Loca7Moto.</p><Link href="/vendas/" className="mt-5 flex items-center justify-between text-xs font-semibold">Abrir Vendas <ArrowUpRight size={16}/></Link></div>
      </div>
    </div>
    <DetailDialog detail={detail} onClose={() => setDetail(null)}/>
  </>;
}
