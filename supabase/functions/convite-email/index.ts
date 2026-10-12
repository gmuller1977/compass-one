// ============================================================
// convite-email — avisa por e-mail quem foi convidado para a conta
// compartilhada (migração 015)
// ============================================================
// O app grava o convite em `compartilhamentos` e chama esta função com o id.
// Ela lê o convite COM O LOGIN DE QUEM CHAMOU: pela política
// compartilhamentos_dono_ler, só o dono enxerga a linha, então ninguém
// consegue disparar e-mail em nome de outro nem para um endereço que não
// convidou. Convite já aceito não gera e-mail.
//
// O envio é pela API do Resend, com o domínio compass-one.com.br verificado.
//
// Deploy (uma vez):
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase functions deploy convite-email
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SITE, emailHtml, escapar } from '../_shared/emailLayout.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (status: number, corpo: Record<string, unknown>) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const auth = req.headers.get('Authorization')
  if (!auth) return responder(401, { erro: 'sem login' })

  const chave = Deno.env.get('RESEND_API_KEY')
  if (!chave) return responder(500, { erro: 'RESEND_API_KEY não configurada' })

  let id = ''
  try { id = String((await req.json()).id ?? '') } catch { /* corpo inválido */ }
  if (!id) return responder(400, { erro: 'sem convite' })

  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: auth } } })
  const { data: eu } = await db.auth.getUser()
  if (!eu?.user) return responder(401, { erro: 'sem login' })
  const { data: c } = await db.from('compartilhamentos').select('*').eq('id', id).eq('dono_id', eu.user.id).maybeSingle()
  if (!c) return responder(404, { erro: 'convite não encontrado' })
  if (c.status !== 'pendente') return responder(200, { ok: true, enviado: false })

  const quem = escapar(String(c.dono_nome || c.dono_email || 'Uma pessoa'))
  const emailDono = c.dono_nome && c.dono_email ? ` (${escapar(String(c.dono_email))})` : ''
  const para = String(c.email)
  const url = `${SITE}/cadastro?email=${encodeURIComponent(para)}`
  const html = emailHtml({
    preview: `${quem} quer organizar as finanças com você.`,
    titulo: `${quem} convidou você para o Compass One`,
    paragrafos: [
      'Olá!',
      `<b>${quem}</b>${emailDono} quer dividir a organização das finanças com você. Aceitando, vocês veem e lançam nas mesmas contas, cartões e planejamento, cada um com o próprio login.`,
      `Para aceitar, entre no Compass One com <b>este e-mail</b> (${escapar(para)}). O convite aparece assim que você entrar.`,
    ],
    botao: { texto: 'Aceitar o convite', url },
    depois: [
      `Ainda não tem conta? O botão abre o cadastro: use o e-mail ${escapar(para)}. Já tem? É só <a href="${SITE}/login" style="color:#1a56db;">entrar</a>.`,
      'Você pode sair da conta compartilhada quando quiser, pelo Perfil. Suas finanças próprias ficam guardadas como estavam.',
    ],
    rodape: `Você recebeu este e-mail porque ${quem} digitou este endereço no Compass One. Se não conhece essa pessoa, é só ignorar: nada muda sem você aceitar.`,
  })

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Compass One <nao-responda@compass-one.com.br>',
      to: [para],
      reply_to: c.dono_email || undefined,
      subject: `${c.dono_nome || c.dono_email || 'Alguém'} convidou você para o Compass One`,
      html,
    }),
  })
  if (!r.ok) {
    console.error('resend', r.status, await r.text())
    return responder(502, { erro: 'falha no envio' })
  }
  return responder(200, { ok: true, enviado: true })
})
