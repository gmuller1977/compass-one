import { useState } from 'react'
import { createPortal } from 'react-dom'
import { COR } from '../utils/cores'
import { NOMES_MESES } from './faturaCartao/FcShared'

// Calendário do mês para clicar na data (27/10/2026, pedido do Guilherme:
// "o calendário mensal para clicar na data, como no computador"). O desenho
// é o do campo Dia de Lançamentos do computador (NleDesktopPanel). Usado na
// data da compra da fatura (o mês anda pelas setas: a fatura junta compras de
// dois meses), no Dia de Lançamentos do celular (só o mês da tela) e no
// "Outro dia" do Lançar (até hoje). No computador abre embaixo do elemento pai
// (position: relative); no celular (`grande`), no meio da tela.

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Data = { dia: number; mes: number; ano: number }

export function CalendarioMes({ selecionada, onEscolher, onFechar, grande, semSetas, ate }: {
  selecionada: Data
  onEscolher: (d: Data) => void
  onFechar: () => void
  /** Celular: dias com toque de 40 px. */
  grande?: boolean
  /** Só o mês da data selecionada, sem trocar de mês. */
  semSetas?: boolean
  /** Último dia que pode ser escolhido (o Lançar não aceita data futura). */
  ate?: Data
}) {
  const [vista, setVista] = useState({ mes: selecionada.mes, ano: selecionada.ano })
  const hoje = new Date()
  const totalDias = new Date(vista.ano, vista.mes + 1, 0).getDate()
  const offset = new Date(vista.ano, vista.mes, 1).getDay()
  const limite = ate ? new Date(ate.ano, ate.mes, ate.dia).getTime() : Infinity

  function andar(passo: number) {
    setVista(v => {
      let m = v.mes + passo, a = v.ano
      if (m < 0) { m = 11; a-- }
      if (m > 11) { m = 0; a++ }
      return { mes: m, ano: a }
    })
  }

  const seta = {
    border: 'none', background: '#eff6ff', color: COR.azul, borderRadius: 999,
    width: grande ? 36 : 28, height: grande ? 36 : 28, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: grande ? 16 : 13, fontWeight: 800,
  } as const

  const conteudo = (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1399, background: grande ? 'rgba(15,23,42,.35)' : undefined }} onClick={onFechar} />
      <div style={grande ? {
        // Celular: no meio da tela, por cima da folha (dentro dela o
        // calendário ficaria preso na rolagem).
        position: 'fixed', top: '50%', left: 16, right: 16, transform: 'translateY(-50%)', zIndex: 1400,
        maxWidth: 400, margin: '0 auto',
        background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,.25)',
        padding: 14, border: '1px solid #e2e8f0',
      } : {
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 400,
        background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        padding: 12, minWidth: 264, border: '1px solid #e2e8f0',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          {semSetas ? <span /> : <button type="button" onClick={() => andar(-1)} aria-label="Mês anterior" style={seta}>‹</button>}
          <span style={{ fontSize: grande ? 15 : 12, fontWeight: 700, color: COR.texto }}>
            {NOMES_MESES[vista.mes]} {vista.ano}
          </span>
          {semSetas || (ate && vista.ano * 12 + vista.mes >= ate.ano * 12 + ate.mes)
            ? <span style={{ width: grande ? 36 : 28 }} />
            : <button type="button" onClick={() => andar(1)} aria-label="Próximo mês" style={seta}>›</button>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
          {SEMANA.map(s => (
            <div key={s} style={{ fontSize: grande ? 12 : 9, fontWeight: 700, color: COR.textoSuave, textAlign: 'center', padding: '2px 0' }}>{s}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: totalDias }, (_, i) => i + 1).map(d => {
            const ativo = d === selecionada.dia && vista.mes === selecionada.mes && vista.ano === selecionada.ano
            const ehHoje = d === hoje.getDate() && vista.mes === hoje.getMonth() && vista.ano === hoje.getFullYear()
            const bloqueado = new Date(vista.ano, vista.mes, d).getTime() > limite
            return (
              <button key={d} type="button" disabled={bloqueado}
                onClick={() => { onEscolher({ dia: d, mes: vista.mes, ano: vista.ano }); onFechar() }}
                aria-label={`${d} de ${NOMES_MESES[vista.mes]} de ${vista.ano}`}
                style={{
                  padding: '4px 2px', border: 'none', borderRadius: 8, cursor: bloqueado ? 'default' : 'pointer',
                  opacity: bloqueado ? 0.35 : 1,
                  fontFamily: 'inherit', fontSize: grande ? 15 : 12, fontWeight: ativo ? 700 : 400,
                  background: ativo ? COR.azul : ehHoje ? '#eff6ff' : 'transparent',
                  color: ativo ? '#fff' : ehHoje ? COR.azul : COR.texto,
                  outline: ehHoje && !ativo ? `1.5px solid ${COR.azul}` : 'none',
                  minHeight: grande ? 40 : 32,
                }}>
                {d}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
  // No celular vai para o body: a folha que o abre pode ter transform, e aí
  // o position: fixed ficaria preso nela.
  return grande ? createPortal(conteudo, document.body) : conteudo
}
