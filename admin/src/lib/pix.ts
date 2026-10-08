import {z} from 'zod';
import type {Empresa} from './empresa';
import type {Snapshot} from './panel-data';
import {whatsappNumber} from './empresa';
// BR Code/Pix estático, manual BCB 2.10.0, seções 2.5.1 e 2.6.
export function crc16(value:string){
  let crc=0xffff;
  for(const byte of new TextEncoder().encode(value)){
    crc^=byte<<8;
    for(let i=0;i<8;i++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}
export function pixField(id:string,value:string){
  const length=new TextEncoder().encode(value).length;
  if(!/^\d{2}$/.test(id)||length<1||length>99)throw new Error('Campo Pix fora do tamanho permitido.');
  return `${id}${String(length).padStart(2,'0')}${value}`;
}
function merchantText(value:string,limit:number){
  const text=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 .\/-]/g,'').replace(/\s+/g,' ').trim().slice(0,limit).trim();
  if(!text)throw new Error('Preencha o nome do recebedor e a cidade nas configurações.');
  return text;
}
export function pixKey(key:string,type:Empresa['tipo_chave_pix']){
  const value=key.trim();
  const valid=type==='cpf'?/^\d{11}$/.test(value):type==='cnpj'?/^[A-Z0-9]{12}\d{2}$/.test(value):type==='email'?z.email().safeParse(value).success:type==='telefone'?/^\+55\d{10,11}$/.test(value)&&!!whatsappNumber(value):type==='aleatoria'?z.uuid().safeParse(value).success:false;
  if(!valid||! /^[\x20-\x7e]{1,77}$/.test(value))throw new Error('Revise a chave Pix e seu tipo nas configurações (máximo de 77 caracteres).');
  return value;
}
export function paymentTxid(id:string){
  if(!z.uuid().safeParse(id).success)throw new Error('Pagamento inválido. Atualize a lista.');
  return BigInt(`0x${id.replace(/-/g,'')}`).toString(36).padStart(25,'0');
}
export function buildPix({empresa,amount,paymentId}:{empresa:Empresa;amount:number;paymentId:string}){
  const cents=Math.round(amount*100);
  if(!Number.isFinite(amount)||!Number.isSafeInteger(cents)||cents<=0||amount>9999999999.99||Math.abs(amount*100-cents)>0.0001)throw new Error('O pagamento precisa ter valor positivo com até duas casas decimais.');
  const key=pixKey(empresa.chave_pix,empresa.tipo_chave_pix);
  const receiver=merchantText(empresa.nome_recebedor,25);const city=merchantText(empresa.cidade,15);const txid=paymentTxid(paymentId);
  const data=pixField('00','01')+pixField('26',pixField('00','br.gov.bcb.pix')+pixField('01',key))+pixField('52','0000')+pixField('53','986')+pixField('54',(cents/100).toFixed(2))+pixField('58','BR')+pixField('59',receiver)+pixField('60',city)+pixField('62',pixField('05',txid))+'6304';
  return {payload:data+crc16(data),key,receiver,city,txid};
}
export function paymentPix(snapshot:Pick<Snapshot,'clientes'|'motos'|'contratos'|'pagamentos'|'empresa'>,paymentId:string){
  const payment=snapshot.pagamentos.find(p=>p.id===paymentId);
  if(!payment||(payment.status!=='pendente'&&payment.status!=='atrasado'))throw new Error('Este pagamento não está mais em aberto. Atualize a lista.');
  const contract=snapshot.contratos.find(c=>c.id===payment.contrato_id);const client=snapshot.clientes.find(c=>c.id===contract?.cliente_id);const moto=snapshot.motos.find(m=>m.id===contract?.moto_id);
  if(!contract||!client||!moto)throw new Error('Dados da locação não encontrados. Atualize a lista.');
  if(!snapshot.empresa)throw new Error('Configure os dados da locadora antes de gerar Pix.');
  return {...buildPix({empresa:snapshot.empresa,amount:payment.valor,paymentId}),payment,contract,client,moto,company:snapshot.empresa.nome,phone:whatsappNumber(client.whatsapp.trim()||client.telefone)};
}
export function pixMessage(pix:ReturnType<typeof paymentPix>){
  const value=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(pix.payment.valor);
  return `Olá, ${pix.client.nome}! Tudo bem?\nSua locação da moto ${pix.moto.marca} ${pix.moto.modelo} - placa ${pix.moto.placa} tem pagamento com vencimento em ${pix.payment.data_vencimento.split('-').reverse().join('/')}.\nValor: ${value}.\nRecebedor: ${pix.receiver}.\n\nPix copia e cola:\n${pix.payload}\n\nConfira o recebedor no seu banco. Após o pagamento, envie o comprovante por aqui. Obrigado!\n${pix.company}`;
}
