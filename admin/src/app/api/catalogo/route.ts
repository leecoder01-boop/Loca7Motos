import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedOrigins = [
  'https://loca7-motos-site.vercel.app',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
];

function originPolicy(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = [...new Set([
    ...allowedOrigins,
    ...(process.env.PUBLIC_SITE_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
  ])];
  const headers = new Headers({ Vary: 'Origin' });
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
  }
  return { origin, allowed, headers };
}

export async function OPTIONS(request: Request) {
  const { origin, allowed, headers } = originPolicy(request);
  if (origin && !allowed.includes(origin)) {
    return Response.json({ error: 'Origem não permitida.' }, { status: 403 });
  }
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
  const { origin, allowed, headers } = originPolicy(request);
  if (origin && !allowed.includes(origin)) {
    return Response.json({ error: 'Origem não permitida.' }, { status: 403 });
  }

  try {
    const config = supabaseConfig();
    if (!config) throw new Error('Supabase não configurado.');
    // A chave é pública e as permissões reais são limitadas pelo RLS e pelos grants de coluna.
    const supabase = createClient(config.url, config.key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase
      .from('motos')
      .select('id,marca,modelo,ano,cor,valor_locacao,tipo_valor,status,foto_url,publicado')
      .eq('publicado', true)
      .order('marca', { ascending: true })
      .order('modelo', { ascending: true })
      .limit(100);

    if (error) throw error;

    headers.set('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=30');
    return Response.json({ motos: data ?? [] }, { headers });
  } catch {
    return Response.json(
      { error: 'Catálogo do painel temporariamente indisponível.' },
      { status: 503, headers },
    );
  }
}
