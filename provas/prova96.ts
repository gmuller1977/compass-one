// prova96 (25/10/2026, pacote 2): a leitura em páginas traz TODAS as linhas,
// sem repetir nem pular, e devolve o erro de qualquer página.
import { lerTudo } from '../src/utils/lerTudo'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHOU', n)) }

// Banco de mentira com o teto do Supabase: no máximo `teto` linhas por resposta.
const banco = (n: number, teto = 1000) => {
  const linhas = Array.from({ length: n }, (_, i) => ({ i }))
  let chamadas = 0
  const pagina = async (de: number, ate: number) => {
    chamadas++
    return { data: linhas.slice(de, Math.min(ate + 1, de + teto)), error: null }
  }
  return { pagina, chamadas: () => chamadas }
}

for (const n of [0, 1, 999, 1000, 1001, 2500, 4000]) {
  const b = banco(n)
  const { data, error } = await lerTudo(b.pagina)
  t(`${n} linhas: todas`, !error && data!.length === n)
  t(`${n} linhas: em ordem, sem repetir`, data!.every((l, k) => l.i === k))
  t(`${n} linhas: páginas = ${Math.floor(n / 1000) + 1}`, b.chamadas() === Math.floor(n / 1000) + 1)
}

// Controle: a consulta antiga, uma só, perde o que passa de mil.
{
  const b = banco(2500)
  const { data } = await b.pagina(0, 1e9)
  t('controle: consulta única corta em 1000', data.length === 1000)
}

// Erro na segunda página: nada pela metade.
{
  let k = 0
  const { data, error } = await lerTudo(async (de, ate) => {
    k++
    if (k === 2) return { data: null, error: { message: 'falhou' } }
    return { data: Array.from({ length: ate - de + 1 }, (_, i) => de + i), error: null }
  })
  t('erro na 2ª página devolve erro', !!error && data === null)
}

console.log(`prova96: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
