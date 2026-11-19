import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import { contasAVencer, contasParaPagar, type ContaAVencer } from '../../utils/contasAVencer'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR } from '../../utils/cores'
import { M, TINTA, TINTA2, BORDA_CLARA } from '../mobile/estilo'
import { CabecalhoCartao } from '../mobile/ui'
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
  const lista = useMemo(() => contasParaPagar(contasAVencer(deps), categorias, deps.contas, deps.extratoData), [deps, categorias])
  const [pagando, setPagando] = useState<ContaAVencer | null>(null)

  const v = (n: number) => (oculto ? 'R$ ••••' : fmt(n))
  if (lista.length === 0) {
    if (!vazio) return null
    return (
      <div style={QUADRO}>
        <CabecalhoCartao icone="ti-receipt" rotulo="Para pagar">Contas da semana</CabecalhoCartao>
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
  // No azul, a paleta escura do app: #fdba74 5,2 e #86efac 4,8 no #1e40af.
  const etiqueta = saldoHoje === undefined ? null : falta > 0.005
    ? { texto: `faltam ${v(falta)}`, cor: '#b91c1c', fundo: '#fdecec' }
    : { texto: '✓ saldo cobre', cor: '#15803d', fundo: '#e8f7ee' }

  return (
    <div style={QUADRO}>
      <CabecalhoCartao icone="ti-receipt" rotulo="Para pagar" direita={etiqueta && (
          <span title={saldoHoje !== undefined ? `${fmt(total)} a pagar e ${fmt(saldoHoje)} hoje no banco` : undefined}
            style={{ fontSize: 13, fontWeight: 700, color: etiqueta.cor, background: etiqueta.fundo, borderRadius: 999,
              padding: '4px 10px', whiteSpace: 'nowrap' }}>{etiqueta.texto}</span>
        )}>Contas da semana</CabecalhoCartao>
      {lista.slice(0, 5).map((c, i) => {
        const ic = c.fatura ? { icone: '💳', cor: COR.azul } : iconeCategoria(categorias, c.nome)
        return (
          <LinhaAzul key={`${c.id}-${c.ano}-${c.mes}`} primeira={i === 0} icone={<IconeCat icone={ic.icone} cor={corDoIcone(ic.cor)} />}
            titulo={nome(c)}
            legenda={<><span style={{ color: c.atrasada ? '#b91c1c' : undefined, fontWeight: c.atrasada ? 700 : undefined }}>{quando(c)}</span> · {v(c.valor)}</>}
            direita={<button onClick={() => setPagando(c)} style={{
              border: 'none', background: TINTA, color: '#fff', borderRadius: 999, padding: '9px 16px', minHeight: 40,
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

// O cartão branco do estilo do site (19/11/2026; era azul desde 10/10/2026).
const ROTULO = TINTA2
const QUADRO: CSSProperties = {
  background: '#fff', borderRadius: M.raio, padding: '18px 18px', border: `1px solid ${BORDA_CLARA}`,
  boxShadow: '0 10px 28px rgba(11,37,69,.08)', color: TINTA,
}

function LinhaAzul({ icone, titulo, legenda, direita, primeira }: {
  icone: ReactNode; titulo: ReactNode; legenda?: ReactNode; direita?: ReactNode; primeira?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', minHeight: 48,
      borderTop: primeira ? 'none' : '1px solid #e3ecf7',
    }}>
      <span aria-hidden style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: '#eef3fa', fontSize: 21,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: COR.sucessoTexto, fontWeight: 700,
      }}>{icone}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: M.corpo, fontWeight: 600, color: TINTA, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</div>
        {legenda && <div style={{ fontSize: M.legenda, color: ROTULO, marginTop: 2 }}>{legenda}</div>}
      </div>
      {direita}
    </div>
  )
}
