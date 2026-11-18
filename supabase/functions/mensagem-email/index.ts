// ============================================================
// mensagem-email — avisa por e-mail quando chega mensagem na caixa do app
// (18/11/2026, migração 026)
// ============================================================
// O app grava a mensagem (ou o comunicado) e chama esta função com
// { tipo: 'mensagem' | 'comunicado', id }. Ela confere quem chamou:
//   * mensagem da pessoa → só a própria pessoa dispara; o e-mail vai para
//     os administradores do suporte (suporte_admins);
//   * resposta do suporte → só administrador dispara; o e-mail vai para a
//     pessoa da conversa;
//   * comunicado → só administrador dispara, e só se ele marcou "avisar por
//     e-mail"; vai para quem ACEITOU receber novidades
//     (user_metadata.ofertas_email = true, e-mail confirmado).
//
// Cada linha leva `email_enviado_em`: a mesma mensagem nunca gera dois
// e-mails. E, para não encher a caixa de ninguém:
//   * a pessoa que manda várias mensagens seguidas avisa o suporte uma vez
//     a cada 30 minutos enquanto não houver resposta;
//   * o suporte que responde várias vezes avisa a pessoa uma vez, enquanto
//     ela não abrir a conversa.
//
// Deploy (uma vez; RESEND_API_KEY já existe por causa do convite-email):
//   (rodar a migração 026)
//   supabase functions deploy mensagem-email
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP, emailHtml, escapar } from '../_shared/emailLayout.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const MINUTOS_ENTRE_AVISOS = 30
const DE = 'Compass One <nao-responda@compass-one.com.br>'

const responder = (status: number, corpo: Record<string, unknown>) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const trecho = (s: string, max = 1200) => {
  const t = s.trim()
  return escapar(t.length > max ? t.slice(0, max) + '…' : t).replace(/\n/g, '<br>')
}

type Envio = { to: string[]; subject: string; html: string }

