// prova120 (11/11/2026): o app mora no app.compass-one.com.br e a
// apresentação no www. Confere os links (site.ts) e o script do index.html
// que manda do www para o app., rodado de verdade numa janela de mentira.
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { urlDoApp, hrefDoApp, ehHostDoApp, ehHostDoSite } from '../src/utils/site'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

t('e-mail e Google voltam para o app.', urlDoApp('/redefinir-senha', 'https://www.compass-one.com.br') === 'https://app.compass-one.com.br/redefinir-senha')
t('localhost volta para o localhost', urlDoApp('/', 'http://localhost:5173') === 'http://localhost:5173/')
t('Entrar no www vai ao app.', hrefDoApp('/login', null, 'www.compass-one.com.br') === 'https://app.compass-one.com.br/login')
t('a indicação viaja no link', hrefDoApp('/cadastro', 'ABC123', 'www.compass-one.com.br') === 'https://app.compass-one.com.br/cadastro?indicacao=ABC123')
t('localhost: link relativo', hrefDoApp('/login', 'X', 'localhost') === '/login')
t('página pronta (sem host): app.', hrefDoApp('/login', null, '') === 'https://app.compass-one.com.br/login')
t('hosts', ehHostDoApp('app.compass-one.com.br') && ehHostDoSite('compass-one.com.br') && !ehHostDoSite('app.compass-one.com.br'))

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('app.compass-one.com.br'))!
type Caso = { url: string; chaves?: Record<string, string>; celular?: boolean; instalado?: boolean }
function abrir(c: Caso) {
  const u = new URL(c.url)
  let destino: string | null = null
  const classes = new Set<string>()
  const ls = c.chaves ?? {}
  runInNewContext(script, {
    location: { hostname: u.hostname, pathname: u.pathname, search: u.search, hash: u.hash, replace: (x: string) => { destino = x } },
    localStorage: { length: Object.keys(ls).length, key: (i: number) => Object.keys(ls)[i], getItem: (k: string) => ls[k] ?? null },
    matchMedia: (q: string) => ({ matches: q.includes('standalone') ? !!c.instalado : !!c.celular }),
    navigator: {},
    document: { documentElement: { classList: { add: (x: string) => classes.add(x) } } },
  })
  return { destino, escondida: classes.has('sem-apresentacao') }
}
const SESSAO = { 'sb-dfskabujscpfgysgipov-auth-token': '{}' }
const a = abrir({ url: 'https://www.compass-one.com.br/' })
t('www/ novo: fica na apresentação', a.destino === null && !a.escondida)
t('www/login vai ao app. no mesmo caminho', abrir({ url: 'https://www.compass-one.com.br/login?x=1#y' }).destino === 'https://app.compass-one.com.br/login?x=1#y')
t('link antigo de e-mail com token no #', abrir({ url: 'https://www.compass-one.com.br/#access_token=abc&type=recovery' }).destino === null
  && abrir({ url: 'https://www.compass-one.com.br/redefinir-senha#access_token=abc' }).destino === 'https://app.compass-one.com.br/redefinir-senha#access_token=abc')
t('www/ com sessão vai ao app.', abrir({ url: 'https://www.compass-one.com.br/', chaves: SESSAO }).destino === 'https://app.compass-one.com.br/')
t('www/ no celular de quem já usa vai ao app.', abrir({ url: 'https://www.compass-one.com.br/', celular: true, chaves: { 'compass-ja-entrou-aqui': '1' } }).destino === 'https://app.compass-one.com.br/')
t('ícone instalado no www vai ao app.', abrir({ url: 'https://www.compass-one.com.br/', celular: true, instalado: true }).destino !== null)
t('termos, privacidade e indicação ficam no www', ['/termos', '/privacidade', '/i/ABC'].every(p => abrir({ url: 'https://www.compass-one.com.br' + p }).destino === null))
const pend = abrir({ url: 'https://www.compass-one.com.br/radar', chaves: { ...SESSAO, 'compass-pendentes-u1': '{}' } })
t('ajuda e aulas ficam no www (reservado)', ['/ajuda', '/ajuda/cartao', '/aulas/1'].every(p => abrir({ url: 'https://www.compass-one.com.br' + p }).destino === null))
t('lançamento sem internet não gravado: fica no www uma vez', pend.destino === null && pend.escondida)
t('raiz sem www também vai', abrir({ url: 'https://compass-one.com.br/dashboard' }).destino === 'https://app.compass-one.com.br/dashboard')
const app = abrir({ url: 'https://app.compass-one.com.br/' })
t('no app. não há apresentação nem redirecionamento', app.destino === null && app.escondida)
const local = abrir({ url: 'http://localhost:5173/login' })
t('localhost não redireciona', local.destino === null)

console.log(`prova120: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
