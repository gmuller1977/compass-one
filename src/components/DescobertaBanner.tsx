import { COR } from '../utils/cores'
import { NOMES_MESES } from '../components/novoLancamentoExtrato/NleShared'
import type { Descoberta } from '../utils/descoberta'

/**
 * A faixa da fase de DESCOBERTA.
 *
 * Ela existe para trocar uma ausência por um progresso. Sem plano, o
 * Planejamento mostrava doze cartões cinzas dizendo "Sem Planejamento" —
 * o app informando doze vezes que o usuário falhou em algo que ele nem sabia
 * que devia fazer.
 *
 * O usuário-alvo do Compass One chega sem saber quanto ganha nem quanto gasta.
 * Para ele, não ter plano no primeiro mês não é falha: é o estado correto. O
 * que faltava era o app dizer isso, e dizer **quando** termina.
 *
 * Nada aqui é decorativo: os três números são o que ele fez, e a data é quando
 * o material fica suficiente.
 */
export default function DescobertaBanner({ d, onComoFunciona }: {
  d: Descoberta
  /** Reabre a explicação da fase. Ausente, o botão não aparece. */
  onComoFunciona?: () => void
}) {
  const mes = NOMES_MESES[d.mesObservado.mes]
  const fechaHoje = d.diasAteFechar <= 0
  const nada = d.lancamentos === 0

  const numeros: [number, string][] = [
    [d.lancamentos,     d.lancamentos === 1 ? 'lançamento' : 'lançamentos'],
    [d.diasComRegistro, d.diasComRegistro === 1 ? 'dia com registro' : 'dias com registro'],
    [d.categoriasVistas, d.categoriasVistas === 1 ? 'categoria' : 'categorias'],
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${COR.azulEscuro}, #1e40af)`,
      borderRadius: 12, padding: '14px 18px', marginBottom: 12,
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 24px',
    }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 3 }}>
          Descobrindo seus números
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>
          {nada
            ? <>Comece registrando o que entra e o que sai em <b style={{ color: '#fff' }}>Lançamentos</b>. Seu plano nasce a partir daí.</>
            : fechaHoje
              ? <><b style={{ color: '#fff' }}>{mes} fecha hoje.</b> Com o que você registrou já dá para montar o primeiro plano.</>
              : <>Seu plano nasce quando <b style={{ color: '#fff' }}>{mes.toLowerCase()}</b> fechar — faltam{' '}
                  <b style={{ color: '#fff' }}>{d.diasAteFechar}</b> {d.diasAteFechar === 1 ? 'dia' : 'dias'}.</>}
        </div>

        {/* A faixa diz o estado; o modal diz o combinado. Depois da primeira
            vez ele só volta por aqui. */}
        {onComoFunciona && (
          <button onClick={onComoFunciona} style={{
            marginTop: 7, padding: 0, border: 'none', background: 'none',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3,
          }}>Como funciona</button>
        )}
      </div>

      {!nada && (
        <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
          {numeros.map(([n, rotulo]) => (
            <div key={rotulo}>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums' }}>{n}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap' }}>{rotulo}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
