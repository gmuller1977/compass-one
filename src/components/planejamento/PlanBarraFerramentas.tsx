import { useState } from 'react'
import { useToast } from '../Toast'
import PlanFerramentas, { type BulkOp } from './PlanFerramentas'
import { COR, type AnoData } from './types'
import type { Categoria } from '../../context/AppContext'

type ToolId = 'reajuste' | 'ano'

/**
 * "Copiar mês" e "Aplicar valor" saíram em 13/10/2026: a repetição da
 * categoria (anual repete até dezembro ao digitar; temporária pergunta as
 * parcelas) faz o trabalho deles, e copiar um mês levava "IPVA · 1 de 3"
 * para o ano inteiro.
 */
const FERRAMENTAS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'reajuste', label: 'Reajuste %',    icon: 'ti-trending-up' },
  { id: 'ano',      label: 'Copiar ano',    icon: 'ti-copy' },
]


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
  /** Edicao indisponivel (plano travado, ou aba so de leitura). */
  bloqueado?: boolean
  motivoBloqueio?: string
  /** Abre a revisão do plano anual (PlanRevisaoAnual): o ano que passou × o que se monta. */
  onRevisarAno?: () => void
}

/**
 * Barra de ferramentas de lote, compartilhada por Grade, Planilha e Lista.
 * Antes existia so na Grade, duplicada inline dentro dela.
 */
export default function PlanBarraFerramentas({
  mesAtual, anoAtual, dadosAtivos, dadosAnoAnterior, categorias,
  onBulkSave,
  bloqueado = false, motivoBloqueio, onRevisarAno,
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
              style={estiloBotao(ativa, bloqueado)}
            >
              <i aria-hidden className={`ti ${f.icon}`} style={{ fontSize: 15 }} />{f.label}
            </button>
          )
        })}
        {onRevisarAno && (
          <button onClick={() => { setToolAberta(null); onRevisarAno() }} style={estiloBotao(false, false)}
            title="Comparar cada mês do ano que passou com o plano do próximo ano">
            <i aria-hidden className="ti ti-arrows-left-right" style={{ fontSize: 15 }} />Revisão anual
          </button>
        )}
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
