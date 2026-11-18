// prova122 (18/11/2026): caixa de mensagens e aceite de ofertas por e-mail.
// A parte do banco (RLS, quem lê e escreve o quê) é a prova122-banco.sql,
// rodada num Postgres 16 de verdade (21 conferências).
import { readFileSync } from 'node:fs'
import { aceiteDeOfertas, aceitouOfertas, comunicadosNaoLidos, ehNovo, respondeuOfertas, textoDoSelo } from '../src/utils/mensagensRegras'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const ler = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

const com = [
  { id: 1, criado_em: '2026-10-01T10:00:00Z' },
  { id: 2, criado_em: '2026-11-10T10:00:00Z' },
  { id: 3, criado_em: '2026-11-17T10:00:00Z' },
]
t('conta antiga: os três acendem', comunicadosNaoLidos(com, new Set(), '2026-01-01T00:00:00Z') === 3)
t('conta nova: só o publicado depois dela', comunicadosNaoLidos(com, new Set(), '2026-11-15T00:00:00Z') === 1)
t('lido não conta', comunicadosNaoLidos(com, new Set([3]), '2026-01-01T00:00:00Z') === 2)
t('sem data da conta: conta todos', comunicadosNaoLidos(com, new Set(), undefined) === 3)
t('NOVO segue a mesma régua', ehNovo(com[2], new Set(), '2026-11-15T00:00:00Z') && !ehNovo(com[0], new Set(), '2026-11-15T00:00:00Z'))
t('selo até 9', textoDoSelo(1) === '1' && textoDoSelo(9) === '9' && textoDoSelo(10) === '9+')

const a = aceiteDeOfertas(true, new Date('2026-11-18T10:00:00Z'))
t('aceite guarda a data', a.ofertas_email === true && a.ofertas_email_em === '2026-11-18T10:00:00.000Z')
t('não respondeu', !respondeuOfertas({ user_metadata: {} }) && !respondeuOfertas(null))
t('recusar também é resposta', respondeuOfertas({ user_metadata: aceiteDeOfertas(false) }) && !aceitouOfertas({ user_metadata: aceiteDeOfertas(false) }))
t('só true é aceite (texto não vale)', !aceitouOfertas({ user_metadata: { ofertas_email: 'true' } }) && aceitouOfertas({ user_metadata: a }))

// LGPD: a caixa nasce desmarcada no cadastro e no primeiro acesso.
t('cadastro: desmarcada', /const \[ofertas, setOfertas\] = useState\(false\)/.test(ler('../src/pages/Cadastro.tsx')))
t('primeiro acesso: desmarcada', /const \[ofertas, setOfertas\] = useState\(false\)/.test(ler('../src/pages/PrimeiroAcesso.tsx')))
// A função só manda comunicado para quem aceitou (=== true) e com e-mail confirmado.
const fn = ler('../supabase/functions/mensagem-email/index.ts')
t('e-mail de comunicado só para quem aceitou', fn.includes('u.user_metadata?.ofertas_email === true') && fn.includes('u.email_confirmed_at'))
t('uma mensagem, um e-mail', fn.includes(".is('email_enviado_em', null)"))

// Toda tabela nova da 026: GRANT explícito e RLS, nada para anon.
const sql = ler('../supabase/migrations/026_mensagens.sql')
for (const tab of ['suporte_admins', 'comunicados', 'comunicados_lidos', 'mensagens_suporte']) {
  t(`${tab}: grant authenticated`, sql.includes(`on public.${tab} to authenticated`))
  t(`${tab}: grant service_role`, sql.includes(`on public.${tab} to service_role`))
  t(`${tab}: RLS`, sql.includes(`alter table public.${tab} enable row level security`))
}
t('anon sem grant', !/to anon\b/.test(sql.replace(/from public, anon/g, '')))
// "Baixar meus dados" leva a conversa e os lidos.
const exp = ler('../src/utils/baixarMeusDados.ts')
t('exporta mensagens_suporte e comunicados_lidos', exp.includes("'mensagens_suporte'") && exp.includes("'comunicados_lidos'"))
t('política fala do aceite', ler('../src/data/politica-de-privacidade.md').includes('Novidades e ofertas por e-mail'))

console.log(`prova122: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
