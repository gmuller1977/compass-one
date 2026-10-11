import { COR } from '../../utils/cores'
import type { LinhaDoMes } from '../acompanhamento/evolucaoCalcs'
import { useLembreteMotivo } from './useLembreteMotivo'

/**
 * "Academia passou do plano: por quê? · Anotar motivo" — no Radar e na
 * Bússola, no mês corrente. Azul de informação, e não vermelho: o vermelho
 * do "passou" já está na linha da categoria; aqui é um convite a anotar.
 * Par medido em cores.ts (infoTexto sobre infoFundo, 5,5:1).
 */
export default function MotivoEstouroFaixa({ linhasSaida, ano, mes }: {
  linhasSaida: LinhaDoMes[]; ano: number; mes: number
}) {
  const { texto, abrir, dialog } = useLembreteMotivo(linhasSaida, ano, mes)
  if (!texto) return dialog
  return (
    <>
      <div role="status" style={{
        flexShrink: 0, borderRadius: 12, padding: '10px 14px', background: COR.infoFundo,
        border: `1px solid ${COR.infoBorda}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COR.infoTexto }}>{texto.titulo}</div>
          <div style={{ fontSize: 12, color: COR.infoTexto, marginTop: 2, lineHeight: 1.4 }}>{texto.detalhe}</div>
        </div>
        <button type="button" onClick={abrir} style={{
          border: 'none', background: COR.infoTexto, color: '#fff', borderRadius: 999,
          padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          Anotar motivo
        </button>
      </div>
      {dialog}
    </>
  )
}
