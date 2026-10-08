import {test} from 'node:test';
import assert from 'node:assert/strict';
import {snapshotSchema,type Snapshot} from '../src/lib/panel-data';
import {chargeContext,whatsappLink} from '../src/lib/whatsapp';
import {whatsappNumber,empresaInputSchema} from '../src/lib/empresa';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const created_at='2026-10-01T12:00:00+00:00';
function fixture():Snapshot{return snapshotSchema.parse({referenceDate:'2026-10-05',empresa:{id:1,nome:'Locadora fictícia',telefone:'',chave_pix:'teste@example.invalid',tipo_chave_pix:'email',nome_recebedor:'Recebedor fictício',cidade:'',updated_at:created_at},clientes:[{id:id(1),nome:'Cliente & Teste',cpf:'00000000000',cnh:'00000000000',telefone:'11999999999',whatsapp:'',endereco:'Teste',created_at}],motos:[{id:id(2),marca:'Teste',modelo:'Moto',ano:2026,placa:'TST1A23',quilometragem:0,valor_locacao:999,status:'alugada',created_at}],contratos:[{id:id(3),cliente_id:id(1),moto_id:id(2),data_inicio:'2026-10-01',data_vencimento:'2026-10-08',valor:999,status:'ativo',created_at}],pagamentos:[{id:id(4),contrato_id:id(3),valor:350.75,data_vencimento:'2026-10-05',data_pagamento:null,status:'pendente',created_at}]});}
test('normaliza WhatsApp brasileiro com DDD sem duplicar país e rejeita inválidos',()=>{
  for(const n of ['(11) 99999-9999','+55 (11) 99999-9999','5511999999999'])assert.equal(whatsappNumber(n),'5511999999999');
  assert.equal(whatsappNumber('55999999999'),'5555999999999');assert.equal(whatsappNumber('1133334444'),'551133334444');
  for(const n of ['','123','00000000000','texto11999999999','+44999999999'])assert.equal(whatsappNumber(n),null);
});
test('mensagem usa pagamento real e encode preserva acentos, &, quebras e Pix',()=>{
  const s=fixture();const c=chargeContext(s,id(3),id(4));assert.equal(c.reason,'');assert.match(c.message,/350,75/);assert.doesNotMatch(c.message,/999,00/);assert.match(c.message,/05\/10\/2026/);assert.match(c.message,/teste@example.invalid/);
  const url=new URL(whatsappLink(c.phone!,c.message)!);assert.equal(url.pathname,'/5511999999999');assert.equal(url.searchParams.get('text'),c.message);assert.match(c.message,/Cliente & Teste/);
  assert.equal(whatsappLink('invalid','test'),null);assert.equal(whatsappLink(c.phone!,' '),null);
});
test('WhatsApp preferencial, múltiplos lançamentos, fechado com dívida e sem cobrança duplicada',()=>{
  const s=fixture();s.clientes[0].whatsapp='21999999999';s.contratos[0].status='finalizado';s.pagamentos.push({...s.pagamentos[0],id:id(5),valor:100,data_vencimento:'2026-10-10'});
  const c=chargeContext(s,id(3));assert.equal(c.payment?.id,id(4));assert.equal(c.phone,'5521999999999');assert.match(c.message,/350,75/);assert.equal(chargeContext(s,id(3),id(5)).payment?.valor,100);
  s.pagamentos[0].status='pago';s.pagamentos[0].data_pagamento='2026-10-05';assert.ok(chargeContext(s,id(3),id(4)).reason);s.pagamentos[1].status='cancelado';assert.match(chargeContext(s,id(3)).reason,/Não há pagamento/);
});
test('não inventa dívida, telefone ou Pix quando cadastro está incompleto',()=>{
  const s=fixture();s.empresa!.chave_pix='';assert.match(chargeContext(s,id(3)).reason,/Configure/);assert.equal(chargeContext(s,id(3)).message,'');s.clientes[0].telefone='';assert.match(chargeContext(s,id(3)).reason,/Cadastre/);s.pagamentos=[];assert.match(chargeContext(s,id(3)).reason,/Não há pagamento/);assert.ok(chargeContext(s,id(99)).reason);
});
test('configurações validam tipo, chave, recebedor e telefone sem obrigar Pix fictício',()=>{
  const v=fixture().empresa!;assert.ok(empresaInputSchema.safeParse(v).success);assert.ok(empresaInputSchema.safeParse({...v,chave_pix:'',nome_recebedor:'',tipo_chave_pix:''}).success);
  for(const change of [{nome:''},{telefone:'123'},{tipo_chave_pix:''},{nome_recebedor:''},{chave_pix:'inválido'},{tipo_chave_pix:'telefone',chave_pix:'11999999999'}])assert.equal(empresaInputSchema.safeParse({...v,...change}).success,false);
  assert.ok(empresaInputSchema.safeParse({...v,tipo_chave_pix:'telefone',chave_pix:'+5511999999999'}).success);
});
