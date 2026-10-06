import { useMemo, type Dispatch, type SetStateAction } from 'react'
import type { Categoria, PlanoAnoData } from '../../context/AppContext'
import AjustePlanoDialog, { type SugestaoAjuste, type MesDoAjuste, type MesRef } from './AjustePlanoDialog'
import type { PedidoAjuste } from './ajustePlanoContexto'
import PlanItensEditor from '../planejamento/PlanItensEditor'
import { cadastroDaLinha } from './evolucaoCalcs'
import { acharLinhaDoPlano, mudarLinhaDoPlano } from '../../utils/linhaDoPlano'
import { comItens, comValor, itensDoMes, novoIdItem, type ItemPlano } from '../../utils/itensPlano'
import { mesAlvoDoAjuste, valorMesAMes } from '../../utils/ajustePlano'
import { mediaSemParcelas, jaLancadoNosMeses } from '../../utils/historicoDaCategoria'
import type { Deps } from '../../utils/saldoConta'
import { fimDoPlanejamento } from '../../utils/simulacaoCompra'
import type { PlanoCat } from '../../context/AppContext'

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

  // A linha da categoria no plano de CADA ano — o ajuste atravessa a virada.
  const linhaNoAno = (a: number): PlanoCat | undefined => {
    const l = (ajuste.tipo === 'entrada' ? planos[a]?.entradas : planos[a]?.saidas) ?? []
    const i = acharLinhaDoPlano(l, cat)
    return typeof i === 'number' ? l[i] : undefined
  }

  // Uma vez, ao abrir: alguns meses de realizado, para trás e para a frente.
  // Para a frente vai até o FIM DO PLANO (o horizonte do alerta e do
  // Simulador) e olha mais 12 meses além dele, só para mostrar parcela que cai
  // em ano ainda sem plano.
  const { base, lancado, ymFim } = useMemo(() => {
    const m = mediaSemParcelas(deps, ajuste.tipo, ajuste.nome, ajuste.descricao)
    const base: SugestaoAjuste | null = m && m.media > 0.005 ? {
      rotulo: m.tinhaParcelas ? 'Média sem parcelas' : m.meses === 1 ? 'Último mês fechado' : `Média dos últimos ${m.meses} meses`,
      valor: m.media,
    } : null
    const ymAlvo = alvo.ano * 12 + alvo.mes
    const fim = fimDoPlanejamento(planos)
    const ymFim = Math.max(ymAlvo, fim ? fim.ano * 12 + fim.mes : ymAlvo)
    const meses = Array.from({ length: ymFim - ymAlvo + 13 }, (_, i) => ({ ano: Math.floor((ymAlvo + i) / 12), mes: (ymAlvo + i) % 12 }))
    return { base, ymFim, lancado: jaLancadoNosMeses(deps, ajuste.tipo, ajuste.nome, ajuste.descricao, meses) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Editável: até o fim do plano, em ano que tem plano. Depois disso — ou em ano
  // sem plano —, só o mês com algo já lançado, como aviso.
  const mesesDoAjuste: MesDoAjuste[] = lancado
    .map(l => {
      const semPlano = l.ano * 12 + l.mes > ymFim || !planos[l.ano]
      return { ano: l.ano, mes: l.mes, planoAtual: linhaNoAno(l.ano)?.v[l.mes] ?? 0, jaLancado: l.total, itens: l.itens, semPlano }
    })
    .filter(m => !m.semPlano || m.jaLancado > 0.005)
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

  /** Grava meses de um ou mais anos: cada ano no plano dele (mudarLinhaDoPlano). */
  const gravarMeses = (meses: MesRef[], fn: (l: PlanoCat, m: MesRef) => PlanoCat) => {
    setPlanos(prev => {
      const novo = { ...prev }
      for (const a of [...new Set(meses.map(m => m.ano))]) {
        const doAno = meses.filter(m => m.ano === a)
        const r = mudarLinhaDoPlano(novo[a], ajuste.tipo, cat, l => doAno.reduce((acc, m) => fn(acc, m), l))
        if (r) novo[a] = r
      }
      return novo
    })
    fechar()
  }

  /**
   * Mês a mês (valorMesAMes). Com algo lançado e o plano subindo, em itens:
   * "Gasto normal" (a média, quando há) e cada parcela. Sem nada a mudar, o
   * mês fica como está.
   */
  function porMes(meses: MesRef[]) {
    const baseValor = base ? base.valor : null
    gravarMeses(meses, (acc, { ano: a, mes: m }) => {
      const jl = lancado.find(x => x.ano === a && x.mes === m)
      const atual = acc.v[m] ?? 0
      const novo = valorMesAMes(baseValor, atual, jl?.total ?? 0)
      if (Math.abs(novo - atual) < 0.005) return acc
      if (!jl || jl.itens.length === 0 || (baseValor === null && novo > jl.total + 0.005)) return comValor(acc, m, novo)
      const doMes: ItemPlano[] = jl.itens.map(i => ({
        id: novoIdItem(), valor: i.valor,
        descricao: i.parcela ? `${i.descricao} · ${i.parcela.atual} de ${i.parcela.total}` : i.descricao,
      }))
      const todos = baseValor !== null && baseValor > 0.005 ? [{ id: novoIdItem(), descricao: 'Gasto normal', valor: baseValor }, ...doMes] : doMes
      return comItens(acc, [m], todos)
    })
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
      meses={mesesDoAjuste} base={base} sugestoes={sugestoes} aviso={aviso}
      onSalvar={(valor, meses) => gravarMeses(meses, (acc, m) => comValor(acc, m.mes, valor))}
      onSalvarPorMes={porMes}
      onDetalhar={partes => setAjuste({ ...ajuste, modo: 'itens', partes })}
      onFechar={fechar} />
  )
}
