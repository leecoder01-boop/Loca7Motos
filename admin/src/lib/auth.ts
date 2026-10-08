import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type PanelRole = "admin" | "atendente";
export type UserProfile = {id:string;nome:string;email:string;role:PanelRole;ativo:boolean;created_at:string};
const profileTableMissing=(error:{code?:string;message?:string})=>error.code==="42P01"||error.code==="PGRST205"||/perfis_usuario.*(not found|does not exist)/i.test(error.message??"");

async function requireProfile() {
  const supabase = await createClient();
  // Consulta ao servidor Auth também verifica sessões revogadas, não apenas o JWT local.
  const {data:{user},error} = await supabase.auth.getUser();
  if (error || !user) redirect("/login/");
  const {data:profile,error:profileError}=await supabase.from("perfis_usuario").select("id,nome,email,role,ativo,created_at").eq("id",user.id).maybeSingle();
  if(profileError&&profileTableMissing(profileError)){
    const {data:legacyAdmin,error:legacyError}=await supabase.rpc("is_admin");
    if(!legacyError&&legacyAdmin===true)return {supabase,user,profile:{id:user.id,nome:"Administrador",email:user.email??"",role:"admin" as const,ativo:true,created_at:new Date(0).toISOString()}};
    redirect("/login/?erro=acesso");
  }
  if(profileError)throw new Error("Não foi possível carregar seu perfil. Aplique a migração de usuários e papéis no Supabase.");
  if(!profile||!profile.ativo||!(profile.role==="admin"||profile.role==="atendente"))redirect("/login/?erro=acesso");
  return {supabase,user,profile:profile as UserProfile};
}

export async function requirePanelUser() {
  return requireProfile();
}

export async function requireAdmin() {
  const context=await requireProfile();
  if(context.profile.role!=="admin")redirect("/login/?erro=acesso");
  return context;
}
