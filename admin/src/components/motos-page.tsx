"use client";
import { OperationBrief } from "./operation-brief";

import { useRef,useState,useTransition,type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Bike,Search,Plus,Eye,Pencil,Trash2,RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from './ui/dialog';
import { PageHeading,Status } from './page-parts';
import { usePanelData } from './panel-provider';
import { date,money } from '@/lib/panel-data';
import { motoStatuses,priceTypes,matchesMoto,type Moto,type MotoValues,type MotoResult } from '@/lib/motos';
import { saveMoto,deleteMoto,restoreMoto } from '@/app/motos/actions';

const fields:{name:keyof MotoValues;label:string;required?:boolean;max?:number;numeric?:boolean;placeholder?:string}[]=[
  {name:'marca',label:'Marca',required:true,max:100,placeholder:'Honda'},
  {name:'modelo',label:'Modelo',required:true,max:150,placeholder:'CG 160'},
  {name:'ano',label:'Ano',required:true,numeric:true,placeholder:'2026'},
  {name:'placa',label:'Placa',required:true,max:15,placeholder:'ABC1D23 ou ABC-1234'},
  {name:'cor',label:'Cor',max:80},
  {name:'quilometragem',label:'Quilometragem (km)',required:true,numeric:true},
  {name:'tipo_valor',label:'Tipo de valor',required:true},
  {name:'valor_locacao',label:'Valor (R$)',required:true,placeholder:'85,90'},
  {name:'status',label:'Status',required:true},
  {name:'observacoes',label:'Observações',max:5000},
];
const controlClass='h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-none focus-visible:outline-2 focus-visible:outline-ring aria-invalid:border-destructive';
const empty=():MotoValues=>({marca:'',modelo:'',ano:'',placa:'',cor:'',quilometragem:'0',tipo_valor:'semanal',valor_locacao:'',status:'disponivel',observacoes:''});
const displayValue=(moto:Moto)=>`${money(moto.valor_locacao)} / ${moto.tipo_valor === 'diaria' ? 'dia' : moto.tipo_valor === 'semanal' ? 'semana' : 'mês'}`;

function MotoForm({moto,onCancel,onSaved,onBusy,canAdmin}: {moto:Moto|null;onCancel:()=>void;onSaved:(message:string)=>void;onBusy:(busy:boolean)=>void;canAdmin:boolean}) {
  const [values,setValues]=useState<MotoValues>(()=>moto ? {...moto,ano:String(moto.ano),quilometragem:String(moto.quilometragem),valor_locacao:moto.valor_locacao.toFixed(2).replace('.',',')} : empty());
  const [result,setResult]=useState<MotoResult|null>(null);
  const [pending,startTransition]=useTransition();
  const inFlight=useRef(false);
  const summary=useRef<HTMLDivElement>(null);
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(inFlight.current) return;
    inFlight.current=true;
    const form=new FormData(event.currentTarget);
    onBusy(true);
    startTransition(async()=>{
      try {const response=await saveMoto(form);if(response.ok) onSaved(response.message);else {setResult(response);requestAnimationFrame(()=>summary.current?.focus());}}
      catch {setResult({ok:false,message:'Não foi possível salvar. Sua sessão pode ter expirado. Recarregue a página e tente novamente.'});requestAnimationFrame(()=>summary.current?.focus());}
      finally {inFlight.current=false;onBusy(false);}
    });
  }
  return <form onSubmit={submit} className="space-y-5">
    {moto && <><input type="hidden" name="id" value={moto.id}/><input type="hidden" name="version" value={moto.updated_at ?? ''}/></>}
    <p className="text-xs leading-relaxed text-slate-500">Campos com * são obrigatórios. Informe o preço por diária, semana ou mensalidade. Nenhum contrato será criado neste cadastro.</p>
    {result && <div ref={summary} tabIndex={-1} role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{result.message}</div>}
    <fieldset disabled={pending} className="grid grid-cols-1 gap-4 disabled:opacity-70 sm:grid-cols-2">{fields.map(field=>{
      const error=result?.errors?.[field.name]?.[0]; const id=`moto-${field.name}`;
      const props={id,name:field.name,value:values[field.name],onChange:(event:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setValues(current=>({...current,[field.name]:event.target.value})),required:field.required,'aria-invalid':!!error,'aria-describedby':error ? `${id}-error` : undefined};
      const options=field.name === 'status' ? motoStatuses : field.name === 'tipo_valor' ? priceTypes : null;
      const adminOnly=field.name==='status'||(moto&&(field.name==='valor_locacao'||field.name==='tipo_valor'));
      return <div key={field.name} className={field.name === 'observacoes' ? 'sm:col-span-2' : ''}><label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">{field.label}{field.required ? ' *' : ''}</label>
        {!canAdmin&&adminOnly?<><input type="hidden" name={field.name} value={values[field.name]}/><p className={`${controlClass} flex items-center text-slate-500`}>{field.name==='status'?motoStatuses[values.status]:field.name==='tipo_valor'?priceTypes[values.tipo_valor]:`R$ ${values.valor_locacao}`} · somente administrador altera</p></>
          : options ? <select {...props} className={controlClass}>{Object.entries(options).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          : field.name === 'observacoes' ? <textarea {...props} rows={3} maxLength={field.max} className={`${controlClass} h-auto min-h-24 py-2`}/>
          : <Input {...props} type="text" inputMode={field.numeric ? 'numeric' : field.name === 'valor_locacao' ? 'decimal' : undefined} maxLength={field.max ?? 30} placeholder={field.placeholder} className={controlClass}/>}
        {error && <p id={`${id}-error`} className="mt-1 text-xs text-rose-700">{error}</p>}
      </div>;
    })}</fieldset>
    <div className="sticky -bottom-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white py-4"><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? 'Salvando…' : moto ? 'Salvar alterações' : 'Cadastrar moto'}</Button></div>
  </form>;
}

function ArchiveMotoForm({moto,onCancel,onDeleted,onBusy,restore=false}: {moto:Moto;onCancel:()=>void;onDeleted:(message:string)=>void;onBusy:(busy:boolean)=>void;restore?:boolean}) {
  const [result,setResult]=useState<MotoResult|null>(null);
  const [pending,startTransition]=useTransition();
  const inFlight=useRef(false);
  return <form onSubmit={event=>{
    event.preventDefault();if(inFlight.current) return;inFlight.current=true;
    const form=new FormData(event.currentTarget);onBusy(true);
    startTransition(async()=>{try {const response=restore?await restoreMoto(form):await deleteMoto(form);if(response.ok) onDeleted(response.message);else setResult(response);}catch {setResult({ok:false,message:'Não foi possível concluir. Recarregue a página e tente novamente.'});}finally {inFlight.current=false;onBusy(false);}});
  }} className="space-y-4">
    <input type="hidden" name="id" value={moto.id}/><input type="hidden" name="version" value={moto.updated_at ?? ''}/><input type="hidden" name="confirm" value={restore?'restaurar':'arquivar'}/>
    <p className="text-sm leading-relaxed text-slate-600">{restore?<>Restaurar <strong>{moto.marca} {moto.modelo}</strong>, placa <strong>{moto.placa}</strong>, para a frota ativa?</>:<>Arquivar <strong>{moto.marca} {moto.modelo}</strong>, placa <strong>{moto.placa}</strong>? Os dados e contratos antigos serão preservados. Motos com contrato aberto não podem ser arquivadas.</>}</p>
    {result && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{result.message}</p>}
    <label className="flex min-h-11 items-center gap-2 text-xs text-slate-700"><input type="checkbox" required className="size-4 accent-blue-700"/>Confirmo que desejo {restore?'restaurar':'arquivar'} esta moto.</label>
    <div className="flex justify-end gap-2"><Button type="button" autoFocus variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button><Button type="submit" variant={restore?'default':'destructive'} disabled={pending}>{pending?'Salvando…':restore?'Restaurar moto':'Arquivar moto'}</Button></div>
  </form>;
}

export function MotosPage({canAdmin=true}:{canAdmin?:boolean}) {
  const {motoRecords:motos}=usePanelData();
  const router=useRouter();
  const [query,setQuery]=useState(''); const [status,setStatus]=useState('todos'); const [sort,setSort]=useState('asc');
  const [modal,setModal]=useState<{kind:'new'|'edit'|'delete'|'restore'|'detail';moto:Moto|null}|null>(null);
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const newButton=useRef<HTMLButtonElement>(null);const origin=useRef<HTMLButtonElement|null>(null);
  const activeMotos=motos.filter(moto=>!moto.deleted_at);
  const rows=motos.filter(moto=>(status==='arquivadas'?!!moto.deleted_at:!moto.deleted_at&&(status==='todos'||moto.status===status))&&matchesMoto(moto,query)).sort((a,b)=>`${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`,'pt-BR')*(sort==='asc'?1:-1));
  const done=(value:string)=>{setMessage(value);setModal(null);router.refresh();};
  const clear=()=>{setQuery('');setStatus('todos');};
  const open=(kind:'new'|'edit'|'delete'|'restore'|'detail',moto:Moto|null,button:HTMLButtonElement)=>{origin.current=button;setMessage('');setModal({kind,moto});};
  const detail=modal?.moto;
  return <>
    <PageHeading title="Motos" description="Disponibilidade, modelos e valores da sua frota."><Button ref={newButton} onClick={event=>open('new',null,event.currentTarget)}><Plus size={16}/>Nova moto</Button></PageHeading>
    {message && <p role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <section aria-label="Resumo da frota" className="module-summary mb-6 grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-5">{[['Frota ativa',activeMotos.length],['Alugadas',activeMotos.filter(moto=>moto.status==='alugada').length],['Disponíveis',activeMotos.filter(moto=>moto.status==='disponivel').length],['Em manutenção',activeMotos.filter(moto=>moto.status==='manutencao').length],['Arquivadas',motos.length-activeMotos.length]].map(([label,value])=><div className="metric-card" key={label}><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="metric-value mt-3">{value}</p></div>)}</section>
    <OperationBrief kind="motos"/>
    <Card className="module-table-panel gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Frota cadastrada</h2><span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Dados cadastrados</span></div>
      <div className="flex flex-wrap items-center gap-3 p-5"><div className="relative w-full sm:min-w-[220px] sm:flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><Input aria-label="Buscar por modelo ou placa" placeholder="Buscar por modelo ou placa…" value={query} onChange={event=>setQuery(event.target.value)} className="h-10 bg-white pl-9 text-xs shadow-none"/></div><select aria-label="Filtrar por status" value={status} onChange={event=>setStatus(event.target.value)} className="filter-select"><option value="todos">Frota ativa</option>{Object.entries(motoStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}<option value="arquivadas">Arquivadas</option></select><select aria-label="Ordenar motos" value={sort} onChange={event=>setSort(event.target.value)} className="filter-select"><option value="asc">Modelo: A → Z</option><option value="desc">Modelo: Z → A</option></select></div>
      {rows.length ? <div className="table-scroll" role="region" aria-label="Lista de motos" tabIndex={0}><table><caption className="sr-only">Motos: {rows.length} resultados</caption><thead><tr>{['Modelo','Placa','Ano','Quilometragem','Valor','Status','Ações'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(moto=><tr key={moto.id}><td><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-500"><Bike size={20}/></span><div><p className="font-semibold">{moto.modelo}</p><p className="mt-1 text-[10px] text-slate-500">{moto.marca}</p></div></div></td><td><span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px]">{moto.placa}</span></td><td>{moto.ano}</td><td>{moto.quilometragem.toLocaleString('pt-BR')} km</td><td className="tabular-nums">{displayValue(moto)}</td><td><Status value={moto.deleted_at?'Arquivada':motoStatuses[moto.status]}/></td><td><div className="flex gap-1">{([{kind:'detail',label:'Ver detalhes de',icon:Eye}] as const).map(({kind,label,icon:Icon})=><Button key={kind} variant="ghost" size="icon" aria-label={`${label} ${moto.placa}`} onClick={event=>open(kind,moto,event.currentTarget)}><Icon size={16}/></Button>)}{canAdmin&&!moto.deleted_at&&<><Button variant="ghost" size="icon" aria-label={`Editar ${moto.placa}`} onClick={event=>open('edit',moto,event.currentTarget)}><Pencil size={16}/></Button><Button variant="ghost" size="icon" className="text-rose-700" aria-label={`Arquivar ${moto.placa}`} onClick={event=>open('delete',moto,event.currentTarget)}><Trash2 size={16}/></Button></>}{canAdmin&&moto.deleted_at&&<Button variant="ghost" size="icon" aria-label={`Restaurar ${moto.placa}`} onClick={event=>open('restore',moto,event.currentTarget)}><RotateCcw size={16}/></Button>}</div></td></tr>)}</tbody></table></div>
        : <div className="border-t border-slate-100 px-5 py-16 text-center"><Bike size={26} className="mx-auto mb-4 text-slate-300"/><h3 className="text-sm font-semibold">{motos.length ? 'Nenhuma moto encontrada' : 'Cadastre sua primeira moto'}</h3><p className="mt-2 text-xs text-slate-500">{motos.length ? 'Tente outro termo ou remova os filtros.' : 'Sua frota aparecerá aqui após o cadastro.'}</p><Button variant="outline" className="mt-5" onClick={event=>motos.length ? clear() : open('new',null,event.currentTarget)}>{motos.length ? 'Limpar filtros' : 'Nova moto'}</Button></div>}
      <p role="status" className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">{rows.length} de {motos.length} motos</p>
    </Card>
    <Dialog open={!!modal} onOpenChange={value=>{if(!value&&!busy)setModal(null);}}><DialogContent showCloseButton={!busy} onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onInteractOutside={event=>event.preventDefault()} onCloseAutoFocus={event=>{event.preventDefault();(origin.current?.isConnected ? origin.current : newButton.current)?.focus();}} className={`max-h-[90svh] overflow-y-auto ${modal?.kind === 'new'||modal?.kind === 'edit' ? 'sm:max-w-2xl' : ''}`}>
      <DialogHeader><DialogTitle>{modal?.kind === 'new' ? 'Nova moto' : modal?.kind === 'edit' ? 'Editar moto' : modal?.kind === 'delete' ? 'Arquivar moto' : modal?.kind==='restore'?'Restaurar moto':'Detalhes da moto'}</DialogTitle><DialogDescription>{modal?.kind === 'detail' ? `${detail?.marca} ${detail?.modelo} · ${detail?.placa}` : modal?.kind === 'delete' ? 'Confirme o arquivamento reversível.' : modal?.kind==='restore'?'Confirme a restauração da moto.':'Preencha os dados da moto da locadora.'}</DialogDescription></DialogHeader>
      {modal && (modal.kind === 'detail' && detail ? <dl className="divide-y divide-slate-100">{[['Marca',detail.marca],['Modelo',detail.modelo],['Ano',String(detail.ano)],['Placa',detail.placa],['Cor',detail.cor||'Não informada'],['Quilometragem',`${detail.quilometragem.toLocaleString('pt-BR')} km`],['Valor',displayValue(detail)],['Status',detail.deleted_at?'Arquivada':motoStatuses[detail.status]],['Observações',detail.observacoes||'Nenhuma'],['Cadastrada em',date(detail.created_at)]].map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="max-w-full break-words whitespace-pre-wrap font-medium">{value}</dd></div>)}</dl>
        : (modal.kind === 'delete'||modal.kind==='restore') && detail ? <ArchiveMotoForm key={`${modal.kind}-${detail.id}`} moto={detail} restore={modal.kind==='restore'} onCancel={()=>setModal(null)} onDeleted={done} onBusy={setBusy}/>
        : <MotoForm key={`${modal.kind}-${detail?.id??'new'}`} moto={detail??null} canAdmin={canAdmin} onCancel={()=>setModal(null)} onSaved={done} onBusy={setBusy}/>)}
    </DialogContent></Dialog>
  </>;
}
