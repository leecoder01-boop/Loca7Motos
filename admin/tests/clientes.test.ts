import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {clienteInputSchema,clienteRecordSchema,validCpf,matchesCliente,clientError} from '../src/lib/clientes';

const fixture={nome:'Cliente de Teste',cpf:'000.000.001-91',telefone:'(11) 99999-9999',whatsapp:'',email:'teste@example.invalid',endereco:'Endereço de teste',cidade:'São Paulo',estado:'SP',cep:'00000-000',cnh:'00000000000',categoria_cnh:'AB',validade_cnh:'2030-01-01',data_nascimento:'1990-01-01',observacoes:'Teste',status:'ativo'};
test('validação de cliente normaliza documentos, telefones, CEP e opcionais',()=>{
  const result=clienteInputSchema.parse(fixture);
  assert.equal(result.cpf,'00000000191');assert.equal(result.telefone,'11999999999');assert.equal(result.cep,'00000000');
  assert.equal(clienteInputSchema.parse({...fixture,validade_cnh:'',data_nascimento:''}).data_nascimento,null);
  assert.equal(validCpf('11111111111'),false);assert.equal(validCpf('00000000192'),false);
});
test('rejeita entradas inválidas no servidor',()=>{
  for(const [field,value] of Object.entries({nome:'',cpf:'11111111111',telefone:'123',whatsapp:'123',email:'invalido',estado:'XX',cep:'123',cnh:'123',categoria_cnh:'X',validade_cnh:'2030-02-30',data_nascimento:'2099-01-01',status:'invalido',observacoes:'x'.repeat(5001)})) {
    assert.equal(clienteInputSchema.safeParse({...fixture,[field]:value}).success,false,field);
  }
});
test('busca ignora acentos e pontuação em CPF e telefone',()=>{
  const cliente=clienteRecordSchema.parse({...clienteInputSchema.parse(fixture),id:'00000000-0000-4000-8000-000000000001',nome:'João Teste',created_at:'2026-10-04T12:00:00+00:00'});
  for(const q of ['joao','000.000.001-91','(11) 99999']) assert.equal(matchesCliente(cliente,q),true);
  assert.equal(matchesCliente(cliente,'Maria'),false);
  assert.match(clientError('23505'),/CPF/);assert.match(clientError('23503'),/contratos/);
});
test('cadastro exige papel de painel; arquivar/restaurar exige admin e confirmação',async()=>{
  const source=await readFile(new URL('../src/app/clientes/actions.ts',import.meta.url),'utf8');
  assert.equal((source.match(/await requirePanelUser\(\)/g) ?? []).length,1);
  assert.equal((source.match(/await requireAdmin\(\)/g) ?? []).length,2);
  assert.ok(source.includes(".eq('updated_at'"));
  assert.ok(source.includes("form.get('confirm') !== 'arquivar'"));
  assert.ok(source.includes("form.get('confirm') !== 'restaurar'"));
  assert.ok(!source.includes(".from('clientes').delete()"));
  assert.ok(!source.includes('service_role'));
});
