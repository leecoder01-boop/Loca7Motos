import { z } from 'zod';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { documentRecordSchema } from '@/lib/documentos';
import { DocumentPreview } from '@/components/document-editor';
import { PrintDocument } from '@/components/print-document';
export const dynamic='force-dynamic';
export const metadata={title:'Minuta de locação — impressão',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {supabase}=await requireAdmin();const {id}=await params;
  if(!z.uuid().safeParse(id).success)notFound();
  const {data,error}=await supabase.from('documentos_contrato').select('*').eq('id',id).maybeSingle();
  if(error)throw new Error('Não foi possível carregar o documento.');if(!data)notFound();
  return <main className="mx-auto max-w-4xl p-5"><PrintDocument/><DocumentPreview document={documentRecordSchema.parse(data)}/><style>{`@media print { .no-print { display:none !important; } main { padding:0 !important; max-width:none !important; } .document-preview { padding:0 !important; border:0 !important; } h2 { break-after:avoid; } @page { size:A4; margin:16mm; } }`}</style></main>;
}
