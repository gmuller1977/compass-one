import { catKey } from '../components/acompanhamento/evolucaoCalcs'
import type { MesComparado } from './comparativoMensal'

/**
 * Regras do ajuste do plano feito pelo Radar. Decidido com o Guilherme em
 * 06/10/2026: **o mês corrente não se mexe.** O Radar existe para mostrar
 * que o mês saiu do plano; trazer o plano do mês até o gasto apagaria
 * exatamente isso — e, virando hábito, o "Previsto × realizado" e a
 * "Precisão do plano" deixariam de mostrar onde o plano erra. O que se
 * corrige é o plano DAQUI PARA A FRENTE, com os números na mão.
 */

/**
 * O primeiro mês que o ajuste pode mudar. Olhando um mês futuro, é ele mesmo;
 * olhando o corrente ou um passado, é o mês seguinte a HOJE — nunca o
 * corrente, nunca o passado.
 */
export function mesAlvoDoAjuste(ano: number, mes: number, hoje: Date = new Date()): { ano: number; mes: number } {
  const ymVisto = ano * 12 + mes
  const ymHoje = hoje.getFullYear() * 12 + hoje.getMonth()
  const alvo = ymVisto > ymHoje ? ymVisto : ymHoje + 1
  return { ano: Math.floor(alvo / 12), mes: alvo % 12 }
}

/**
 * A média do realizado de uma categoria nos meses FECHADOS do comparativo —
 * a mesma janela e as mesmas linhas da Início (comparativoMensal). Conta só
 * os meses em que a categoria existiu (com plano ou com gasto): categoria
 * nova não é puxada para baixo pelos meses em que não existia.
 * `null` sem nenhum mês fechado.
 */
export function mediaDaCategoria(
  meses: MesComparado[], tipo: 'entrada' | 'saida', nome: string, descricao?: string,
): { media: number; meses: number } | null {
  const k = catKey(nome, descricao)
  let soma = 0, n = 0
  for (const m of meses) {
    if (m.parcial) continue
    const l = (tipo === 'entrada' ? m.linhasEntrada : m.linhasSaida).find(x => catKey(x.nome, x.descricao) === k)
    if (!l || (l.prev <= 0.005 && Math.abs(l.real) <= 0.005)) continue
    soma += l.real; n++
  }
  return n ? { media: Math.round((soma / n) * 100) / 100, meses: n } : null
}
