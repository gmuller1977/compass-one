import { useEffect, useRef, useState } from 'react'
import PlanPainel from './PlanPainel'
import { type BulkOp } from './PlanFerramentas'
import { MESES_FULL, type AnoData, type Saldos } from './types'
import type { Categoria } from '../../context/AppContext'
import { COR } from '../../utils/cores'

const CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function porTela(): number {
  const w = window.innerWidth
  return w >= 1024 ? 3 : w >= 640 ? 2 : 1
}

/**
 * O modal que abre ao clicar num mês da Grade: a PLANILHA (o Painel) recortada
 * em 3 meses a partir dele, com setas — 2 no tablet, 1 no celular. "Ano
 * inteiro" troca a janela pelos doze, dentro do próprio modal. Decidido com o
 * Guilherme em 06/10/2026, quando o Planejamento virou uma tela só: a Lista
 * saiu, e a Planilha deixou de ser uma visão à parte para morar aqui.
 *
 * Não há cópia da planilha: é o mesmo PlanPainel, com `janela` e `compacto`.
 * Grupos, subtotais, saldo inicial, resultado, saldo final e meta presos, a
 * célula com conta e itens, e o nome da categoria abrindo o ajuste (já
 * lançado nos próximos meses) — tudo vem dele.
 */
export default function PlanModalMeses(props: {
  mesInicial: number
  anoAtual: number
  mesAtual: number
  dadosAtivos: AnoData
  previsto: Saldos
  categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onBulkSave: (ops: BulkOp[]) => void
  objetivos: number[]
  sobraPrevista: number[]
  onMetaSave: (objetivos: number[]) => void
  dadosAnoAnterior: AnoData | null
  onClose: () => void
}) {
  const { mesInicial, anoAtual, onClose } = props
  const [n, setN] = useState(porTela)
  const [anoInteiro, setAnoInteiro] = useState(false)
  const [inicio, setInicio] = useState(() => Math.min(mesInicial, 12 - porTela()))
  const fecharRef = useRef(onClose)
  fecharRef.current = onClose

  useEffect(() => {
    const medir = () => setN(porTela())
    // Esc fecha — mas só quando este é o único diálogo aberto: com o editor de
    // itens ou o ajuste por cima, o Esc é deles.
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.querySelectorAll('[aria-modal="true"]').length <= 1) fecharRef.current()
    }
    window.addEventListener('resize', medir)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('resize', medir); window.removeEventListener('keydown', esc) }
  }, [])

  const ini = Math.max(0, Math.min(inicio, 12 - n))
  const janela = anoInteiro
    ? Array.from({ length: 12 }, (_, i) => i)
    : Array.from({ length: Math.min(n, 12) }, (_, i) => ini + i)
  const titulo = anoInteiro || janela.length === 12
    ? `${anoAtual}`
    : janela.length === 1 ? `${MESES_FULL[janela[0]]} ${anoAtual}` : `${CURTOS[janela[0]]}–${CURTOS[janela[janela.length - 1]]} ${anoAtual}`

  const seta = (dir: -1 | 1) => {
    const desligada = dir < 0 ? ini <= 0 : ini >= 12 - n
    return (
      <button type="button" aria-label={dir < 0 ? 'Mês anterior' : 'Próximo mês'} disabled={desligada}
        onClick={() => setInicio(Math.max(0, Math.min(12 - n, ini + dir)))}
        style={{
          width: 32, height: 32, borderRadius: '50%', border: `1px solid ${COR.borda}`,
          background: desligada ? '#f8fafc' : COR.branco, color: desligada ? '#cbd5e1' : '#1e3a8a',
          fontSize: 17, fontWeight: 700, cursor: desligada ? 'default' : 'pointer',
        }}>{dir < 0 ? '‹' : '›'}</button>
    )
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="meses-titulo" style={{
        background: COR.branco, borderRadius: 16, padding: '14px 16px 16px', maxWidth: '96vw', maxHeight: '94vh',
        overflow: 'auto', boxShadow: '0 20px 50px rgba(15,23,42,.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <h3 id="meses-titulo" style={{ margin: 0, fontSize: 16, color: COR.texto, marginRight: 'auto' }}>
            Planejamento · {titulo}
          </h3>
          {!anoInteiro && (
            <span style={{ display: 'flex', gap: 6 }}>{seta(-1)}{seta(1)}</span>
          )}
          <button type="button" aria-pressed={anoInteiro} onClick={() => setAnoInteiro(v => !v)} style={{
            border: `1px solid ${anoInteiro ? COR.azul : COR.borda}`, borderRadius: 999, padding: '6px 12px',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: anoInteiro ? '#eff6ff' : COR.branco, color: '#1e3a8a',
          }}>{anoInteiro ? `${n === 1 ? '1 mês' : `${n} meses`}` : 'Ano inteiro'}</button>
          <button type="button" aria-label="Fechar" onClick={onClose} style={{
            border: 'none', background: '#f1f5f9', color: '#475569', borderRadius: '50%', width: 32, height: 32,
            fontSize: 16, cursor: 'pointer',
          }}>✕</button>
        </div>

        <PlanPainel
          anoAtual={anoAtual} mesAtual={props.mesAtual}
          dadosAtivos={props.dadosAtivos} previsto={props.previsto} categorias={props.categorias}
          onSave={props.onSave} onBulkSave={props.onBulkSave}
          objetivos={props.objetivos} sobraPrevista={props.sobraPrevista} onMetaSave={props.onMetaSave}
          dadosAnoAnterior={props.dadosAnoAnterior}
          janela={janela} compacto
        />
        <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 8, lineHeight: 1.5, maxWidth: 560 }}>
          Clique num valor para editar (aceita conta, como <b>800+300</b>). Clique no <b>nome da categoria</b> para
          ver o que já está lançado nos próximos meses e ajustar o plano daqui para frente.
        </div>
      </div>
    </div>
  )
}
