import type { Conta, DadosMes, PlanoAnoData } from '../context/AppContext'
import { fimDoPlanejamento } from './simulacaoCompra'
import { ehTransferencia } from '../components/acompanhamento/evolucaoCalcs'

/**
 * A fase de DESCOBERTA: o usuário está registrando para descobrir os próprios
 * números, antes de existir plano nenhum.
 *
 * Ela é **derivada**, não guardada. "Estar descobrindo" é exatamente
 * "terminou o onboarding e ainda não tem plano em lugar nenhum" — as duas
 * coisas o app já sabe. Guardar num campo criaria um terceiro estado capaz de
 * discordar dos outros dois: alguém com plano marcado como "descobrindo", ou o
 * contrário. Este app já gastou um dia caçando divergência desse tipo.
 *
 * O horizonte do plano vem de `fimDoPlanejamento`, a mesma função que o
 * Simulador usa para decidir até onde consegue projetar. Se ela devolve `null`,
 * não há plano em ano nenhum — e é essa a pergunta aqui.
 */
export type Descoberta = {
  /** Terminou o onboarding e ainda não há plano: está observando. */
  ativa: boolean
  /** Lançamentos registrados no mês observado, transferência inclusive. */
  lancamentos: number
  /** Em quantos dias distintos ele registrou algo. */
  diasComRegistro: number
  /**
   * Categorias distintas que apareceram. Transferência fica de fora: ela não é
   * categoria, é dinheiro trocando de conta — a mesma regra do realizado.
   */
  categoriasVistas: number
  /** Quantos dias faltam para o mês observado fechar. 0 = fecha hoje. */
  diasAteFechar: number
  /** O mês que vira o primeiro plano quando fechar. */
  mesObservado: { ano: number; mes: number }
  /**
   * O mês JÁ FECHADO que tem material para virar plano, se houver um.
   *
   * Não é sempre o mês anterior: quem registrou em setembro, não abriu o app
   * em outubro e voltou em novembro continua tendo setembro como base. Olhar
   * só para o mês anterior deixaria essa pessoa observando para sempre.
   *
   * Enquanto for `null`, a fase é de observação. Quando existe, o convite
   * substitui o contador — é o momento que o modal da descoberta promete.
   */
  mesBase: { ano: number; mes: number } | null
}

type Entrada = {
  onboardingCompleto: boolean
  planos: Record<number, PlanoAnoData | undefined>
  extratoData: Record<string, DadosMes>
  contas: Conta[]
  hoje?: Date
}

/** As chaves do extrato que são de banco ou dinheiro naquele mês. Cartão não. */
function chavesDoMes(extratoData: Record<string, DadosMes>, contas: Conta[], ano: number, mes: number) {
  const sufixo = `-${ano}-${String(mes + 1).padStart(2, '0')}`
  const ehCartao = (k: string) => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id))
  return Object.entries(extratoData)
    .filter(([k]) => k.endsWith(sufixo) && !ehCartao(k))
    .map(([, dm]) => dm)
}

export function medirDescoberta({
  onboardingCompleto, planos, extratoData, contas, hoje = new Date(),
}: Entrada): Descoberta {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const totalDias = new Date(ano, mes + 1, 0).getDate()

  const dias = new Set<number>()
  const cats = new Set<string>()
  let lancamentos = 0

  for (const dm of chavesDoMes(extratoData, contas, ano, mes)) {
    for (const [diaStr, itens] of Object.entries(dm.lancamentos ?? {})) {
      for (const l of itens) {
        lancamentos++
        dias.add(Number(diaStr))
        if (!ehTransferencia(l.categoria)) cats.add(l.categoria.trim().toLowerCase())
      }
    }
  }

  // O mês fechado mais recente COM registro, olhando até um ano para trás.
  let mesBase: { ano: number; mes: number } | null = null
  for (let atras = 1; atras <= 12 && !mesBase; atras++) {
    let m = mes - atras, a = ano
    while (m < 0) { m += 12; a-- }
    const temRegistro = chavesDoMes(extratoData, contas, a, m)
      .some(dm => Object.values(dm.lancamentos ?? {}).some(itens => itens.length > 0))
    if (temRegistro) mesBase = { ano: a, mes: m }
  }

  return {
    ativa: onboardingCompleto && fimDoPlanejamento(planos) === null,
    mesBase,
    lancamentos,
    diasComRegistro: dias.size,
    categoriasVistas: cats.size,
    diasAteFechar: totalDias - hoje.getDate(),
    mesObservado: { ano, mes },
  }
}
