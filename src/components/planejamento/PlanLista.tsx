import { useState } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, COR, MESES_FULL, type AnoData } from './types'
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
  totaisReais?: { te: number[]; ts: number[] }
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

export default function PlanLista({
  aba, anoAtual, mesAtual, dadosAtivos, previsto, planejamentoLockado,
  categorias, onSave, lancadoPorCatMes,
}: Props) {
  const [mes, setMes] = useState(mesAtual)
  const bloqueado = planejamentoLockado && aba === 'meu-plano'
  const anoCorrente = new Date().getFullYear()
  const isAtual = mes === mesAtual && anoAtual === anoCorrente

  const te = previsto.totalEntradas[mes]
  const ts = previsto.totalSaidas[mes]
  const resultado = te - ts

  const gruposE = groupBy(dadosAtivos.entradas, categorias)
  const gruposS = groupBy(dadosAtivos.saidas, categorias)

  // suppress unused import warning
  void iconeCategoria

  return (
    <div style={{ padding: '16px 20px', maxWidth: 640, margin: '0 auto' }}>
      {/* Navegador de mes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => setMes(m => Math.max(0, m - 1))}
          disabled={mes === 0}
          style={{
            border: 'none', background: 'none', fontSize: 20,
            cursor: mes === 0 ? 'default' : 'pointer',
            color: mes === 0 ? COR.borda : COR.azul,
          }}
        >◄</button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: COR.texto }}>{MESES_FULL[mes]} {anoAtual}</span>
          {isAtual && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontWeight: 700, background: COR.azul,
              color: '#fff', padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase',
            }}>Atual</span>
          )}
        </div>
        <button
          onClick={() => setMes(m => Math.min(11, m + 1))}
          disabled={mes === 11}
          style={{
            border: 'none', background: 'none', fontSize: 20,
            cursor: mes === 11 ? 'default' : 'pointer',
            color: mes === 11 ? COR.borda : COR.azul,
          }}
        >►</button>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Receitas', valor: te, cor: COR.verde, bg: '#f0fdf4', bd: '#bbf7d0' },
          { label: 'Despesas', valor: ts, cor: COR.vermelho, bg: '#fef2f2', bd: '#fecaca' },
          {
            label: 'Resultado', valor: resultado,
            cor: resultado >= 0 ? COR.verde : COR.vermelho,
            bg: resultado >= 0 ? '#f0fdf4' : '#fef2f2',
            bd: resultado >= 0 ? '#bbf7d0' : '#fecaca',
          },
        ].map(({ label, valor, cor, bg, bd }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${bd}`, borderRadius: 14,
            padding: '14px 16px', textAlign: 'center',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.4px', color: COR.textoSuave, marginBottom: 6,
            }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(valor, true)}
            </div>
          </div>
        ))}
      </div>

      {/* Receitas */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.5px', color: COR.verde, marginBottom: 8,
        }}>Receitas</div>
        {gruposE.map(([grupo, cats]) => (
          <PlanGrupoAccordion
            key={`e-${grupo}`}
            grupo={grupo}
            modo="lista"
            tipo="e"
            aba={aba}
            mesSelecionado={mes}
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
      </div>

      {/* Despesas */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.5px', color: COR.vermelho, marginBottom: 8,
        }}>Despesas</div>
        {gruposS.map(([grupo, cats]) => (
          <PlanGrupoAccordion
            key={`s-${grupo}`}
            grupo={grupo}
            modo="lista"
            tipo="s"
            aba={aba}
            mesSelecionado={mes}
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
      </div>

      <div style={{
        marginTop: 16, padding: '12px 16px',
        background: '#fefce8', border: '1px solid #fde047',
        borderRadius: 12, fontSize: 12, color: '#854d0e',
      }}>
        Toque no valor de qualquer categoria para ajustar.
      </div>
    </div>
  )
}
