import { useState, useEffect, useRef } from 'react'
import { COR } from '../utils/cores'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

type Props = {
  mes: number
  ano: number
  onSelect: (mes: number, ano: number) => void
  /** Recusa um mês no calendário e desabilita a seta que levaria até ele. */
  habilitado?: (mes: number, ano: number) => boolean
  /** Rótulo curto ("Set 2026") em vez de "Setembro 2026". */
  compacto?: boolean
  /** Trava o calendário no ano corrente: a Revisão Mensal só olha um ano. */
  anoFixo?: boolean
}

/**
 * Seletor de mês/ano usado em todas as telas que navegam por mês.
 *
 * O desenho vem do header de Lançamentos: setas para andar um mês e um botão
 * com o mês por extenso que abre um calendário de 12 meses com navegação de
 * ano. Antes cada tela tinha o seu — algumas só com setas, sem calendário, e
 * com setas de glifo diferente (◀ em umas, ‹ em outras).
 *
 * Vai sobre fundo azul, dentro do PageHeader; por isso as cores claras.
 */
export default function SeletorMesAno({ mes, ano, onSelect, habilitado, compacto, anoFixo }: Props) {
  const [aberto, setAberto] = useState(false)
  const [anoCal, setAnoCal] = useState(ano)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  function passo(delta: 1 | -1) {
    let m = mes + delta
    let a = ano
    if (m > 11) { m = 0; a++ }
    if (m < 0)  { m = 11; a-- }
    if (habilitado && !habilitado(m, a)) return
    onSelect(m, a)
  }

  const podeVoltar  = !habilitado || habilitado(mes === 0 ? 11 : mes - 1, mes === 0 ? ano - 1 : ano)
  const podeAvancar = !habilitado || habilitado(mes === 11 ? 0 : mes + 1, mes === 11 ? ano + 1 : ano)

  const seta = (ativa: boolean) => ({
    width: 28, height: 28, borderRadius: 8, border: 'none',
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    cursor: ativa ? 'pointer' : 'default', opacity: ativa ? 1 : 0.35,
    fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  } as const)

  const btnAno = {
    border: 'none', background: '#eff6ff', color: COR.azul, borderRadius: 6,
    padding: '4px 12px', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
  } as const

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => passo(-1)} disabled={!podeVoltar}
          aria-label="Mês anterior" style={seta(podeVoltar)}>‹</button>

        <button
          onClick={e => { e.stopPropagation(); setAnoCal(ano); setAberto(v => !v) }}
          aria-label="Escolher mês"
          style={{
            fontSize: compacto ? 15 : 20, fontWeight: 800, color: '#fff',
            border: 'none', background: 'rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '4px 14px',
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            // Largura fixa pelo maior rótulo ("Fevereiro"). Sem isso as setas
            // mudam de lugar a cada mês, porque "Maio" é bem mais estreito.
            minWidth: compacto ? 96 : 178, textAlign: 'center',
          }}>
          {compacto ? ABREV[mes] : NOMES_MESES[mes]} {ano}
        </button>

        <button onClick={() => passo(1)} disabled={!podeAvancar}
          aria-label="Próximo mês" style={seta(podeAvancar)}>›</button>
      </div>

      {aberto && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
            background: '#fff', borderRadius: 14, padding: 16, minWidth: 272,
            boxShadow: '0 8px 32px rgba(0,0,0,.22)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {anoFixo
              ? <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15, color: COR.texto }}>{anoCal}</span>
              : <>
                  <button onClick={() => setAnoCal(a => a - 1)} aria-label="Ano anterior" style={btnAno}>‹</button>
                  <span style={{ fontWeight: 700, fontSize: 15, color: COR.texto }}>{anoCal}</span>
                  <button onClick={() => setAnoCal(a => a + 1)} aria-label="Próximo ano" style={btnAno}>›</button>
                </>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {ABREV.map((abrev, i) => {
              const ativo = i === mes && anoCal === ano
              const ok    = !habilitado || habilitado(i, anoCal)
              return (
                <button key={i} disabled={!ok}
                  onClick={() => { onSelect(i, anoCal); setAberto(false) }}
                  style={{
                    padding: '8px 4px', border: 'none', borderRadius: 8,
                    cursor: ok ? 'pointer' : 'default', opacity: ok ? 1 : 0.35,
                    fontFamily: 'inherit', fontSize: 12,
                    fontWeight: ativo ? 700 : 500,
                    background: ativo ? COR.azul : '#f1f5f9',
                    color: ativo ? '#fff' : COR.texto,
                  }}>
                  {abrev}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
