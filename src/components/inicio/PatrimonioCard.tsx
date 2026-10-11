import { useMemo } from 'react'
import { COR } from '../../utils/cores'
import { detalharMes, memoriaDoRadar, type Deps } from '../../utils/saldoConta'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * "Patrimônio hoje": o que está nas contas e na carteira, menos as faturas que
 * ainda vão sair. Veio do Resumo mensal, removido em 11/10/2026 — era a única
 * parte dele que não existia em outra tela. Lá o saldo de cada conta partia do
 * saldo de CADASTRO e somava só o mês; aqui não há conta nova:
 *
 *   contas  → detalharMes, o "Saldo atual" do Radar aberto por conta
 *   faturas → memoriaDoRadar().faturaEmAberto, a linha "Fatura do cartão"
 *             da memória do saldo final previsto
 */
export default function PatrimonioCard({ ano, mes, deps }: { ano: number; mes: number; deps: Deps }) {
  const contas = useMemo(() => detalharMes(ano, mes, deps), [ano, mes, deps])
  const faturas = useMemo(() => memoriaDoRadar(ano, mes, deps).faturaEmAberto, [ano, mes, deps])
  const total = contas.reduce((s, c) => s + c.final, 0)
  const liquido = total - faturas
  const cor = (v: number) => (v < 0 ? COR.erroTexto : COR.texto)

  const linha = (rotulo: React.ReactNode, valor: string, c: string, forte = false, key?: string) => (
    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0',
      borderTop: `1px solid ${COR.borda}`, fontSize: forte ? 15 : 14, fontWeight: forte ? 700 : 400 }}>
      <span style={{ color: COR.texto, minWidth: 0 }}>{rotulo}</span>
      <span style={{ color: c, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{valor}</span>
    </div>
  )

  return (
    <div style={{ background: COR.branco, borderRadius: 12, padding: '16px 20px', border: `.5px solid ${COR.borda}` }}>
      {contas.map(c => linha(<>{c.icone} {c.nome}</>, fmt(c.final), cor(c.final), false, c.id))}
      {linha('Em contas e dinheiro', fmt(total), cor(total), true)}
      {faturas > 0 && linha('Faturas do cartão a pagar no mês', `− ${fmt(faturas)}`, COR.erroTexto)}
      {faturas > 0 && linha('Se pagasse tudo hoje', fmt(liquido), cor(liquido), true)}
    </div>
  )
}
