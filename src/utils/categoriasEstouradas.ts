import type { Categoria } from '../context/AppContext'
import { cadastroDaLinha, type LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'

/**
 * As categorias de despesa que passaram do plano no mês — o quadro da tela
 * Início que substitui "Maiores despesas" quando há plano. Pedido do
 * Guilherme em 27/09/2026 (item 5 do estudo de indicadores).
 *
 * Não há conta própria. As linhas são as de `totaisDoMes` — as MESMAS que o
 * Radar desenha, por (nome, variante) — e o excesso é o "Estourou" da linha
 * de categoria do Radar: realizado − previsto, sempre que o realizado passa.
 *
 * Categoria SEM plano NÃO entra: sem plano não há o que estourar, e o Radar
 * só mostra o realizado dela (C2, decisão do Guilherme em 19/10/2026). Antes
 * entrava marcada "sem plano", e o mês da chegada, ainda sem plano de dia a
 * dia, virava uma lista de estouros e de pedidos de motivo. O que se repete
 * vira plano no "fechou" da Início (mesQueFechou).
 *
 * Ordem: pelo excesso em reais, do maior para o menor. É o que pesa no
 * saldo; o percentual vai ao lado.
 */
export type Estouro = LinhaDoMes & { excesso: number }

const MEIO_CENTAVO = 0.005

export function categoriasEstouradas(linhas: LinhaDoMes[], n = 3): Estouro[] {
  return linhas
    .filter(l => l.prev > MEIO_CENTAVO && l.real - l.prev > MEIO_CENTAVO)
    .map(l => ({ ...l, excesso: l.real - l.prev }))
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
 * O cadastro é achado como o Radar acha: cadastroDaLinha.
 */
export function maisPertoDoLimite(linhas: LinhaDoMes[], categorias: Categoria[], n = 3): LinhaDoMes[] {
  const ehFixa = (l: LinhaDoMes) => !!cadastroDaLinha(l, categorias)?.fixa
  return linhas
    .filter(l => l.prev > MEIO_CENTAVO && l.real > MEIO_CENTAVO && l.real - l.prev <= MEIO_CENTAVO && !ehFixa(l))
    .sort((a, b) => b.real / b.prev - a.real / a.prev || b.real - a.real)
    .slice(0, n)
}
