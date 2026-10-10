import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { DadosMes } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import { contasAVencer, type ContaAVencer } from '../../utils/contasAVencer'
import { contaDoPagamento, confirmarPagamento } from '../../utils/pagarConta'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { parseBRL } from '../../utils/moeda'
import { COR } from '../../utils/cores'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const chave = (conta: string, ano: number, mes: number) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`

/**
 * "Contas a pagar" na home do celular, com o "Pagar" ali mesmo. A lista é a
 * da Início (`contasAVencer`: atrasadas + próximos 7 dias, as linhas da
 * memória de cálculo). Pagar grava o MESMO que marcar a fixa em Lançamentos —
 * `fixasConsolidadas`, e o valor real em `fixasValorOverride` quando é outro —
 * na conta onde a fixa aparece (`contaDoPagamento`). A conta vem escolhida e
 * pode ser trocada, como no "Pagar de qual conta?" de Lançamentos.
 */
export default function ContasAPagarRapido({ deps, saldoHoje, vazio }: {
  deps: Deps
  /** Bancos + dinheiro hoje. Com ele, o quadro diz se dá para pagar tudo. */
  saldoHoje?: number
  /** Texto quando não há conta a pagar; sem ele, o quadro some. */
  vazio?: string
}) {
  const { contas, categorias, extratoData, updateExtratoMes } = useApp()
  const lista = useMemo(() => contasAVencer(deps), [deps])
  const [pagando, setPagando] = useState<ContaAVencer | null>(null)
  const [valor, setValor] = useState('')
  const [conta, setConta] = useState<string>('')

  const destinos = useMemo(() => [
    ...contas.filter(c => c.tipo !== 'cartao').map(c => ({ id: c.id, nome: c.apelido || c.nome })),
    { id: 'dinheiro', nome: 'Dinheiro' },
  ], [contas])

  const titulo = (
    <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
      Contas a pagar
    </div>
  )
  if (lista.length === 0) {
    if (!vazio) return null
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${COR.borda}`, padding: '10px 12px', marginBottom: 10 }}>
        {titulo}
        <div style={{ fontSize: 13, color: COR.sucessoTexto, fontWeight: 600 }}>✓ {vazio}</div>
      </div>
    )
  }
  // "Tenho saldo para pagar?" — o total da lista contra bancos + dinheiro de
  // hoje. Fatura entra: ela também sai da conta.
  const total = lista.reduce((t, c) => t + c.valor, 0)
  const falta = saldoHoje === undefined ? 0 : total - saldoHoje

  const hoje = new Date()
  const hoje0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const quando = (c: ContaAVencer) => {
    const d = new Date(c.ano, c.mes, c.dia)
    const dd = `${String(c.dia).padStart(2, '0')}/${String(c.mes + 1).padStart(2, '0')}`
    if (c.atrasada) return `Venceu ${dd}`
    const diff = Math.round((d.getTime() - hoje0.getTime()) / 86_400_000)
    return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${DIAS_SEM[d.getDay()]} ${dd}`
  }
  const nome = (c: ContaAVencer) => c.fatura ? `Fatura ${c.nome}` : c.descricao ? `${c.nome} · ${c.descricao}` : c.nome

  function abrir(c: ContaAVencer) {
    setPagando(c)
    setValor(c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    setConta(contaDoPagamento(c.id, c.ano, c.mes, contas, categorias, extratoData as Record<string, DadosMes>) ?? destinos[0]?.id ?? '')
  }

  function confirmar() {
    if (!pagando || !conta) return
    const v = parseBRL(valor)
    if (v <= 0) return
    updateExtratoMes(chave(conta, pagando.ano, pagando.mes), dm => confirmarPagamento(dm, pagando.id, v, pagando.valor))
    setPagando(null)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${COR.borda}`, padding: '10px 12px', marginBottom: 10 }}>
      {titulo}
      {saldoHoje !== undefined && (
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: falta > 0.005 ? COR.erroTexto : COR.sucessoTexto }}>
          {falta > 0.005
            ? `${fmt(total)} a pagar e ${fmt(saldoHoje)} hoje no banco: faltam ${fmt(falta)}`
            : `${fmt(total)} a pagar · o saldo de hoje cobre tudo`}
        </div>
      )}
      {lista.slice(0, 5).map((c, i) => (
        <div key={`${c.id}-${c.ano}-${c.mes}`} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
          borderTop: i === 0 ? 'none' : '1px solid #f1f5f9',
        }}>
          <span aria-hidden style={{ fontSize: 16 }}>{c.fatura ? '💳' : iconeCategoria(categorias, c.nome).icone}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome(c)}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: c.atrasada ? COR.erroTexto : COR.textoSuave }}>
              {quando(c)} · {fmt(c.valor)}
            </div>
          </div>
          <button onClick={() => abrir(c)} style={{
            border: `1.5px solid ${COR.azul}`, background: '#eff6ff', color: COR.azul, borderRadius: 20,
            padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Pagar</button>
        </div>
      ))}
      {lista.length > 5 && (
        <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 4 }}>e mais {lista.length - 5} em Lançamentos</div>
      )}

      {pagando && (
        <div role="dialog" aria-modal="true" aria-label={`Pagar ${nome(pagando)}`}
          onClick={() => setPagando(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '18px 16px 28px',
            fontFamily: "-apple-system,'Inter',sans-serif", animation: 'slideUp .2s ease',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COR.texto }}>{nome(pagando)}</div>
            <div style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 12 }}>Previsto {fmt(pagando.valor)} · {quando(pagando)}</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COR.textoSuave }}>Valor pago
              <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" style={{
                display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, marginBottom: 10,
                border: `2px solid ${COR.azul}`, borderRadius: 12, padding: '10px 12px', fontSize: 18, fontWeight: 700,
                color: COR.azul, background: '#eff6ff', fontFamily: 'inherit', outline: 'none',
              }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: COR.textoSuave }}>Pago de
              <select value={conta} onChange={e => setConta(e.target.value)} style={{
                display: 'block', width: '100%', marginTop: 4, marginBottom: 14, border: `1.5px solid ${COR.borda}`,
                borderRadius: 12, padding: '10px 12px', fontSize: 14, color: COR.texto, background: '#fff', fontFamily: 'inherit',
              }}>
                {destinos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </label>
            <button onClick={confirmar} style={{
              width: '100%', padding: 13, border: 'none', borderRadius: 14, cursor: 'pointer',
              background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`, color: '#fff',
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
            }}>✓ Marcar como paga</button>
          </div>
        </div>
      )}
    </div>
  )
}
