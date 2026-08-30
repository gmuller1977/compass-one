import { useState } from 'react'
import { useToast } from '../Toast'
import PlanFerramentas, { type BulkOp } from './PlanFerramentas'
import { COR, type AnoData } from './types'
import type { Categoria } from '../../context/AppContext'

type ToolId = 'copiar' | 'valor' | 'reajuste' | 'ano'

const FERRAMENTAS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'copiar',   label: 'Copiar mês',    icon: '📋' },
  { id: 'valor',    label: 'Aplicar valor', icon: '💱' },
  { id: 'reajuste', label: 'Reajuste %',    icon: '📈' },
  { id: 'ano',      label: 'Copiar ano',    icon: '📅' },
]

interface Props {
  mesAtual: number
  anoAtual: number
  /** Dados da aba corrente: e deles que as ferramentas leem e para eles que gravam. */
  dadosAtivos: AnoData
  dadosAnoAnterior: AnoData | null
  categorias: Categoria[]
  onBulkSave: (ops: BulkOp[]) => void
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
  onBulkSave, bloqueado = false, motivoBloqueio,
}: Props) {
  const [toolAberta, setToolAberta] = useState<ToolId | null>(null)
  const { toast } = useToast()

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
              style={{
                border: `1.5px solid ${ativa ? '#1a56db' : COR.borda}`,
                borderRadius: 8, padding: '6px 14px',
                fontSize: 12, fontWeight: 600,
                cursor: bloqueado ? 'not-allowed' : 'pointer',
                background: ativa ? '#eff6ff' : COR.branco,
                color: ativa ? '#1a56db' : COR.textoSuave,
                opacity: bloqueado ? 0.55 : 1,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all .12s',
              }}
            >
              {f.icon} {f.label}
            </button>
          )
        })}
      </div>

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
