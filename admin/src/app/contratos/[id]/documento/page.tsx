import { DocumentPage } from '@/components/document-page';
export const dynamic='force-dynamic';
export const metadata={title:'Documento de locação'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <DocumentPage id={id}/>;}
