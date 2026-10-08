import type {Snapshot} from './panel-data';
import {whatsappNumber,empresaInputSchema} from './empresa';
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const date=(v:string)=>v.split('-').reverse().join('/');
export function chargeContext(snapshot:Pick<Snapshot,'clientes'|'motos'|'contratos'|'pagamentos'|'empresa'>,contractId:string,paymentId?:string){
  const contract=snapshot.contratos.find(c=>c.id===contractId);
  const client=snapshot.clientes.find(c=>c.id===contract?.cliente_id);
  const moto=snapshot.motos.find(m=>m.id===contract?.moto_id);
  const payments=snapshot.pagamentos.filter(p=>p.contrato_id===contractId&&(p.status==='pendente'||p.status==='atrasado')).sort((a,b)=>a.data_vencimento.localeCompare(b.data_vencimento)||a.id.localeCompare(b.id));
  const payment=paymentId?payments.find(p=>p.id===paymentId):payments[0];
  const phone=whatsappNumber(client?.whatsapp.trim()||client?.telefone||'');
  const empresa=snapshot.empresa;
  const reason=!contract||!client||!moto?'Dados da locação não encontrados.':!payment?'Não há pagamento pendente. Registre o lançamento antes de cobrar.':!phone?'Cadastre um WhatsApp ou telefone válido com DDD para o cliente.':!empresa?.chave_pix||!empresaInputSchema.safeParse(empresa).success?'Configure a chave Pix e o recebedor da locadora antes de cobrar.':'';
  const message=!reason&&payment&&empresa&&client&&moto?`Olá, ${client.nome}! Tudo bem?\nO pagamento da sua locação da moto ${moto.marca} ${moto.modelo} - placa ${moto.placa} tem vencimento em ${date(payment.data_vencimento)}.\nValor pendente deste pagamento: ${money(payment.valor)}.\nPix para pagamento: ${empresa.chave_pix}.\nRecebedor: ${empresa.nome_recebedor}.\nApós o pagamento, envie o comprovante por aqui. Obrigado!\n${empresa.nome}`:'';
  return {contract,client,moto,payments,payment,phone,reason,message};
}
export function whatsappLink(phone:string,message:string){
  if(!/^55\d{10,11}$/.test(phone)||!whatsappNumber(phone)||!message.trim())return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
