import type { ContaAVencer } from './contasAVencer'

/** Nome e "quando vence" de uma conta a vencer, no Lançar do celular e na janela do Pagar. */
const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const nomeDaContaAVencer = (c: ContaAVencer) =>
  c.fatura ? `Fatura ${c.nome}` : c.descricao ? `${c.nome} · ${c.descricao}` : c.nome

export function quandoVence(c: ContaAVencer, hoje = new Date()) {
  const hoje0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const d = new Date(c.ano, c.mes, c.dia)
  const dd = `${String(c.dia).padStart(2, '0')}/${String(c.mes + 1).padStart(2, '0')}`
  if (c.atrasada) return `Venceu ${dd}`
  const diff = Math.round((d.getTime() - hoje0.getTime()) / 86_400_000)
  return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${DIAS_SEM[d.getDay()]} ${dd}`
}

