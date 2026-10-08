"use client";
import Link from 'next/link';
import { useState,useSyncExternalStore } from 'react';
import { ArrowDownToLine,ArrowUpRight,ArrowLeft,CalendarDays,ArrowRight,Wallet,CheckCheck } from 'lucide-react';
import { usePanelData } from './panel-provider';
import { money,date } from '@/lib/panel-data';
import { salesSummary } from '@/lib/vendas';
import { paymentMethods } from '@/lib/pagamentos';

const subscribeSmall=(notify:()=>void)=>{const query=window.matchMedia('(max-width:767px)');query.addEventListener('change',notify);return ()=>query.removeEventListener('change',notify);};
const isSmall=()=>window.matchMedia('(max-width:767px)').matches;
export function SalesPage(){
  const small=useSyncExternalStore(subscribeSmall,isSmall,()=>false);
  const chartWidth=small?360:920,left=small?60:70,right=small?330:880;
  const axisMoney=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0,notation: value>=1000?'compact':'standard'}).format(value);
  const {paymentRecords,referenceDate,rentals,clientFor,motoFor,totalReceivedMonth,totalPending}=usePanelData();
  const [days,setDays]=useState<7|30>(7);
  const sales=salesSummary(paymentRecords,referenceDate,days);
  const maximum=Math.max(100,...sales.daily.flatMap(d=>[d.amount,d.previous]));
  const ceiling=Math.ceil(maximum/100)*100;
  const point=(amount:number,index:number)=>`${left+index*(right-left)/(days-1)},${235-amount/ceiling*190}`;
  const currentPoints=sales.daily.map((d,i)=>point(d.amount,i)).join(' ');
  const previousPoints=sales.daily.map((d,i)=>point(d.previous,i)).join(' ');
  const exportCsv=()=>{
    const rows=[['Data','Recebido (BRL)','Data período anterior','Recebido anterior (BRL)'],...sales.daily.map(d=>[d.day,d.amount.toFixed(2),d.previousDay,d.previous.toFixed(2)])];
    const blob=new Blob(['\uFEFF'+rows.map(r=>r.join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`loca7moto-recebimentos-${sales.start}-${sales.end}.csv`;document.body.appendChild(link);link.click();
    window.setTimeout(()=>{URL.revokeObjectURL(url);link.remove();},1000);
  };
  return <div className="sales-view">
    <section className="sales-hero" aria-labelledby="sales-title">
      <div className="sales-route" aria-hidden="true"><span>07</span></div>
      <div className="sales-hero-nav"><Link href="/" className="sales-back"><ArrowLeft size={15}/>Voltar ao dashboard</Link><span className="sales-live"><span/>Dados da operação</span></div>
      <div className="sales-hero-heading"><p className="eyebrow">LOCA7MOTO / RECEBIMENTOS</p><h1 id="sales-title">Vendas hoje<span>.</span></h1><p>{date(referenceDate)} · Horário de Brasília</p></div>
      <div className="sales-total"><div className="sales-total-top"><span>Faturamento recebido</span><CheckCheck size={17}/></div><p className="sales-amount">{money(sales.receivedToday)}</p><div className="sales-total-foot"><span>Pagamentos registrados como pagos</span><span>Ontem: <strong>{money(sales.yesterday)}</strong></span></div></div>
      <p className="sales-disclaimer">Vendas representam recebimentos de locações. Não inclui contratos em aberto nem pagamentos cancelados.</p>
    </section>
    <section className="sales-analysis" aria-labelledby="trend-title">
      <div className="sales-section-heading"><div><p className="eyebrow">O RITMO DA SUA OPERAÇÃO</p><h2 id="trend-title">Tendência de vendas</h2><p>Recebimentos por dia, comparados ao período anterior de mesma duração.</p></div><div className="sales-controls"><div className="sales-segment" aria-label="Período do gráfico">{([7,30] as const).map(value=><button key={value} type="button" aria-pressed={days===value} onClick={()=>setDays(value)}>Últimos {value} dias</button>)}</div><button type="button" onClick={exportCsv} className="sales-export"><ArrowDownToLine size={16}/>CSV</button></div></div>
      <div className="sales-chart-top"><div><span className="sales-period"><CalendarDays size={14}/>{date(sales.start)} — {date(sales.end)}</span><p className="sales-period-total">{money(sales.total)}<span>recebidos no período</span></p></div><p className="sales-comparison">{sales.change===null?'Sem base de recebimentos no período anterior':`${sales.change>=0?'+':''}${sales.change.toFixed(1).replace('.',',')}% em relação ao período anterior`}<span>{date(sales.previousStart)} — {date(sales.previousEnd)}</span></p></div>
      <div className="sales-legend"><span><i/>Período selecionado</span><span><i/>Período anterior</span></div>
      <figure className="sales-chart"><svg viewBox={`0 0 ${chartWidth} 280`} role="img" aria-labelledby="sales-chart-title"><title id="sales-chart-title">Recebimentos diários em reais. Dados completos na tabela abaixo.</title><defs><linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2999ff" stopOpacity=".2"/><stop offset="100%" stopColor="#2999ff" stopOpacity="0"/></linearGradient></defs>{[0,1,2,3].map(i=>{const y=235-i*190/3;return <g key={i}><line x1={left} y1={y} x2={right} y2={y} stroke="#263f5c" strokeDasharray="3 6"/><text x={left-10} y={y+4} textAnchor="end" fill="#adbed0" fontSize={small?13:11}>{axisMoney(ceiling*i/3)}</text></g>;})}<polygon points={`${left},235 ${currentPoints} ${right},235`} fill="url(#sales-area)"/><polyline points={previousPoints} fill="none" stroke="#9baec5" strokeWidth="2" strokeDasharray="6 6"/><polyline points={currentPoints} fill="none" stroke="#52b8ff" strokeWidth="3" strokeLinejoin="round"/>{sales.daily.map((d,i)=>i%(days===7?(small?2:1):(small?10:6))===0||i===days-1?<g key={d.day}><circle cx={left+i*(right-left)/(days-1)} cy={235-d.amount/ceiling*190} r="3.5" fill="#52b8ff"/><text x={left+i*(right-left)/(days-1)} y="263" textAnchor="middle" fill="#adbed0" fontSize={small?13:11}>{date(d.day).slice(0,5)}</text></g>:null)}</svg>{!sales.total&&!sales.previousTotal&&<div className="sales-chart-empty"><Wallet size={24}/><p>Ainda sem recebimentos neste intervalo</p><span>Registre um pagamento como pago para alimentar o gráfico.</span></div>}<figcaption>Valores integrais por data de pagamento. Atualização a cada minuto enquanto a aba estiver visível.</figcaption></figure>
      <details className="sales-data"><summary>Consultar valores diários</summary><div className="table-scroll" tabIndex={0} role="region" aria-label="Valores diários de recebimentos"><table><thead><tr><th>Data</th><th>Recebido</th><th>Data anterior</th><th>Recebido anterior</th></tr></thead><tbody>{sales.daily.map(d=><tr key={d.day}><td>{date(d.day)}</td><td>{money(d.amount)}</td><td>{date(d.previousDay)}</td><td>{money(d.previous)}</td></tr>)}</tbody></table></div></details>
    </section>
    <section className="sales-kpis" aria-label="Resumo financeiro"><div><span>Recebido neste mês</span><strong>{money(totalReceivedMonth)}</strong><small>Até {date(referenceDate)}</small></div><div><span>Valor em aberto</span><strong>{money(totalPending)}</strong><small>Inclui pagamentos atrasados</small></div><div><span>Recebimentos no período</span><strong>{String(sales.count).padStart(2,'0')}</strong><small>Últimos {days} dias</small></div><div><span>Valor médio recebido</span><strong>{money(sales.average)}</strong><small>Por lançamento pago no período</small></div></section>
    <div className="sales-bottom"><section className="sales-receipts"><div className="sales-section-heading"><div><p className="eyebrow">DA LOCAÇÃO AO CAIXA</p><h2>Últimos recebimentos</h2></div><Link href="/pagamentos/">Ver pagamentos <ArrowUpRight size={15}/></Link></div><div className="table-scroll" tabIndex={0} role="region" aria-label="Últimos recebimentos"><table><thead><tr><th>Cliente / moto</th><th>Data</th><th>Forma</th><th>Recebido</th></tr></thead><tbody>{sales.current.slice(0,8).map(p=>{const r=rentals.find(r=>r.id===p.contrato_id)!;return <tr key={p.id}><td><strong>{clientFor(r).name}</strong><span className="sales-moto">{motoFor(r).model} · {motoFor(r).plate}</span></td><td>{date(p.data_pagamento!)}</td><td>{p.forma_pagamento?paymentMethods[p.forma_pagamento]:'Não informada'}</td><td><strong>{money(p.valor)}</strong></td></tr>;})}{!sales.count&&<tr><td colSpan={4} className="sales-no-receipts">Nenhum recebimento nos últimos {days} dias.<Link href="/pagamentos/">Registrar pagamento <ArrowRight size={14}/></Link></td></tr>}</tbody></table></div><p className="sales-table-foot">Exibindo {Math.min(8,sales.count)} de {sales.count} recebimentos do período.</p></section><section className="sales-methods"><p className="eyebrow">COMPOSIÇÃO DO CAIXA</p><h2>Como você recebe</h2><p>Formas registradas nos últimos {days} dias.</p>{sales.methods.map(m=><div className="sales-method" key={m.key}><div><span>{m.label}</span><strong>{money(m.amount)}</strong></div><div className="sales-method-track"><span style={{width:`${sales.total?m.amount/sales.total*100:0}%`}}/></div></div>)}<p className="sales-method-note">Pix é informado manualmente. Nenhuma cobrança ou transferência é feita pelo painel.</p></section></div>
  </div>;
}
