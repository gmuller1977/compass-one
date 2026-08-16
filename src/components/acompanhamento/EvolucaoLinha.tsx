import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt } from './AcShared'

interface EvolucaoLinhaProps {
  nome: string
  descricao?: string
  prev: number
  real: number
  isEntrada: boolean
  categorias: Categoria[]
  isSubtotal?: boolean
  grupoLabel?: string
}

function calcStatus(isEntrada: boolean, prev: number, real: number) {
  if (isEntrada) {
    if (real === 0) return { texto: '○ A receber', cor: '#d97706', barra: '#fbbf24' }
    if (real >= prev) return { texto: '✓ Recebido', cor: '#16a34a', barra: '#4ade80' }
    return { texto: '◐ Parcial', cor: '#d97706', barra: '#fbbf24' }
  }
  if (real === 0) return { texto: '○ Pendente', cor: '#d97706', barra: '#fbbf24' }
  if (real <= prev) {
    if (real === prev) return { texto: '✓ Pago', cor: '#16a34a', barra: '#4ade80' }
    return { texto: 'Dentro do previsto', cor: '#16a34a', barra: '#4ade80' }
  }
  return { texto: '⚠ Acima do previsto', cor: '#dc2626', barra: '#f87171' }
}

function calcDif(isEntrada: boolean, prev: number, real: number) {
  if (isEntrada) {
    if (real === 0 && prev === 0) return { label: '—', valor: 0, cor: '#cbd5e1', vazio: true }
    if (real === 0) return { label: 'A receber', valor: prev, cor: '#d97706', vazio: false }
    if (real >= prev) return { label: 'Diferença', valor: real - prev, cor: '#16a34a', vazio: false }
    return { label: 'Faltou', valor: prev - real, cor: '#d97706', vazio: false }
  }
  if (real === 0 && prev === 0) return { label: '—', valor: 0, cor: '#cbd5e1', vazio: true }
  if (real === 0) return { label: 'Disponível', valor: prev, cor: '#1a56db', vazio: false }
  if (real <= prev) return { label: 'Disponível', valor: prev - real, cor: '#1a56db', vazio: false }
  return { label: 'Estourou', valor: real - prev, cor: '#dc2626', negativo: true, vazio: false }
}

export default function EvolucaoLinha({
  nome, descricao, prev, real, isEntrada, categorias, isSubtotal, grupoLabel,
}: EvolucaoLinhaProps) {
  const { icone, cor: corIcone } = iconeCategoria(categorias, nome)
  const status = calcStatus(isEntrada, prev, real)
  const dif    = calcDif(isEntrada, prev, real)

  const barraFundo = status.barra
  const iconeFundo = status.barra === '#4ade80' ? '#f0fdf4' : status.barra === '#f87171' ? '#fef2f2' : '#fffbeb'
  const perc       = prev > 0 ? real / prev : (real > 0 ? 1 : 0)
  const percClamp  = Math.min(perc, 1)
  const percLabel  = prev > 0 || real > 0 ? `${Math.round(perc * 100)}%` : '—'
  const percCor    = perc === 0 ? '#cbd5e1' : perc > 1 ? '#dc2626' : '#16a34a'
  const barCor     = perc > 1 ? '#f87171' : barraFundo

  const realCor = real === 0
    ? '#cbd5e1'
    : isEntrada ? '#1e293b' : (real > prev && prev > 0 ? '#dc2626' : '#1e293b')

  if (isSubtotal) {
    const bordaCor = isEntrada ? '#1a56db' : '#dc2626'
    return (
      <div style={{
        padding: '10px 14px', background: '#f1f5f9',
        display: 'flex', alignItems: 'center', gap: 8,
        borderTop: '2px solid #e2e8f0',
      }}>
        <div style={{ width: 3, height: 32, borderRadius: 2, background: bordaCor, flexShrink: 0 }} />
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#475569',
        }}>∑</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Total {grupoLabel}</div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Previsto</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: '#64748b' }}>
            {prev > 0 ? fmt(prev) : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Realizado</div>
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: '#1e293b' }}>
            {real > 0 ? fmt(real) : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>{dif.label}</div>
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: dif.vazio ? '#cbd5e1' : dif.cor }}>
            {dif.vazio ? '—' : fmt(dif.valor)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
          <div style={{ width: 50, height: 6, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${percClamp * 100}%`, background: barCor }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, minWidth: 32, textAlign: 'right', color: percCor }}>{percLabel}</div>
        </div>
      </div>
    )
  }

  const displayName = descricao ? `${nome} · ${descricao}` : nome

  return (
    <div style={{
      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: '1px solid #f1f5f9',
    }}>
      <div style={{ width: 3, height: 32, borderRadius: 2, background: barraFundo, flexShrink: 0 }} />
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: iconeFundo, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15,
      }}>{icone}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1e293b',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </div>
        <div style={{ fontSize: 9, marginTop: 2, color: status.cor }}>{status.texto}</div>
      </div>
      <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Previsto</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: '#94a3b8' }}>
          {prev > 0 ? fmt(prev) : '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Realizado</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: realCor }}>
          {real > 0 ? fmt(real) : '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>{dif.label}</div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: dif.vazio ? '#cbd5e1' : dif.cor }}>
          {dif.vazio ? '—' : fmt(dif.valor)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
        <div style={{ width: 50, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, width: `${percClamp * 100}%`, background: barCor }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, minWidth: 32, textAlign: 'right', color: percCor }}>{percLabel}</div>
      </div>
    </div>
  )
}
