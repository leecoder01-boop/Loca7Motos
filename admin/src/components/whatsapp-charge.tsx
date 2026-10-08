'use client';
import Link from 'next/link';
import {useState} from 'react';
import {MessageCircle,ArrowUpRight} from 'lucide-react';
import {usePanelData} from './panel-provider';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from './ui/dialog';
import {chargeContext,whatsappLink} from '@/lib/whatsapp';
import {money,date} from '@/lib/panel-data';
export function WhatsAppCharge({contractId,paymentId}:{contractId:string;paymentId?:string}){
  const panel=usePanelData();const [open,setOpen]=useState(false);const [selected,setSelected]=useState(paymentId);const [draft,setDraft]=useState<{source:string;text:string}|null>(null);
  const context=chargeContext({clientes:panel.clientRecords,motos:panel.motoRecords,contratos:panel.contractRecords,pagamentos:panel.paymentRecords,empresa:panel.empresa},contractId,selected);
  const message=draft?.source===context.message?draft.text:context.message;
  const link=!context.reason&&context.phone?whatsappLink(context.phone,message):null;
  return <Dialog open={open} onOpenChange={value=>{setOpen(value);if(value){setSelected(paymentId);setDraft(null);}}}><DialogTrigger asChild><Button variant="outline" size="sm" className="whatsapp-charge"><MessageCircle size={14}/>Cobrar no WhatsApp</Button></DialogTrigger><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Revisar cobrança</DialogTitle><DialogDescription>Você confere a mensagem, abre a conversa e decide quando enviar. Nenhum envio é automático.</DialogDescription></DialogHeader>
    <div className="rounded-xl bg-blue-50 p-4 text-xs leading-relaxed"><p className="font-semibold">{context.client?.nome??'Cliente não encontrado'}</p><p>{context.moto?`${context.moto.marca} ${context.moto.modelo} · ${context.moto.placa}`:'Moto não encontrada'}</p><p className="mt-2">Destino: {context.phone?`+${context.phone}`:'Telefone não configurado'}</p></div>
    {!paymentId&&context.payments.length>1&&<label className="grid gap-2 text-xs font-medium">Pagamento a cobrar<select className="filter-select w-full" value={context.payment?.id??''} onChange={e=>{setSelected(e.target.value);setDraft(null);}}>{context.payments.map(p=><option value={p.id} key={p.id}>{date(p.data_vencimento)} · {money(p.valor)} · {p.id.slice(0,8)}</option>)}</select></label>}
    {context.reason?<div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><p>{context.reason}</p><Link href={context.reason.startsWith('Configure')?'/configuracoes/':context.reason.startsWith('Cadastre')?'/clientes/':'/pagamentos/'} className="mt-3 inline-flex underline">Abrir cadastro necessário</Link></div>:<><p className="text-xs text-slate-600">Cobrança integral de um lançamento: {money(context.payment!.valor)} · vencimento {date(context.payment!.data_vencimento)}. Outros pagamentos não são somados a este valor.</p><label htmlFor={`charge-${paymentId??contractId}`} className="grid gap-2 text-xs font-medium">Mensagem para o cliente<textarea id={`charge-${paymentId??contractId}`} rows={9} maxLength={3000} value={message} onChange={e=>setDraft({source:context.message,text:e.target.value})} className="rounded-lg border border-input p-3 text-sm leading-relaxed"/></label></>}
    <p className="text-[11px] leading-relaxed text-slate-500">Ao abrir, o telefone e a mensagem serão compartilhados com o WhatsApp. Confira o destinatário e a chave Pix. Abrir a conversa não marca o pagamento como pago nem resolve o alerta.</p><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>Voltar</Button>{link?<Button asChild><a href={link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ArrowUpRight size={16}/>Abrir WhatsApp</a></Button>:<Button disabled>Abrir WhatsApp</Button>}</div>
  </DialogContent></Dialog>;
}
