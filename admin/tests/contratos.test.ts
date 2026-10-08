import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contratoInputSchema,isClosed } from '../src/lib/contratos';
const values={cliente_id:'00000000-0000-4000-8000-000000000001',moto_id:'00000000-0000-4000-8000-000000000002',data_inicio:'2026-10-04',data_vencimento:'2026-10-11',periodicidade:'semanal',valor:'350,90',caucao:'',observacoes:''};
test('contrato semanal, centavos e caução opcional',()=>{const c=contratoInputSchema.parse(values);assert.equal(c.valor,350.9);assert.equal(c.caucao,0);assert.equal(c.periodicidade,'semanal');});
test('contrato rejeita datas inexistentes, intervalo invertido e valores inválidos',()=>{for(const change of [{data_inicio:'2026-02-30'},{data_vencimento:'2026-10-03'},{valor:'1,234'},{caucao:'-5'},{cliente_id:''},{moto_id:''},{periodicidade:'anual'}])assert.equal(contratoInputSchema.safeParse({...values,...change}).success,false);});
test('encerramentos nunca voltam a status temporal',()=>{assert.equal(isClosed('cancelado'),true);assert.equal(isClosed('finalizado'),true);assert.equal(isClosed('atrasado'),false);});
