import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {motoInputSchema,motoRecordSchema,matchesMoto,parsePrice,motoError} from '../src/lib/motos';
import {presentSnapshot,snapshotSchema} from '../src/lib/panel-data';
const fixture={marca:'Teste',modelo:'Modelo fictício',ano:'2026',placa:' tst-1234 ',cor:'Azul',quilometragem:'1200',valor_locacao:'1.250,75',tipo_valor:'mensalidade',status:'disponivel',observacoes:'Fixture sintética'};
test('moto normaliza placa, valores brasileiros e inteiros',()=>{
  const parsed=motoInputSchema.parse(fixture);
  assert.equal(parsed.placa,'TST1234');assert.equal(parsed.valor_locacao,1250.75);assert.equal(parsed.ano,2026);assert.equal(parsed.quilometragem,1200);
  assert.equal(parsed.publicado,true);assert.equal(parsed.foto_url,null);
  assert.equal(motoInputSchema.parse({...fixture,foto_url:'https://cdn.example.invalid/moto.jpg',publicado:'false'}).publicado,false);
  assert.equal(motoInputSchema.parse({...fixture,foto_url:'https://cdn.example.invalid/moto.jpg'}).foto_url,'https://cdn.example.invalid/moto.jpg');
  assert.equal(motoInputSchema.parse({...fixture,placa:'tst1a23'}).placa,'TST1A23');
  assert.equal(motoInputSchema.parse({...fixture,tipo_valor:'semanal'}).tipo_valor,'semanal');
  for(const [raw,expected] of [['85,90',85.9],['85.90',85.9],['0',0],['1.000',1000],['1.250,75',1250.75]] as const) assert.equal(parsePrice(raw),expected);
});
test('moto rejeita dados inválidos sem converter vazio em zero',()=>{
  for(const [field,value] of Object.entries({marca:'',modelo:'',ano:'1800',placa:'ABC12',quilometragem:'-1',valor_locacao:'',tipo_valor:'anual',status:'reservada',observacoes:'x'.repeat(5001)})) assert.equal(motoInputSchema.safeParse({...fixture,[field]:value}).success,false,field);
  for(const foto_url of ['http://cdn.example.invalid/moto.jpg','javascript:alert(1)','x'.repeat(2049)]) assert.equal(motoInputSchema.safeParse({...fixture,foto_url}).success,false,`foto_url ${foto_url.slice(0,20)}`);
  for(const value of ['1,234','-10','NaN','Infinity','85.9999','1e3','10000000000','1.25,00']) assert.equal(motoInputSchema.safeParse({...fixture,valor_locacao:value}).success,false,value);
  for(const value of ['','1.5','2147483648']) assert.equal(motoInputSchema.safeParse({...fixture,quilometragem:value}).success,false,value);
  assert.equal(motoInputSchema.safeParse({...fixture,ano:String(new Date().getFullYear()+2)}).success,false);
});
test('busca por modelo/placa ignora acentos, hífen e caixa',()=>{
  const moto=motoRecordSchema.parse({...motoInputSchema.parse(fixture),id:'00000000-0000-4000-8000-000000000001',created_at:'2026-10-04T12:00:00+00:00'});
  for(const query of ['ficticio','tst-1234','TST1234','']) assert.equal(matchesMoto(moto,query),true);
  assert.equal(matchesMoto(moto,'inexistente'),false);
  assert.match(motoError('23505'),/placa/);assert.match(motoError('23503'),/contratos/);
});
test('snapshot aceita quatro status sem contar indisponível como disponível ou alugada',()=>{
  const snapshot=snapshotSchema.parse({referenceDate:'2026-10-04',clientes:[],contratos:[],pagamentos:[],motos:Object.keys({disponivel:1,alugada:1,manutencao:1,indisponivel:1}).map((status,index)=>({...motoInputSchema.parse(fixture),id:`00000000-0000-4000-8000-00000000000${index+1}`,status,created_at:'2026-10-04T12:00:00+00:00'}))});
  const data=presentSnapshot(snapshot);assert.equal(data.motorcycles.filter(item=>item.status === 'Disponível').length,1);assert.equal(data.motorcycles.filter(item=>item.status === 'Alugada').length,1);assert.equal(data.motorcycles[3].status,'Indisponível');
});
test('cadastro de motos exige papel de painel; arquivar/restaurar exige admin e confirmação',async()=>{
  const source=await readFile(new URL('../src/app/motos/actions.ts',import.meta.url),'utf8');
  assert.equal((source.match(/await requirePanelUser\(\)/g)??[]).length,1);assert.equal((source.match(/await requireAdmin\(\)/g)??[]).length,2);assert.ok(source.includes(".eq('updated_at'"));assert.ok(source.includes("form.get('confirm') !== 'arquivar'"));assert.ok(source.includes("form.get('confirm') !== 'restaurar'"));assert.ok(!source.includes(".from('motos').delete()"));assert.ok(!source.includes('service_role'));
});
