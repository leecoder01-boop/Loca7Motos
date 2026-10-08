"use client";
import { OperationBrief } from "./operation-brief";

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Eye, Pencil, Trash2, Users, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { PageHeading, Status, DetailDialog, type Detail } from './page-parts';
import { usePanelData } from './panel-provider';
import { date, initials } from '@/lib/panel-data';
import { estados, categorias, matchesCliente, cpfDisplay, type Cliente, type ClienteResult, type ClienteValues } from '@/lib/clientes';
import { saveCliente, deleteCliente, restoreCliente } from '@/app/clientes/actions';

const groups:{title:string;fields:{name:keyof ClienteValues;label:string;type?:string;required?:boolean;max?:number;placeholder?:string}[]}[] = [
  {title:'Dados pessoais',fields:[{name:'nome',label:'Nome completo',required:true,max:200},{name:'cpf',label:'CPF',required:true,max:20,placeholder:'000.000.000-00'},{name:'data_nascimento',label:'Data de nascimento',type:'date'}]},
  {title:'Contato',fields:[{name:'telefone',label:'Telefone',required:true,type:'tel',max:30,placeholder:'(11) 99999-9999'},{name:'whatsapp',label:'WhatsApp',type:'tel',max:30},{name:'email',label:'E-mail',type:'email',max:254}]},
  {title:'Endereço',fields:[{name:'endereco',label:'Endereço',required:true,max:500,placeholder:'Rua, número, complemento e bairro'},{name:'cidade',label:'Cidade',max:120},{name:'estado',label:'Estado'},{name:'cep',label:'CEP',max:12,placeholder:'00000-000'}]},
  {title:'Habilitação',fields:[{name:'cnh',label:'Número da CNH',required:true,max:20},{name:'categoria_cnh',label:'Categoria da CNH'},{name:'validade_cnh',label:'Validade da CNH',type:'date'}]},
  {title:'Informações da locadora',fields:[{name:'status',label:'Status'},{name:'observacoes',label:'Observações',max:5000}]},
];
const empty = ():ClienteValues => ({nome:'',cpf:'',telefone:'',whatsapp:'',email:'',endereco:'',cidade:'',estado:'',cep:'',cnh:'',categoria_cnh:'',validade_cnh:'',data_nascimento:'',observacoes:'',status:'ativo'});
const controlClass='h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-none focus-visible:outline-2 focus-visible:outline-ring aria-invalid:border-destructive';

