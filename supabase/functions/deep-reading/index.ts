// Supabase Edge Function: lectura profunda del mes con Claude.
// Despliegue: supabase functions deploy deep-reading
// Secreto:    supabase secrets set ANTHROPIC_API_KEY=...
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // Solo usuarios con sesión.
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });

    const { name, natal, context, lines } = await req.json();
    const prompt = `Eres un lector de tarot cálido, lúcido y nada fatalista. Hablas en español, de tú, a ${String(name).slice(0, 60)}.

CONTEXTO:
${String(context || '(sin contexto)').slice(0, 4000)}

CARTA NATAL: ${Array.isArray(natal) ? natal.map((n: string[]) => n.filter(Boolean).join(' ')).join('; ') : '(no registrada)'}

TIRADAS DEL MES (posición=carta, con los tránsitos de ese día):
${String(lines).slice(0, 12000)}

Escribe una lectura del mes completo en 4 párrafos cortos: 1) el hilo que une las tiradas y cómo dialogan con los tránsitos sobre su carta natal, 2) qué dicen sobre el amor y sus vínculos, 3) qué dicen sobre trabajo y familia, 4) un consejo concreto y accionable para lo que queda del mes. Menciona cartas concretas. Sin títulos ni viñetas, máximo 260 palabras.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 900, messages: [{ role: 'user', content: prompt }] }),
    });
    const j = await r.json();
    const text = j?.content?.map((c: { text?: string }) => c.text || '').join('') || '';
    return new Response(JSON.stringify({ text }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
