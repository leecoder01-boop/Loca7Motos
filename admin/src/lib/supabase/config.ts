export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("SEU-PROJETO") || key.includes("SUBSTITUA")) return null;
  if (key.startsWith("sb_secret_")) throw new Error("Use a chave publishable, nunca uma chave secreta.");
  if (key.startsWith("eyJ")) {
    const payload = JSON.parse(Buffer.from(key.split(".")[1],"base64url").toString());
    if (payload.role !== "anon") throw new Error("A chave legada deve ser anon, nunca service_role.");
  }
  return { url, key };
}
