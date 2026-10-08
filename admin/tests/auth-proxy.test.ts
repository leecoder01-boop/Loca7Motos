import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import { readFile } from "node:fs/promises";

test("proxy não duplica /admin e não expõe dados sem sessão",async()=>{
  const previousUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_test";
  try {
    const response=await proxy(new NextRequest("http://localhost:3001/admin/contratos/",{nextConfig:{basePath:"/admin"}}));
    assert.equal(response.status,307);
    assert.equal(response.headers.get("location"),"http://localhost:3001/admin/login/");
    assert.match(response.headers.get("cache-control") ?? "",/no-store/);
    const login=await proxy(new NextRequest("http://localhost:3001/admin/login/",{nextConfig:{basePath:"/admin"}}));
    assert.equal(login.status,200);
  } finally {
    if(previousUrl===undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL=previousUrl;
    if(previousKey===undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=previousKey;
  }
});

test("login usa o fluxo padrão do useActionState sem interceptar o envio do formulário",async()=>{
  const form=await readFile(new URL("../src/components/login-form.tsx",import.meta.url),"utf8");
  assert.match(form,/<form action=\{action\}/);
  assert.doesNotMatch(form,/preventDefault\(\)|startTransition\(/);
});
