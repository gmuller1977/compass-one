// prova138 — Fixa "não vai ocorrer" sai do planejado do mês (28/11/2026,
// decisão do Guilherme). Em novembro o card do grupo já tirava a fixa marcada
// do Planejado, e o topo, as barras e a frase do Radar seguiam contando:
// R$ 169,00 de diferença. Hoje totaisDoMes({ naoOcorre }) tira a linha do
// planejado (prev 0) quando nada foi lançado nela; paga, ela fica.
import { construirRealizadoMes } from '../src/utils/realizadoMes'
import { totaisDoMes, nomesDeCartao } from '../src/components/acompanhamento/evolucaoCalcs'
import { idsQueNaoOcorrem } from '../src/utils/fixasDoMes'
import { balancoDoPlano } from '../src/utils/balancoDoPlano'
import { contas, categoriasBase, planos, extratoData, faturaData } from './familia'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6

const ano = 2026, mes = 10
// Luz (dia 20, não paga) marcada "não vai ocorrer"; Aluguel pago também marcado
// (a marca de paga vence: fixaNaoOcorre devolve falso).
const ext = structuredClone(extratoData)
ext['cx-2026-11'].fixasNaoOcorre = { luz: true }
ext['sic-2026-11'].fixasNaoOcorre = { alu: true }
const ids = idsQueNaoOcorrem(ext, contas, categoriasBase as any, ano, mes)
t('Luz não ocorre', ids.has('luz'))
t('Aluguel pago não entra (paga vence)', !ids.has('alu'))
t('sem marca, vazio', idsQueNaoOcorrem(extratoData, contas, categoriasBase as any, ano, mes).size === 0)

const { saidasMap, entradasMap } = construirRealizadoMes({ ano, mes, extratoData: ext, faturaData, contas: contas as any, categorias: categoriasBase as any, planoAno: planos[ano] })
const base = { mes, planoAno: planos[ano], categorias: categoriasBase as any, cartaoNomes: nomesDeCartao(contas), entradasMap, saidasMap }
const sem = totaisDoMes(base)
const com = totaisDoMes({ ...base, naoOcorre: ids })
const luzSem = sem.saida.linhas.find(l => l.nome === 'Luz')!
const luzCom = com.saida.linhas.find(l => l.nome === 'Luz')!
t('Luz tem plano em novembro', luzSem.prev > 0, luzSem)
t('Luz sai do planejado da linha', luzCom.prev === 0, luzCom)
t('total planejado cai pelo plano da Luz', perto(sem.saida.prev - com.saida.prev, luzSem.prev))
t('naoOcorre devolve o plano tirado', perto(com.saida.naoOcorre, luzSem.prev))
t('total planejado = soma das linhas', perto(com.saida.prev, com.saida.linhas.reduce((s, l) => s + l.prev, 0)))
t('realizado não muda', perto(sem.saida.real, com.saida.real))
// A frase (balancoDoPlano) não conta mais a Luz como "abaixo do plano".
const bSem = balancoDoPlano(sem.saida.linhas)!, bCom = balancoDoPlano(com.saida.linhas)!
t('frase perde o plano da Luz', perto(bSem.diferenca - bCom.diferenca, luzSem.prev), { bSem: bSem.diferenca, bCom: bCom.diferenca })
// Controle: com algo lançado na fixa marcada, ela fica no planejado.
const realLuz = { ...saidasMap }
const k = Object.keys(saidasMap).find(x => x.startsWith('Luz')) ?? 'Luz'
realLuz[k] = { ...(saidasMap[k] ?? {}), total: 30 } as any
const comLancado = totaisDoMes({ ...base, saidasMap: realLuz, naoOcorre: ids })
t('controle: lançada, a Luz fica no planejado', perto(comLancado.saida.prev, sem.saida.prev))

console.log(`prova138: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
