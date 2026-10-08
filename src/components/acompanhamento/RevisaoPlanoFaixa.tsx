import { COR } from '../../utils/cores'
import type { LancadoAcima } from '../../utils/lancadoAcimaDoPlano'

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const reais = (v: number) => `R$ ${Math.round(Math.abs(v)).toLocaleString('pt-BR')}`

/**
 * No Radar, logo abaixo da frase do mês: as categorias cujo já lançado passa
 * do plano de um mês que ainda não começou (utils/lancadoAcimaDoPlano). Cada
 * uma é um botão que abre o ajuste do plano — onde a sugestão "média sem
 * parcelas + já lançado, mês a mês" já conta com elas.
 *
 * Âmbar, e não vermelho: é aviso sobre o que vem, não fato do mês. Par de
 * estado medido em cores.ts (avisoTexto sobre avisoFundo).
 */
export default function LancadoAcimaFaixa({ itens, onAjustar }: {
  itens: LancadoAcima[]
  onAjustar: (nome: string, descricao: string) => void
}) {
  if (itens.length === 0) return null
  return (
    <div role="status" style={{
      flexShrink: 0, borderRadius: 12, padding: '10px 14px', background: COR.avisoFundo,
      border: `1px solid ${COR.avisoBorda}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: COR.avisoTexto }}>
        Já lançado acima do plano dos próximos meses:
      </span>
      {itens.map(a => {
        const nome = a.descricao ? `${a.nome} · ${a.descricao}` : a.nome
        const m0 = a.meses[0], mN = a.meses[a.meses.length - 1]
        const quando = a.meses.length === 1 ? MESES[m0.mes] : `${MESES[m0.mes]}–${MESES[mN.mes]}`
        return (
          <button key={`${a.nome}||${a.descricao}`} type="button" onClick={() => onAjustar(a.nome, a.descricao)}
            title="Ajustar o plano"
            style={{ border: `1px solid ${COR.avisoBorda}`, background: COR.branco, color: COR.avisoTexto, borderRadius: 999,
              padding: '4px 10px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {nome} · {quando} +{reais(a.excessoTotal)} ✎
          </button>
        )
      })}
    </div>
  )
}
