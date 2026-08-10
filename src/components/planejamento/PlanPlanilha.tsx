import type React from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, COR, MESES, type AnoData } from './types'
import PlanResumoAnual from './PlanResumoAnual'
import PlanGrupoAccordion from './PlanGrupoAccordion'

interface Props {
  aba: 'meu-plano' | 'realizado'
  anoAtual: number
  mesAtual: number
  dadosAtivos: AnoData
  previsto: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  planejamentoLockado: boolean
  categorias: any[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  lancadoPorCatMes?: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
}

function groupBy(cats: any[], categorias: any[]) {
  const map = new Map<string, any[]>()
  for (const c of cats) {
    const cat = categorias.find((cc: any) => (c.id ? cc.id === c.id : cc.nome === c.nome))
    const g = cat?.grupo ?? '__sem_grupo__'
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(c)
  }
  return [...map.entries()].sort(([a], [b]) =>
    a === '__sem_grupo__' ? 1 : b === '__sem_grupo__' ? -1 : a.localeCompare(b, 'pt-BR')
  )
}

export default function PlanPlanilha({
  aba, anoAtual, mesAtual, dadosAtivos, previsto, planejamentoLockado, categorias, onSave, lancadoPorCatMes,
}: Props) {
  const bloqueado = planejamentoLockado && aba === 'meu-plano'
  const ehAtualMes = (mi: number) => mi === mesAtual && anoAtual === new Date().getFullYear()

  const thStyle = (mi?: number): React.CSSProperties => ({
    position: 'sticky', top: 0, zIndex: 10,
    background: (mi !== undefined && ehAtualMes(mi)) ? '#eff6ff' : '#f8fafc',
    padding: 10, fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: .5,
    color: (mi !== undefined && ehAtualMes(mi)) ? COR.azul : COR.textoSuave,
    borderBottom: `2px solid ${COR.borda}`, textAlign: 'right',
    whiteSpace: 'nowrap',
  })

  const gruposE = groupBy(dadosAtivos.entradas, categorias)
  const gruposS = groupBy(dadosAtivos.saidas, categorias)

  const receitasAnuais = previsto.totalEntradas.reduce((a, b) => a + b, 0)
  const despesasAnuais = previsto.totalSaidas.reduce((a, b) => a + b, 0)

  return (
    <div style={{ padding: '16px 20px' }}>
      <PlanResumoAnual
        saldoInicial={previsto.saldoInicial[0]}
        totalReceitas={receitasAnuais}
        totalDespesas={despesasAnuais}
        resultado={previsto.saldoFinal[11]}
      />

      <div style={{ background: COR.branco, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr>
                <th style={{
                  ...thStyle(), textAlign: 'left', minWidth: 190,
                  position: 'sticky', left: 0, zIndex: 11, background: '#f8fafc',
                }}>Categoria</th>
                {MESES.map((m, mi) => (
                  <th key={mi} style={thStyle(mi)}>{ehAtualMes(mi) ? '● ' : ''}{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Saldo inicial */}
              <tr>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 5, padding: '8px 12px',
                  fontSize: 12, fontWeight: 600, color: COR.textoSuave,
                  background: '#f8fafc', borderTop: `1px solid ${COR.borda}`,
                }}>Saldo inicial</td>
                {previsto.saldoInicial.map((v, mi) => (
                  <td key={mi} style={{
                    padding: 8, textAlign: 'right', fontSize: 12, color: COR.textoSuave,
                    background: '#f8fafc', borderTop: `1px solid ${COR.borda}`,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{fmt(v)}</td>
                ))}
              </tr>

              {/* Receitas total */}
              <tr>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 5, padding: '10px 12px',
                  fontSize: 13, fontWeight: 700, color: COR.verde,
                  background: '#f0fdf4', borderTop: `2px solid ${COR.borda}`,
                }}>Receitas</td>
                {previsto.totalEntradas.map((v, mi) => (
                  <td key={mi} style={{
                    padding: '10px', fontSize: 12, fontWeight: 700, color: COR.verde,
                    background: '#f0fdf4', textAlign: 'right', borderTop: `2px solid ${COR.borda}`,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{fmt(v)}</td>
                ))}
              </tr>

              {/* Despesas total */}
              <tr>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 5, padding: '10px 12px',
                  fontSize: 13, fontWeight: 700, color: COR.vermelho,
                  background: '#fef2f2', borderTop: `1px solid ${COR.borda}`,
                }}>Despesas</td>
                {previsto.totalSaidas.map((v, mi) => (
                  <td key={mi} style={{
                    padding: '10px', fontSize: 12, fontWeight: 700, color: COR.vermelho,
                    background: '#fef2f2', textAlign: 'right', borderTop: `1px solid ${COR.borda}`,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{fmt(v)}</td>
                ))}
              </tr>

              {/* Resultado */}
              <tr>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 5, padding: '10px 12px',
                  fontSize: 13, fontWeight: 700, color: COR.texto,
                  background: '#f8fafc', borderTop: `1px solid ${COR.borda}`,
                }}>= Resultado</td>
                {previsto.totalEntradas.map((_, mi) => {
                  const res = previsto.totalEntradas[mi] - previsto.totalSaidas[mi]
                  return (
                    <td key={mi} style={{
                      padding: '10px', fontSize: 12, fontWeight: 700,
                      color: res >= 0 ? COR.verde : COR.vermelho,
                      background: '#f8fafc', textAlign: 'right', borderTop: `1px solid ${COR.borda}`,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{fmt(res, true)}</td>
                  )
                })}
              </tr>

              {/* Separador */}
              <tr><td colSpan={13} style={{ height: 8, background: '#f0f4ff' }} /></tr>

              {/* Grupos de Receitas */}
              {gruposE.map(([grupo, cats]) => (
                <PlanGrupoAccordion
                  key={`e-${grupo}`}
                  grupo={grupo}
                  modo="planilha"
                  tipo="e"
                  aba={aba}
                  bloqueado={bloqueado}
                  cats={cats.map((cat: any) => ({
                    cat,
                    ri: dadosAtivos.entradas.indexOf(cat),
                    icone: iconeCategoria(categorias, cat.nome).icone,
                    corIcone: iconeCategoria(categorias, cat.nome).cor,
                  }))}
                  onSave={onSave}
                  lancadoPorCatMes={lancadoPorCatMes}
                />
              ))}

              {/* Separador */}
              <tr><td colSpan={13} style={{ height: 8, background: '#f0f4ff' }} /></tr>

              {/* Grupos de Despesas */}
              {gruposS.map(([grupo, cats]) => (
                <PlanGrupoAccordion
                  key={`s-${grupo}`}
                  grupo={grupo}
                  modo="planilha"
                  tipo="s"
                  aba={aba}
                  bloqueado={bloqueado}
                  cats={cats.map((cat: any) => ({
                    cat,
                    ri: dadosAtivos.saidas.indexOf(cat),
                    icone: iconeCategoria(categorias, cat.nome).icone,
                    corIcone: iconeCategoria(categorias, cat.nome).cor,
                  }))}
                  onSave={onSave}
                  lancadoPorCatMes={lancadoPorCatMes}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
