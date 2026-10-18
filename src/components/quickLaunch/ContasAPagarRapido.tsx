import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import { contasAVencer, type ContaAVencer } from '../../utils/contasAVencer'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR } from '../../utils/cores'
import { M } from '../mobile/estilo'
import PagarContaDialog from '../PagarContaDialog'
import { nomeDaContaAVencer, quandoVence } from '../../utils/quandoVence'
import { IconeCat } from '../IconeCat'
import { corDoIcone } from '../../utils/iconeDesenhado'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * "Contas a pagar" na home do celular, com o "Pagar" ali mesmo. A lista é a
 * da Início (`contasAVencer`: atrasadas + próximos 7 dias, as linhas da
 * memória de cálculo). O "Pagar" abre `PagarContaDialog`, a mesma janela da
 * Início do computador.
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
  const { categorias } = useApp()
  const lista = useMemo(() => contasAVencer(deps), [deps])
  const [pagando, setPagando] = useState<ContaAVencer | null>(null)

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

  const quando = (c: ContaAVencer) => quandoVence(c)
  const nome = nomeDaContaAVencer

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
        const ic = c.fatura ? { icone: '💳', cor: COR.azul } : iconeCategoria(categorias, c.nome)
        return (
          <LinhaAzul key={`${c.id}-${c.ano}-${c.mes}`} primeira={i === 0} icone={<IconeCat icone={ic.icone} cor={corDoIcone(ic.cor)} />}
            titulo={nome(c)}
            legenda={<><span style={{ color: c.atrasada ? '#fecaca' : undefined, fontWeight: c.atrasada ? 700 : undefined }}>{quando(c)}</span> · {v(c.valor)}</>}
            direita={<button onClick={() => setPagando(c)} style={{
              border: 'none', background: '#fff', color: '#1e3a8a', borderRadius: 999, padding: '9px 16px', minHeight: 40,
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>Pagar</button>} />
        )
      })}
      {lista.length > 5 && (
        <div style={{ fontSize: M.legenda, color: ROTULO, marginTop: 6 }}>e mais {lista.length - 5} em Lançamentos</div>
      )}

      {pagando && <PagarContaDialog conta={pagando} onFechar={() => setPagando(null)} />}
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
