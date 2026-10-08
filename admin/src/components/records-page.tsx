"use client";
import { OperationBrief } from "./operation-brief";

import { useState } from "react";
import { Search, ArrowUpRight, SlidersHorizontal, Bike, Bell, FileText, Users, Wallet, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageHeading, Status, DetailDialog, type Detail } from "./page-parts";
import { date, money, initials, type PanelData } from "@/lib/panel-data";
import { usePanelData } from "./panel-provider";

type Kind = "clientes" | "motos" | "contratos" | "pagamentos" | "alertas";
type Row = { rentalId?:string; due?:string; id:string; status:string; search:string; sort:string; cells:React.ReactNode[]; detail:Detail };
const normalize = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const person = (name:string,subtitle:string) => <div className="flex items-center gap-3"><span className="avatar">{initials(name)}</span><div><p className="font-semibold">{name}</p><p className="mt-1 text-[10px] text-slate-500">{subtitle}</p></div></div>;
const rentalDetail = (rental:PanelData["rentals"][number], {clientFor,motoFor,rentalStatus}:PanelData):Detail => ({title:rental.id,subtitle:clientFor(rental).name,fields:[["Cliente",clientFor(rental).name],["Contato",clientFor(rental).phone],["Moto",motoFor(rental).model],["Placa",motoFor(rental).plate],["Início",date(rental.start)],["Vencimento",date(rental.end)],["Valor contratado",money(rental.amount)],["Situação",rentalStatus(rental)]]});

function buildRows(kind:Kind,data:PanelData):Row[] {
  const {clients,motorcycles,rentals,payments,alerts,clientFor,motoFor,rentalFor,rentalStatus} = data;
  if(kind === "clientes") return clients.map(client => {
    const active = rentals.filter(rental => rental.clientId === client.id && !rental.closed).length;
    return {id:client.id,status:client.status,search:`${client.name} ${client.cpf} ${client.phone} ${client.id}`,sort:client.name,cells:[person(client.name,client.id),<div key="contato"><p>{client.phone}</p><p className="mt-1 text-[10px] text-slate-500">CPF: {client.cpf}</p></div>,date(client.since),`${active} ${active === 1 ? "locação" : "locações"}`,<Status key="status" value={client.status}/>],detail:{title:client.name,subtitle:client.id,fields:[["CPF",client.cpf],["CNH",client.cnh],["Endereço",client.address],["Telefone",client.phone],["Cliente desde",date(client.since)],["Locações ativas",String(active)],["Situação",client.status]]}};
  });
  if(kind === "motos") return motorcycles.map(moto => ({id:moto.id,status:moto.status,search:`${moto.model} ${moto.plate} ${moto.brand} ${moto.id}`,sort:moto.model,cells:[<div key="moto" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-500"><Bike size={20}/></span><div><p className="font-semibold">{moto.model}</p><p className="mt-1 text-[10px] text-slate-500">{moto.id} · {moto.year}</p></div></div>,<span key="placa" className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px]">{moto.plate}</span>,moto.brand,money(moto.daily),<Status key="status" value={moto.status}/>],detail:{title:moto.model,subtitle:moto.id,fields:[["Placa",moto.plate],["Marca",moto.brand],["Quilometragem",`${moto.mileage} km`],["Ano",String(moto.year)],["Valor de locação",money(moto.daily)],["Situação",moto.status]]}}));
  if(kind === "pagamentos") return payments.map(payment => {
    const rental = rentalFor(payment); const client = clientFor(rental);
    return {id:payment.id,status:payment.status,search:`${payment.id} ${rental.id} ${client.name}`,sort:payment.due,cells:[<div key="id"><p className="font-semibold">{payment.id}</p><p className="mt-1 text-[10px] text-slate-500">{rental.id}</p></div>,person(client.name,motoFor(rental).model),<span key="valor" className="font-semibold tabular-nums">{money(payment.amount)}</span>,date(payment.due),<Status key="status" value={payment.status}/>],detail:{title:payment.id,subtitle:client.name,fields:[["Contrato",rental.id],["Cliente",client.name],["Valor",money(payment.amount)],["Vencimento",date(payment.due)],["Recebimento",payment.received ? date(payment.received) : "Não recebido"],["Situação",payment.status]]}};
  });
  if(kind === "alertas") return alerts.map(alert => {
    const rental = rentals.find(item => item.id === alert.rentalId)!;
    return {id:alert.id,rentalId:rental.id,due:alert.due,status:alert.status,search:`${rental.id} ${clientFor(rental).name} ${motoFor(rental).model} ${motoFor(rental).plate}`,sort:alert.due,cells:[],detail:{...rentalDetail(rental,data),subtitle:`${clientFor(rental).name} · ${alert.kind === "pagamento" ? "Pagamento" : "Contrato"}`,fields:[["Tipo",alert.kind === "pagamento" ? "Pagamento" : "Contrato"],["Vencimento do alerta",date(alert.due)],["Valor do alerta",money(alert.amount)],...rentalDetail(rental,data).fields]}};
  });
  return rentals.map(rental => ({id:rental.id,status:rentalStatus(rental),search:`${rental.id} ${clientFor(rental).name} ${motoFor(rental).model} ${motoFor(rental).plate}`,sort:rental.end,cells:[<span key="id" className="font-semibold">{rental.id}</span>,person(clientFor(rental).name,motoFor(rental).model),<div key="periodo"><p>{date(rental.start)}</p><p className="mt-1 text-[10px] text-slate-500">até {date(rental.end)}</p></div>,money(rental.amount),<Status key="status" value={rentalStatus(rental)}/>],detail:rentalDetail(rental,data)}));
}

