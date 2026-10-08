'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {QrCode,Copy,MessageCircle,ArrowUpRight} from 'lucide-react';
import {usePanelData} from './panel-provider';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from './ui/dialog';
import {paymentPix,pixMessage} from '@/lib/pix';
import {whatsappLink} from '@/lib/whatsapp';
import {money,date} from '@/lib/panel-data';
export function PixCharge({paymentId}:{paymentId:string}){
  const panel=usePanelData();const [open,setOpen]=useState(false);const [review,setReview]=useState(false);const [notice,setNotice]=useState('');const codeRef=useRef<HTMLTextAreaElement>(null);const titleRef=useRef<HTMLHeadingElement>(null);const reviewTitle=useRef<HTMLHeadingElement>(null);
  let pix:ReturnType<typeof paymentPix>|null=null;let error='';
  try{pix=paymentPix({clientes:panel.clientRecords,motos:panel.motoRecords,contratos:panel.contractRecords,pagamentos:panel.paymentRecords,empresa:panel.empresa},paymentId);}catch(e){error=e instanceof Error?e.message:'Não foi possível gerar o Pix.';}
  const payload=pix?.payload??'';const message=pix?pixMessage(pix):'';const link=pix?.phone?whatsappLink(pix.phone,message):null;
  // Uma revisão anterior não autoriza compartilhar dados alterados na atualização periódica.
  const [reviewedSource,setReviewedSource]=useState('');
  useEffect(()=>{setNotice('');setReview(false);},[payload]);
  useEffect(()=>{if(review)reviewTitle.current?.focus();},[review]);
  async function copy(){try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(payload);setNotice('Código Pix copiado. Confira o recebedor no aplicativo do banco.');}catch{codeRef.current?.focus();codeRef.current?.select();setNotice('Não foi possível acessar a área de transferência. O código foi selecionado: copie manualmente.');}}
  return <Dialog open={open} onOpenChange={value=>{setOpen(value);setNotice('');setReview(false);}}><DialogTrigger asChild><Button variant="outline" size="sm"><QrCode size={14}/>Gerar Pix</Button></DialogTrigger><DialogContent onOpenAutoFocus={event=>{event.preventDefault();titleRef.current?.focus();}} className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle ref={titleRef} tabIndex={-1}>Pix da locação</DialogTitle><DialogDescription>QR Code e copia e cola do pagamento integral. A confirmação do recebimento continua manual.</DialogDescription></DialogHeader>
    {error?<div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"><p>{error}</p><Link href={error.includes('configurações')||error.includes('locadora')?'/configuracoes/':'/pagamentos/'} className="mt-3 inline-flex underline">Revisar cadastro</Link></div>:pix&&<>
      <div className="pix-summary"><div><p className="eyebrow">PAGAMENTO EM ABERTO</p><p className="pix-amount">{money(pix.payment.valor)}</p><p className="text-xs leading-relaxed">{pix.client.nome}</p><p className="mt-1 text-[11px]">{pix.moto.marca} {pix.moto.modelo} · {pix.moto.placa}</p></div><div className="text-xs leading-relaxed"><p>Vencimento: <strong>{date(pix.payment.data_vencimento)}</strong></p><p className="mt-2">Pagamento {pix.payment.id.slice(0,8)}</p></div></div>
      <div className="pix-layout"><div className="pix-qr"><PixQr payload={payload}/><p className="mt-3 text-center text-[11px] text-slate-600">Leia no aplicativo do banco</p></div><dl className="space-y-4 text-xs min-w-0"><div><dt className="text-slate-500">Recebedor no código</dt><dd className="mt-1 font-semibold break-words">{pix.receiver}</dd></div><div><dt className="text-slate-500">Cidade no código</dt><dd className="mt-1 font-semibold">{pix.city}</dd></div><div><dt className="text-slate-500">Chave Pix</dt><dd className="mt-1 font-semibold break-all">{pix.key}</dd></div><div><dt className="text-slate-500">Referência Pix (txid)</dt><dd className="mt-1 break-all font-mono text-[11px]">{pix.txid}</dd></div></dl></div>
      <label className="grid gap-2 text-xs font-medium" htmlFor={`pix-code-${paymentId}`}>Pix copia e cola<textarea ref={codeRef} id={`pix-code-${paymentId}`} readOnly value={payload} rows={4} className="w-full resize-none rounded-lg border border-input bg-slate-50 p-3 font-mono text-[11px] leading-relaxed break-all"/></label>
      <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">Pix estático: não expira nem é cancelado no banco por este painel. Após editar valor ou chave, envie um novo código. Um código já compartilhado pode continuar sendo pago. Confira o recebedor no banco antes do pagamento. Nome e cidade foram normalizados para o formato BR Code.</p>
      <div className="flex flex-wrap gap-2"><Button onClick={copy}><Copy size={15}/>Copiar código Pix</Button><Button variant="outline" onClick={()=>{setReview(true);setReviewedSource(message);}}><MessageCircle size={15}/>Cobrar no WhatsApp</Button></div>
      {notice&&<p role="status" className="text-xs leading-relaxed text-blue-800">{notice}</p>}
      {review&&reviewedSource===message&&<section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3"><h3 ref={reviewTitle} tabIndex={-1} className="text-xs font-semibold">Revise antes de abrir a conversa</h3><p className="text-xs">Destino: {pix.phone?`+${pix.phone}`:'Telefone inválido — revise o cadastro do cliente.'}</p><label className="grid gap-2 text-xs font-medium">Mensagem com Pix copia e cola<textarea readOnly rows={7} value={message} className="rounded-md border border-input bg-white p-3 text-xs leading-relaxed"/></label><p className="text-[11px] leading-relaxed text-slate-600">Ao abrir, telefone, dados da cobrança e código Pix serão compartilhados com o WhatsApp. Você precisa enviar a mensagem na conversa.</p>{link?<Button asChild><a href={link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ArrowUpRight size={15}/>Abrir WhatsApp</a></Button>:<Link className="text-xs underline" href="/clientes/">Corrigir telefone do cliente</Link>}</section>}
    </>}
    <div className="border-t pt-4 flex justify-end"><Button variant="outline" onClick={()=>setOpen(false)}>Fechar Pix</Button></div>
  </DialogContent></Dialog>;
}
function PixQr({payload}:{payload:string}){
  const [qr,setQr]=useState<{payload:string;size:number;path:string}|null>(null);const [failed,setFailed]=useState(false);
  useEffect(()=>{let current=true;setFailed(false);import('@/lib/pix-qr').then(({pixQr})=>{const data=pixQr(payload);if(current)setQr({...data,payload});}).catch(()=>{if(current)setFailed(true);});return()=>{current=false;};},[payload]);
  if(failed)return <p role="status" className="text-xs text-amber-900">QR Code indisponível. Use o copia e cola ou reabra esta janela.</p>;
  if(!qr||qr.payload!==payload)return <p role="status" className="text-xs text-slate-500">Preparando QR Code…</p>;
  return <svg role="img" aria-label="QR Code Pix deste pagamento" viewBox={`0 0 ${qr.size} ${qr.size}`} width="240" height="240" className="max-w-full h-auto" shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="#fff"/><path d={qr.path} fill="#000"/></svg>;
}
