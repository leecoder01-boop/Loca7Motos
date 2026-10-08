"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { loginErrorMessage } from "@/lib/login-errors";

export type LoginState = { error:string;success?:boolean };
export async function login(_previous:LoginState, form:FormData):Promise<LoginState> {
  if (!supabaseConfig()) return {error:"A conexão com o Supabase ainda não foi configurada."};
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return {error:"Informe e-mail e senha."};
  try {
    const supabase = await createClient();
    const {data,error} = await supabase.auth.signInWithPassword({email,password});
    if (error) return {error:loginErrorMessage(error)};
    const {data:profile,error:profileError}=await supabase.from("perfis_usuario").select("role,ativo").eq("id",data.user.id).maybeSingle();
    const legacyProfileTableMissing=profileError&&(profileError.code==="42P01"||profileError.code==="PGRST205"||/perfis_usuario.*(not found|does not exist)/i.test(profileError.message));
    const {data:legacyAdmin,error:legacyAdminError}=legacyProfileTableMissing?await supabase.rpc("is_admin"): {data:false,error:null};
    const legacyAdminAllowed=legacyProfileTableMissing&&!legacyAdminError&&legacyAdmin===true;
    if ((profileError&&!legacyAdminAllowed) || (!legacyProfileTableMissing&&(!profile || !profile.ativo || !["admin","atendente"].includes(profile.role)))) {
      await supabase.auth.signOut();
      return {error:profileError&&!legacyAdminAllowed ? "Não foi possível carregar seu perfil. Confira a migração de usuários e papéis no Supabase." : "Esta conta está inativa ou ainda não foi autorizada para o painel."};
    }
  } catch { return {error:"Não foi possível conectar ao serviço de autenticação. Tente novamente."}; }
  return {error:"",success:true};
}
export async function logout() {
  const supabase = await createClient();
  const {error} = await supabase.auth.signOut();
  if (error) throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
  redirect("/login/");
}
