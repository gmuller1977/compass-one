import type { Categoria } from '../context/AppContext'
import { catKey, cadastroDaLinha, type LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { ehFixaPaga } from '../components/acompanhamento/radarCores'
import type { MesComparado } from './comparativoMensal'

/**
 * Planejado × realizado POR CATEGORIA, mês a mês — a visão "Por categoria" do
 * quadro "Receitas e despesas contra o plano" da Início. Pedido do Guilherme
 * em 06/10/2026: "o que estou sentindo falta é um comparativo entre o
 * planejamento e o realizado", por categoria ao longo dos meses.
 *
 * Não soma nada novo: as células são as `linhasSaida` / `linhasEntrada` que
 * comparativoMensal já guarda por mês — as mesmas linhas do Radar daquele mês,
 * por (nome, variante). A linha de grupo é a soma das células das categorias
 * dele, e a coluna "Média" segue as regras da Precisão do plano: só meses
 * FECHADOS, só os meses em que a categoria tem plano, mínimo de 3 — a
 * prova42 exige o mesmo desvio que precisaoDoPlano dá.
 *
 * A ordem é a do Radar: grupos em ordem alfabética, "Outras" no fim, e as
 * categorias na ordem em que o Radar as lista no mês mais recente.
 */
export type Celula = { prev: number; real: number; fixaPaga: boolean }

export type MediaDaLinha = {
  mediaPrev: number; mediaReal: number
  /** (média real − média prev) / média prev. */
  desvioPerc: number
  /** Em quantos meses fechados passou do previsto (despesa) ou ficou abaixo (receita). */
  mesesRuins: number
  meses: number
}

export type LinhaCategoria = {
  nome: string; descricao: string; fixa: boolean
  /** Uma por mês da janela; null quando a categoria não existe naquele mês. */
  celulas: (Celula | null)[]
  media: MediaDaLinha | null
}

export type GrupoMesAMes = {
  grupo: string
  /** Soma das categorias do grupo, por mês. */
  celulas: Celula[]
  linhas: LinhaCategoria[]
}

export type LadoMesAMes = { tipo: 'saida' | 'entrada'; grupos: GrupoMesAMes[] }

const MEIO_CENTAVO = 0.005
const SEM_GRUPO = '__sem_grupo__'

function lado(
  tipo: 'saida' | 'entrada', meses: MesComparado[], categorias: Categoria[], minimoMeses: number,
): LadoMesAMes {
  const isEntrada = tipo === 'entrada'
  const linhasDe = (m: MesComparado): LinhaDoMes[] => (isEntrada ? m.linhasEntrada : m.linhasSaida)

  // Ordem: do mês mais recente para trás, para que a categoria fique no grupo
  // e na posição em que o Radar a mostra hoje.
  const ordem: { k: string; nome: string; descricao: string; grupo: string }[] = []
  const vistos = new Set<string>()
  for (let i = meses.length - 1; i >= 0; i--) {
    for (const l of linhasDe(meses[i])) {
      const k = catKey(l.nome, l.descricao)
      if (vistos.has(k)) continue
      vistos.add(k)
      ordem.push({ k, nome: l.nome, descricao: l.descricao, grupo: l.grupo })
    }
  }

  const porMes = meses.map(m => new Map(linhasDe(m).map(l => [catKey(l.nome, l.descricao), l])))

  const linhas = ordem.map(o => {
    const fixa = !!cadastroDaLinha({ nome: o.nome, descricao: o.descricao }, categorias)?.fixa
    const celulas = porMes.map(mapa => {
      const l = mapa.get(o.k)
      return l ? { prev: l.prev, real: l.real, fixaPaga: ehFixaPaga(l.prev, l.real, isEntrada, fixa) } : null
    })
    // Média: as regras da Precisão do plano — só meses fechados e com plano.
    let prev = 0, real = 0, n = 0, ruins = 0
    meses.forEach((m, i) => {
      const c = celulas[i]
      if (m.parcial || !c || c.prev <= MEIO_CENTAVO) return
      prev += c.prev; real += c.real; n++
      if (isEntrada ? c.prev - c.real > MEIO_CENTAVO : c.real - c.prev > MEIO_CENTAVO) ruins++
    })
    const media: MediaDaLinha | null = n >= minimoMeses
      ? { mediaPrev: prev / n, mediaReal: real / n, desvioPerc: (real - prev) / prev, mesesRuins: ruins, meses: n }
      : null
    return { grupo: o.grupo, linha: { nome: o.nome, descricao: o.descricao, fixa, celulas, media } }
  })
    // Linha que não tem nada em mês nenhum da janela (plano zero, nada gasto) é ruído.
    .filter(({ linha }) => linha.celulas.some(c => c && (c.prev > MEIO_CENTAVO || Math.abs(c.real) > MEIO_CENTAVO)))

  const nomesGrupo = [...new Set(linhas.map(l => l.grupo))].sort((a, b) => {
    if (a === SEM_GRUPO) return 1
    if (b === SEM_GRUPO) return -1
    return a.localeCompare(b, 'pt-BR')
  })
  const grupos = nomesGrupo.map(grupo => {
    const doGrupo = linhas.filter(l => l.grupo === grupo).map(l => l.linha)
    const celulas = meses.map((_, i) => {
      const cs = doGrupo.map(l => l.celulas[i]).filter((c): c is Celula => !!c)
      const comValor = cs.filter(c => c.prev > MEIO_CENTAVO || Math.abs(c.real) > MEIO_CENTAVO)
      return {
        prev: cs.reduce((s, c) => s + c.prev, 0),
        real: cs.reduce((s, c) => s + c.real, 0),
        // Grupo "pago" só quando TODAS as linhas com valor são fixas pagas —
        // a mesma regra do cabeçalho do grupo no Radar (destaqueDoGrupo).
        fixaPaga: comValor.length > 0 && comValor.every(c => c.fixaPaga),
      }
    })
    return { grupo, celulas, linhas: doGrupo }
  })
  return { tipo, grupos }
}

export function categoriasMesAMes(
  meses: MesComparado[], categorias: Categoria[], opts: { minimoMeses?: number } = {},
): { saida: LadoMesAMes; entrada: LadoMesAMes } {
  const minimo = opts.minimoMeses ?? 3
  return {
    saida: lado('saida', meses, categorias, minimo),
    entrada: lado('entrada', meses, categorias, minimo),
  }
}
