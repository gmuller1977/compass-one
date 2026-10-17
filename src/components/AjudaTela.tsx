import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AJUDA, type TelaAjuda } from '../utils/ajudaDasTelas'
import ModalTopo from './ModalTopo'

/**
 * O "?" do cabeçalho: abre a explicação da tela quando a pessoa pede, e
 * nunca sozinho. Substitui o TutorialCard (11/10/2026), que cobria a tela na
 * primeira visita — ver utils/ajudaDasTelas.
 *
 * As perguntas levam ao Norte já perguntando (`/norte?pergunta=`).
 *
 * O cabeçalho é o das janelas (ModalTopo); as dicas ficam em caixas
 * #eef2f8 com texto escuro, e as perguntas em #1e3a8a sobre #eff6ff (9,6:1).
 */
export default function AjudaTela({ tela }: { tela: TelaAjuda }) {
  const [aberta, setAberta] = useState(false)
  const navigate = useNavigate()
  const a = AJUDA[tela]

  return (
    <>
      <button
        onClick={() => setAberta(true)}
        title="Como usar esta tela"
        aria-label="Como usar esta tela"
        style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          border: '1.5px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.12)',
          color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >?</button>

      {aberta && (
        <div
          role="dialog" aria-modal="true" aria-label={`Como usar: ${a.titulo}`}
          onClick={e => { if (e.target === e.currentTarget) setAberta(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 18, maxWidth: 440, width: '100%',
            maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 60px rgba(0,0,0,.4)', fontFamily: "-apple-system,'Inter',sans-serif",
          }}>
            <ModalTopo icone="ti-help-circle" rotulo="Como usar" titulo={a.titulo} subtitulo={a.resumo}
              onFechar={() => setAberta(false)} />
            <div style={{ overflowY: 'auto', padding: '16px 20px 18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {a.dicas.map((d, i) => (
                <div key={i} style={{
                  background: '#eef2f8', borderRadius: 10, padding: '10px 12px',
                  fontSize: 13, color: '#1e293b', lineHeight: 1.45,
                }}>{d}</div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Ficou com dúvida? Pergunte ao Norte
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {a.perguntas.map(p => (
                <button key={p}
                  onClick={() => navigate(`/norte?pergunta=${encodeURIComponent(p)}`)}
                  style={{
                    background: '#eff6ff', border: '1px solid #93c5fd',
                    color: '#1e3a8a', borderRadius: 16, padding: '7px 12px', fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}><i aria-hidden className="ti ti-compass" style={{ fontSize: 14, verticalAlign: '-2px', marginRight: 5 }} />{p}</button>
              ))}
              <button
                onClick={() => navigate('/norte')}
                style={{
                  background: '#1a56db', border: 'none', color: '#fff', borderRadius: 16,
                  padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>Outra pergunta →</button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
