import { Brand } from '@/components/brand';
export default function Loading() { return <main className="panel-state"><div><Brand/><div className="loading-route" aria-hidden="true"/><p role="status" className="text-sm text-slate-500">Carregando dados da operação…</p><p className="mt-3 text-xs text-slate-500">Preparando sua rota de trabalho.</p></div></main>; }
