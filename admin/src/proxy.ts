import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  if (!config) return response;
  const supabase = createServerClient(config.url, config.key, {
    cookieOptions: {httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV === "production",path:"/admin"},
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({name,value}) => request.cookies.set(name,value));
        response = NextResponse.next({request});
        values.forEach(({name,value,options}) => response.cookies.set(name,value,options));
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
      },
    },
  });
  const {data,error} = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname.replace(/^\/admin(?=\/|$)/, "");
  if ((!data?.claims || error) && !path.startsWith("/login")) {
    const url = new URL("/admin/login/", request.url);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store, max-age=0");
    return redirect;
  }
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
