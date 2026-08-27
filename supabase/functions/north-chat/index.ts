// ============================================================
// north-chat — proxy do Gemini para o assistente North
// ============================================================
// A chave da API fica AQUI, no servidor. Antes ela ia embutida no bundle
// (VITE_GEMINI_API_KEY) e qualquer pessoa lia em texto puro abrindo o .js
// publicado.
//
// A funcao exige JWT: o Supabase rejeita a chamada antes mesmo deste codigo
// rodar (verify_jwt vem ligado por padrao). Isso protege a COTA, nao so a
// chave — um endpoint aberto continuaria permitindo que terceiros gastassem
// os creditos da conta.
//
// Deploy:
//   supabase secrets set GEMINI_API_KEY=<a chave nova>
//   supabase functions deploy north-chat
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

type Mensagem = { role: 'user' | 'model'; parts: { text: string }[] }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  // ── Quem está chamando ────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autenticado' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return json({ error: 'Não autenticado' }, 401)

  // ── Entrada ───────────────────────────────────────────────
  let systemPrompt: string
  let history: Mensagem[]
  try {
    const body = await req.json()
    systemPrompt = String(body.systemPrompt ?? '')
    history = Array.isArray(body.history) ? body.history : []
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }
  if (!systemPrompt || history.length === 0) {
    return json({ error: 'systemPrompt e history são obrigatórios' }, 400)
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    console.error('[north-chat] GEMINI_API_KEY não configurada')
    return json({ error: 'Assistente indisponível' }, 503)
  }

  // ── Gemini ────────────────────────────────────────────────
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: history,
        }),
        signal: AbortSignal.timeout(25000),
      },
    )

    if (!resp.ok) {
      // O corpo do erro pode citar a chave — nunca repassar para o cliente
      console.error('[north-chat] Gemini respondeu', resp.status)
      return json({ error: 'Assistente indisponível' }, 502)
    }

    const data = await resp.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      ?? 'Desculpe, não consegui processar sua pergunta.'

    return json({ text })
  } catch (e) {
    console.error('[north-chat] falha ao chamar o Gemini:', e instanceof Error ? e.message : e)
    return json({ error: 'Assistente indisponível' }, 502)
  }
})
