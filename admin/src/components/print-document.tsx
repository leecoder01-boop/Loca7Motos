"use client";
import { Button } from './ui/button';
export function PrintDocument(){return <div className="no-print mb-5"><Button onClick={()=>window.print()}>Imprimir / salvar como PDF</Button><p className="mt-2 text-xs text-slate-600">Use a opção Salvar como PDF da janela de impressão. Documento confidencial: guarde em local seguro.</p></div>;}
