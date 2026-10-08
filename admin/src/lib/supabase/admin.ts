import "server-only";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {supabaseConfig} from "./config";

function adminCredential(){return process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";}
function isAdminCredential(value:string){
  if(value.startsWith("sb_secret_"))return true;
  if(!value.startsWith("eyJ"))return false;
  try{return JSON.parse(Buffer.from(value.split(".")[1],"base64url").toString()).role==="service_role";}catch{return false;}
}
export function hasSupabaseAdminCredential(){return isAdminCredential(adminCredential());}

export function createSupabaseAdminClient(){
  const config=supabaseConfig();
  const credential=adminCredential();
  if(!config)throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL no servidor.");
  if(!isAdminCredential(credential))throw new Error("Configure SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY somente no servidor.");
  return createSupabaseClient(config.url,credential,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