function ClienteForm({cliente,onCancel,onSaved,onBusy,canAdmin}: {cliente:Cliente|null;onCancel:()=>void;onSaved:(message:string)=>void;onBusy:(busy:boolean)=>void;canAdmin:boolean}) {
  const [values,setValues]=useState<ClienteValues>(() => cliente ? {...empty(),...cliente,estado:cliente.estado as ClienteValues['estado'],categoria_cnh:cliente.categoria_cnh as ClienteValues['categoria_cnh'],validade_cnh:cliente.validade_cnh ?? '',data_nascimento:cliente.data_nascimento ?? ''} : empty());
  const [result,setResult]=useState<ClienteResult|null>(null);
  const [pending,startTransition]=useTransition();
  const summary=useRef<HTMLDivElement>(null);
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(pending) return;
    const form=new FormData(event.currentTarget);
    onBusy(true);
    startTransition(async()=>{
      try {
        const response=await saveCliente(form);
        if(response.ok) onSaved(response.message);
        else {setResult(response);requestAnimationFrame(()=>summary.current?.focus());}
      } catch {setResult({ok:false,message:'Não foi possível salvar. Sua sessão pode ter expirado. Recarregue a página e tente novamente.'});requestAnimationFrame(()=>summary.current?.focus());}
      finally {onBusy(false);}
    });
  }
  return <form onSubmit={submit} className="space-y-5">
    {cliente && <><input type="hidden" name="id" value={cliente.id}/><input type="hidden" name="version" value={cliente.updated_at ?? ''}/></>}
    <p className="text-xs text-slate-500">Campos com * são obrigatórios. WhatsApp é apenas um contato, sem envio automático.</p>
    {result && <div ref={summary} tabIndex={-1} role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{result.message}</div>}
    <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
      {groups.map(group => <fieldset key={group.title} className="border-t border-slate-100 pt-4"><legend className="px-1 text-sm font-semibold">{group.title}</legend><div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">{group.fields.map(field => {
        const error=result?.errors?.[field.name]?.[0];
        const id=`cliente-${field.name}`;
        const props={id,name:field.name,value:values[field.name],onChange:(event:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setValues(current=>({...current,[field.name]:event.target.value})),required:field.required,'aria-invalid':!!error,'aria-describedby':error ? `${id}-error` : undefined};
        const options=field.name === 'estado' ? estados : field.name === 'categoria_cnh' ? categorias : null;
        return <div key={field.name} className={['nome','endereco','observacoes'].includes(field.name) ? 'sm:col-span-2' : ''}><label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">{field.label}{field.required ? ' *' : ''}</label>
          {field.name === 'status' ? canAdmin?<select {...props} className={controlClass}><option value="ativo">Ativo</option><option value="bloqueado">Bloqueado</option></select>:<><input type="hidden" name="status" value={values.status}/><p className={`${controlClass} flex items-center text-slate-500`}>{values.status==='ativo'?'Ativo':'Bloqueado'} · somente administrador altera</p></>
            : options ? <select {...props} className={controlClass}><option value="">Não informado</option>{options.map(option=><option key={option}>{option}</option>)}</select>
            : field.name === 'observacoes' ? <textarea {...props} rows={3} maxLength={field.max} className={`${controlClass} h-auto min-h-24 py-2`}/>
            // Datas nativas usam o valor do formulário: preservar segmentos durante digitação/seleção.
            : field.type === 'date' ? <Input {...props} type="date" value={undefined} onChange={undefined} defaultValue={values[field.name]} min="1900-01-01" max={field.name === 'data_nascimento' ? new Date().toISOString().slice(0,10) : '2100-12-31'} className={controlClass}/>
            : <Input {...props} type={field.type ?? 'text'} maxLength={field.max} placeholder={field.placeholder} inputMode={['cpf','cnh','cep'].includes(field.name) ? 'numeric' : undefined} className={controlClass}/>}
          {error && <p id={`${id}-error`} className="mt-1 text-xs text-rose-700">{error}</p>}
        </div>;
      })}</div></fieldset>)}
    </fieldset>
    <div className="sticky -bottom-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white py-4"><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? 'Salvando…' : cliente ? 'Salvar alterações' : 'Cadastrar cliente'}</Button></div>
  </form>;
}

function ArchiveForm({cliente,onCancel,onDeleted,onBusy,restore=false}: {cliente:Cliente;onCancel:()=>void;onDeleted:(message:string)=>void;onBusy:(busy:boolean)=>void;restore?:boolean}) {
  const [result,setResult]=useState<ClienteResult|null>(null);
  const [pending,startTransition]=useTransition();
  return <form onSubmit={event=>{
    event.preventDefault(); if(pending) return;
    const form=new FormData(event.currentTarget);
    onBusy(true);
    startTransition(async()=>{try {const response=restore?await restoreCliente(form):await deleteCliente(form);if(response.ok) onDeleted(response.message);else setResult(response);}catch {setResult({ok:false,message:'Não foi possível concluir. Recarregue a página e tente novamente.'});}finally {onBusy(false);}});
  }} className="space-y-4">
    <input type="hidden" name="id" value={cliente.id}/><input type="hidden" name="version" value={cliente.updated_at ?? ''}/><input type="hidden" name="confirm" value={restore?'restaurar':'arquivar'}/>
    <p className="text-sm text-slate-600">{restore?<>Restaurar <strong>{cliente.nome}</strong> (CPF {cpfDisplay(cliente.cpf)}) para a lista ativa?</>:<>Arquivar <strong>{cliente.nome}</strong> (CPF {cpfDisplay(cliente.cpf)})? Os dados e vínculos serão preservados. Clientes com contrato aberto não podem ser arquivados.</>}</p>
    {result && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{result.message}</p>}
    <label className="flex min-h-11 items-center gap-2 text-xs text-slate-700"><input type="checkbox" required className="size-4 accent-blue-700"/>Confirmo que desejo {restore?'restaurar':'arquivar'} este cadastro.</label>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onCancel} autoFocus>Cancelar</Button><Button type="submit" variant={restore?'default':'destructive'} disabled={pending}>{pending ? 'Salvando…' : restore?'Restaurar cliente':'Arquivar cliente'}</Button></div>
  </form>;
}

