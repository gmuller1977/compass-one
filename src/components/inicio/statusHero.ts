/**
 * A linha de status do hero, dividida entre a Início do computador e a
 * Bússola do celular — a mesma frase para o mesmo mês nos dois.
 *
 * É a bússola de antes com outro desenho: o MESMO compassStatus, com as mesmas
 * faixas — só a cor do ponto e a frase mudam. Pontos sobre o azul do hero
 * (elemento gráfico, 3:1): #86efac, #fde047 e #f87171 passam no extremo mais
 * claro, #1e40af.
 *
 * No mês corrente a frase fala com a pessoa ("Você está dentro do plano"),
 * porque o número logo abaixo já diz o mês. Não é "no azul": o status mede as
 * despesas contra o plano, não o saldo — com o saldo previsto negativo, "no
 * azul" contradiria o número vermelho embaixo.
 */
export type CompassStatus = 'verde' | 'amarelo' | 'vermelho' | 'sem-plano' | 'sem-dados'

export const STATUS_HERO: Record<CompassStatus, { cor: string; frase: (mes: string, fechou: boolean) => string }> = {
  verde:       { cor: '#86efac', frase: (m, f) => (f ? `${m} fechou dentro do plano` : 'Você está dentro do plano') },
  amarelo:     { cor: '#fde047', frase: (m, f) => (f ? `${m} fechou no limite do plano` : 'Você está chegando no limite do plano') },
  vermelho:    { cor: '#f87171', frase: (m, f) => (f ? `${m} fechou acima do plano` : 'Você passou do plano este mês') },
  'sem-plano': { cor: 'rgba(255,255,255,.5)', frase: m => `Sem plano para ${m.toLowerCase()}` },
  'sem-dados': { cor: 'rgba(255,255,255,.5)', frase: m => `Sem movimentação em ${m.toLowerCase()}` },
}

export function statusDoMes(t: {
  totalEntradas: number; totalSaidas: number; totalPrevS: number; temPlano: boolean
}): CompassStatus {
  if (t.totalEntradas === 0 && t.totalSaidas === 0) return 'sem-dados'
  if (!t.temPlano || t.totalPrevS === 0) return 'sem-plano'
  if (t.totalSaidas > t.totalPrevS) return 'vermelho'
  if (t.totalSaidas / t.totalPrevS >= 0.9) return 'amarelo'
  return 'verde'
}
