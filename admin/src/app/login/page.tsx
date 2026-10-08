import { LoginForm } from "@/components/login-form";
import { supabaseConfig } from "@/lib/supabase/config";
export const metadata = {title:"Entrar"};
export const dynamic = "force-dynamic";
export default async function Page({searchParams}: {searchParams:Promise<{erro?:string}>}) {
  const params = await searchParams;
  return <LoginForm configured={!!supabaseConfig()} accessDenied={params.erro === "acesso"}/>;
}
