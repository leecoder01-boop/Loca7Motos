import { cn } from "@/lib/utils";
import { Bike, Users, FileText, Wallet, Bell, Route, History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PageHeading({title,description,children}: {title:string;description:string;children?:React.ReactNode}) {
  const chapters:Record<string,[string,string,typeof Bike]> = {
    Clientes:['02','Quem faz parte da sua rota',Users],
    Motos:['03','A frota que move o negócio',Bike],
    'Contratos / Locações':['04','Cada saída, uma história registrada',FileText],
    Pagamentos:['05','Da rua ao caixa',Wallet],
    Alertas:['06','O próximo passo merece atenção',Bell],
    Configurações:['07','A identidade de cada conversa',Wallet],
    'Modelo de contrato':['04.1','O padrão de cada nova locação',FileText],
    'Documento de locação':['04.2','Os detalhes ficam no papel',FileText],
    'Histórico de auditoria':['08','Cada mudança deixa um rastro',History],
  };
  const [chapter,kicker,Icon] = chapters[title] ?? ['07','Central de operação',Route];
  return <header className="module-heading"><div className="module-heading-copy"><p className="eyebrow"><span>LOCA7MOTO / {chapter}</span>{kicker}</p><h1>{title}</h1><p className="module-description">{description}</p>{children&&<div className="module-actions">{children}</div>}</div><div className="module-route-art" aria-hidden="true"><span>{chapter.split('.')[0]}</span><Icon size={72} strokeWidth={1.15}/><i/><b>ROTA DA OPERAÇÃO</b></div></header>;
}
export function Status({value}: {value:string}) {
  const color = ["Disponível","Ativo","Pago","Cadastrado"].includes(value) ? "green" : ["Alugada","Em andamento"].includes(value) ? "blue" : ["Vencendo","Vencendo hoje","Vence hoje","Próximo do vencimento","Pendente","Pagamento vence hoje","Pagamento a vencer"].includes(value) ? "amber" : ["Atrasado","Pagamento atrasado","Bloqueado"].includes(value) ? "red" : "gray";
  return <span className={cn("status",`status-${color}`)}>{value}</span>;
}
export type Detail = { title:string; subtitle:string; fields:[string,string][] };
export function DetailDialog({detail,onClose}: {detail:Detail|null;onClose:()=>void}) {
  return <Dialog open={!!detail} onOpenChange={value => { if(!value) onClose(); }}><DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{detail?.title}</DialogTitle><DialogDescription>{detail?.subtitle}</DialogDescription></DialogHeader><dl className="divide-y divide-slate-100">{detail?.fields.map(([label,value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="font-medium break-words">{value}</dd></div>)}</dl><p className="text-[11px] text-slate-500">Dados cadastrados na operação.</p></DialogContent></Dialog>;
}
