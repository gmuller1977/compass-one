import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AJUDA, type TelaAjuda } from '../utils/ajudaDasTelas'

/**
 * O "?" do cabeçalho: abre a explicação da tela quando a pessoa pede, e
 * nunca sozinho. Substitui o TutorialCard (11/10/2026), que cobria a tela na
 * primeira visita — ver utils/ajudaDasTelas.
 *
 * As perguntas levam ao Norte já perguntando (`/norte?pergunta=`).
 *
 * Cartão em #0f2878 → #1e40af: o texto a 85% de branco dá 5,6:1 no extremo
 * mais claro; as dicas ficam em caixas brancas com texto escuro.
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
            background: 'linear-gradient(160deg, #0f2878 0%, #1e40af 100%)',
            borderRadius: 18, padding: '22px 20px 18px', maxWidth: 440, width: '100%',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 60px rgba(0,0,0,.4)', fontFamily: "-apple-system,'Inter',sans-serif",
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{a.titulo}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', lineHeight: 1.5 }}>{a.resumo}</div>
              </div>
              <button onClick={() => setAberta(false)} aria-label="Fechar" style={{
                background: 'none', border: 'none', color: '#fff', fontSize: 22, lineHeight: 1,
                cursor: 'pointer', padding: 2,
              }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {a.dicas.map((d, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10, padding: '10px 12px',
                  fontSize: 13, color: '#1e293b', lineHeight: 1.45,
                }}>{d}</div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Ficou com dúvida? Pergunte ao Norte
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {a.perguntas.map(p => (
                <button key={p}
                  onClick={() => navigate(`/norte?pergunta=${encodeURIComponent(p)}`)}
                  style={{
                    background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.45)',
                    color: '#fff', borderRadius: 16, padding: '7px 12px', fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}><i aria-hidden className="ti ti-compass" style={{ fontSize: 14, verticalAlign: '-2px', marginRight: 5 }} />{p}</button>
              ))}
              <button
                onClick={() => navigate('/norte')}
                style={{
                  background: '#fff', border: 'none', color: '#0f2878', borderRadius: 16,
                  padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>Outra pergunta →</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