const config = {
  clientes: { title:"Clientes", description:"Os clientes que fazem parte da operação Loca7Moto.", table:"Base de clientes", headers:["Cliente","Contato","Cadastro","Locações ativas","Situação"], icon:Users, search:"Buscar por nome, CPF ou telefone…" },
  motos: { title:"Motos", description:"Disponibilidade, modelos e diárias da sua frota.", table:"Frota cadastrada", headers:["Moto","Placa","Marca","Valor de locação","Situação"], icon:Bike, search:"Buscar por modelo, placa ou marca…" },
  contratos: { title:"Contratos / Locações", description:"Acompanhe períodos, devoluções e contratos em andamento.", table:"Contratos da operação", headers:["Contrato","Cliente / moto","Período","Valor contratado","Situação"], icon:FileText, search:"Buscar por contrato, cliente ou moto…" },
  pagamentos: { title:"Pagamentos", description:"Uma visão clara dos recebimentos e valores em aberto.", table:"Histórico de pagamentos", headers:["Pagamento","Cliente / moto","Valor","Vencimento","Situação"], icon:Wallet, search:"Buscar por pagamento, contrato ou cliente…" },
  alertas: { title:"Alertas", description:"Priorize devoluções e pagamentos vencidos ou próximos do vencimento.", table:"Central de alertas", headers:[], icon:Bell, search:"Buscar por cliente, contrato ou moto…" },
};

function summaries(kind:Kind,{clients,motorcycles,rentals,payments,alerts,pendingPayments,receivedPayments,daysUntil}:PanelData):[string,string][] {
  switch(kind) {
    case "clientes": return [["Clientes cadastrados",String(clients.length)],["Sem locação em andamento",String(clients.length - new Set(rentals.filter(item => !item.closed).map(item => item.clientId)).size)],["Com locação em andamento",String(new Set(rentals.filter(item => !item.closed).map(item => item.clientId)).size)]];
    case "motos": return [["Total da frota",String(motorcycles.length)],["Disponíveis",String(motorcycles.filter(item => item.status === "Disponível").length)],["Em manutenção",String(motorcycles.filter(item => item.status === "Manutenção").length)]];
    case "contratos": return [["Locações em aberto",String(rentals.filter(item => !item.closed).length)],["Vencendo hoje",String(rentals.filter(item => !item.closed && daysUntil(item.end) === 0).length)],["Contratos atrasados",String(rentals.filter(item => !item.closed && daysUntil(item.end) < 0).length)]];
    case "pagamentos": return [["Total recebido",money(receivedPayments.reduce((total,item) => total+item.amount,0))],["Total em aberto",money(pendingPayments.reduce((total,item) => total+item.amount,0))],["Pagamentos atrasados",String(payments.filter(item => item.status === "Atrasado").length)]];
    case "alertas": return [["Alertas atrasados",String(alerts.filter(item => item.status.toLowerCase().includes("atrasado")).length)],["Vencendo hoje",String(alerts.filter(item => !item.status.toLowerCase().includes("atrasado") && daysUntil(item.due)===0).length)],["Próximos vencimentos",String(alerts.filter(item => !item.status.toLowerCase().includes("atrasado") && daysUntil(item.due)>0).length)]];
  }
}

