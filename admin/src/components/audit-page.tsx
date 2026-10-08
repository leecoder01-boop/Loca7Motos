'use client';

import {useMemo,useState} from 'react';
import {History,Search,ShieldCheck,UserRound} from 'lucide-react';
import {PageHeading} from '@/components/page-parts';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {type AuditLog} from '@/lib/auditoria';

const entityLabels:Record<AuditLog['entidade'],string>={cliente:'Cliente',moto:'Moto',contrato:'Contrato',pagamento:'Pagamento',usuario:'Usuário',empresa:'Empresa'};
const actionLabels:Record<string,string>={
  cliente_criado:'Cliente criado',cliente_alterado:'Cliente editado',cliente_status_alterado:'Status do cliente alterado',cliente_excluido:'Cliente excluído',
  moto_criado:'Moto cadastrada',moto_alterado:'Moto editada',moto_status_alterado:'Status da moto alterado',moto_excluido:'Moto excluída',
  contrato_criado:'Locação criada',contrato_alterado:'Locação alterada',contrato_status_alterado:'Status da locação alterado',contrato_finalizado:'Locação finalizada',contrato_cancelado:'Locação cancelada',contrato_excluido:'Locação excluída',
  pagamento_criado:'Pagamento registrado',pagamento_alterado:'Pagamento alterado',pagamento_status_alterado:'Status do pagamento alterado',pagamento_excluido:'Pagamento excluído',
  usuario_criado:'Usuário criado',usuario_alterado:'Usuário editado',usuario_permissoes_alteradas:'Acesso ou papel alterado',usuario_excluido:'Usuário removido',
  empresa_configuracao_alterada:'Configuração da empresa alterada',
};
const dateTime=(value:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value));

export function AuditPage({logs,loadError}:{logs:AuditLog[];loadError?:string}){
  const [entity,setEntity]=useState('todos');const [query,setQuery]=useState('');
  const rows=useMemo(()=>{
    const term=query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return logs.filter(log=>{
      if(entity!=='todos'&&log.entidade!==entity)return false;
      if(!term)return true;
      return `${log.usuario_nome} ${log.role} ${log.acao} ${log.entidade} ${log.registro_id??''} ${log.resumo}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term);
    });
  },[logs,entity,query]);

  return <>
    <PageHeading title="Histórico de auditoria" description="Ações importantes registradas com responsável, horário e resumo seguro."><span className="flex items-center gap-2 text-xs"><History size={16}/>{logs.length} eventos recentes</span></PageHeading>
    {loadError?<p role="alert" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{loadError}</p>:<p className="panel-context mb-5 text-xs leading-relaxed">Mostrando os 200 registros mais recentes. Senhas, dados pessoais detalhados, tokens e chaves de API não são gravados no resumo.</p>}
    <Card className="module-table-panel gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold">Atividade do sistema</h2><p className="mt-1 text-[10px] text-slate-500">Histórico somente para leitura</p></div><span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-800">ADMIN</span></div>
      <div className="flex flex-wrap gap-3 p-5"><div className="relative min-w-0 flex-1 basis-[220px]"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><Input aria-label="Buscar no histórico" placeholder="Buscar usuário, ação ou registro…" value={query} onChange={event=>setQuery(event.target.value)} className="h-10 bg-white pl-9 text-xs shadow-none"/></div><select className="filter-select" aria-label="Filtrar por tipo de registro" value={entity} onChange={event=>setEntity(event.target.value)}><option value="todos">Todos os registros</option>{Object.entries(entityLabels).map(([value,label])=><option value={value} key={value}>{label}s</option>)}</select></div>
      <div className="table-scroll border-t border-slate-100" role="region" aria-label="Eventos de auditoria" tabIndex={0}><table><caption className="sr-only">Eventos de auditoria, mais recentes primeiro</caption><thead><tr>{['Data e hora','Responsável','Ação','Registro','Resumo'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(log=><tr key={log.id}><td className="whitespace-nowrap text-xs tabular-nums">{dateTime(log.created_at)}</td><td><div className="flex min-w-[140px] items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">{log.role==='admin'?<ShieldCheck size={14}/>:<UserRound size={14}/>}</span><div><p className="text-xs font-semibold">{log.usuario_nome}</p><p className="mt-0.5 text-[10px] text-slate-500">{log.role==='admin'?'Admin':log.role==='atendente'?'Atendente':'Sistema'}</p></div></div></td><td className="whitespace-nowrap text-xs font-medium">{actionLabels[log.acao]??log.acao.replaceAll('_',' ')}</td><td><span className="text-xs">{entityLabels[log.entidade]}</span><code className="ml-2 text-[10px] text-slate-500" title={log.registro_id??undefined}>{log.registro_id?log.registro_id.slice(0,8):'—'}</code></td><td className="min-w-[210px] max-w-[420px] text-xs leading-relaxed text-slate-600">{log.resumo}</td></tr>)}{!rows.length&&<tr><td colSpan={5} className="py-12 text-center text-xs text-slate-500">{logs.length?'Nenhum evento corresponde à busca.':'Ainda não há eventos registrados.'}</td></tr>}</tbody></table></div>
      <p role="status" className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">{rows.length} de {logs.length} eventos exibidos · Mais recentes primeiro</p>
    </Card>
  </>;
}
