// prova126 — "hoje" é o dia do Brasil até as 24h (24/11/2026, revisão de
// 24/11, item A1). Lançamentos e a fatura usavam toISOString(), que dá a data
// em UTC: das 21h à meia-noite gravavam o saldo informado e o valor da fatura
// com a data de AMANHÃ, e a Início (que usa dataDeHoje) não via a conferência.
// Agora as três telas usam dataDeHoje, a data local do aparelho.
process.env.TZ = 'America/Sao_Paulo'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dataDeHoje } from '../src/utils/conferirSaldos'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean) => { if (cond) ok++; else { falhas++; console.log('FALHOU:', nome) } }

// 22h30 do dia 30/11 em São Paulo (01:30 do dia 1º em UTC)
const noite = new Date('2026-11-30T22:30:00-03:00')
t('22h30 do dia 30 ainda é dia 30', dataDeHoje(noite) === '2026-11-30')
t('controle: toISOString já diria dia 1º', noite.toISOString().slice(0, 10) === '2026-12-01')
t('23h59 de 31/12 ainda é 2026', dataDeHoje(new Date('2026-12-31T23:59:00-03:00')) === '2026-12-31')
t('00h01 do dia 1º já é dia 1º', dataDeHoje(new Date('2026-12-01T00:01:00-03:00')) === '2026-12-01')
t('manhã sem mudança', dataDeHoje(new Date('2026-11-23T09:00:00-03:00')) === '2026-11-23')

// As duas telas não podem voltar a calcular "hoje" em UTC.
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const arq of ['src/pages/NovoLancamentoExtrato.tsx', 'src/pages/FaturaCartao.tsx']) {
  const src = readFileSync(join(raiz, arq), 'utf8')
  t(`${arq}: hojeStr usa dataDeHoje`, /hojeStr\s*=\s*dataDeHoje\(hoje\)/.test(src))
  t(`${arq}: sem toISOString().slice(0,10)`, !/toISOString\(\)\.slice\(0, ?10\)/.test(src))
}

console.log(`prova126: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
