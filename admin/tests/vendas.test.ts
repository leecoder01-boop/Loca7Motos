import {test} from 'node:test';
import assert from 'node:assert/strict';
import { salesSummary,addDays } from '../src/lib/vendas';
import { paymentRecordSchema } from '../src/lib/pagamentos';
const payment=(n:number,day:string,value:number,status='pago')=>paymentRecordSchema.parse({id:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,contrato_id:'00000000-0000-4000-8000-000000000001',valor:value,data_vencimento:day,data_pagamento:status==='pago'?day:null,status,forma_pagamento:'pix',created_at:'2026-10-01T12:00:00Z'});
test('vendas: períodos civis alinhados, recebido hoje e comparação sem receita inventada',()=>{
  const sales=salesSummary([payment(1,'2026-10-04',100.25),payment(2,'2026-09-28',50),payment(3,'2026-09-27',20),payment(4,'2026-10-04',999,'cancelado'),payment(5,'2026-10-05',100),payment(6,'2026-10-04',888,'pendente')],'2026-10-04',7);
  assert.equal(sales.start,'2026-09-28');assert.equal(sales.previousStart,'2026-09-21');assert.equal(sales.previousEnd,'2026-09-27');
  assert.equal(sales.total,150.25);assert.equal(sales.previousTotal,20);assert.equal(sales.receivedToday,100.25);assert.equal(sales.count,2);
  assert.equal(sales.methods[0].amount,150.25);assert.equal(sales.daily[6].previousDay,'2026-09-27');assert.equal(sales.daily[6].amount,100.25);
});
test('vendas: estado vazio, centavos, limites de mês e virada de ano',()=>{
  assert.equal(addDays('2026-01-01',-1),'2025-12-31');assert.equal(addDays('2024-03-01',-1),'2024-02-29');
  const empty=salesSummary([],'2026-01-01',30);assert.equal(empty.daily.length,30);assert.equal(empty.total,0);assert.equal(empty.change,null);assert.equal(empty.average,0);
  const cents=salesSummary([payment(1,'2026-01-01',0.1),payment(2,'2026-01-01',0.2)],'2026-01-01',7);assert.equal(cents.total,0.3);assert.equal(cents.average,0.15);
});
