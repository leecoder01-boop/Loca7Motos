import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loginErrorMessage} from '../src/lib/login-errors';

test('login distingue confirmação, credenciais, limite e indisponibilidade',()=>{
  assert.match(loginErrorMessage({code:'email_not_confirmed',status:400}),/ainda não foi confirmado/);
  assert.match(loginErrorMessage({code:'invalid_credentials',status:400}),/E-mail ou senha não foram aceitos/);
  assert.match(loginErrorMessage({status:429}),/Muitas tentativas/);
  assert.match(loginErrorMessage({name:'AuthRetryableFetchError',status:0}),/conexão falhou/);
  assert.match(loginErrorMessage({status:503}),/indisponível/);
  assert.match(loginErrorMessage({code:'request_timeout'}),/indisponível/);
  assert.match(loginErrorMessage({code:'unknown'}),/configuração de login/);
});
test('login usa a action nativa do React, preserva os campos e não salva senha localmente',()=>{
  const source=readFileSync(new URL('../src/components/login-form.tsx',import.meta.url),'utf8');
  assert.match(source,/<form action=\{action\}/);
  assert.match(source,/value=\{email\} onChange=/);
  assert.match(source,/value=\{password\} onChange=/);
  assert.doesNotMatch(source,/preventDefault\(\)|startTransition\(/);
  assert.doesNotMatch(source,/localStorage|sessionStorage/);
  const action=readFileSync(new URL('../src/app/login/actions.ts',import.meta.url),'utf8');
  assert.match(action,/return \{error:"",success:true\}/);
  assert.match(source,/if\(state\.success\)window\.location\.assign\("\/admin\/clientes\/"\)/);
  const message=loginErrorMessage({code:'unknown',...{message:'private-internal-details'}});
  assert.doesNotMatch(message,/private-internal-details/);
});
