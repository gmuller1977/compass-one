import { useState } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, COR, MESES, MESES_FULL, type AnoData } from './types'

interface Props {
  anoAtual: number
  mesAtual: number
  dadosPrevisto: AnoData
  lancadoPorCatMes: Record<number, {
    entrada: Record<string, number>
    saida: Record<string, number>
  }>
  categorias: any[]
  onAjustar: (tipo: 'e' | 's', ri: number, mesInicio: number, valor: number) => void
}

function badge(tipo: 'e' | 's', planejado: number, realizado: number) {
  if (planejado === 0 && realizado === 0) return null
  const ratio = planejado > 0 ? realizado / planejado : realizado > 0 ? Infinity : 0
  if (tipo === 'e') {
    if (ratio >= 0.95) return { icon: '✅', cor: '#16a34a', label: 'OK' }
    if (ratio >= 0.7) return { icon: '⚠️', cor: '#d97706', label: `${Math.round(ratio * 100)}%` }
    return { icon: '🔴', cor: '#dc2626', label: `${Math.round(ratio * 100)}%` }
  } else {
    if (ratio <= 1.05) return { icon: '✅', cor: '#16a34a', label: 'OK' }
    if (ratio <= 1.3) return { icon: '⚠️', cor: '#d97706', label: `+${Math.round((ratio - 1) * 100)}%` }
    return { icon: '🔴', cor: '#dc2626', label: `+${Math.round((ratio - 1) * 100)}%` }
  }
}

