import type { Conta } from '../context/AppContext'
import { parseBRL } from './moeda'
import {
  simularCompraSobre, diagnosticar,
  type SerieDoPlano, type PontoFluxo, type ResultadoCompra, type Gravidade,
} from './simulacaoCompra'

/**
 * Comparar formas de pagamento da MESMA compra.
 *
 * A tela antiga perguntava "em quantas vezes?" e o usuário escolhia uma. Mas
 * ninguém chega na loja com a parcela decidida — chega com as opções que o
 * vendedor ofereceu, e a dúvida é qual escolher. Comparar é a decisão real.
 *
 * **O juro é SAÍDA, não entrada.** No Brasil ninguém informa a taxa: informa a
 * parcela — "12× de R$ 179". Pedir a taxa obrigaria o usuário a fazer de
 * cabeça exatamente a conta que ele veio pedir ajuda para fazer. Aqui ele
 * digita parcela e quantidade; total e juro embutido saem disso.
 *
 * **E o juro embutido só existe contra o preço à vista.** Sem uma linha de
 * `parcelas === 1` não há âncora, e a coluna vale `null` — travessão na tela.
 * Inventar uma taxa de referência seria afirmar um fundamento que não existe.
 */

export type Opcao = {
  id: string
  /** Quantidade que o vendedor ofereceu. 1 = à vista. */
  parcelas: number
  /** O que ele disse por mês. À vista, é o preço à vista. */
  valorParcela: number
  /** Texto livre: "3× sem juros", "entrada + 5×". Só rótulo. */
  rotulo?: string
  /**
   * O usuário digitou nesta linha. Trocar o valor da compra re-semeia as
   * linhas automáticas e **preserva** estas — o que o vendedor disse é dado
   * real e não pode ser sobrescrito por um palpite de divisão igual.
   */
  manual?: boolean
}

export type LinhaComparativo = {
  opcao: Opcao
  total: number
  /** Contra o preço à vista. `null` quando não há linha à vista. */
  juroEmbutido: number | null
  /**
   * `null` quando as parcelas passam do horizonte do plano. A linha NÃO some
   * da tabela nesse caso — ela aparece marcada, com o teto e o convite a
   * planejar mais meses. Sumir repetiria o defeito que o truncamento
   * silencioso da Dívida criou.
   */
  veredito: {
    cabe: boolean
    gravidade: Gravidade
    /** O mês de menor saldo depois da compra. */
    pior: PontoFluxo
    adiarPara: ResultadoCompra['adiarPara']
  } | null
  /** Quantas parcelas o plano alcança. Só preenchido quando a linha excede. */
  tetoDoPlano?: number
  recomendada: boolean
}

export type ContextoComparativo = {
  serie: SerieDoPlano
  contas: Conta[]
  alvo: { ano: number; mes: number; cartaoId?: string }
  /** Quantas parcelas o plano alcança a partir de `alvo`. Não varia por linha. */
  teto: number
  /** A reserva que não se quer encostar. Zero quando não há. */
  piso?: number
}

/** O preço à vista da tabela, se alguém o informou. */
export function precoAVista(opcoes: Opcao[]): number | null {
  const aVista = opcoes.find(o => o.parcelas === 1 && o.valorParcela > 0)
  return aVista ? aVista.valorParcela : null
}

export function compararOpcoes(
  opcoes: Opcao[],
  ctx: ContextoComparativo,
): LinhaComparativo[] {
  const base = precoAVista(opcoes)
  const piso = ctx.piso ?? 0

  const linhas: LinhaComparativo[] = opcoes.map(opcao => {
    const total = opcao.parcelas * opcao.valorParcela
    const juroEmbutido = base === null ? null : total - base

    // Linha SEM VALOR não é linha fora do plano: não há o que julgar, e dizer
    // "fora do plano" numa linha vazia acusa um limite que não foi atingido.
    // Só quem excede o horizonte carrega `tetoDoPlano`.
    if (total <= 0) {
      return { opcao, total, juroEmbutido, veredito: null, recomendada: false }
    }

    // Fora do horizonte: não há série para julgar, e estender o plano por
    // conta própria foi descartado no módulo irmão.
    if (opcao.parcelas > ctx.teto) {
      return {
        opcao, total, juroEmbutido,
        veredito: null,
        tetoDoPlano: ctx.teto,
        recomendada: false,
      }
    }

    const r = simularCompraSobre(
      ctx.serie,
      { valorTotal: total, parcelas: opcao.parcelas, cartaoId: ctx.alvo.cartaoId,
        ano: ctx.alvo.ano, mes: ctx.alvo.mes },
      ctx.contas,
      { piso },
    )
    const d = diagnosticar(r, piso, total / opcao.parcelas)

    return {
      opcao, total, juroEmbutido,
      veredito: { cabe: r.cabe, gravidade: d.gravidade, pior: r.pior, adiarPara: r.adiarPara },
      recomendada: false,
    }
  })

  return marcarRecomendada(linhas)
}

/**
 * A recomendada é a **mais barata entre as que cabem** — não a mais barata.
 *
 * A distinção é o ponto da tela: à vista costuma ser a mais barata e a que
 * mais aperta. Recomendar por preço sozinho mandaria a pessoa para o mês que
 * a quebra.
 *
 * Empate no total — o caso de "3× sem juros" contra "à vista" sem desconto —
 * desempata pelo maior saldo no pior mês, ou seja, a que aperta menos.
 */
function marcarRecomendada(linhas: LinhaComparativo[]): LinhaComparativo[] {
  const cabem = linhas.filter(l => l.veredito?.cabe)
  if (!cabem.length) return linhas

  const melhor = cabem.reduce((a, b) => {
    if (b.total < a.total) return b
    if (b.total > a.total) return a
    return (b.veredito!.pior.comCompra > a.veredito!.pior.comCompra) ? b : a
  })

  return linhas.map(l => (l === melhor ? { ...l, recomendada: true } : l))
}

/**
 * Aplica a edição de uma célula da tabela.
 *
 * `parseBRL` e não `parseValor` porque o `onChange` roda a cada tecla: `null`
 * no meio da digitação travaria o campo na vírgula. É a regra do CLAUDE.md.
 *
 * Toda edição marca a linha como `manual` — inclusive apagar o campo. Quem
 * apagou quis apagar, e re-semear por cima seria desfazer isso na cara dele.
 */
export function editarOpcao(
  opcoes: Opcao[], id: string, campo: 'parcelas' | 'valorParcela', valor: string,
): Opcao[] {
  return opcoes.map(o => {
    if (o.id !== id) return o
    if (campo === 'parcelas') {
      const n = parseInt(valor.replace(/\D/g, ''), 10)
      return { ...o, parcelas: Number.isFinite(n) ? Math.min(n, 99) : 0, manual: true }
    }
    return { ...o, valorParcela: parseBRL(valor), manual: true }
  })
}

/**
 * As linhas com que a tabela abre.
 *
 * À vista, 3×, 6× e 12× cobrem o que a maioria das lojas oferece. O valor
 * nasce dividido igualmente — é o palpite mais neutro possível, e o usuário
 * sobrescreve com o que o vendedor de fato disse, que é o dado real.
 */
export function opcoesPadrao(valorTotal: number): Opcao[] {
  return [1, 3, 6, 12].map(n => ({
    id: `p${n}`,
    parcelas: n,
    valorParcela: valorTotal > 0 ? valorTotal / n : 0,
    rotulo: n === 1 ? 'À vista' : `${n}×`,
  }))
}
