import type { Categoria } from '../context/AppContext'
import type { LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'

/**
 * As categorias de despesa que passaram do plano no mês — o quadro da tela
 * Início que substitui "Maiores despesas" quando há plano. Pedido do
 * Guilherme em 27/09/2026 (item 5 do estudo de indicadores).
 *
 * Não há conta própria. As linhas são as de `totaisDoMes` — as MESMAS que o
 * Radar desenha, por (nome, variante) — e o excesso é o "Estourou" da linha
 * de categoria do Radar: realizado − previsto, sempre que o realizado passa.
 *
 * Categoria SEM plano com gasto entra também, marcada: o Radar mostra
 * "Estourou" nela, e é dinheiro que saiu fora do que foi planejado — muitas
 * vezes o mais importante de ver.
 *
 * Ordem: pelo excesso em reais, do maior para o menor. É o que pesa no
 * saldo; o percentual vai ao lado.
 */
export type Estouro = LinhaDoMes & { excesso: number; semPlano: boolean }

const MEIO_CENTAVO = 0.005

export function categoriasEstouradas(linhas: LinhaDoMes[], n = 3): Estouro[] {
  return linhas
    .filter(l => l.real - l.prev > MEIO_CENTAVO)
    .map(l => ({ ...l, excesso: l.real - l.prev, semPlano: l.prev <= MEIO_CENTAVO }))
    .sort((a, b) => b.excesso - a.excesso)
    .slice(0, n)
}

/**
 * Quando nada estourou: as que estão mais perto do limite, pelo percentual
 * usado. Só categoria com plano e com gasto — sem plano não há limite, e sem
 * gasto não há o que vigiar.
 *
 * Conta FIXA fica de fora: paga até o previsto ela é "✓ Pago" no Radar, não
 * "no limite" — o aluguel pago em 100% encabeçaria a lista sem nada a vigiar.
 * O cadastro é achado como o Radar acha (EvolucaoLinha): pelo par (nome,
 * variante), e pelo nome sozinho só quando ele é único.
 */
export function maisPertoDoLimite(linhas: LinhaDoMes[], categorias: Categoria[], n = 3): LinhaDoMes[] {
  const ehFixa = (l: LinhaDoMes) => {
    const cad = categorias.find(c => c.nome === l.nome && (c.descricao ?? '') === (l.descricao ?? ''))
      ?? (categorias.filter(c => c.nome === l.nome).length === 1 ? categorias.find(c => c.nome === l.nome) : undefined)
    return !!cad?.fixa
  }
  return linhas
    .filter(l => l.prev > MEIO_CENTAVO && l.real > MEIO_CENTAVO && l.real - l.prev <= MEIO_CENTAVO && !ehFixa(l))
    .sort((a, b) => b.real / b.prev - a.real / a.prev || b.real - a.real)
    .slice(0, n)
}
