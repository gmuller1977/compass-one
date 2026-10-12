import type { Categoria } from '../context/AppContext'
import { COR } from '../utils/cores'
import { iconeCategoria } from '../utils/categoriaIcone'
import type { ContaAVencer } from '../utils/contasAVencer'
import { Cartao, Etiqueta, Linha, TituloCartao, Valor } from './mobile/ui'
import { M, mostrar } from './mobile/estilo'

const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * As contas a vencer da tela Início (a semana, ou o mês futuro inteiro). A
 * lista vem pronta de utils/contasAVencer — aqui é só desenho, no kit do
 * celular: ícone da categoria em círculo, nome e quando, valor à direita.
 * Com `saldoHoje`, a etiqueta diz se o saldo de hoje cobre o total, como as
 * "Contas da semana" do celular. Atrasada em COR.erroTexto (6,5:1 no branco).
 */
export default function ContasAVencerCard({
  contas, categorias, onAbrir, hoje = new Date(), oculto = false, saldoHoje,
  titulo = 'Contas dos próximos 7 dias', acao = 'Ver em Lançamentos ›',
}: {
  contas: ContaAVencer[]
  categorias: Categoria[]
  onAbrir: () => void
  hoje?: Date
  oculto?: boolean
  saldoHoje?: number
  titulo?: string
  acao?: string
}) {
  const hoje0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const quando = (c: ContaAVencer) => {
    const d = new Date(c.ano, c.mes, c.dia)
    const dd = `${String(c.dia).padStart(2, '0')}/${String(c.mes + 1).padStart(2, '0')}`
    if (c.atrasada) return `Venceu ${dd}`
    const diff = Math.round((d.getTime() - hoje0.getTime()) / 86_400_000)
    if (diff === 0) return 'Vence hoje'
    if (diff === 1) return 'Vence amanhã'
    return `${DIAS_SEM[d.getDay()]}, ${dd}`
  }
  const total = contas.reduce((t, c) => t + c.valor, 0)
  const falta = saldoHoje != null ? total - saldoHoje : 0

  return (
    <Cartao>
      <TituloCartao direita={contas.length === 0 ? null : saldoHoje == null
        ? <Valor>{mostrar(total, oculto)}</Valor>
        : falta > 0
          ? <Etiqueta cor={COR.erroTexto} fundo={COR.erroFundo}>faltam {mostrar(falta, oculto)}</Etiqueta>
          : <Etiqueta cor={COR.sucessoTexto} fundo={COR.sucessoFundo}>✓ saldo cobre</Etiqueta>}>
        {titulo}
      </TituloCartao>
      {contas.length === 0 && (
        <div style={{ fontSize: M.corpo, color: COR.textoSuave }}>Nenhuma conta vencendo nos próximos 7 dias.</div>
      )}
      {contas.map((c, i) => {
        const ic = c.fatura ? { icone: '💳', cor: COR.azul } : iconeCategoria(categorias, c.nome)
        return (
          <Linha key={`${c.id}-${c.ano}-${c.mes}`} primeira={i === 0} icone={ic.icone} cor={ic.cor}
            titulo={c.fatura ? `Fatura ${c.nome}` : c.descricao ? `${c.nome} · ${c.descricao}` : c.nome}
            legenda={<span style={{ color: c.atrasada ? COR.erroTexto : undefined, fontWeight: c.atrasada ? 700 : undefined }}>{quando(c)}</span>}
            direita={<Valor cor={c.atrasada ? COR.erroTexto : COR.texto}>{mostrar(c.valor, oculto)}</Valor>} />
        )
      })}
      {contas.length > 0 && (
        <button onClick={onAbrir} style={{
          display: 'block', width: '100%', marginTop: 8, padding: '14px 0 0', border: 'none', borderTop: '1px solid #eef2f8',
          background: 'none', color: COR.azul, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
        }}>{acao}</button>
      )}
    </Cartao>
  )
}
