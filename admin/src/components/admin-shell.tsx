"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, Bike, FileText, Wallet, Bell, ArrowUpRight, Menu, ChevronRight, CircleHelp, TrendingUp, Settings, BotMessageSquare, UserCog, History } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePanelData } from "./panel-provider";
import { date } from "@/lib/panel-data";
import { Brand } from "./brand";
import {PanelMotion} from "./panel-motion";
import { logout } from "@/app/login/actions";
import type {PanelRole} from "@/lib/auth";

const navigation = [
  { href:"/", label:"Dashboard", icon:LayoutDashboard },
  { href:"/vendas/", label:"Vendas", icon:TrendingUp },
  { href:"/clientes/", label:"Clientes", icon:Users },
  { href:"/motos/", label:"Motos", icon:Bike },
  { href:"/contratos/", label:"Contratos / Locações", icon:FileText },
  { href:"/pagamentos/", label:"Pagamentos", icon:Wallet },
  { href:"/alertas/", label:"Alertas", icon:Bell },
  { href:"/atendimento/", label:"Atendimento com IA", icon:BotMessageSquare },
  { href:"/configuracoes/", label:"Configurações", icon:Settings },
  { href:"/usuarios/", label:"Usuários", icon:UserCog,adminOnly:true },
  { href:"/auditoria/", label:"Histórico de auditoria", icon:History,adminOnly:true },
];
function SidebarContent({ onNavigate, email, role }: { onNavigate?: () => void; email:string;role:PanelRole }) {
  const {activeAlerts:alerts} = usePanelData();
  const pathname = usePathname().replace(/^\/admin(?=\/|$)/, "").replace(/\/$/, "") || "/";
  const items=navigation.filter(item=>!item.adminOnly||role==='admin').filter(item=>role==='admin'||item.href!=='/configuracoes/');
  return <>
    <div className="px-3"><Brand /><p className="sidebar-section-label">VISÃO DA OPERAÇÃO</p></div>
    <nav aria-label="Navegação administrativa" className="mt-3 space-y-1">
      {items.map(({href,label,icon:Icon}) => {
        const active = pathname === (href.replace(/\/$/, "") || "/") || (href === "/contratos/" && pathname.startsWith("/contratos/"));
        return <Link key={href} href={href} className="nav-item" data-active={active} aria-current={active ? "page" : undefined} onClick={onNavigate}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{href === "/alertas/" && <span className="ml-auto rounded bg-white/10 px-1.5 text-[10px]">{alerts.length}</span>}</Link>;
      })}
    </nav>
    <div className="mt-auto pt-8">
      <div className="mx-2 mb-5 rounded-lg border border-blue-100 bg-blue-50/60 p-4"><CircleHelp size={18} className="mb-3 text-[#42a5f5]" /><p className="text-xs font-semibold text-slate-800">Sua frota. Seu ritmo.</p><p className="mt-2 text-[11px] leading-relaxed text-slate-600">Cada locação conectada ao seu próximo recebimento.</p></div>
      <a href="/" className="nav-item" onClick={onNavigate}><ArrowUpRight size={17} />Visitar o site</a>
      <div className="mt-5 flex items-center gap-3 border-t border-slate-200 px-3 pt-5"><span className="avatar">{role==='admin'?'AD':'AT'}</span><div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{role==='admin'?'Administrador':'Atendente'}</p><p className="mt-1 truncate text-[10px] text-slate-500">{email}</p></div></div>
    </div>
  </>;
}
export function AdminShell({children,email,role}: {children:React.ReactNode;email:string;role:PanelRole}) {
  const {activeAlerts:alerts,referenceDate} = usePanelData();
  const [open,setOpen] = useState(false);
  const pathname = usePathname().replace(/^\/admin(?=\/|$)/, "").replace(/\/$/, "") || "/";
  const title = navigation.find(item => (item.href.replace(/\/$/, "") || "/") === pathname || (item.href === "/contratos/" && pathname.startsWith("/contratos/")))?.label ?? "Painel";
  return <>
    <a href="#conteudo-admin" className="skip-link">Pular para o conteúdo</a>
    <aside className="app-sidebar"><SidebarContent email={email} role={role}/></aside>
    <div className="app-body">
      <header className="app-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir navegação"><Menu size={20}/></Button></SheetTrigger><SheetContent side="left" className="w-[280px] border-slate-200 bg-white p-6 text-slate-600 flex flex-col"><SheetTitle className="sr-only">Navegação administrativa</SheetTitle><SheetDescription className="sr-only">Acesse as páginas do painel da Loca7Moto.</SheetDescription><SidebarContent email={email} role={role} onNavigate={() => setOpen(false)} /></SheetContent></Sheet>
          <span className="hidden text-xs text-slate-400 sm:inline">Operação</span><ChevronRight size={14} className="hidden text-slate-300 sm:block"/><span className="truncate text-xs font-semibold">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-4"><span className="connection-status"><i/>Conectado</span><Link href="/alertas/" aria-label={`${alerts.length} alertas da operação`} className="relative p-2 text-slate-500"><Bell size={19}/><span className="absolute right-1 top-1 size-2 rounded-full bg-[#1565c0] ring-2 ring-white"/></Link><form action={logout}><Button variant="outline" size="sm" type="submit">Sair</Button></form><span className="avatar topbar-avatar">{role==='admin'?'AD':'AT'}</span></div>
      </header>
      <main id="conteudo-admin" className="app-content"><PanelMotion>{children}</PanelMotion>
        <footer className="panel-footer mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-5 text-[10px] text-slate-500"><span>Loca7Moto · Painel administrativo</span><span>Supabase · Referência: {date(referenceDate)} · Atualização a cada minuto</span></footer>
      </main>
    </div>
  </>;
}
