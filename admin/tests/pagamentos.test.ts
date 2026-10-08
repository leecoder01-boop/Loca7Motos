import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { paymentInputSchema,sumMoney,paymentError } from '../src/lib/pagamentos';
const fixture={contrato_id:'00000000-0000-4000-8000-000000000001',valor:'1.250,75',data_vencimento:'2026-01-01',data_pagamento:'',forma_pagamento:'pix',status:'pendente',observacoes:'Teste'};
test('pagamentos: valor em centavos e quitação integral coerente',()=>{
  assert.equal(paymentInputSchema.parse(fixture).valor,1250.75);
  assert.equal(sumMoney([0.1,0.2]),0.3);
  assert.equal(paymentInputSchema.safeParse({...fixture,status:'pago'}).success,false);
  assert.equal(paymentInputSchema.safeParse({...fixture,status:'pago',data_pagamento:'2026-01-02',forma_pagamento:''}).success,false);
  assert.equal(paymentInputSchema.parse({...fixture,status:'pago',data_pagamento:'2026-01-02'}).data_pagamento,'2026-01-02');
  assert.equal(paymentInputSchema.parse({...fixture,status:'cancelado',data_pagamento:'2026-01-02'}).data_pagamento,null);
  for(const valor of ['0','-1','1,234','abc'])assert.equal(paymentInputSchema.safeParse({...fixture,valor}).success,false);
  assert.equal(paymentInputSchema.safeParse({...fixture,data_vencimento:'2026-02-30'}).success,false);
  assert.equal(paymentInputSchema.safeParse({...fixture,status:'pago',data_pagamento:'2099-01-01'}).success,false);
  assert.match(paymentError('23505'),/já foi registrado/i);
});
test('criação exige usuário do painel, edição existente exige admin e versão idempotente',async()=>{
  const source=await readFile(new URL('../src/app/pagamentos/actions.ts',import.meta.url),'utf8');
  assert.match(source,/await requirePanelUser\(\)/);
  assert.match(source,/if\(id&&profile\.role!=='admin'\)/);
  assert.match(source,/\.eq\('updated_at',ref.data.version\)/);
  assert.match(source,/id:creation.data/);
  assert.match(source,/data_vencimento',parsed\.data\.data_vencimento/);
  assert.match(source,/status','cancelado/);
});
