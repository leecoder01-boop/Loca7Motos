"use server";
import {refresh} from "next/cache";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {createSupabaseAdminClient,hasSupabaseAdminCredential} from "@/lib/supabase/admin";

const roles=z.enum(["admin","atendente"]);
const createSchema=z.object({nome:z.string().trim().min(2).max(120),email:z.email().trim().toLowerCase(),senha:z.string().min(8).max(128),role:roles});
const updateSchema=z.object({id:z.uuid(),nome:z.string().trim().min(2).max(120),role:roles,ativo:z.boolean()});
type Result={ok:boolean;message:string};

export async function createPanelUser(values:unknown):Promise<Result>{
  const {supabase}=await requireAdmin();
  const parsed=createSchema.safeParse(values);
  if(!parsed.success)return {ok:false,message:"Informe nome, e-mail válido, senha com pelo menos 8 caracteres e papel."};
  if(!hasSupabaseAdminCredential())return {ok:false,message:"Para criar contas, adicione SUPABASE_SECRET_KEY no ambiente local do servidor e reinicie o painel."};
  let authAdmin;
  try{authAdmin=createSupabaseAdminClient();}catch{return {ok:false,message:"Não foi possível preparar o serviço seguro de criação de usuários."};}
  const {data,error}=await authAdmin.auth.admin.createUser({email:parsed.data.email,password:parsed.data.senha,email_confirm:true,user_metadata:{name:parsed.data.nome,full_name:parsed.data.nome}});
  if(error||!data.user)return {ok:false,message:error?.message.toLowerCase().includes("already")?"Já existe uma conta com esse e-mail.":"Não foi possível criar a conta no Supabase Auth. Confira o e-mail e tente novamente."};
  const {error:profileError}=await supabase.rpc("admin_atualizar_perfil",{p_user_id:data.user.id,p_nome:parsed.data.nome,p_role:parsed.data.role,p_ativo:true});
  if(profileError){return {ok:false,message:"A conta de autenticação foi criada, mas permaneceu inativa porque o perfil não foi atualizado. Não tente criá-la novamente; confira a migração e peça a um administrador para revisar esse usuário."};}
  refresh();
  return {ok:true,message:`Conta de ${parsed.data.nome} criada como ${parsed.data.role==='admin'?'administrador':'atendente'}. Compartilhe a senha inicial por um canal seguro.`};
}

export async function updatePanelUser(values:unknown):Promise<Result>{
  const {supabase,user}=await requireAdmin();
  const parsed=updateSchema.safeParse(values);
  if(!parsed.success)return {ok:false,message:"Revise nome, papel e situação da conta."};
  if(parsed.data.id===user.id&&(parsed.data.role!=="admin"||!parsed.data.ativo))return {ok:false,message:"Você não pode remover ou desativar seu próprio acesso administrativo."};
  const {error}=await supabase.rpc("admin_atualizar_perfil",{p_user_id:parsed.data.id,p_nome:parsed.data.nome,p_role:parsed.data.role,p_ativo:parsed.data.ativo});
  if(error)return {ok:false,message:error.code==="23514"?"É necessário manter ao menos um administrador ativo.":error.code==="P0002"?"Usuário não encontrado. Atualize a lista.":"Não foi possível atualizar o perfil. Confira suas permissões e tente novamente."};
  refresh();
  return {ok:true,message:"Perfil atualizado com sucesso."};
}
