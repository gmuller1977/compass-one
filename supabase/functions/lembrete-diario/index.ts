// ============================================================
// lembrete-diario — a notificação das 21h no celular
// ============================================================
// Uma vez por dia (pg_cron, ver docs no fim), para cada aparelho inscrito:
//   - conta vencendo amanhã → "Amanhã vence: Aluguel · R$ 2.200,00"
//   - sem lançamento hoje   → "Lançou seus gastos de hoje?"
//   - os dois em dia        → nada
// As regras estão em regras.ts. A lista de contas vem pronta do app
// (push_inscricoes.contas_proximas): o servidor não refaz a conta do saldo.
//
// Sem JWT de usuário — quem chama é o agendador. Protegida por um segredo
// próprio no cabeçalho x-cron-secret.
//
// Deploy (uma vez):
//   npx web-push generate-vapid-keys
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... CRON_SECRET=...
//   supabase functions deploy lembrete-diario --no-verify-jwt
//   Vercel: VITE_VAPID_PUBLIC_KEY = a mesma chave pública
// Agendamento (SQL, uma vez; 00:00 UTC = 21h em São Paulo):
//   select cron.schedule('lembrete-diario', '0 0 * * *', $$
//     select net.http_post(
//       url := 'https://<projeto>.supabase.co/functions/v1/lembrete-diario',
//       headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>'));
//   $$);
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { diaEmSaoPaulo, lancouNoDia, mensagemDoDia, type ContaProxima } from './regras.ts'

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('Não autorizado', { status: 401 })

  webpush.setVapidDetails('mailto:contato@compassone.app',
    Deno.env.get('VAPID_PUBLIC_KEY') ?? '', Deno.env.get('VAPID_PRIVATE_KEY') ?? '')
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  const hoje = diaEmSaoPaulo(new Date())
  const { data: inscricoes, error } = await db.from('push_inscricoes').select('*')
  if (error) return new Response(error.message, { status: 500 })

  // O mês corrente e o seguinte: a compra no cartão depois do fechamento
  // está na fatura do mês que vem.
  const proxMes = hoje.mes === 11 ? { ano: hoje.ano + 1, mes: 1 } : { ano: hoje.ano, mes: hoje.mes + 2 }
  const usuarios = [...new Set((inscricoes ?? []).map(i => i.user_id as string))]
  const lancou = new Map<string, boolean>()
  // Conta compartilhada (migração 015): as finanças de um membro estão no
  // user_id do dono. Sem a tabela, cada um é dono de si.
  const { data: comp } = await db.from('compartilhamentos').select('membro_id, dono_id').eq('status', 'aceito')
  const donoDe = new Map<string, string>((comp ?? []).map(c => [c.membro_id as string, c.dono_id as string]))
  for (const uid of usuarios) {
    const dono = donoDe.get(uid) ?? uid
    const [{ data: ext }, { data: fat }] = await Promise.all([
      db.from('extrato_data').select('ano, mes, dados').eq('user_id', dono).eq('ano', hoje.ano).eq('mes', hoje.mes + 1),
      db.from('fatura_data').select('ano, mes, dados').eq('user_id', dono)
        .or(`and(ano.eq.${hoje.ano},mes.eq.${hoje.mes + 1}),and(ano.eq.${proxMes.ano},mes.eq.${proxMes.mes})`),
    ])
    lancou.set(uid, lancouNoDia(ext ?? [], fat ?? [], hoje))
  }

  let enviadas = 0, removidas = 0
  for (const i of inscricoes ?? []) {
    const msg = mensagemDoDia({ lancouHoje: lancou.get(i.user_id) ?? false, contas: (i.contas_proximas ?? []) as ContaProxima[], amanhaIso: hoje.amanhaIso })
    if (!msg) continue
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, JSON.stringify(msg))
      enviadas++
    } catch (e) {
      // 404/410: o aparelho cancelou a inscrição. Não adianta tentar de novo.
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) { await db.from('push_inscricoes').delete().eq('endpoint', i.endpoint); removidas++ }
      else console.error('push falhou:', status, (e as Error).message)
    }
  }
  return new Response(JSON.stringify({ inscricoes: inscricoes?.length ?? 0, enviadas, removidas }), { headers: { 'Content-Type': 'application/json' } })
})
