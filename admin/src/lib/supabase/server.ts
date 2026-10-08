import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV === "production",path:"/admin"},
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try { values.forEach(({name,value,options}) => cookieStore.set(name,value,options)); }
        catch { /* O Proxy renova cookies durante renderizações somente leitura. */ }
      },
    },
  });
}
