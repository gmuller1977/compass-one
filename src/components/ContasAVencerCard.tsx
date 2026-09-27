import type { Categoria } from '../context/AppContext'
import { COR } from '../utils/cores'
import { iconeCategoria } from '../utils/categoriaIcone'
import type { ContaAVencer } from '../utils/contasAVencer'

const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * "Contas dos próximos 7 dias" da tela Início. A lista vem pronta de
 * utils/contasAVencer — aqui é só desenho. Atrasada em COR.erroTexto
 * (6,5:1 no branco); data e rótulos em COR.textoSuave (4,76:1).
 */
export default function ContasAVencerCard({
  contas, categorias, isMobile, onAbrir, hoje = new Date(),
  titulo = 'Contas dos próximos 7 dias', acao = 'Marcar como paga em Lançamentos →',
}: {
  contas: ContaAVencer[]
  categorias: Categoria[]
  isMobile: boolean
  onAbrir: () => void
  hoje?: Date
  titulo?: string
  acao?: string
}) {
  const hoje0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const quando = (c: ContaAVencer) => {
    const d = new Date(c.ano, c.mes, c.dia)
    const dd = `${String(c.dia).padStart(2, '0')}/${String(c.mes + 1).padStart(2, '0')}`
    if (c.atrasada) return `Venceu ${dd}`
    const diff = Math.round((d.getTime() - hoje0.getTime()) / 86_400_000)
    if (diff === 0) return 'Hoje'
    if (diff === 1) return 'Amanhã'
    return `${DIAS_SEM[d.getDay()]}, ${dd}`
  }
  const total = contas.reduce((t, c) => t + c.valor, 0)
  const atrasadas = contas.filter(c => c.atrasada).length

  return (
    <div style={{
      background: COR.branco, borderRadius: 12, padding: isMobile ? '14px 14px' : '16px 20px',
      border: `.5px solid ${COR.borda}`, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>{titulo}</div>
          {atrasadas > 0 && (
            <div style={{ fontSize: 12, color: COR.erroTexto, fontWeight: 600, marginTop: 2 }}>
              {atrasadas === 1 ? '1 conta vencida e não marcada como paga' : `${atrasadas} contas vencidas e não marcadas como pagas`}
            </div>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: COR.texto, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {fmt(total)}
        </div>
      </div>
      {contas.map((c, i) => {
        const icone = c.fatura ? '💳' : iconeCategoria(categorias, c.nome).icone
        return (
          <div key={`${c.id}-${c.ano}-${c.mes}`} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            borderTop: i === 0 ? 'none' : '1px solid #f1f5f9',
          }}>
            <span style={{
              minWidth: 78, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              color: c.atrasada ? COR.erroTexto : COR.textoSuave,
            }}>{quando(c)}</span>
            <span aria-hidden style={{ fontSize: 15 }}>{icone}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: COR.texto,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.fatura ? `Fatura ${c.nome}` : c.descricao ? `${c.nome} · ${c.descricao}` : c.nome}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              color: c.atrasada ? COR.erroTexto : COR.texto }}>{fmt(c.valor)}</span>
          </div>
        )
      })}
      <button onClick={onAbrir} style={{
        marginTop: 8, border: 'none', background: 'transparent', color: COR.azul, padding: 0,
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>{acao}</button>
    </div>
  )
}
