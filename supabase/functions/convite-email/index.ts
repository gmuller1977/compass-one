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
// Limite (25/10/2026, migração 021): até 5 e-mails por dono em 24 horas e o
// mesmo convite no máximo a cada 10 minutos, contados em `envios_convite`
// pela service_role. Sem a tabela, a função não envia (falha fechada): o
// convite continua valendo e aparece quando a pessoa entra.
//
// Deploy (uma vez):
//   supabase secrets set RESEND_API_KEY=re_...
//   (rodar a migração 021)
//   supabase functions deploy convite-email
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SITE, emailHtml, escapar } from '../_shared/emailLayout.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const MAX_POR_DIA = 5
const MINUTOS_ENTRE_REENVIOS = 10

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

  const adm = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const desde = new Date(Date.now() - 24 * 3600_000).toISOString()
  const { data: envios, error: limErr } = await adm.from('envios_convite')
    .select('convite_id, enviado_em').eq('dono_id', eu.user.id).gte('enviado_em', desde)
  if (limErr) {
    console.error('envios_convite', limErr)
    return responder(503, { erro: 'limite indisponível' })
  }
  if ((envios ?? []).length >= MAX_POR_DIA) return responder(429, { erro: 'limite', motivo: 'dia' })
  const recente = Date.now() - MINUTOS_ENTRE_REENVIOS * 60_000
  if ((envios ?? []).some(e => e.convite_id === id && new Date(e.enviado_em).getTime() > recente))
    return responder(429, { erro: 'limite', motivo: 'reenvio' })

  const quem = escapar(String(c.dono_nome || c.dono_email || 'Uma pessoa'))
  const emailDono = c.dono_nome && c.dono_email ? ` (${escapar(String(c.dono_email))})` : ''
  const para = String(c.email)
  const url = `${SITE}/cadastro?email=${encodeURIComponent(para)}`
  const html = emailHtml({
    preview: `${quem} quer organizar as finanças com você.`,
    titulo: `${quem} convidou você para o Compass One`,
    paragrafos: [
      'Olá!',
      c.acesso === 'visualizar'
        // Convite de Educador Financeiro (migração 023): só visualiza.
        ? `<b>${quem}</b>${emailDono} convidou você como <b>Educador Financeiro</b>. Aceitando, você vê as contas, os lançamentos e o planejamento, sem lançar nem alterar nada, com o seu próprio login. ${quem} liga e desliga esse acesso quando quiser.`
        : `<b>${quem}</b>${emailDono} quer dividir a organização das finanças com você. Aceitando, vocês veem e lançam nas mesmas contas, cartões e planejamento, cada um com o próprio login.`,
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
  const { error: regErr } = await adm.from('envios_convite').insert({ dono_id: eu.user.id, convite_id: id })
  if (regErr) console.error('envios_convite registro', regErr)
  return responder(200, { ok: true, enviado: true })
})
