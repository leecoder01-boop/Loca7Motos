import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crc16,pixField,buildPix,pixKey,paymentTxid,paymentPix,pixMessage} from '../src/lib/pix';
import {whatsappLink} from '../src/lib/whatsapp';
import {snapshotSchema} from '../src/lib/panel-data';
import {pixQr} from '../src/lib/pix-qr';
import jsQR from 'jsqr';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const created_at='2026-10-01T12:00:00+00:00';
const empresa={id:1 as const,nome:'Locadora fictícia',telefone:'',chave_pix:'teste@example.invalid',tipo_chave_pix:'email' as const,nome_recebedor:'João da Silva',cidade:'São Paulo',updated_at:created_at};
function fields(payload:string){const result:Record<string,string>={};for(let pos=0;pos<payload.length;){const tag=payload.slice(pos,pos+2);const size=Number(payload.slice(pos+2,pos+4));assert.ok(size>0);assert.ok(pos+4+size<=payload.length);assert.equal(result[tag],undefined);result[tag]=payload.slice(pos+4,pos+4+size);pos+=4+size;}return result;}
test('CRC confere vetor oficial BCB e vetor CCITT-FALSE independente',()=>{
  assert.equal(crc16('123456789'),'29B1');
  const bcb='00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  assert.equal(crc16(bcb),'1D3D');assert.throws(()=>pixField('26','a'.repeat(100)));assert.throws(()=>pixField('26',''));
});
test('payload BR Code com valor integral, chave, templates, normalização e CRC',()=>{
  const p=buildPix({empresa,amount:350.50,paymentId:id(4)});const f=fields(p.payload);
  assert.equal(f['00'],'01');assert.equal(f['52'],'0000');assert.equal(f['53'],'986');assert.equal(f['54'],'350.50');assert.equal(f['58'],'BR');assert.equal(f['59'],'JOAO DA SILVA');assert.equal(f['60'],'SAO PAULO');assert.equal(fields(f['26'])['00'],'br.gov.bcb.pix');assert.equal(fields(f['26'])['01'],empresa.chave_pix);assert.equal(fields(f['62'])['05'],p.txid);assert.equal(f['63'],crc16(p.payload.slice(0,-4)));
  assert.match(p.txid,/^[a-z0-9]{25}$/);assert.notEqual(paymentTxid(id(4)),paymentTxid(id(5)));assert.equal(BigInt('0x'+id(4).replace(/-/g,'')).toString(36).padStart(25,'0'),p.txid);
});
test('validação bloqueia dados ausentes e valores inválidos, limita nome/cidade sem alterar chave',()=>{
  for(const amount of [0,-1,NaN,Infinity,.001,10000000000])assert.throws(()=>buildPix({empresa,amount,paymentId:id(1)}));
  for(const override of [{cidade:''},{nome_recebedor:''},{chave_pix:''},{chave_pix:'a'.repeat(70)+'@test.invalid'}])assert.throws(()=>buildPix({empresa:{...empresa,...override},amount:10,paymentId:id(1)}));
  const p=buildPix({empresa:{...empresa,nome_recebedor:'A'.repeat(40),cidade:'B'.repeat(30)},amount:.29,paymentId:id(1)});assert.equal(p.receiver.length,25);assert.equal(p.city.length,15);assert.equal(fields(p.payload)['54'],'0.29');assert.throws(()=>paymentTxid('invalid'));
  assert.equal(pixKey('+5511999999999','telefone'),'+5511999999999');assert.equal(pixKey('12ABC34501DE35','cnpj'),'12ABC34501DE35');assert.throws(()=>pixKey('11999999999','telefone'));
});
test('Pix usa lançamento pendente, não valor do contrato; mensagem e link incluem payload idêntico',()=>{
  const s=snapshotSchema.parse({referenceDate:'2026-10-05',empresa,clientes:[{id:id(1),nome:'Cliente fictício',cpf:'00000000000',cnh:'00000000000',telefone:'11999999999',endereco:'Teste',created_at}],motos:[{id:id(2),marca:'Teste',modelo:'Moto',ano:2026,placa:'TST1A23',quilometragem:0,valor_locacao:999,status:'alugada',created_at}],contratos:[{id:id(3),cliente_id:id(1),moto_id:id(2),data_inicio:'2026-10-01',data_vencimento:'2026-10-08',valor:999,status:'finalizado',created_at}],pagamentos:[{id:id(4),contrato_id:id(3),valor:350.5,data_vencimento:'2026-10-04',data_pagamento:null,status:'atrasado',created_at}]});
  const before=JSON.stringify(s);const p=paymentPix(s,id(4));assert.match(pixMessage(p),/350,50/);assert.match(pixMessage(p),/04\/10\/2026/);assert.ok(pixMessage(p).includes(p.payload));assert.equal(new URL(whatsappLink(p.phone!,pixMessage(p))!).searchParams.get('text'),pixMessage(p));assert.equal(JSON.stringify(s),before);
  for(const status of ['pago','cancelado'] as const){s.pagamentos[0].status=status;assert.throws(()=>paymentPix(s,id(4)));}
});
test('decodificador independente lê exatamente o payload desenhado pelo SVG do QR',()=>{
  const payload=buildPix({empresa,amount:350.50,paymentId:id(4)}).payload;const qr=pixQr(payload);const scale=5;const width=qr.size*scale;const image=new Uint8ClampedArray(width*width*4).fill(255);
  for(const square of qr.path.matchAll(/M(\d+) (\d+)h1v1h-1z/g)){
    const x=Number(square[1])*scale;const y=Number(square[2])*scale;
    for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const i=((y+dy)*width+x+dx)*4;image[i]=image[i+1]=image[i+2]=0;}
  }
  assert.equal(jsQR(image,width,width)?.data,payload);
});
