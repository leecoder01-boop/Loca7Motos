"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bot,UserRound,UserRoundCog,Send,RefreshCw,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {PageHeading} from '@/components/page-parts';
import {usePanelData} from '@/components/panel-provider';

type Message={id:string;autor:'cliente'|'ia'|'humano'|'sistema';conteudo:string;criada_em:string};
type State={enabled:boolean;configured:boolean;scope:'overview'|'client';conversation:{id:string;status:'ia'|'humano';atualizada_em:string}|null;messages:Message[];client:{id:string;nome:string}|null};
const time=(value:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
export function AtendimentoPage({canAdmin}:{canAdmin:boolean}){
  const {clientRecords}=usePanelData();
  const [clientId,setClientId]=useState('overview');
  const [state,setState]=useState<State|null>(null);const [text,setText]=useState('');const [pendingText,setPendingText]=useState('');const [loading,setLoading]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const endRef=useRef<HTMLDivElement>(null);
  const reload=useCallback(async(id=clientId)=>{
    if(!id)return;setLoading(true);setError('');
    try{const query=id==='overview'?'':`?clienteId=${encodeURIComponent(id)}`;const response=await fetch(`/admin/api/atendimento${query}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível carregar o atendimento.');setState(data);}
    catch(e){setError(e instanceof Error?e.message:'Falha de conexão.');}
    finally{setLoading(false);}
  },[clientId]);
  useEffect(()=>{void reload(clientId);},[clientId,reload]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[state?.messages.length]);
  async function action(payload:Record<string,unknown>){
    setBusy(true);setError('');try{const response=await fetch('/admin/api/atendimento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível concluir a ação.');return data;}
    catch(e){setError(e instanceof Error?e.message:'Falha de conexão.');return null;}finally{setBusy(false);}
  }
  async function toggle(){if(!state)return;const data=await action({action:'toggle',enabled:!state.enabled});if(data)await reload();}
  async function takeover(){if(!state?.conversation)return;const data=await action({action:state.conversation.status==='ia'?'takeover':'resume',conversationId:state.conversation.id});if(data)await reload();}
  async function send(event:React.FormEvent){
    event.preventDefault();const value=text.trim();if(!value||!clientId||busy)return;setText('');
    setPendingText(value);
    const payload=state?.conversation?.status==='humano'&&state.conversation.id?{action:'humanMessage',conversationId:state.conversation.id,text:value}:{action:'message',clientId:clientId==='overview'?null:clientId,text:value};
    const data=await action(payload);if(data)await reload();else setText(value);setPendingText('');
  }
  const human=state?.conversation?.status==='humano';
  return <>
    <PageHeading title="Atendimento com IA" description="Teste respostas com os dados cadastrados e acompanhe o histórico por cliente." />
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/20 bg-white p-5 shadow-lg shadow-slate-950/10">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Sparkles size={19}/></span><div><p className="text-sm font-semibold text-slate-900">{canAdmin?'Configuração da IA':'Atendimento'}</p><p className="text-xs text-slate-500">Atendimento interno de teste</p></div></div>
        <div className="mt-5 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-slate-800">Atendimento ativo</p><p className="mt-1 text-xs text-slate-500">{state?.enabled?'A IA pode responder no simulador.':'A IA está pausada.'}</p></div>{canAdmin&&<button type="button" aria-pressed={state?.enabled??false} disabled={!state||busy||(!state.configured&&!state.enabled)} onClick={toggle} className={`relative h-6 w-11 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${state?.enabled?'bg-blue-700':'bg-slate-300'}`} aria-label="Ativar ou desativar a IA"><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${state?.enabled?'translate-x-5':'translate-x-0.5'}`}/></button>}</div>
          {canAdmin&&!state?.configured&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Falta configurar <code>OPENAI_API_KEY</code> no servidor. Depois disso, você poderá ativar a IA.</p>}
          {canAdmin&&state?.configured&&<p className="mt-3 text-[11px] text-emerald-700">API configurada no servidor.</p>}
          {!canAdmin&&<p className="mt-3 text-[11px] leading-relaxed text-slate-500">A configuração da IA é gerenciada por um administrador.</p>}
        </div>
        <div className="mt-6"><label htmlFor="ai-client" className="text-xs font-semibold text-slate-700">Escopo do simulador</label><select id="ai-client" value={clientId} onChange={e=>setClientId(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"><option value="overview">Visão geral da locadora</option>{clientRecords.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><p className="mt-2 text-[11px] leading-relaxed text-slate-500">A visão geral consulta os clientes e registros autorizados ao administrador. Você também pode limitar a conversa a um cliente.</p></div>
      </aside>
      <section className="flex min-h-[70dvh] flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-lg shadow-slate-950/10 xl:min-h-[600px]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-blue-100 text-blue-700"><Bot size={20}/></span><div><p className="text-sm font-semibold text-slate-900">{state?.client?.nome??(clientId==='overview'?'Visão geral da locadora':'Conversa de teste')}</p><p className="text-xs text-slate-500">{human?'Atendimento assumido por uma pessoa':state?.conversation?'Assistente virtual':'Nova conversa de teste'}</p></div></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={()=>void reload()} disabled={loading||busy}><RefreshCw size={14}/>Atualizar</Button>{state?.conversation&&<Button variant={human?'default':'outline'} size="sm" onClick={takeover} disabled={busy}><UserRoundCog size={15}/>{human?'Devolver para IA':'Assumir conversa'}</Button>}</div></header>
        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-5" aria-live="polite">
          {!state?.conversation&&<div className="mx-auto mt-14 max-w-md text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-100 text-blue-700"><Bot size={26}/></span><h2 className="mt-4 text-base font-semibold text-slate-900">Converse com os dados do cliente</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Experimente: “Quando vence meu contrato?”, “Tenho pagamento atrasado?” ou “Qual é a chave Pix?”</p></div>}
          {loading&&<p className="text-center text-xs text-slate-500">Carregando histórico…</p>}
          {state?.messages.map(m=><div key={m.id} className={`flex gap-2 ${m.autor==='cliente'||m.autor==='humano'?'justify-end':''}`}><div className={`max-w-[min(85%,620px)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${m.autor==='cliente'?'rounded-br-md bg-blue-700 text-white':m.autor==='humano'?'rounded-br-md bg-indigo-100 text-indigo-950':m.autor==='sistema'?'bg-amber-50 text-amber-900':'rounded-bl-md border border-slate-200 bg-white text-slate-800'}`}><p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold opacity-70">{m.autor==='cliente'?<><UserRound size={12}/>Cliente (simulado)</>:m.autor==='humano'?<><UserRoundCog size={12}/>Atendente</>:<><Bot size={12}/>Loca7Moto IA</>}<time className="font-normal">· {time(m.criada_em)}</time></p><p className="whitespace-pre-wrap">{m.conteudo}</p></div></div>)}
          {pendingText&&<><div className="flex justify-end"><div className="max-w-[min(85%,620px)] rounded-2xl rounded-br-md bg-blue-700 px-4 py-3 text-sm leading-relaxed text-white shadow-sm"><p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold opacity-70"><UserRound size={12}/>{human?'Atendente':'Cliente (simulado)'}</p><p className="whitespace-pre-wrap">{pendingText}</p></div></div>{busy&&!human&&<div className="flex gap-2" role="status" aria-live="polite"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700"><Bot size={16}/></span><div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm"><span className="inline-flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-blue-600"/>Consultando os dados e preparando uma resposta…</span></div></div>}</>}
          <div ref={endRef}/>
        </div>
        {error&&<p role="alert" className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
        <form onSubmit={send} className="flex flex-col items-stretch gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-end"><textarea value={text} onChange={e=>setText(e.target.value)} maxLength={1200} rows={2} disabled={!clientId||busy||(!human&&(!state?.enabled||!state?.configured))} placeholder={human?'Digite uma resposta como atendente…':'Escreva uma pergunta para testar a IA…'} className="min-h-12 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 sm:flex-1"/><Button type="submit" disabled={!text.trim()||busy||!clientId||(!human&&(!state?.enabled||!state?.configured))} aria-label="Enviar mensagem" className="self-end sm:self-auto"><Send size={16}/>{busy?'Enviando…':'Enviar'}</Button></form>
        <p className="px-5 pb-4 text-[10px] text-slate-500">Simulador interno: as mensagens não são enviadas pelo WhatsApp.</p>
      </section>
    </div>
  </>;
}
