import type { Dispatch, SetStateAction } from 'react'
import type { Categoria, PlanoAnoData } from '../../context/AppContext'
import AjustePlanoDialog from './AjustePlanoDialog'
import type { PedidoAjuste } from './ajustePlanoContexto'
import PlanItensEditor from '../planejamento/PlanItensEditor'
import { cadastroDaLinha } from './evolucaoCalcs'
import { acharLinhaDoPlano, mudarLinhaDoPlano } from '../../utils/linhaDoPlano'
import { comItens, comValor, itensDoMes, type ItemPlano } from '../../utils/itensPlano'

export type AjusteAberto = PedidoAjuste & { modo?: 'valor' | 'itens'; partes?: number[] }

/**
 * O ajuste do plano aberto a partir do Radar: acha a linha CRU do plano —
 * id do cadastro, depois o par (nome, variante), e o nome só se for único
 * (utils/linhaDoPlano) — e grava por comValor / comItens, as funções do
 * Planejamento. Categoria com itens no mês abre direto o editor de itens.
 */
export default function AjustePlanoRadar({
  ajuste, setAjuste, planos, setPlanos, ano, mes, categorias,
}: {
  ajuste: AjusteAberto
  setAjuste: (a: AjusteAberto | null) => void
  planos: Record<number, PlanoAnoData>
  setPlanos: Dispatch<SetStateAction<Record<number, PlanoAnoData>>>
  ano: number
  mes: number
  categorias: Categoria[]
}) {
  const cad = cadastroDaLinha({ nome: ajuste.nome, descricao: ajuste.descricao ?? '' }, categorias)
  const cat = {
    id: cad?.id, nome: ajuste.nome, descricao: ajuste.descricao || cad?.descricao,
    grupo: cad?.grupo, tipoMovimento: cad?.tipoMovimento,
  }
  const plano = planos[ano]
  const lista = (ajuste.tipo === 'entrada' ? plano?.entradas : plano?.saidas) ?? []
  const idx = acharLinhaDoPlano(lista, cat)
  const linha = typeof idx === 'number' ? lista[idx] : undefined
  const itens = linha ? itensDoMes(linha, mes) : null
  const nomeExib = cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome
  const fechar = () => setAjuste(null)
  const gravar = (fn: Parameters<typeof mudarLinhaDoPlano>[3]) => {
    setPlanos(prev => {
      const novo = mudarLinhaDoPlano(prev[ano], ajuste.tipo, cat, fn)
      return novo ? { ...prev, [ano]: novo } : prev
    })
    fechar()
  }

  if (ajuste.modo === 'itens' || (itens && ajuste.modo !== 'valor')) {
    return (
      <PlanItensEditor nome={nomeExib} grupo={cat.grupo} mes={mes} valorAtual={linha?.v[mes] ?? 0}
        itens={itens} partes={ajuste.partes}
        onSalvar={(novos: ItemPlano[], meses: number[]) => gravar(l => comItens(l, meses, novos))}
        onTirar={itens ? () => gravar(l => comItens(l, [mes], null)) : undefined}
        onFechar={fechar} />
    )
  }
  return (
    <AjustePlanoDialog nome={nomeExib} mes={mes} prev={ajuste.prev} real={ajuste.real}
      isEntrada={ajuste.tipo === 'entrada'}
      aviso={idx === 'ambigua'
        ? `O plano de ${ano} tem duas linhas “${cat.nome}” sem variante (plano antigo). Ajuste pelo Planejamento, onde as duas aparecem separadas.`
        : undefined}
      onSalvar={(valor, meses) => gravar(l => meses.reduce((acc, m) => comValor(acc, m, valor), l))}
      onDetalhar={partes => setAjuste({ ...ajuste, modo: 'itens', partes })}
      onFechar={fechar} />
  )
}
