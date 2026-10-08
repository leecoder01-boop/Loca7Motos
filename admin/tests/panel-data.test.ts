import { test } from "node:test";
import assert from "node:assert/strict";
import { presentSnapshot, snapshotSchema, type Snapshot } from "../src/lib/panel-data";

const id = (n:number) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const created_at = "2026-10-01T12:00:00+00:00";
function fixture():Snapshot {
  return snapshotSchema.parse({referenceDate:"2026-10-04",clientes:[{id:id(1),nome:"Cliente Teste",cpf:"00000000000",cnh:"00000000000",telefone:"Teste",endereco:"Teste",created_at}],motos:[{id:id(2),marca:"Honda",modelo:"CG",ano:2025,placa:"TST1A23",valor_locacao:85,status:"alugada",quilometragem:100,created_at}],contratos:[{id:id(3),cliente_id:id(1),moto_id:id(2),data_inicio:"2026-10-01",data_vencimento:"2026-10-04",valor:255,status:"vencendo",created_at}],pagamentos:[{id:id(4),contrato_id:id(3),valor:255.75,data_vencimento:"2026-10-03",data_pagamento:null,status:"pendente",created_at}]});
}
test("indicadores e alertas respeitam hoje, atraso e pagamentos com centavos",() => {
  const data = presentSnapshot(snapshotSchema.parse(fixture()));
  assert.equal(data.daysUntil("2026-10-04"),0);
  assert.equal(data.rentalStatus(data.rentals[0]),"Vencendo hoje");
  assert.equal(data.pendingPayments.reduce((n,p)=>n+p.amount,0),255.75);
  assert.equal(data.alerts.length,2);
  assert.equal(data.alerts[0].status,"Pagamento atrasado");
});
test("pagamento em aberto continua alertando após finalização; pago não alerta",() => {
  const snapshot = fixture(); snapshot.contratos[0].status = "finalizado";
  let data = presentSnapshot(snapshot);
  assert.equal(data.alerts.length,1);
  assert.equal(data.alerts[0].kind,"pagamento");
  snapshot.pagamentos[0].status="pago"; snapshot.pagamentos[0].data_pagamento="2026-10-04";
  data=presentSnapshot(snapshot);
  assert.equal(data.alerts.length,0);
  assert.equal(data.pendingPayments.length,0);
  assert.equal(data.receivedPayments.length,1);
});
test("janela de três dias inclui limite e exclui o quarto dia",() => {
  const snapshot=fixture(); snapshot.pagamentos=[];
  snapshot.contratos[0].data_vencimento="2026-10-07";
  assert.equal(presentSnapshot(snapshot).alerts.length,1);
  snapshot.contratos[0].data_vencimento="2026-10-08";
  assert.equal(presentSnapshot(snapshot).alerts.length,0);
});
test("base vazia não injeta dados fictícios",() => {
  const data=presentSnapshot({referenceDate:"2026-10-04",clientes:[],motos:[],contratos:[],pagamentos:[]});
  assert.equal(data.motorcycles.length,0);assert.equal(data.alerts.length,0);assert.equal(data.pendingPayments.length,0);
});

test('contrato cancelado não conta como aberto nem produz alerta de devolução',()=>{
  const snapshot=fixture();snapshot.pagamentos=[];snapshot.contratos[0].status='cancelado';
  const data=presentSnapshot(snapshot);assert.equal(data.rentals[0].closed,true);assert.equal(data.rentalStatus(data.rentals[0]),'Cancelado');assert.equal(data.alerts.length,0);
});
test('cancelado é excluído; recebido no mês usa data de pagamento, não vencimento',()=>{
  const snapshot=fixture();
  snapshot.pagamentos[0].status='cancelado';
  assert.equal(presentSnapshot(snapshot).totalPending,0);
  assert.equal(presentSnapshot(snapshot).alerts.filter(a=>a.kind==='pagamento').length,0);
  snapshot.pagamentos[0].status='pago';snapshot.pagamentos[0].data_pagamento='2026-09-30';
  assert.equal(presentSnapshot(snapshot).totalReceivedMonth,0);
  snapshot.pagamentos[0].data_pagamento='2026-10-01';snapshot.pagamentos[0].data_vencimento='2026-09-01';
  assert.equal(presentSnapshot(snapshot).totalReceivedMonth,255.75);
  assert.equal(presentSnapshot(snapshot).latePayments.length,0);
});
test('atraso manual permanece nos alertas mesmo fora da janela de sete dias',()=>{
  const snapshot=fixture();snapshot.pagamentos[0].status='atrasado';snapshot.pagamentos[0].data_vencimento='2026-12-01';
  const panel=presentSnapshot(snapshot);
  assert.equal(panel.latePayments.length,1);assert.equal(panel.alerts.filter(a=>a.kind==='pagamento').length,1);
});
