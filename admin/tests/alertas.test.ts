import {test} from 'node:test';
import assert from 'node:assert/strict';
import {snapshotSchema,type Snapshot} from '../src/lib/panel-data';
import {buildOperationAlerts,alertTiming} from '../src/lib/alertas';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const created_at='2026-10-01T12:00:00+00:00';
function fixture():Snapshot{return snapshotSchema.parse({referenceDate:'2026-10-05',resolucoes:[],clientes:[{id:id(1),nome:'Cliente fictício',cpf:'00000000000',cnh:'00000000000',telefone:'Teste',endereco:'Teste',validade_cnh:'2026-11-04',created_at}],motos:[{id:id(2),marca:'Teste',modelo:'Moto',ano:2026,placa:'TST1A23',quilometragem:0,valor_locacao:350,status:'manutencao',created_at}],contratos:[{id:id(3),cliente_id:id(1),moto_id:id(2),data_inicio:'2026-10-01',data_vencimento:'2026-10-08',valor:350,status:'ativo',created_at}],pagamentos:[{id:id(4),contrato_id:id(3),valor:350,data_vencimento:'2026-10-05',data_pagamento:null,status:'pendente',created_at}]});}
test('alertas incluem limites de 3 dias, hoje, CNH 30 dias e manutenção sem prazo inventado',()=>{
  const s=fixture();const alerts=buildOperationAlerts(s);assert.equal(alerts.length,4);
  assert.equal(alerts.find(a=>a.group==='contratos')?.days,3);
  assert.equal(alerts.find(a=>a.group==='pagamentos')?.days,0);
  assert.equal(alerts.find(a=>a.group==='clientes')?.days,30);
  const maintenance=alerts.find(a=>a.group==='motos')!;assert.equal(maintenance.due,null);assert.equal(maintenance.priority,'informativo');assert.equal(maintenance.clientId,undefined);
  assert.equal(alertTiming(maintenance),'Sem prazo cadastrado');
  s.contratos[0].data_vencimento='2026-10-09';s.clientes[0].validade_cnh='2026-11-05';s.pagamentos[0].data_vencimento='2026-10-06';assert.equal(buildOperationAlerts(s).length,1);
});
test('atrasos são urgentes, hoje atenção, CNH vencida urgente; ordenação por prioridade',()=>{
  const s=fixture();s.contratos[0].data_vencimento='2026-10-05';s.pagamentos[0].data_vencimento='2026-10-04';s.clientes[0].validade_cnh='2026-10-04';
  const alerts=buildOperationAlerts(s);assert.equal(alerts[0].priority,'urgente');assert.equal(alerts[1].priority,'urgente');assert.equal(alerts.find(a=>a.group==='contratos')?.title,'Contrato vencendo hoje');assert.equal(alerts.find(a=>a.group==='contratos')?.priority,'atencao');assert.equal(alerts.at(-1)?.priority,'informativo');
});
test('corrigir origem remove alerta; pagamento pendente ainda alerta após encerramento',()=>{
  const s=fixture();s.contratos[0].status='finalizado';s.clientes[0].validade_cnh='2028-01-01';s.motos[0].status='disponivel';
  assert.deepEqual(buildOperationAlerts(s).map(a=>a.group),['pagamentos']);
  s.pagamentos[0].status='pago';s.pagamentos[0].data_pagamento=s.referenceDate;assert.equal(buildOperationAlerts(s).length,0);
  s.pagamentos[0].status='cancelado';assert.equal(buildOperationAlerts(s).length,0);
});
test('resolução é por versão e dia, sem quitar dívida; reaparece se origem mudar ou no dia seguinte',()=>{
  const s=fixture();const alert=buildOperationAlerts(s).find(a=>a.group==='pagamentos')!;
  s.resolucoes=[{alerta_id:alert.id,versao:alert.version,data_referencia:s.referenceDate,resolvido_por:id(10),observacao:'Tratado no teste',created_at}];
  assert.equal(buildOperationAlerts(s).find(a=>a.id===alert.id)?.resolved,true);assert.equal(s.pagamentos[0].status,'pendente');
  s.pagamentos[0].updated_at='2026-10-05T12:01:00+00:00';assert.equal(buildOperationAlerts(s).find(a=>a.id===alert.id)?.resolved,false);
  delete s.pagamentos[0].updated_at;s.referenceDate='2026-10-06';assert.equal(buildOperationAlerts(s).find(a=>a.id===alert.id)?.resolved,false);
});
test('não duplica CNH e manutenção mesmo com múltiplos contratos; atraso manual mantém urgência',()=>{
  const s=fixture();s.contratos.push({...s.contratos[0],id:id(5)});s.pagamentos[0].status='atrasado';s.pagamentos[0].data_vencimento='2026-12-01';
  const alerts=buildOperationAlerts(s);assert.equal(alerts.filter(a=>a.group==='clientes').length,1);assert.equal(alerts.filter(a=>a.group==='motos').length,1);assert.equal(new Set(alerts.map(a=>a.id)).size,alerts.length);assert.match(alertTiming(alerts.find(a=>a.group==='pagamentos')!),/registrado manualmente/);
});
test('CNH sem validade e base vazia não inventam alertas',()=>{
  const s=fixture();s.clientes[0].validade_cnh=null;assert.equal(buildOperationAlerts(s).some(a=>a.group==='clientes'),false);
  assert.deepEqual(buildOperationAlerts({referenceDate:'2026-10-05',clientes:[],motos:[],contratos:[],pagamentos:[]}),[]);
});
