import { COR } from '../../utils/cores'
import type { Aviso } from '../../utils/avisosDoMes'

// Tons sobre o BRANCO do cartão: erroTexto #b91c1c 6,47; âmbar #b45309 5,02
// (o token do app — #d97706 dava 3,19 e reprova). Texto da frase em COR.texto.
const TOM = { vermelho: COR.erroTexto, ambar: '#b45309' } as const

/**
 * "Pede sua atenção": os avisos de utils/avisosDoMes, um cartão cada. Sem
 * nenhum, "Tudo em dia" — a mensagem que mais vende numa tela de finanças.
 * Aqui é só desenho; a frase e a ordem chegam prontas.
 */
export default function AvisosCard({ avisos, acoes, isMobile, emDia }: {
  avisos: Aviso[]
  acoes: Record<Aviso['id'], { rotulo: string; onClick: () => void; aberto?: boolean }>
  isMobile: boolean
  /** O texto do "tudo em dia" — muda conforme o que foi conferido. */
  emDia: string
}) {
  if (avisos.length === 0) {
    return (
      <div role="status" style={{ background: COR.sucessoFundo, border: '1px solid #bbf7d0', borderRadius: 14,
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', background: COR.sucessoTexto, color: '#fff',
          display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>✓</span>
        <div>
          <div style={{ fontWeight: 700, color: '#14532d', fontSize: 15 }}>Tudo em dia</div>
          <div style={{ fontSize: 13, color: '#166534', marginTop: 2 }}>{emDia}</div>
        </div>
      </div>
    )
  }
  return (
    <section aria-label="Pede sua atenção">
      <h2 style={{ fontSize: 12, fontWeight: 700, color: COR.textoSuave, letterSpacing: '.06em', textTransform: 'uppercase',
        margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        Pede sua atenção
        <span style={{ background: COR.erroTexto, color: '#fff', borderRadius: 999, fontSize: 11, padding: '1px 7px', letterSpacing: 0 }}>
          {avisos.length}
        </span>
      </h2>
      <div style={{ display: 'grid', gap: isMobile ? 10 : 12,
        gridTemplateColumns: isMobile ? '1fr' : `repeat(${avisos.length}, 1fr)` }}>
        {avisos.map(a => {
          const cor = TOM[a.tom]
          const acao = acoes[a.id]
          return (
            <article key={a.id} style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderTop: `4px solid ${cor}`,
              borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: cor }}>{a.tag}</span>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 650, lineHeight: 1.35, color: COR.texto, textWrap: 'balance' }}>{a.titulo}</p>
              <p style={{ margin: 0, fontSize: 13, color: COR.textoSuave, lineHeight: 1.4 }}>{a.detalhe}</p>
              <button type="button" onClick={acao.onClick} aria-expanded={acao.aberto}
                style={{ alignSelf: 'flex-start', marginTop: 'auto', border: `1px solid ${COR.borda}`, background: '#f8fafc',
                  color: '#1e3a8a', borderRadius: 999, padding: '6px 14px', fontFamily: 'inherit', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer' }}>
                {acao.rotulo}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