export function RecordsPage({kind}: {kind:Kind}) {
  const panel = usePanelData();
  const {rentals,clientFor,motoFor,daysUntil,referenceDate} = panel;
  const [query,setQuery] = useState("");
  const [status,setStatus] = useState("Todos");
  const [sort,setSort] = useState("default");
  const [detail,setDetail] = useState<Detail|null>(null);
  const data = buildRows(kind,panel);
  const options = Array.from(new Set(data.map(row => row.status)));
  const rows = data.filter(row => (status === "Todos" || row.status === status) && normalize(row.search).includes(normalize(query))).sort((a,b) => sort === "asc" ? a.sort.localeCompare(b.sort,"pt-BR") : sort === "desc" ? b.sort.localeCompare(a.sort,"pt-BR") : 0);
  const settings = config[kind]; const Icon = settings.icon;
  return <>
    <PageHeading title={settings.title} description={settings.description}><span className="flex items-center gap-2 text-[11px] text-slate-500"><Icon size={16}/>{data.length} {kind === "alertas" ? "alertas" : "registros"}</span></PageHeading>
    <section aria-label="Resumo" className="module-summary mb-6 grid grid-cols-1 sm:grid-cols-3 gap-0">{summaries(kind,panel).map(([label,value]) => <div key={label} className="metric-card"><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="metric-value mt-3">{value}</p></div>)}</section>
    <OperationBrief kind={kind}/>
    <Card className="module-table-panel gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">{settings.table}</h2><span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Dados cadastrados</span></div>
      <div className="flex flex-wrap items-center gap-3 p-5"><div className="relative w-full sm:flex-1 sm:min-w-[220px]"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><Input aria-label={settings.search.replace("…", "")} placeholder={settings.search} value={query} onChange={event => setQuery(event.target.value)} className="h-10 bg-white pl-9 text-xs shadow-none"/></div><div className="flex w-full flex-wrap items-center gap-2 sm:w-auto"><SlidersHorizontal size={15} className="text-slate-400"/><select aria-label="Filtrar por situação" value={status} onChange={event => setStatus(event.target.value)} className="filter-select min-w-0 flex-1 sm:flex-none"><option value="Todos">Todas as situações</option>{options.map(option => <option key={option}>{option}</option>)}</select><select aria-label="Ordenar registros" value={sort} onChange={event => setSort(event.target.value)} className="filter-select min-w-0 flex-1 sm:flex-none"><option value="default">Ordem original</option><option value="asc">{kind === "clientes" || kind === "motos" ? "Nome: A → Z" : "Vencimento: mais próximo"}</option><option value="desc">{kind === "clientes" || kind === "motos" ? "Nome: Z → A" : "Vencimento: mais distante"}</option></select></div></div>
      {rows.length === 0 ? <div className="flex flex-col items-center border-t border-slate-100 px-5 py-16 text-center"><Search size={26} className="mb-4 text-slate-300"/><h3 className="text-sm font-semibold">Nenhum registro encontrado</h3><p className="mt-2 text-xs text-slate-500">Tente outro termo ou remova o filtro de situação.</p><Button variant="outline" className="mt-5" onClick={() => {setQuery("");setStatus("Todos");}}>Limpar filtros</Button></div> : kind === "alertas" ? <div className="border-t border-slate-100">{rows.map(row => {
        const rental = rentals.find(item => item.id === row.rentalId)!; const days = daysUntil(row.due!);
        return <article key={row.id} className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-5 last:border-0"><span className={`grid size-11 shrink-0 place-items-center rounded-lg ${row.status.toLowerCase().includes("atrasado") ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}><CalendarClock size={21}/></span><div className="min-w-0 flex-1 basis-[180px]"><div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{clientFor(rental).name}</h3><Status value={row.status}/></div><p className="text-xs leading-relaxed text-slate-500">{motoFor(rental).model} · {rental.id}</p><p className="mt-2 text-xs text-slate-600">{row.id.startsWith("pagamento-") ? (days < 0 ? `Pagamento atrasado há ${Math.abs(days)} dia(s).` : row.status === "Pagamento atrasado" ? "Atraso registrado manualmente." : days === 0 ? "Pagamento com vencimento hoje." : `Pagamento vence em ${days} dia(s).`) : (days < 0 ? `Devolução atrasada há ${Math.abs(days)} dia(s).` : days === 0 ? "Devolução prevista para hoje." : `Devolução prevista em ${days} dia(s).`)} Vencimento: {date(row.due!)}.</p></div><Button variant="outline" size="sm" onClick={() => setDetail(row.detail)}>Ver contrato <ArrowUpRight size={14}/></Button></article>;
      })}</div> : <div className="table-scroll" role="region" aria-label={settings.table} tabIndex={0}><table><caption className="sr-only">{settings.table}, {rows.length} registros encontrados</caption><thead><tr>{settings.headers.map(header => <th key={header} scope="col">{header}</th>)}<th scope="col"><span className="sr-only">Detalhes</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{row.cells.map((cell,index) => <td key={index}>{cell}</td>)}<td><Button variant="ghost" size="icon" onClick={() => setDetail(row.detail)} aria-label={`Ver detalhes de ${row.detail.title}`}><ArrowUpRight size={16}/></Button></td></tr>)}</tbody></table></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3"><p role="status" className="text-[10px] text-slate-500">{rows.length} de {data.length} registros{query || status !== "Todos" ? " · Filtros aplicados" : ""}</p>{(query || status !== "Todos") && <button type="button" onClick={() => {setQuery("");setStatus("Todos");}} className="text-[11px] font-semibold text-[#1565c0]">Limpar filtros</button>}<span className="text-[10px] text-slate-500">Referência: {date(referenceDate)}</span></div>
    </Card>
    <DetailDialog detail={detail} onClose={() => setDetail(null)}/>
  </>;
}
