import { useMemo, type Dispatch, type SetStateAction } from 'react'
import type { Categoria, PlanoAnoData } from '../../context/AppContext'
import AjustePlanoDialog, { type SugestaoAjuste, type MesDoAjuste } from './AjustePlanoDialog'
import type { PedidoAjuste } from './ajustePlanoContexto'
import PlanItensEditor from '../planejamento/PlanItensEditor'
import { cadastroDaLinha } from './evolucaoCalcs'
import { acharLinhaDoPlano, mudarLinhaDoPlano } from '../../utils/linhaDoPlano'
import { comItens, comValor, itensDoMes, novoIdItem, type ItemPlano } from '../../utils/itensPlano'
import { mesAlvoDoAjuste } from '../../utils/ajustePlano'
import { mediaSemParcelas, jaLancadoNosMeses } from '../../utils/historicoDaCategoria'
import type { Deps } from '../../utils/saldoConta'

export type AjusteAberto = PedidoAjuste & { modo?: 'valor' | 'itens'; partes?: number[] }

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/**
 * O ajuste do plano aberto a partir do Radar. Muda os PRÓXIMOS meses, nunca o
 * corrente (utils/ajustePlano.mesAlvoDoAjuste); o mês na tela é a referência.
 * Acha a linha CRU do plano do ano-alvo por utils/linhaDoPlano e grava por
 * comValor / comItens, as funções do Planejamento.
 *
 * As sugestões vêm de utils/historicoDaCategoria — a média SEM parcelas e o
 * que já está lançado em cada mês —, calculadas uma vez, ao abrir. "Média + já
 * lançado, mês a mês" grava cada mês com o seu valor, e nos meses com algo
 * lançado o plano fica em itens: "Gasto normal" e cada parcela, para o
 * Planejamento mostrar de onde veio o número.
 */
export default function AjustePlanoRadar({
  ajuste, setAjuste, planos, setPlanos, ano, mes, categorias, deps,
}: {
  ajuste: AjusteAberto
  setAjuste: (a: AjusteAberto | null) => void
  planos: Record<number, PlanoAnoData>
  setPlanos: Dispatch<SetStateAction<Record<number, PlanoAnoData>>>
  ano: number
  mes: number
  categorias: Categoria[]
  deps: Deps
}) {
  const cad = cadastroDaLinha({ nome: ajuste.nome, descricao: ajuste.descricao ?? '' }, categorias)
  const cat = {
    id: cad?.id, nome: ajuste.nome, descricao: ajuste.descricao || cad?.descricao,
    grupo: cad?.grupo, tipoMovimento: cad?.tipoMovimento,
  }
  const alvo = mesAlvoDoAjuste(ano, mes)
  const plano = planos[alvo.ano]
  const lista = (ajuste.tipo === 'entrada' ? plano?.entradas : plano?.saidas) ?? []
  const idx = acharLinhaDoPlano(lista, cat)
  const linha = typeof idx === 'number' ? lista[idx] : undefined
  const itens = linha ? itensDoMes(linha, alvo.mes) : null
  const nomeExib = cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome

  // Uma vez, ao abrir: são alguns meses de realizado, para trás e para a frente.
  const { base, lancado } = useMemo(() => {
    const m = mediaSemParcelas(deps, ajuste.tipo, ajuste.nome, ajuste.descricao)
    const base: SugestaoAjuste | null = m && m.media > 0.005 ? {
      rotulo: m.tinhaParcelas ? 'Média sem parcelas' : m.meses === 1 ? 'Último mês fechado' : `Média dos últimos ${m.meses} meses`,
      valor: m.media,
    } : null
    const meses = Array.from({ length: 12 - alvo.mes }, (_, i) => ({ ano: alvo.ano, mes: alvo.mes + i }))
    return { base, lancado: jaLancadoNosMeses(deps, ajuste.tipo, ajuste.nome, ajuste.descricao, meses) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mesesDoAjuste: MesDoAjuste[] = lancado.map(l => ({
    mes: l.mes, planoAtual: linha?.v[l.mes] ?? 0, jaLancado: l.total, itens: l.itens,
  }))
  const sugestoes: SugestaoAjuste[] = []
  if (base) sugestoes.push(base)
  if (ajuste.real > 0.005) {
    const hoje = new Date()
    const corrente = ano === hoje.getFullYear() && mes === hoje.getMonth()
    sugestoes.push({ rotulo: corrente ? `${MESES[mes]} até agora` : `Em ${MESES[mes].toLowerCase()}`, valor: ajuste.real })
  }

  const fechar = () => setAjuste(null)
  const gravar = (fn: Parameters<typeof mudarLinhaDoPlano>[3]) => {
    setPlanos(prev => {
      const novo = mudarLinhaDoPlano(prev[alvo.ano], ajuste.tipo, cat, fn)
      return novo ? { ...prev, [alvo.ano]: novo } : prev
    })
    fechar()
  }

  /** Base + já lançado de cada mês; com algo lançado, em itens. */
  function porMes(baseValor: number, meses: number[]) {
    gravar(l => meses.reduce((acc, m) => {
      const jl = lancado.find(x => x.mes === m)
      if (!jl || jl.itens.length === 0) return comValor(acc, m, baseValor)
      const doMes: ItemPlano[] = jl.itens.map(i => ({
        id: novoIdItem(), valor: i.valor,
        descricao: i.parcela ? `${i.descricao} · ${i.parcela.atual} de ${i.parcela.total}` : i.descricao,
      }))
      const todos = baseValor > 0.005 ? [{ id: novoIdItem(), descricao: 'Gasto normal', valor: baseValor }, ...doMes] : doMes
      return comItens(acc, [m], todos)
    }, l))
  }

  if (plano && (ajuste.modo === 'itens' || (itens && ajuste.modo !== 'valor'))) {
    return (
      <PlanItensEditor nome={nomeExib} grupo={cat.grupo} mes={alvo.mes} valorAtual={linha?.v[alvo.mes] ?? 0}
        itens={itens} partes={ajuste.partes}
        onSalvar={(novos: ItemPlano[], meses: number[]) => gravar(l => comItens(l, meses, novos))}
        onTirar={itens ? () => gravar(l => comItens(l, [alvo.mes], null)) : undefined}
        onFechar={fechar} />
    )
  }
  const aviso = !plano
    ? `Ainda não há plano para ${alvo.ano}. Monte o plano do ano no Planejamento para ajustar daqui.`
    : idx === 'ambigua'
      ? `O plano de ${alvo.ano} tem duas linhas “${cat.nome}” sem variante (plano antigo). Ajuste pelo Planejamento, onde as duas aparecem separadas.`
      : undefined
  return (
    <AjustePlanoDialog nome={nomeExib} isEntrada={ajuste.tipo === 'entrada'}
      mesVisto={mes} prevVisto={ajuste.prev} realVisto={ajuste.real}
      anoAlvo={alvo.ano} meses={mesesDoAjuste} base={base} sugestoes={sugestoes} aviso={aviso}
      onSalvar={(valor, meses) => gravar(l => meses.reduce((acc, m) => comValor(acc, m, valor), l))}
      onSalvarPorMes={porMes}
      onDetalhar={partes => setAjuste({ ...ajuste, modo: 'itens', partes })}
      onFechar={fechar} />
  )
}
