import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../../context/AppContext'
import type { DadosMes } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import { contasAVencer, type ContaAVencer } from '../../utils/contasAVencer'
import { contaDoPagamento, confirmarPagamento } from '../../utils/pagarConta'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { parseBRL } from '../../utils/moeda'
import { COR } from '../../utils/cores'
import { M } from '../mobile/estilo'

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
export default function ContasAPagarRapido({ deps, saldoHoje, vazio, oculto = false }: {
  deps: Deps
  /** Bancos + dinheiro hoje. Com ele, o quadro diz se dá para pagar tudo. */
  saldoHoje?: number
  /** Texto quando não há conta a pagar; sem ele, o quadro some. */
  vazio?: string
  /** O olho da Bússola: esconde os valores. */
  oculto?: boolean
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

  const v = (n: number) => (oculto ? 'R$ ••••' : fmt(n))
  if (lista.length === 0) {
    if (!vazio) return null
    return (
      <div style={QUADRO}>
        <h2 style={TITULO}>Contas da semana</h2>
        <LinhaAzul primeira icone="✓" titulo={vazio} />
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

  // Uma etiqueta no título no lugar da frase: "✓ saldo cobre" ou "faltam R$ X".
  // No azul, a paleta escura do app: #fecaca 4,6 e #86efac 4,8 no #1e40af.
  const etiqueta = saldoHoje === undefined ? null : falta > 0.005
    ? { texto: `faltam ${v(falta)}`, cor: '#fecaca', fundo: 'rgba(15,23,42,.35)' }
    : { texto: '✓ saldo cobre', cor: '#86efac', fundo: 'rgba(15,23,42,.35)' }

  return (
    <div style={QUADRO}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={TITULO}>Contas da semana</h2>
        {etiqueta && (
          <span title={saldoHoje !== undefined ? `${fmt(total)} a pagar e ${fmt(saldoHoje)} hoje no banco` : undefined}
            style={{ fontSize: 13, fontWeight: 700, color: etiqueta.cor, background: etiqueta.fundo, borderRadius: 999,
              padding: '4px 10px', whiteSpace: 'nowrap' }}>{etiqueta.texto}</span>
        )}
      </div>
      {lista.slice(0, 5).map((c, i) => {
        const ic = c.fatura ? { icone: '💳' } : iconeCategoria(categorias, c.nome)
        return (
          <LinhaAzul key={`${c.id}-${c.ano}-${c.mes}`} primeira={i === 0} icone={ic.icone}
            titulo={nome(c)}
            legenda={<><span style={{ color: c.atrasada ? '#fecaca' : undefined, fontWeight: c.atrasada ? 700 : undefined }}>{quando(c)}</span> · {v(c.valor)}</>}
            direita={<button onClick={() => abrir(c)} style={{
              border: 'none', background: '#fff', color: '#1e3a8a', borderRadius: 999, padding: '9px 16px', minHeight: 40,
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>Pagar</button>} />
        )
      })}
      {lista.length > 5 && (
        <div style={{ fontSize: M.legenda, color: ROTULO, marginTop: 6 }}>e mais {lista.length - 5} em Lançamentos</div>
      )}

      {pagando && (
        <div role="dialog" aria-modal="true" aria-label={`Pagar ${nome(pagando)}`}
          onClick={() => setPagando(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '18px 16px 28px',
            fontFamily: "-apple-system,'Inter',sans-serif", animation: 'slideUp .2s ease',
          }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: COR.texto }}>{nome(pagando)}</div>
            <div style={{ fontSize: 14, color: COR.textoSuave, marginBottom: 14 }}>Previsto {fmt(pagando.valor)} · {quando(pagando)}</div>
            <label style={{ fontSize: 14, fontWeight: 600, color: COR.textoSuave }}>Valor pago
              <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" style={{
                display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, marginBottom: 10,
                border: `2px solid ${COR.azul}`, borderRadius: 12, padding: '10px 12px', fontSize: 18, fontWeight: 700,
                color: COR.azul, background: '#eff6ff', fontFamily: 'inherit', outline: 'none',
              }} />
            </label>
            <label style={{ fontSize: 14, fontWeight: 600, color: COR.textoSuave }}>Pago de
              <select value={conta} onChange={e => setConta(e.target.value)} style={{
                display: 'block', width: '100%', marginTop: 4, marginBottom: 14, border: `1.5px solid ${COR.borda}`,
                borderRadius: 12, padding: '10px 12px', fontSize: 14, color: COR.texto, background: '#fff', fontFamily: 'inherit',
              }}>
                {destinos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </label>
            <button onClick={confirmar} style={{
              width: '100%', padding: 16, border: 'none', borderRadius: 16, cursor: 'pointer',
              background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`, color: '#fff',
              fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
            }}>✓ Marcar como paga</button>
          </div>
        </div>
      )}
    </div>
  )
}

// O quadro azul do Lançar (pedido do Guilherme, 10/10/2026): o mesmo
// gradiente do topo e dos quadros das categorias, com o ícone em círculo cinza.
const ROTULO = 'rgba(255,255,255,.75)'
const QUADRO: CSSProperties = {
  background: 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)', borderRadius: M.raio, padding: '18px 18px',
  boxShadow: '0 4px 14px rgba(15,40,120,.18)', color: '#fff',
}
const TITULO: CSSProperties = { margin: '0 0 12px', fontSize: M.titulo, fontWeight: 700, color: '#fff' }

function LinhaAzul({ icone, titulo, legenda, direita, primeira }: {
  icone: ReactNode; titulo: ReactNode; legenda?: ReactNode; direita?: ReactNode; primeira?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', minHeight: 48,
      borderTop: primeira ? 'none' : '1px solid rgba(255,255,255,.14)',
    }}>
      <span aria-hidden style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: '#e6ebf1', fontSize: 21,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: COR.sucessoTexto, fontWeight: 700,
      }}>{icone}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: M.corpo, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</div>
        {legenda && <div style={{ fontSize: M.legenda, color: ROTULO, marginTop: 2 }}>{legenda}</div>}
      </div>
      {direita}
    </div>
  )
}