export default function PlanRevisao({
  anoAtual, mesAtual, dadosPrevisto, lancadoPorCatMes, categorias, onAjustar,
}: Props) {
  const hoje = new Date()
  const anoHoje = hoje.getFullYear()

  const mesesPassados = MESES.map((_, i) => i).filter(i => {
    if (anoAtual < anoHoje) return true
    if (anoAtual > anoHoje) return false
    return i < mesAtual
  })

  const [mesSel, setMesSel] = useState<number>(
    mesesPassados.length > 0 ? mesesPassados[mesesPassados.length - 1] : 0
  )
  const [aceitos, setAceitos] = useState<Set<string>>(new Set())
  const [mantidos, setMantidos] = useState<Set<string>>(new Set())

  const lancado = lancadoPorCatMes[mesSel] ?? { entrada: {}, saida: {} }

  function toggleAceito(key: string) {
    setAceitos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
    setMantidos(prev => { const n = new Set(prev); n.delete(key); return n })
  }
  function toggleMantido(key: string) {
    setMantidos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
    setAceitos(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  function aplicarRevisao() {
    const mesInicio = mesSel + 1
    if (mesInicio > 11) return
    dadosPrevisto.entradas.forEach((cat, ri) => {
      const key = `e-${ri}`
      if (!aceitos.has(key)) return
      const real = lancado.entrada[cat.nome] ?? 0
      onAjustar('e', ri, mesInicio, real)
    })
    dadosPrevisto.saidas.forEach((cat, ri) => {
      const key = `s-${ri}`
      if (!aceitos.has(key)) return
      const real = lancado.saida[cat.nome] ?? 0
      onAjustar('s', ri, mesInicio, real)
    })
    setAceitos(new Set())
    setMantidos(new Set())
  }

  function renderCategoria(tipo: 'e' | 's', cat: { nome: string; v: number[] }, ri: number) {
    const key = `${tipo}-${ri}`
    const planejado = cat.v[mesSel] ?? 0
    const real = tipo === 'e' ? (lancado.entrada[cat.nome] ?? 0) : (lancado.saida[cat.nome] ?? 0)
    if (planejado === 0 && real === 0) return null
    const b = badge(tipo, planejado, real)
    const { icone } = iconeCategoria(categorias, cat.nome)
    const diff = real - planejado
    const isAceito = aceitos.has(key)
    const isMantido = mantidos.has(key)

    return (
      <div key={cat.nome} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderBottom: `1px solid ${COR.borda}`,
        background: isAceito ? '#f0fdf4' : isMantido ? '#f8fafc' : COR.branco,
        transition: 'background .15s',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icone}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cat.nome}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
            <span style={{ fontSize: 11, color: COR.textoSuave }}>
              Plan: <span style={{ fontWeight: 700, color: COR.texto }}>{fmt(planejado)}</span>
            </span>
            <span style={{ fontSize: 11, color: COR.textoSuave }}>
              Real: <span style={{ fontWeight: 700, color: tipo === 'e' ? COR.verde : COR.vermelho }}>{fmt(real)}</span>
            </span>
            {diff !== 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? (tipo === 'e' ? COR.verde : COR.vermelho) : (tipo === 'e' ? COR.vermelho : COR.verde) }}>
                {diff > 0 ? '+' : ''}{fmt(diff)}
              </span>
            )}
          </div>
        </div>
        {b && (
          <span style={{ fontSize: 11, fontWeight: 700, color: b.cor, minWidth: 32, textAlign: 'center' }}>
            {b.icon} {b.label}
          </span>
        )}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => toggleAceito(key)}
            title="Usar valor real nos próximos meses"
            style={{
              border: `1.5px solid ${isAceito ? COR.verde : COR.borda}`,
              borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: isAceito ? '#dcfce7' : 'transparent',
              color: isAceito ? COR.verde : COR.textoSuave,
            }}
          >Aceitar</button>
          <button
            onClick={() => toggleMantido(key)}
            title="Manter valor planejado"
            style={{
              border: `1.5px solid ${isMantido ? COR.azul : COR.borda}`,
              borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: isMantido ? '#dbeafe' : 'transparent',
              color: isMantido ? COR.azul : COR.textoSuave,
            }}
          >Manter</button>
        </div>
      </div>
    )
  }

  const temAceitos = aceitos.size > 0
  const mesInicioAplicar = mesSel + 1

  return (
    <div style={{ padding: '16px 20px', maxWidth: 680, margin: '0 auto' }}>
      {/* Navegador de meses */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap',
      }}>
        {mesesPassados.length === 0 ? (
          <div style={{ fontSize: 13, color: COR.textoSuave, padding: '8px 0' }}>
            Nenhum mês passado disponível para revisão.
          </div>
        ) : mesesPassados.map(mi => (
          <button
            key={mi}
            onClick={() => { setMesSel(mi); setAceitos(new Set()); setMantidos(new Set()) }}
            style={{
              border: 'none', borderRadius: 8, padding: '6px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: mesSel === mi ? COR.azul : '#f1f5f9',
              color: mesSel === mi ? '#fff' : COR.textoSuave,
              transition: 'all .15s',
            }}
          >{MESES[mi]}</button>
        ))}
      </div>

      {mesesPassados.length > 0 && (
        <div style={{
          background: COR.branco, borderRadius: 16,
          boxShadow: '0 1px 6px rgba(0,0,0,.07)', overflow: 'hidden',
        }}>
          {/* Cabeçalho */}
          <div style={{
            padding: '14px 16px', borderBottom: `1px solid ${COR.borda}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COR.texto }}>{MESES_FULL[mesSel]}</div>
              <div style={{ fontSize: 11, color: COR.textoSuave }}>Revisão — planejado vs realizado</div>
            </div>
            {temAceitos && mesInicioAplicar <= 11 && (
              <button
                onClick={aplicarRevisao}
                style={{
                  border: 'none', borderRadius: 10, padding: '8px 16px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: COR.azul, color: '#fff',
                  boxShadow: '0 2px 8px rgba(26,86,219,.25)',
                }}
              >
                Aplicar revisão ({aceitos.size}) →
              </button>
            )}
          </div>

          {/* Receitas */}
          <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: COR.verde }}>
            Receitas
          </div>
          {dadosPrevisto.entradas.map((cat, ri) => renderCategoria('e', cat, ri))}

          {/* Despesas */}
          <div style={{ padding: '14px 16px 4px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: COR.vermelho }}>
            Despesas
          </div>
          {dadosPrevisto.saidas.map((cat, ri) => renderCategoria('s', cat, ri))}

          {/* Rodapé */}
          {temAceitos && mesInicioAplicar <= 11 && (
            <div style={{
              padding: '12px 16px', borderTop: `1px solid ${COR.borda}`,
              background: '#eff6ff', fontSize: 12, color: COR.azulEscuro,
            }}>
              {aceitos.size} categoria(s) marcada(s) para atualizar os meses de {MESES[mesInicioAplicar]} a Dez/{anoAtual}.
            </div>
          )}
          {mesInicioAplicar > 11 && (
            <div style={{
              padding: '12px 16px', borderTop: `1px solid ${COR.borda}`,
              background: '#fef9c3', fontSize: 12, color: '#92400e',
            }}>
              Dezembro é o último mês — não há meses futuros para aplicar a revisão.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
