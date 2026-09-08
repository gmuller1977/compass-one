import { useState } from 'react'
import { useToast } from '../Toast'
import PlanFerramentas, { type BulkOp } from './PlanFerramentas'
import PlanModalMeta from './PlanModalMeta'
import { COR, type AnoData } from './types'
import type { Categoria } from '../../context/AppContext'

type ToolId = 'copiar' | 'valor' | 'reajuste' | 'ano'

const FERRAMENTAS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'copiar',   label: 'Copiar mês',    icon: '📋' },
  { id: 'valor',    label: 'Aplicar valor', icon: '💱' },
  { id: 'reajuste', label: 'Reajuste %',    icon: '📈' },
  { id: 'ano',      label: 'Copiar ano',    icon: '📅' },
]

/** A meta abre modal em vez de painel: nao e edicao em lote como as outras. */
const META = { label: 'Meta mensal', icon: '🎯' }

/**
 * Azul escuro com fonte branca — 10,4:1, o mesmo tom das faixas de resumo do
 * Planejamento, para a barra pertencer visualmente à tabela que ela edita.
 *
 * A ferramenta ABERTA inverte: fundo branco, letra azul. Com todos os botões
 * escuros, o realce não podia ser "mais escuro ainda"; inverter é o contraste
 * mais forte disponível e não precisa de uma terceira cor.
 */
const BTN_ESCURO = '#1e3a8a'
const BTN_ATIVO_TEXTO = '#1a56db'

function estiloBotao(ativa: boolean, bloqueado: boolean): React.CSSProperties {
  return {
    border: `1.5px solid ${ativa ? BTN_ATIVO_TEXTO : BTN_ESCURO}`,
    borderRadius: 8, padding: '6px 14px',
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
    cursor: bloqueado ? 'not-allowed' : 'pointer',
    background: ativa ? COR.branco : BTN_ESCURO,
    color: ativa ? BTN_ATIVO_TEXTO : '#fff',
    opacity: bloqueado ? 0.55 : 1,
    display: 'flex', alignItems: 'center', gap: 5,
    transition: 'all .12s',
  }
}

interface Props {
  mesAtual: number
  anoAtual: number
  /** Dados da aba corrente: e deles que as ferramentas leem e para eles que gravam. */
  dadosAtivos: AnoData
  dadosAnoAnterior: AnoData | null
  categorias: Categoria[]
  onBulkSave: (ops: BulkOp[]) => void
  /** Doze metas de sobra, uma por mes. Zero = sem meta. */
  objetivos: number[]
  /** Resultado previsto de cada mes, para o modal comparar com a meta. */
  sobraPrevista: number[]
  onMetaSave: (objetivos: number[]) => void
  /** Edicao indisponivel (plano travado, ou aba so de leitura). */
  bloqueado?: boolean
  motivoBloqueio?: string
}

/**
 * Barra de ferramentas de lote, compartilhada por Grade, Planilha e Lista.
 * Antes existia so na Grade, duplicada inline dentro dela.
 */
export default function PlanBarraFerramentas({
  mesAtual, anoAtual, dadosAtivos, dadosAnoAnterior, categorias,
  onBulkSave, objetivos, sobraPrevista, onMetaSave,
  bloqueado = false, motivoBloqueio,
}: Props) {
  const [toolAberta, setToolAberta] = useState<ToolId | null>(null)
  const [metaAberta, setMetaAberta] = useState(false)
  const { toast } = useToast()
  const temMeta = objetivos.some(v => v > 0)

  function toggleTool(id: ToolId) {
    if (bloqueado) {
      if (motivoBloqueio) toast(motivoBloqueio, 'info')
      return
    }
    setToolAberta(prev => prev === id ? null : id)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {FERRAMENTAS.map(f => {
          const ativa = toolAberta === f.id
          return (
            <button
              key={f.id}
              onClick={() => toggleTool(f.id)}
              title={bloqueado ? motivoBloqueio : undefined}
              style={estiloBotao(ativa, bloqueado)}
            >
              {f.icon} {f.label}
            </button>
          )
        })}

        {/* Ao lado das de lote, mas separada: abre modal, nao painel. */}
        <button
          onClick={() => {
            if (bloqueado) { if (motivoBloqueio) toast(motivoBloqueio, 'info'); return }
            setMetaAberta(true)
          }}
          title={bloqueado ? motivoBloqueio : 'Quanto você quer que sobre por mês'}
          style={estiloBotao(metaAberta, bloqueado)}
        >
          {META.icon} {META.label}
          {/* Ja existe meta em algum mes. Antes isso pintava o botao inteiro de
              azul claro, o que com a barra escura viraria "sempre ativo". */}
          {temMeta && !metaAberta && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#86efac', marginLeft: 1,
            }} />
          )}
        </button>
      </div>

      {metaAberta && (
        <PlanModalMeta
          mesAtual={mesAtual}
          objetivos={objetivos}
          sobraPrevista={sobraPrevista}
          onSalvar={onMetaSave}
          onFechar={() => setMetaAberta(false)}
        />
      )}

      <PlanFerramentas
        toolAberta={bloqueado ? null : toolAberta}
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        dadosAtivos={dadosAtivos}
        dadosAnoAnterior={dadosAnoAnterior}
        categorias={categorias}
        onBulkSave={onBulkSave}
        onClose={() => setToolAberta(null)}
      />
    </>
  )
}
