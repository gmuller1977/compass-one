import type { Categoria, TipoCategoria } from '../context/AppContext'
import { CATEGORIAS_PADRAO, GRUPOS_PADRAO } from '../data/categoriasPadrao'
import { buscarCategoria } from './categoriaIcone'

/**
 * Criar categoria a partir do próprio lançamento.
 *
 * Uma categoria tem doze campos e o usuário digita UM. Todos os outros já
 * estão na tela em que ele está: o tipo é entrada ou saída do formulário, o
 * movimento é banco ou dinheiro conforme a aba, a conta é a que ele está
 * lançando. Pedir ícone, cor, grupo e forma de pagamento na hora é cobrar a
 * conclusão antes da observação — e cada campo a mais é uma chance de
 * abandonar o registro, que é a ÚNICA tarefa da fase de descoberta.
 *
 * `fixa` sai sempre falso. Não se sabe se algo se repete todo mês a partir de
 * um gasto só; essa pergunta pertence ao fechamento do mês, quando ele já viu
 * o gasto acontecer.
 *
 * Ícone, cor e grupo saem do casamento com `CATEGORIAS_PADRAO` — "mercado"
 * traz 🛒 e "Alimentação". Sem casamento, o neutro: a categoria nasce em
 * "Outros" e ele reclassifica depois se quiser.
 */

export type Recusa = { erro: string }

/** O contexto que o formulário já tem e não precisa ser perguntado. */
export type Contexto = {
  tipo: TipoCategoria
  /** A aba do dinheiro cria categoria de dinheiro; o extrato, de banco. */
  isDinheiro: boolean
  /** A conta em que ele está lançando. Ignorada no dinheiro. */
  contaId?: string
  categorias: Categoria[]
  /**
   * Grupo escolhido na caixa. Vence a sugestão — o campo nasce preenchido
   * com ela, então quando os dois diferem é porque o usuário trocou de
   * propósito. Vazio ou ausente, vale a sugestão.
   */
  grupo?: string
}

/**
 * Os grupos que a caixa oferece: os padrão mais os que o usuário já criou.
 * Sem isso, quem inventou "Filhos" em Configurações não o encontraria aqui e
 * criaria um segundo grupo com o mesmo propósito.
 */
export function gruposDisponiveis(categorias: Categoria[]): string[] {
  const todos = new Set<string>(GRUPOS_PADRAO)
  for (const c of categorias) if (c.grupo?.trim()) todos.add(c.grupo.trim())
  return [...todos].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

const normalizar = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function novoId() {
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * A sugestão padrão de mesmo nome, se existir. É daqui que vêm ícone, cor e
 * grupo — e só do MESMO tipo: "salário" de entrada não empresta nada para uma
 * despesa homônima.
 */
function sugestaoDe(nome: string, tipo: TipoCategoria) {
  const alvo = normalizar(nome)
  return CATEGORIAS_PADRAO.find(c => c.tipo === tipo && normalizar(c.nome) === alvo)
}

export function montarCategoria(nomeCru: string, ctx: Contexto): Categoria | Recusa {
  const nome = nomeCru.trim().replace(/\s+/g, ' ')
  if (!nome) return { erro: 'Dê um nome à categoria.' }
  if (nome.length > 40) return { erro: 'Nome muito longo — até 40 caracteres.' }

  // buscarCategoria já normaliza acento e caixa, então "mercado" encontra
  // "Mercado". Sinônimo ele não pega: "supermercado" nasce como categoria
  // nova, e juntar as duas é assunto do fechamento do mês.
  const existente = buscarCategoria(ctx.categorias, nome)
  if (existente) {
    return existente.tipo === ctx.tipo
      ? { erro: `"${existente.nome}" já existe. É só escolher na lista.` }
      : { erro: `Já existe "${existente.nome}" como ${existente.tipo === 'entrada' ? 'receita' : 'despesa'}.` }
  }

  const sug = sugestaoDe(nome, ctx.tipo)

  return {
    id: novoId(),
    nome: sug?.nome ?? nome,
    tipo: ctx.tipo,
    fixa: false,
    ativa: true,
    tipoMovimento: ctx.isDinheiro ? 'dinheiro' : 'banco',
    contaDebitoId: ctx.isDinheiro ? undefined : ctx.contaId,
    icone: sug?.icone ?? '📁',
    cor: sug?.cor ?? '#6b7280',
    grupo: ctx.grupo?.trim() || sug?.grupo || 'Outros',
  }
}

/** O que a caixa mostra antes de confirmar: como a categoria vai nascer. */
export function previaDe(nomeCru: string, tipo: TipoCategoria) {
  const sug = sugestaoDe(nomeCru, tipo)
  return {
    icone: sug?.icone ?? '📁',
    grupo: sug?.grupo ?? 'Outros',
    reconhecida: !!sug,
  }
}
