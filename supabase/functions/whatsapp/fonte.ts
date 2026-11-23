// ============================================================
// whatsapp — lançar pelo WhatsApp (Z-API → n8n → aqui → n8n → Z-API)
// ============================================================
// FONTE. O arquivo publicado é o index.ts AO LADO, gerado por
//   node scripts/empacotar-whatsapp.mjs
// (junta as regras de src/utils/whatsapp.ts num arquivo só, para colar no
// editor de funções do painel do Supabase). Não edite o index.ts à mão.
//
// O n8n repassa o corpo que a Z-API manda em "Ao receber" e recebe
//   { telefone, resposta }   resposta null = não responder nada
// e manda `resposta` para `telefone` pela Z-API (send-text).
//
// Sem JWT: protegida pelo segredo do cabeçalho x-whatsapp-secret.
// Deploy (uma vez):
//   supabase secrets set WHATSAPP_SECRET=<um texto longo e aleatório>
//   supabase functions deploy whatsapp --no-verify-jwt
//   (ou cole o index.ts no editor do painel e desligue "Verify JWT")
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  classificar, normalizarTelefone, hojeEmSaoPaulo, lerLancamento, aplicarLancamento, mesesDaAcao, chaveDoMes,
  textoLigado, textoLancado, TEXTO_AJUDA, TEXTO_SEM_VINCULO, TEXTO_SO_TEXTO, TEXTO_CODIGO_INVALIDO,
  TEXTO_DESLIGADO, TEXTO_NADA_PENDENTE, TEXTO_CANCELADO, MINUTOS_DA_PROPOSTA,
  type AcaoLancar, type ContaWa, type CategoriaWa,
} from '../../../src/utils/whatsapp.ts'

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const segredo = Deno.env.get('WHATSAPP_SECRET')
  if (!segredo || req.headers.get('x-whatsapp-secret') !== segredo) return new Response('Não autorizado', { status: 401 })

  let p: Record<string, unknown>
  try { p = await req.json() } catch { return json({ erro: 'corpo inválido' }, 400) }
  // n8n às vezes embrulha o webhook em { body: ... }
  if (p && typeof p.body === 'object' && p.body && !p.phone) p = p.body as Record<string, unknown>

  const telefone = normalizarTelefone(p.phone)
  if (typeof p.type === 'string' && p.type !== 'ReceivedCallback') return json({ telefone, resposta: null })
  if (!telefone || p.fromMe === true || p.isGroup === true || p.isNewsletter === true) return json({ telefone, resposta: null })
  const responder = (resposta: string | null) => json({ telefone, resposta })

  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  // A mesma mensagem duas vezes (reenvio da Z-API) não lança duas vezes.
  const messageId = typeof p.messageId === 'string' ? p.messageId : null
  if (messageId) {
    const { error } = await db.from('whatsapp_processadas').insert({ message_id: messageId })
    if (error?.code === '23505') return responder(null)
    if (Math.random() < 0.02)
      await db.from('whatsapp_processadas').delete().lt('criado_em', new Date(Date.now() - 7 * 864e5).toISOString())
  }

  const texto = typeof (p.text as { message?: unknown } | undefined)?.message === 'string'
    ? ((p.text as { message: string }).message) : ''
  if (!texto.trim()) {
    // Áudio, foto, documento: explica. Reação, aviso de sistema e afins: silêncio.
    const midia = ['audio', 'image', 'video', 'document', 'sticker'].some(k => p[k])
    return responder(midia ? TEXTO_SO_TEXTO : null)
  }
  const cmd = classificar(texto)

  // Ligar: o código gerado no Perfil, mandado DESTE número.
  if (cmd.tipo === 'codigo') {
    const { data: v } = await db.from('whatsapp_vinculos').select('user_id, codigo_expira')
      .eq('codigo', cmd.codigo).maybeSingle()
    if (!v || !v.codigo_expira || new Date(v.codigo_expira) < new Date()) return responder(TEXTO_CODIGO_INVALIDO)
    // Um número, um login: quem prova ter o celular leva o número.
    await db.from('whatsapp_vinculos').update({ telefone: null, avisos: false }).eq('telefone', telefone).neq('user_id', v.user_id)
    await db.from('whatsapp_pendentes').delete().eq('telefone', telefone)
    const { error } = await db.from('whatsapp_vinculos')
      .update({ telefone, codigo: null, codigo_expira: null, vinculado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
      .eq('user_id', v.user_id)
    if (error) { console.error('vincular:', error.message); return responder('Não consegui ligar agora. Tente de novo em instantes.') }
    const { data: pref } = await db.from('user_preferences').select('perfil_apelido, perfil_nome').eq('user_id', v.user_id).maybeSingle()
    const nome = (pref?.perfil_apelido || (pref?.perfil_nome ?? '').split(' ')[0] || '').trim()
    return responder(textoLigado(nome || undefined))
  }

  const { data: vinculo } = await db.from('whatsapp_vinculos').select('user_id').eq('telefone', telefone).maybeSingle()
  if (!vinculo) return responder(TEXTO_SEM_VINCULO)
  const login = vinculo.user_id as string

  if (cmd.tipo === 'sair') {
    await db.from('whatsapp_pendentes').delete().eq('telefone', telefone)
    await db.from('whatsapp_vinculos').delete().eq('user_id', login)
    return responder(TEXTO_DESLIGADO)
  }
  if (cmd.tipo === 'ajuda') return responder(TEXTO_AJUDA)
  if (cmd.tipo === 'nao') {
    await db.from('whatsapp_pendentes').delete().eq('telefone', telefone)
    return responder(TEXTO_CANCELADO)
  }

  // Conta compartilhada (migração 015): as finanças estão no user_id do dono.
  const { data: comp } = await db.from('compartilhamentos').select('dono_id')
    .eq('membro_id', login).eq('status', 'aceito').maybeSingle()
  const dono = (comp?.dono_id as string | undefined) ?? login

  if (cmd.tipo === 'sim') {
    const { data: pend } = await db.from('whatsapp_pendentes').select('acao, criado_em, user_id').eq('telefone', telefone).maybeSingle()
    await db.from('whatsapp_pendentes').delete().eq('telefone', telefone)
    if (!pend || pend.user_id !== login || Date.now() - new Date(pend.criado_em).getTime() > MINUTOS_DA_PROPOSTA * 60e3)
      return responder(TEXTO_NADA_PENDENTE)
    const acao = pend.acao as AcaoLancar
    const tabela = acao.destino === 'fatura' ? 'fatura_data' : 'extrato_data'
    const refs = mesesDaAcao(acao)
    const { data: linhas, error: errLer } = await db.from(tabela).select('conta_id, ano, mes, dados')
      .eq('user_id', dono).eq('conta_id', acao.contaId)
      .or(refs.map(r => `and(ano.eq.${r.ano},mes.eq.${r.mes + 1})`).join(','))
    if (errLer) { console.error('ler meses:', errLer.message); return responder('Não consegui lançar agora. Tente de novo em instantes.') }
    const meses: Record<string, unknown> = {}
    for (const l of linhas ?? []) meses[chaveDoMes(l.conta_id, l.ano, l.mes - 1)] = l.dados
    const novos = aplicarLancamento(acao, meses, { baseId: `w-${Date.now()}`, autor: login })
    const porChave = new Map(refs.map(r => [chaveDoMes(r.contaId, r.ano, r.mes), r]))
    const rows = Object.entries(novos).map(([k, dados]) => {
      const r = porChave.get(k)!
      return { user_id: dono, conta_id: r.contaId, ano: r.ano, mes: r.mes + 1, dados }
    })
    const { error } = await db.from(tabela).upsert(rows, { onConflict: 'user_id,conta_id,ano,mes' })
    if (error) { console.error('gravar:', error.message); return responder('Não consegui lançar agora. Tente de novo em instantes.') }
    return responder(textoLancado(acao))
  }

  // Uma frase: vira proposta e espera o SIM.
  const [{ data: contasDb }, { data: catsDb }] = await Promise.all([
    db.from('contas').select('id, nome, banco, tipo, apelido, preferida, dia_fechamento, saldo_inicial_desde, ativo').eq('user_id', dono),
    db.from('categorias').select('id, nome, tipo, ativa, tipo_movimento, forma_pagamento, conta_debito_id, descricao, pin_quick').eq('user_id', dono),
  ])
  const contas: ContaWa[] = (contasDb ?? []).filter(c => c.ativo !== false).map(c => ({
    id: c.id, nome: c.nome, banco: c.banco ?? '', tipo: c.tipo, apelido: c.apelido ?? undefined,
    preferida: !!c.preferida, diaFechamento: c.dia_fechamento ?? undefined, saldoInicialDesde: c.saldo_inicial_desde ?? undefined,
  }))
  const categorias: CategoriaWa[] = (catsDb ?? []).map(c => ({
    id: c.id, nome: c.nome, tipo: c.tipo, ativa: !!c.ativa, tipoMovimento: c.tipo_movimento,
    formaPagamento: c.forma_pagamento ?? undefined, contaDebitoId: c.conta_debito_id ?? undefined,
    descricao: c.descricao ?? undefined, pinQuick: !!c.pin_quick,
  }))
  const leitura = lerLancamento(texto, { contas, categorias, hoje: hojeEmSaoPaulo() })
  if (!leitura.ok) return responder(leitura.resposta)
  await db.from('whatsapp_pendentes').upsert({ telefone, user_id: login, acao: leitura.acao, criado_em: new Date().toISOString() })
  return responder(leitura.resposta)
})
