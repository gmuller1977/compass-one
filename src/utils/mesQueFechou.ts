import type { Categoria, DadosMes, PlanoAnoData } from '../context/AppContext'
import type { Deps } from './saldoConta'
import { construirRealizadoMes } from './realizadoMes'
import { catKey, nomesDeCartao, totaisDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { jaLancadoNosMeses } from './historicoDaCategoria'
import { cadastroPlanejavel, itensDaSugestao } from './revisaoDoPlano'
import { somaDeParcelas, valorMesAMes } from './ajustePlano'
import { mudarLinhaDoPlano } from './linhaDoPlano'
import { comItens, comValor } from './itensPlano'
import { fimDoPlanejamento } from './simulacaoCompra'
import { estimativasDosPlanos, NOME_ANTERIORES, NOME_PARCELADAS } from './primeiroAcesso'
import { mesDaChegada, primeiroMesCompleto } from './primeiroPlano'

/**
 * "O mês fechou": o que o plano não sabia. Pedido do Guilherme em 18/10/2026,
 * ao perguntar como entra no plano uma categoria criada no meio do mês ("no
 * início é bom, toda informação ou ação parte desta tela"). Na Início e na
 * Bússola, a partir do dia 1, até cada item ser resolvido:
 *
 * - **nova**: categoria variável com gasto no mês que fechou e SEM plano no
 *   mês de hoje. Sem isso, o mesmo gasto vira "fora do plano" todo mês.
 * - **chute**: o mês que fechou é o primeiro do plano inicial, e o gasto ficou
 *   longe do que a pessoa estimou no primeiro acesso (10% e R$ 20 ou mais).
 *
 * O gasto é o do Radar (`totaisDoMes`), sem as parcelas: a parcela já está
 * lançada nos meses dela e o plano a soma por cima (`valorMesAMes`, a regra
 * do ajuste e da revisão). Fixas ficam de fora, e as duas categorias que o
 * primeiro acesso cria para o que já estava na fatura, também.
 *
 * Gravar vale do mês de HOJE até o fim do plano. É exceção consciente à regra
 * do ajuste pelo Radar (o mês corrente não se mexe): lá o plano subiria até o
 * gasto do próprio mês e apagaria o "passou"; aqui o valor é o do mês que
 * fechou, e a revisão acontece na virada.
 */
export type ItemDoMesQueFechou = {
  nome: string
  descricao: string
  grupo: string
  tipo: 'nova' | 'chute'
  /** Gasto no mês que fechou, sem parcelas. */
  gasto: number
  /** O plano do mês que fechou (o chute; zero na nova). */
  plano: number
  /** O valor que a janela oferece: o gasto, em reais inteiros. */
  sugerido: number
}

export type MesQueFechou = {
  ano: number
  mes: number
  /** O mês da chegada: a pessoa usou o app só parte dele. */
  parcial: boolean
  itens: ItemDoMesQueFechou[]
}

const ehZero = (v: number) => Math.abs(v) < 0.005
const FORA = new Set([NOME_ANTERIORES, NOME_PARCELADAS])

function linhasDoMes(deps: Deps, ano: number, mes: number) {
  const { saidasMap, entradasMap } = construirRealizadoMes({
    ano, mes, extratoData: deps.extratoData as Record<string, DadosMes>,
    faturaData: deps.faturaData, contas: deps.contas, categorias: deps.categorias, planoAno: deps.planos[ano],
  })
  return totaisDoMes({ mes, planoAno: deps.planos[ano], categorias: deps.categorias, cartaoNomes: nomesDeCartao(deps.contas), entradasMap, saidasMap }).saida.linhas
}

/** A chave com que a pessoa dispensa um item ("Foi só uma vez"). */
export const chaveDoItem = (f: { ano: number; mes: number }, i: { nome: string; descricao: string }) =>
  `mes-fechou:${f.ano}-${String(f.mes + 1).padStart(2, '0')}:${catKey(i.nome, i.descricao)}`

export function mesQueFechou(deps: Deps, hoje: Date = new Date()): MesQueFechou | null {
  const fim = fimDoPlanejamento(deps.planos)
  const ymHoje = hoje.getFullYear() * 12 + hoje.getMonth()
  // Sem plano daqui para a frente não há onde colocar nada.
  if (!fim || fim.ano * 12 + fim.mes < ymHoje) return null
  const ano = Math.floor((ymHoje - 1) / 12), mes = (ymHoje - 1) % 12
  const chegada = estimativasDosPlanos(deps.planos)?.chegada
  const primeiro = chegada ? primeiroMesCompleto(new Date(`${chegada}T12:00:00`)) : null
  const ehPrimeiroDoPlano = !!primeiro && primeiro.ano === ano && primeiro.mes === mes

  const agora = new Map(linhasDoMes(deps, hoje.getFullYear(), hoje.getMonth()).map(l => [catKey(l.nome, l.descricao), l.prev]))
  const itens: ItemDoMesQueFechou[] = []
  for (const l of linhasDoMes(deps, ano, mes)) {
    if (FORA.has(l.nome) || l.real <= 0.5) continue
    const cad = cadastroPlanejavel(l.nome, l.descricao, deps.categorias)
    if (!cad || cad.fixa) continue
    // Só os dois casos abaixo viram item; sem nenhum deles, nem vale somar o
    // lançado (que refaz o realizado do mês para cada linha).
    const semPlano = ehZero(l.prev) && ehZero(agora.get(catKey(l.nome, l.descricao)) ?? 0)
    if (!semPlano && !(ehPrimeiroDoPlano && l.prev > 0.005)) continue
    const lanc = jaLancadoNosMeses(deps, 'saida', l.nome, l.descricao || undefined, [{ ano, mes }])[0]
    const gasto = Math.round((l.real - somaDeParcelas(lanc.itens)) * 100) / 100
    if (gasto <= 0.5) continue
    const base = { nome: l.nome, descricao: l.descricao, grupo: l.grupo, gasto, plano: l.prev, sugerido: Math.round(gasto) }
    if (semPlano) itens.push({ ...base, tipo: 'nova' })
    else if (ehPrimeiroDoPlano && l.prev > 0.005 && Math.abs(gasto - l.prev) >= Math.max(20, l.prev * 0.1)) {
      itens.push({ ...base, tipo: 'chute' })
    }
  }
  if (!itens.length) return null
  itens.sort((a, b) => (a.tipo === b.tipo ? b.gasto - a.gasto : a.tipo === 'chute' ? -1 : 1))
  return { ano, mes, parcial: !!mesDaChegada(deps.planos, ano, mes), itens }
}

/**
 * Grava o valor de cada item escolhido, do mês de hoje até o fim do plano,
 * cada mês no plano do ano dele. Com `meses` ("em parcelas", 19/10/2026,
 * análise da chegada v3, C5: IPVA, matrícula, seguro), só nos N meses a
 * partir de hoje; os seguintes ficam como estão. Mês com parcela lançada: o valor + a
 * parcela, em itens ("Gasto normal" e a parcela), como na revisão do plano.
 * Ano sem plano fica de fora.
 */
export function colocarNoPlano(
  planos: Record<number, PlanoAnoData>, escolhas: { item: ItemDoMesQueFechou; valor: number; meses?: number }[],
  deps: Deps, categorias: Categoria[], hoje: Date = new Date(),
): Record<number, PlanoAnoData> {
  const fim = fimDoPlanejamento(planos)
  if (!fim) return planos
  const de = hoje.getFullYear() * 12 + hoje.getMonth(), ate = fim.ano * 12 + fim.mes
  const todos = Array.from({ length: Math.max(0, ate - de + 1) }, (_, i) => ({ ano: Math.floor((de + i) / 12), mes: (de + i) % 12 }))
  let novo = { ...planos }
  for (const { item, valor, meses: n } of escolhas) {
    const meses = n && n > 0 ? todos.slice(0, n) : todos
    const cad = cadastroPlanejavel(item.nome, item.descricao, categorias)
    if (!cad) continue
    const cat = { id: cad.id, nome: cad.nome, descricao: cad.descricao || undefined, grupo: cad.grupo, tipoMovimento: cad.tipoMovimento }
    const lancado = jaLancadoNosMeses(deps, 'saida', item.nome, item.descricao || undefined, meses)
    for (const a of [...new Set(meses.map(m => m.ano))]) {
      if (!novo[a]) continue
      const r = mudarLinhaDoPlano(novo[a], 'saida', cat, l => meses.filter(m => m.ano === a).reduce((acc, m) => {
        const jl = lancado.find(x => x.ano === m.ano && x.mes === m.mes)!
        const v = valorMesAMes(valor, acc.v[m.mes] ?? 0, jl.total, somaDeParcelas(jl.itens))
        const itens = itensDaSugestao(valor, v, jl.itens, jl.total)
        return itens ? comItens(acc, [m.mes], itens) : comValor(acc, m.mes, v)
      }, l), categorias)
      if (r) novo = { ...novo, [a]: r }
    }
  }
  return novo
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

/** A linha do "Pede sua atenção". */
export function textoDoMesQueFechou(f: MesQueFechou): { titulo: string; detalhe: string } {
  const m = MESES[f.mes].replace(/^./, c => c.toUpperCase())
  const novas = f.itens.filter(i => i.tipo === 'nova').length
  const chutes = f.itens.length - novas
  const partes = [
    chutes ? `${chutes} ${chutes === 1 ? 'gasto ficou longe' : 'gastos ficaram longe'} do que você estimou` : '',
    novas ? `${novas} ${novas === 1 ? 'gasto ficou' : 'gastos ficaram'} fora do plano` : '',
  ].filter(Boolean)
  return {
    titulo: `${m} fechou: ${partes.join(' e ')}`,
    detalhe: 'Coloque no plano dos próximos meses o que vai se repetir.',
  }
}