function details(cliente:Cliente):Detail {
  return {title:cliente.nome,subtitle:'Cadastro do cliente',fields:[['CPF',cpfDisplay(cliente.cpf)],['Telefone',cliente.telefone],['WhatsApp',cliente.whatsapp || 'Não informado'],['E-mail',cliente.email || 'Não informado'],['Endereço',cliente.endereco],['Cidade',cliente.cidade || 'Não informada'],['Estado',cliente.estado || 'Não informado'],['CEP',cliente.cep || 'Não informado'],['CNH',cliente.cnh],['Categoria da CNH',cliente.categoria_cnh || 'Não informada'],['Validade da CNH',cliente.validade_cnh ? date(cliente.validade_cnh) : 'Não informada'],['Data de nascimento',cliente.data_nascimento ? date(cliente.data_nascimento) : 'Não informada'],['Status',cliente.status === 'ativo' ? 'Ativo' : 'Bloqueado'],['Observações',cliente.observacoes || 'Nenhuma'],['Cadastrado em',date(cliente.created_at)]]};
}

export function ClientesPage({canAdmin=true}:{canAdmin?:boolean}) {
  const {clientRecords:clientes}=usePanelData();
  const router=useRouter();
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('todos');
  const [sort,setSort]=useState('asc');
  const [modal,setModal]=useState<{kind:'new'|'edit'|'delete'|'restore';cliente:Cliente|null}|null>(null);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const newButton=useRef<HTMLButtonElement>(null);
  const activeClientes=clientes.filter(cliente=>!cliente.deleted_at);
  const rows=clientes.filter(cliente=>(status==='arquivados'?!!cliente.deleted_at:!cliente.deleted_at&&(status==='todos'||cliente.status===status))&&matchesCliente(cliente,query)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')*(sort==='asc'?1:-1));
  const done=(value:string)=>{setMessage(value);setModal(null);router.refresh();};
  const clear=()=>{setQuery('');setStatus('todos');};
  return <>
    <PageHeading title="Clientes" description="Os clientes que fazem parte da operação Loca7Moto."><Button ref={newButton} onClick={()=>{setMessage('');setModal({kind:'new',cliente:null});}}><Plus size={16}/>Novo cliente</Button></PageHeading>
    {message && <p role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <section aria-label="Resumo de clientes" className="module-summary mb-6 grid grid-cols-1 gap-0 sm:grid-cols-4">{[['Clientes ativos',activeClientes.length],['Ativos',activeClientes.filter(cliente=>cliente.status==='ativo').length],['Bloqueados',activeClientes.filter(cliente=>cliente.status==='bloqueado').length],['Arquivados',clientes.length-activeClientes.length]].map(([label,value])=><div className="metric-card" key={label}><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="metric-value mt-3">{value}</p></div>)}</section>
    <OperationBrief kind="clientes"/>
    <Card className="module-table-panel gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Base de clientes</h2><span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Dados cadastrados</span></div>
      <div className="flex flex-wrap items-center gap-3 p-5"><div className="relative w-full sm:min-w-[220px] sm:flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><Input aria-label="Buscar por nome, CPF ou telefone" placeholder="Buscar por nome, CPF ou telefone…" value={query} onChange={event=>setQuery(event.target.value)} className="h-10 bg-white pl-9 text-xs shadow-none"/></div><select aria-label="Filtrar por status" className="filter-select" value={status} onChange={event=>setStatus(event.target.value)}><option value="todos">Clientes ativos</option><option value="ativo">Ativo</option><option value="bloqueado">Bloqueado</option><option value="arquivados">Arquivados</option></select><select aria-label="Ordenar clientes" className="filter-select" value={sort} onChange={event=>setSort(event.target.value)}><option value="asc">Nome: A → Z</option><option value="desc">Nome: Z → A</option></select></div>
      {rows.length ? <div className="table-scroll" role="region" aria-label="Lista de clientes" tabIndex={0}><table><caption className="sr-only">Clientes: {rows.length} resultados</caption><thead><tr>{['Nome','Telefone','CPF','CNH','Status','Ações'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(cliente=><tr key={cliente.id}><td><div className="flex items-center gap-3"><span className="avatar">{initials(cliente.nome)}</span><span className="font-semibold">{cliente.nome}</span></div></td><td>{cliente.telefone}</td><td>{cpfDisplay(cliente.cpf)}</td><td>{cliente.cnh}</td><td><Status value={cliente.deleted_at?'Arquivado':cliente.status==='ativo'?'Ativo':'Bloqueado'}/></td><td><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Ver detalhes de ${cliente.nome}`} onClick={()=>setDetail(details(cliente))}><Eye size={16}/></Button>{canAdmin&&!cliente.deleted_at&&<><Button variant="ghost" size="icon" aria-label={`Editar ${cliente.nome}`} onClick={()=>{setMessage('');setModal({kind:'edit',cliente});}}><Pencil size={16}/></Button><Button variant="ghost" size="icon" className="text-rose-700" aria-label={`Arquivar ${cliente.nome}`} onClick={()=>{setMessage('');setModal({kind:'delete',cliente});}}><Trash2 size={16}/></Button></>}{canAdmin&&cliente.deleted_at&&<Button variant="ghost" size="icon" aria-label={`Restaurar ${cliente.nome}`} onClick={()=>{setMessage('');setModal({kind:'restore',cliente});}}><RotateCcw size={16}/></Button>}</div></td></tr>)}</tbody></table></div>
        : <div className="border-t border-slate-100 px-5 py-16 text-center"><Users size={26} className="mx-auto mb-4 text-slate-300"/><h3 className="text-sm font-semibold">{clientes.length ? 'Nenhum cliente encontrado' : 'Cadastre seu primeiro cliente'}</h3><p className="mt-2 text-xs text-slate-500">{clientes.length ? 'Tente outro termo ou remova os filtros.' : 'Os clientes da locadora aparecerão aqui após o cadastro.'}</p><Button variant="outline" className="mt-5" onClick={clientes.length ? clear : ()=>setModal({kind:'new',cliente:null})}>{clientes.length ? 'Limpar filtros' : 'Novo cliente'}</Button></div>}
      <p role="status" className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">{rows.length} de {clientes.length} clientes</p>
    </Card>
    <Dialog open={!!modal} onOpenChange={open=>{if(!open && !busy)setModal(null);}}><DialogContent showCloseButton={!busy} onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onInteractOutside={event=>event.preventDefault()} className={modal?.kind === 'delete'||modal?.kind==='restore' ? 'max-h-[90svh] overflow-y-auto' : 'max-h-[90svh] overflow-y-auto sm:max-w-2xl'} onCloseAutoFocus={event=>{event.preventDefault();newButton.current?.focus();}}><DialogHeader><DialogTitle>{modal?.kind === 'new' ? 'Novo cliente' : modal?.kind === 'edit' ? 'Editar cliente' : modal?.kind==='restore'?'Restaurar cliente':'Arquivar cliente'}</DialogTitle><DialogDescription>{modal?.kind==='delete'?'Confirme o arquivamento reversível deste cadastro.':modal?.kind==='restore'?'Confirme a restauração deste cadastro.':'Preencha os dados do cliente da locadora.'}</DialogDescription></DialogHeader>{modal && ((modal.kind==='delete'||modal.kind==='restore')&&modal.cliente ? <ArchiveForm key={`${modal.kind}-${modal.cliente.id}`} cliente={modal.cliente} restore={modal.kind==='restore'} onCancel={()=>setModal(null)} onDeleted={done} onBusy={setBusy}/> : <ClienteForm key={`${modal.kind}-${modal.cliente?.id ?? 'new'}`} cliente={modal.cliente} canAdmin={canAdmin} onCancel={()=>setModal(null)} onSaved={done} onBusy={setBusy}/>)}</DialogContent></Dialog>
    <DetailDialog detail={detail} onClose={()=>setDetail(null)}/>
  </>;
}
