"use client";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
export default function ErrorPage({reset}: {error:Error;reset:()=>void}) {
  return <main className="panel-state"><div className="max-w-md rounded-xl border bg-white p-7"><Brand className="mb-8"/><h1 className="text-xl font-semibold">Não foi possível abrir o painel</h1><p role="alert" className="mt-3 text-sm text-slate-600">Confira a conexão com o Supabase, a migração do banco e sua permissão administrativa. Nenhum dado fictício foi utilizado como substituto.</p><Button onClick={reset} className="mt-5">Tentar novamente</Button><a href="/admin/login/" className="ml-4 text-sm text-[#1565c0]">Voltar ao acesso</a></div></main>;
}
