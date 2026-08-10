import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR, MESES_FULL, fmt, type AnoData } from './types'
import PlanCelulaEditavel from './PlanCelulaEditavel'

interface Props {
  mes: number
  dadosPrevisto: AnoData
  dadosRealizado: AnoData | null
  aba: 'meu-plano' | 'realizado'
  planejamentoLockado: boolean
  hasFaturaCat: boolean
  planoRef?: AnoData
  categorias: any[]
  onSave: (tipo: 'e' | 's', ri: number, valor: number) => void
  onClose: () => void
  somaCartaoMes: number[]
}

export default function PlanModalMes({
  mes, dadosPrevisto, dadosRealizado, aba, planejamentoLockado, hasFaturaCat,
  categorias, onSave, onClose,
}: Props) {
  const dadosAtivos = aba === 'realizado' && dadosRealizado ? dadosRealizado : dadosPrevisto
  const bloqueado = planejamentoLockado && aba === 'meu-plano'

  // Só oculta categorias 'cartao' quando existe fatura_cartao (evita dupla contagem)
  const saidasVisiveis = hasFaturaCat
    ? dadosAtivos.saidas.filter(c => c.t !== 'cartao')
    : dadosAtivos.saidas
  const teTotal = dadosAtivos.entradas.reduce((s, c) => s + c.v[mes], 0)
  const tsTotal = saidasVisiveis.reduce((s, c) => s + c.v[mes], 0)
  const resultado = teTotal - tsTotal

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: COR.branco, borderRadius: 20, width: '100%', maxWidth: 500,
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${COR.borda}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COR.texto }}>{MESES_FULL[mes]}</div>
            <div style={{ fontSize: 11, color: COR.textoSuave }}>
              {aba === 'meu-plano' ? 'Meu plano' : 'Atualizado'}
              {bloqueado ? ' · 🔒 bloqueado' : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: '#f1f5f9', borderRadius: 8,
              padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: COR.textoSuave,
            }}
          >Fechar</button>
        </div>

        {/* Conteudo */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
          {/* Receitas */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.4px', color: COR.verde, marginBottom: 8,
            }}>Receitas</div>
            {dadosAtivos.entradas.map((cat, ri) => {
              const { icone } = iconeCategoria(categorias, cat.nome)
              return (
                <div key={cat.nome} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: `1px solid ${COR.borda}`,
                }}>
                  <span style={{ fontSize: 16 }}>{icone}</span>
                  <span style={{ flex: 1, fontSize: 13, color: COR.texto }}>{cat.nome}</span>
                  <PlanCelulaEditavel
                    valor={cat.v[mes]}
                    readOnly={bloqueado && aba === 'meu-plano'}
                    onSave={v => onSave('e', ri, v)}
                  />
                </div>
              )
            })}
          </div>

          {/* Despesas */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.4px', color: COR.vermelho, marginBottom: 8,
            }}>Despesas</div>
            {dadosAtivos.saidas.map((cat, ri) => {
              if (hasFaturaCat && cat.t === 'cartao') return null
              const { icone } = iconeCategoria(categorias, cat.nome)
              return (
                <div key={cat.nome} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: `1px solid ${COR.borda}`,
                }}>
                  <span style={{ fontSize: 16 }}>{icone}</span>
                  <span style={{ flex: 1, fontSize: 13, color: COR.texto }}>{cat.nome}</span>
                  <PlanCelulaEditavel
                    valor={cat.v[mes]}
                    readOnly={bloqueado && aba === 'meu-plano'}
                    onSave={v => onSave('s', ri, v)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Rodape */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${COR.borda}`,
          background: '#f8fafc', display: 'flex', gap: 12,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: '.4px' }}>Receitas</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: COR.verde }}>{fmt(teTotal, true)}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: '.4px' }}>Despesas</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: COR.vermelho }}>{fmt(tsTotal, true)}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: '.4px' }}>Resultado</div>
            <div style={{
              fontSize: 15, fontWeight: 800,
              color: resultado >= 0 ? COR.verde : COR.vermelho,
            }}>
              {resultado >= 0 ? '+' : ''}{fmt(resultado, true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
