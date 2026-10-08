"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { presentSnapshot, type Snapshot, type PanelData } from "@/lib/panel-data";
const Context = createContext<(PanelData & {clientRecords:Snapshot['clientes'];motoRecords:Snapshot['motos'];contractRecords:Snapshot['contratos'];paymentRecords:Snapshot['pagamentos']})|null>(null);
const PANEL_UPDATED_EVENT = "loca7moto:panel-data-updated";
const PANEL_UPDATED_STORAGE_KEY = "loca7moto:panel-data-updated";
export function PanelProvider({snapshot,children}: {snapshot:Snapshot;children:React.ReactNode}) {
  const router = useRouter();
  const [,startTransition] = useTransition();
  const lastRefresh = useRef(Date.now());
  const data = useMemo(() => ({...presentSnapshot(snapshot),clientRecords:snapshot.clientes,motoRecords:snapshot.motos,contractRecords:snapshot.contratos,paymentRecords:snapshot.pagamentos}),[snapshot]);
  useEffect(() => {
    const refreshNow = () => {
      if(document.visibilityState !== "visible")return;
      lastRefresh.current=Date.now();
      startTransition(() => router.refresh());
    };
    const refreshIfStale = () => {
      if(document.visibilityState !== "visible" || Date.now()-lastRefresh.current<90000)return;
      lastRefresh.current=Date.now();
      startTransition(() => router.refresh());
    };
    const refreshOnLocalChange = () => refreshNow();
    const refreshOnOtherTabChange = (event:StorageEvent) => {
      if(event.key===PANEL_UPDATED_STORAGE_KEY){
        if(document.visibilityState==="visible")refreshNow();
        else lastRefresh.current=0;
      }
    };
    const timer = window.setInterval(refreshIfStale,300000);
    document.addEventListener("visibilitychange",refreshIfStale);
    window.addEventListener(PANEL_UPDATED_EVENT,refreshOnLocalChange);
    window.addEventListener("storage",refreshOnOtherTabChange);
    return () => {window.clearInterval(timer);document.removeEventListener("visibilitychange",refreshIfStale);window.removeEventListener(PANEL_UPDATED_EVENT,refreshOnLocalChange);window.removeEventListener("storage",refreshOnOtherTabChange);};
  },[router]);
  return <Context.Provider value={data}>{children}</Context.Provider>;
}
export function usePanelData() {
  const data = useContext(Context);
  if(!data) throw new Error("O painel precisa de dados autenticados.");
  return data;
}
