import { useMemo, type Dispatch, type SetStateAction } from 'react'
import type { Categoria, PlanoAnoData } from '../../context/AppContext'
import AjustePlanoDialog, { type SugestaoAjuste } from './AjustePlanoDialog'
import type { PedidoAjuste } from './ajustePlanoContexto'
import PlanItensEditor from '../planejamento/PlanItensEditor'
import { cadastroDaLinha } from './evolucaoCalcs'
import { acharLinhaDoPlano, mudarLinhaDoPlano } from '../../utils/linhaDoPlano'
import { comItens, comValor, itensDoMes, type ItemPlano } from '../../utils/itensPlano'
import { mesAlvoDoAjuste, mediaDaCategoria } from '../../utils/ajustePlano'
import { comparativoMensal } from '../../utils/comparativoMensal'
import type { Deps } from '../../utils/saldoConta'

export type AjusteAberto = PedidoAjuste & { modo?: 'valor' | 'itens'; partes?: number[] }

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/**
 * O ajuste do plano aberto a partir do Radar. Muda os PRÓXIMOS meses, nunca o
 * corrente (utils/ajustePlano.mesAlvoDoAjuste); o mês que está na tela é só
 * a referência. Acha a linha CRU do plano do ano-alvo por utils/linhaDoPlano
 * e grava por comValor / comItens, as funções do Planejamento. Categoria com
 * itens no mês-alvo abre direto o editor de itens.
 *
 * A média vem de comparativoMensal — as mesmas linhas da Início —, calculada
 * só quando a janela abre.
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

  const sugestoes = useMemo<SugestaoAjuste[]>(() => {
    const out: SugestaoAjuste[] = []
    const m = mediaDaCategoria(comparativoMensal(deps, planos), ajuste.tipo, ajuste.nome, ajuste.descricao)
    if (m && m.media > 0.005) out.push({ rotulo: m.meses === 1 ? 'Último mês fechado' : `Média dos últimos ${m.meses} meses`, valor: m.media })
    if (ajuste.real > 0.005) {
      const hoje = new Date()
      const corrente = ano === hoje.getFullYear() && mes === hoje.getMonth()
      out.push({ rotulo: corrente ? `${MESES[mes]} até agora` : `Em ${MESES[mes].toLowerCase()}`, valor: ajuste.real })
    }
    return out
    // Uma vez, ao abrir: a média são seis meses de realizado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fechar = () => setAjuste(null)
  const gravar = (fn: Parameters<typeof mudarLinhaDoPlano>[3]) => {
    setPlanos(prev => {
      const novo = mudarLinhaDoPlano(prev[alvo.ano], ajuste.tipo, cat, fn)
      return novo ? { ...prev, [alvo.ano]: novo } : prev
    })
    fechar()
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
      mesAlvo={alvo.mes} anoAlvo={alvo.ano} prevAlvo={linha?.v[alvo.mes] ?? 0}
      sugestoes={sugestoes} aviso={aviso}
      onSalvar={(valor, meses) => gravar(l => meses.reduce((acc, m) => comValor(acc, m, valor), l))}
      onDetalhar={partes => setAjuste({ ...ajuste, modo: 'itens', partes })}
      onFechar={fechar} />
  )
}
