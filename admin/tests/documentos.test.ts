import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankModel,blankInspection,documentInputSchema } from '../src/lib/documentos';
const input=()=>({...blankModel(),chassi:'',renavam:'',observacoes:'',retirada:blankInspection(),devolucao:blankInspection(),aceite:{registrado:false,nome:'',data:'',meio:'',referencia:''}});
test('minuta começa com cláusulas vazias e sem aceite inventado',()=>{const v=documentInputSchema.parse(input());assert.ok(Object.values(v.clausulas).every(c=>c===''));assert.equal(v.aceite.registrado,false);});
test('aceite manual exige identificação, data, meio e referência',()=>{const v=input();v.aceite.registrado=true;assert.equal(documentInputSchema.safeParse(v).success,false);v.aceite={registrado:true,nome:'Teste',data:'2026-10-04',meio:'Papel',referencia:'Arquivo interno de teste'};assert.equal(documentInputSchema.safeParse(v).success,true);v.aceite.data='2026-02-30';assert.equal(documentInputSchema.safeParse(v).success,false);});
test('vistoria valida data, quilometragem e limite dos textos',()=>{const v=input();v.retirada.quilometragem='-1';assert.equal(documentInputSchema.safeParse(v).success,false);v.retirada.quilometragem='100';v.clausulas.danos='x'.repeat(5001);assert.equal(documentInputSchema.safeParse(v).success,false);});
