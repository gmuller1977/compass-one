import { useState } from 'react'
import { fmt, COR, MESES, nomeExibicao, type Cat } from './types'
import PlanCelulaEditavel from './PlanCelulaEditavel'

interface GrupoCat {
  cat: Cat
  ri: number
  icone: string
  corIcone: string
}

interface Props {
  grupo: string
  cats: GrupoCat[]
  modo: 'planilha' | 'lista'
  mesSelecionado?: number
  bloqueado: boolean
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  tipo: 'e' | 's'
  aba: 'meu-plano' | 'realizado'
  lancadoPorCatMes?: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
}

export default function PlanGrupoAccordion({
  grupo, cats, modo, mesSelecionado = 0, bloqueado, onSave, tipo, aba, lancadoPorCatMes,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const label = grupo === '__sem_grupo__' ? 'Sem grupo' : grupo

  if (modo === 'lista') {
    const total = cats.reduce((s, { cat }) => s + cat.v[mesSelecionado], 0)
    const lancadoTotal = tipo === 'e'
      ? cats.reduce((s, { cat }) => s + (lancadoPorCatMes?.[mesSelecionado]?.entrada[cat.nome] ?? 0), 0)
      : cats.reduce((s, { cat }) => s + (lancadoPorCatMes?.[mesSelecionado]?.saida[cat.nome] ?? 0), 0)

    return (
      <div style={{
        background: COR.branco, borderRadius: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 8, overflow: 'hidden',
      }}>
        <div
          onClick={() => setAberto(v => !v)}
          style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: 12 }}
        >
          <span style={{
            fontSize: 9, display: 'inline-block',
            transition: 'transform .2s', transform: aberto ? 'rotate(90deg)' : 'none',
          }}>▶</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: COR.texto }}>{label}</span>
          <span style={{ fontSize: 11, color: COR.textoSuave }}>{cats.length} categorias</span>
          <span style={{
            fontSize: 15, fontWeight: 800,
            color: '#1e293b',
            fontVariantNumeric: 'tabular-nums',
          }}>{fmt(aba === 'realizado' ? lancadoTotal : total, true)}</span>
        </div>
        {aberto && (
          <div style={{ borderTop: `1px solid ${COR.borda}` }}>
            {cats.map(({ cat, ri, icone }) => {
              const lancado = tipo === 'e'
                ? (lancadoPorCatMes?.[mesSelecionado]?.entrada[cat.nome] ?? 0)
                : (lancadoPorCatMes?.[mesSelecionado]?.saida[cat.nome] ?? 0)
              return (
                <div key={cat.id ?? cat.nome} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 16px 8px 44px', borderBottom: `1px solid ${COR.borda}`,
                }}>
                  <span style={{ fontSize: 14 }}>{icone}</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#1e293b' }}>{nomeExibicao(cat)}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <PlanCelulaEditavel
                      valor={cat.v[mesSelecionado]}
                      readOnly={bloqueado}
                      onSave={v => onSave(tipo, ri, mesSelecionado, v)}
                    />
                    {aba === 'realizado' && (
                      <span style={{
                        fontSize: 13, fontWeight: 600, minWidth: 70, textAlign: 'right',
                        color: lancado > 0 ? (tipo === 'e' ? COR.verde : COR.vermelho) : COR.textoSuave,
                      }}>{fmt(lancado)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Modo planilha — retorna fragmentos de <tr>
  const totaisMes = MESES.map((_, mi) => cats.reduce((s, { cat }) => s + cat.v[mi], 0))
  return (
    <>
      <tr onClick={() => setAberto(v => !v)} style={{ cursor: 'pointer' }}>
        <td style={{
          position: 'sticky', left: 0, zIndex: 5,
          padding: '8px 10px 8px 28px', fontSize: 12, fontWeight: 700,
          color: tipo === 'e' ? '#166534' : '#991b1b',
          background: tipo === 'e' ? '#f0fdf4' : '#fef2f2',
          borderBottom: `1px solid ${tipo === 'e' ? '#dcfce7' : '#fecdd3'}`,
        }}>
          <span style={{
            display: 'inline-block', marginRight: 6,
            transition: 'transform .2s', transform: aberto ? 'rotate(90deg)' : 'none',
            fontSize: 9,
          }}>▶</span>
          {label}
        </td>
        {totaisMes.map((v, mi) => (
          <td key={mi} style={{
            padding: '8px 10px', textAlign: 'right', fontWeight: 600,
            color: tipo === 'e' ? '#166534' : '#991b1b', fontSize: 12,
            background: tipo === 'e' ? '#f0fdf4' : '#fef2f2',
            borderBottom: `1px solid ${tipo === 'e' ? '#dcfce7' : '#fecdd3'}`,
            fontVariantNumeric: 'tabular-nums',
          }}>{fmt(v)}</td>
        ))}
      </tr>
      {aberto && cats.map(({ cat, ri, icone }) => (
        <tr key={cat.id ?? cat.nome}>
          <td style={{
            position: 'sticky', left: 0, zIndex: 5,
            padding: '6px 10px 6px 46px', fontSize: 12,
            color: COR.textoSuave, fontWeight: 400,
            background: COR.branco, borderBottom: `1px solid #f8fafc`,
          }}>
            <span style={{ marginRight: 5, fontSize: 13 }}>{icone}</span>{nomeExibicao(cat)}
          </td>
          {cat.v.map((v, mi) => (
            <td key={mi} style={{
              padding: '4px 6px', fontSize: 12, textAlign: 'right',
              background: COR.branco, borderBottom: `1px solid #f8fafc`,
            }}>
              <PlanCelulaEditavel
                valor={v}
                readOnly={bloqueado}
                onSave={nv => onSave(tipo, ri, mi, nv)}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
