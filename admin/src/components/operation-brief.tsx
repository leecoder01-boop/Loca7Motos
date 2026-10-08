"use client";
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { usePanelData } from './panel-provider';

export function OperationBrief({kind}:{kind:'clientes'|'motos'|'contratos'|'pagamentos'|'alertas'}) {
  const {motorcycles,rentals,alerts} = usePanelData();
  const open=rentals.filter(r=>!r.closed).length;
  const content={
    clientes:['Pessoas antes dos contratos','Mantenha contato e habilitação à mão. Um cadastro organizado acompanha o cliente em cada nova locação.','Ver locações','/contratos/'],
    motos:['Uma visão da sua garagem','Disponibilidade, manutenção e preço no mesmo lugar. Confira o cadastro antes de colocar uma moto na rua.','Abrir locações','/contratos/'],
    contratos:['Da retirada à devolução',`${open} ${open===1?'locação em aberto':'locações em aberto'}. Cliente, moto e período conectados; a disponibilidade da frota acompanha cada encerramento.`,'Consultar vencimentos','/alertas/'],
    pagamentos:['Recebimento registrado, operação organizada','Os lançamentos são manuais. Marcar como pago registra o valor integral, sem cobrar ou transferir dinheiro.','Analisar vendas','/vendas/'],
    alertas:['Sua próxima ação começa aqui',`${alerts.length} ${alerts.length===1?'vencimento merece':'vencimentos merecem'} acompanhamento. Confira o contrato e o pagamento antes de entrar em contato com o cliente.`,'Ver pagamentos','/pagamentos/'],
  }[kind];
  const fleet=[['Disponíveis','Disponível'],['Na rua','Alugada'],['Manutenção','Manutenção'],['Indisponíveis','Indisponível']];
  return <aside className={`operation-brief brief-${kind}`} aria-label="Contexto da operação"><div><p className="eyebrow">{kind==='motos'?'MAPA DA FROTA':'NA SUA ROTA'}</p><h2>{content[0]}</h2><p>{content[1]}</p></div>{kind==='motos'&&<div className="fleet-map"><div className="fleet-map-track" aria-hidden="true">{fleet.map(([label,status],i)=><span key={status} className={`fleet-segment-${i}`} style={{width:`${motorcycles.length?motorcycles.filter(m=>m.status===status).length/motorcycles.length*100:0}%`}}/>)}</div><div className="fleet-map-legend">{fleet.map(([label,status],i)=><span key={status}><i className={`fleet-segment-${i}`}/>{label}<strong>{motorcycles.filter(m=>m.status===status).length}</strong></span>)}</div></div>}<Link href={content[3]}>{content[2]}<ArrowUpRight size={15}/></Link></aside>;
}