async function enviar(chave: string, envios: Envio[]): Promise<boolean> {
  // A API de lote do Resend aceita até 100 e-mails por chamada.
  for (let i = 0; i < envios.length; i += 100) {
    const lote = envios.slice(i, i + 100).map(e => ({ from: DE, ...e }))
    const r = await fetch(lote.length === 1 ? 'https://api.resend.com/emails' : 'https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(lote.length === 1 ? lote[0] : lote),
    })
    if (!r.ok) { console.error('resend', r.status, await r.text()); return false }
  }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const auth = req.headers.get('Authorization')
  if (!auth) return responder(401, { erro: 'sem login' })
  const chave = Deno.env.get('RESEND_API_KEY')
  if (!chave) return responder(500, { erro: 'RESEND_API_KEY não configurada' })

  let tipo = '', id = 0
  try { const b = await req.json(); tipo = String(b.tipo ?? ''); id = Number(b.id) } catch { /* corpo inválido */ }
  if (!['mensagem', 'comunicado'].includes(tipo) || !Number.isFinite(id) || id <= 0) return responder(400, { erro: 'pedido inválido' })

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const db = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: auth } } })
  const { data: eu } = await db.auth.getUser()
  if (!eu?.user) return responder(401, { erro: 'sem login' })
  const adm = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  const { data: admins } = await adm.from('suporte_admins').select('user_id')
  const idsAdmin = (admins ?? []).map(a => a.user_id as string)
  const souSuporte = idsAdmin.includes(eu.user.id)

  // ---------- Comunicado ----------
  if (tipo === 'comunicado') {
    if (!souSuporte) return responder(403, { erro: 'só o suporte' })
    const { data: c } = await adm.from('comunicados').select('*').eq('id', id).maybeSingle()
    if (!c) return responder(404, { erro: 'não encontrado' })
    if (!c.avisar_por_email || c.email_enviado_em) return responder(200, { ok: true, enviado: false })
    // Marca antes de mandar: um segundo toque não manda de novo.
    const { data: marcado } = await adm.from('comunicados').update({ email_enviado_em: new Date().toISOString() })
      .eq('id', id).is('email_enviado_em', null).select('id')
    if (!marcado?.length) return responder(200, { ok: true, enviado: false })

    const para: string[] = []
    for (let pagina = 1; pagina < 100; pagina++) {
      const { data, error } = await adm.auth.admin.listUsers({ page: pagina, perPage: 1000 })
      if (error) { console.error('listUsers', error); break }
      for (const u of data.users) {
        if (u.email && u.email_confirmed_at && u.user_metadata?.ofertas_email === true) para.push(u.email)
      }
      if (data.users.length < 1000) break
    }
    const html = emailHtml({
      preview: String(c.texto).slice(0, 120),
      titulo: escapar(String(c.titulo)),
      paragrafos: [trecho(String(c.texto), 4000)],
      botao: { texto: 'Abrir no Compass One', url: `${APP}/mensagens` },
      rodape: 'Você recebeu este e-mail porque aceitou receber novidades do Compass One. Para parar, desmarque "Novidades e ofertas por e-mail" em Configurações › Perfil.',
    })
    const ok = await enviar(chave, para.map(e => ({ to: [e], subject: String(c.titulo), html })))
    return responder(ok ? 200 : 502, { ok, enviado: ok, quantos: para.length })
  }

  // ---------- Mensagem da conversa ----------
  const { data: m } = await adm.from('mensagens_suporte').select('*').eq('id', id).maybeSingle()
  if (!m) return responder(404, { erro: 'não encontrada' })
  if (m.email_enviado_em) return responder(200, { ok: true, enviado: false })
  if (m.autor === 'pessoa' && m.user_id !== eu.user.id) return responder(403, { erro: 'não é sua' })
  if (m.autor === 'suporte' && !souSuporte) return responder(403, { erro: 'só o suporte' })

  const { data: antes } = await adm.from('mensagens_suporte').select('autor, criado_em, lida_em, email_enviado_em')
    .eq('user_id', m.user_id).lt('id', id).order('id', { ascending: false }).limit(50)
  const anteriores = antes ?? []
  if (m.autor === 'pessoa') {
    // Já avisou há pouco e o suporte ainda não respondeu: não avisa de novo.
    const ultimaResposta = anteriores.find(a => a.autor === 'suporte')
    const avisoRecente = anteriores.find(a => a.autor === 'pessoa' && a.email_enviado_em
      && (!ultimaResposta || a.criado_em > ultimaResposta.criado_em)
      && Date.now() - new Date(a.email_enviado_em).getTime() < MINUTOS_ENTRE_AVISOS * 60_000)
    if (avisoRecente) return responder(200, { ok: true, enviado: false, motivo: 'aviso recente' })
  } else {
    // A pessoa ainda não abriu a resposta anterior, que já foi avisada.
    if (anteriores.some(a => a.autor === 'suporte' && !a.lida_em && a.email_enviado_em))
      return responder(200, { ok: true, enviado: false, motivo: 'ainda não leu' })
  }
  const { data: marcado } = await adm.from('mensagens_suporte').update({ email_enviado_em: new Date().toISOString() })
    .eq('id', id).is('email_enviado_em', null).select('id')
  if (!marcado?.length) return responder(200, { ok: true, enviado: false })

  const { data: dono } = await adm.auth.admin.getUserById(m.user_id)
  const emailPessoa = dono?.user?.email ?? ''
  const nomePessoa = String(dono?.user?.user_metadata?.nome || dono?.user?.user_metadata?.full_name || emailPessoa || 'Uma pessoa')

  let envios: Envio[] = []
  if (m.autor === 'pessoa') {
    const emails: string[] = []
    for (const a of idsAdmin) {
      const { data } = await adm.auth.admin.getUserById(a)
      if (data?.user?.email) emails.push(data.user.email)
    }
    const html = emailHtml({
      preview: String(m.texto).slice(0, 120),
      titulo: `Nova mensagem de ${escapar(nomePessoa)}`,
      paragrafos: [`<b>${escapar(nomePessoa)}</b> (${escapar(emailPessoa)}) escreveu para o suporte:`, trecho(String(m.texto))],
      botao: { texto: 'Responder no Compass One', url: `${APP}/mensagens?conversa=${m.user_id}` },
      rodape: 'Você recebeu este e-mail porque é administrador do suporte do Compass One. Responda pelo app: a resposta chega na caixa de mensagens da pessoa.',
    })
    envios = emails.map(e => ({ to: [e], subject: `Suporte: nova mensagem de ${nomePessoa}`, html }))
  } else if (emailPessoa) {
    const html = emailHtml({
      preview: String(m.texto).slice(0, 120),
      titulo: 'O suporte respondeu sua mensagem',
      paragrafos: ['Olá!', 'O Suporte Compass One respondeu:', trecho(String(m.texto))],
      botao: { texto: 'Ver a conversa', url: `${APP}/mensagens?aba=suporte` },
      rodape: 'Você recebeu este e-mail porque escreveu para o suporte do Compass One. Para continuar a conversa, responda pelo app: este endereço não recebe respostas.',
    })
    envios = [{ to: [emailPessoa], subject: 'O suporte do Compass One respondeu', html }]
  }
  const ok = envios.length === 0 ? true : await enviar(chave, envios)
  if (!ok) await adm.from('mensagens_suporte').update({ email_enviado_em: null }).eq('id', id)
  return responder(ok ? 200 : 502, { ok, enviado: ok && envios.length > 0 })
})
