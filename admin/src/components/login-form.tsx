"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Brand } from "./brand";
import { login } from "@/app/login/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm({configured,accessDenied}: {configured:boolean;accessDenied:boolean}) {
  const [state,action,pending] = useActionState(login,{error:""});
  const [showPassword,setShowPassword] = useState(false);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const errorRef=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(state.error)errorRef.current?.focus();if(state.success)window.location.assign("/admin/clientes/");},[state]);
  return <main className="login-workspace"><section className="login-story" aria-label="Loca7Moto"><Brand/><div><p className="eyebrow">GESTÃO / LOCAÇÃO / MOVIMENTO</p><h2>Sua frota na rua.<br/><span>Sua gestão em dia.</span></h2><p>Clientes, motos, contratos e recebimentos. Uma rota clara para acompanhar a locadora.</p></div><div className="login-road" aria-hidden="true"/><footer>LOCA7MOTO · CENTRAL DA OPERAÇÃO</footer></section><div className="login-form-area"><Card className="w-full max-w-sm gap-0 p-7 shadow-none"><p className="eyebrow mb-6 text-blue-700">BEM-VINDO À LOCA7MOTO</p><LockKeyhole size={23} className="mb-4 text-[#1565c0]"/><h1 className="text-xl font-semibold">Acesso administrativo</h1><p className="mt-2 mb-6 text-xs leading-relaxed text-slate-500">Entre com sua conta autorizada para acompanhar a operação.</p>
    {!configured && <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">A conexão ainda não foi configurada. Adicione as variáveis do Supabase ao ambiente do painel.</p>}
    <form action={action} className="space-y-4"><div><label htmlFor="email" className="mb-2 block text-xs font-semibold">E-mail</label><Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={event=>setEmail(event.target.value)} disabled={!configured || pending}/></div><div><label htmlFor="password" className="mb-2 block text-xs font-semibold">Senha</label><Input id="password" name="password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} disabled={!configured || pending}/></div><Button type="button" variant="ghost" size="sm" aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)} disabled={pending}>{showPassword?"Ocultar senha":"Mostrar senha"}</Button>{(state.error || accessDenied) && <p ref={errorRef} tabIndex={-1} role="alert" className="text-xs leading-relaxed text-rose-700">{state.error || "Este usuário não tem acesso administrativo."}</p>}{state.success&&<div role="status" className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><p>Login confirmado. Se a página não abrir sozinha, toque abaixo:</p><a className="inline-flex min-h-9 items-center font-semibold underline" href="/admin/clientes/">Abrir cadastro de clientes</a></div>}<Button type="submit" disabled={!configured || pending} className="w-full">{pending ? "Entrando…" : "Entrar no painel"}</Button></form>
    <p className="mt-5 text-[11px] text-slate-500">Contas são provisionadas pelo administrador.</p></Card></div></main>;
}
