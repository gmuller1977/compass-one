/**
 * Ajuda de cada tela — o que o botão "?" do cabeçalho mostra e o que o Norte
 * sabe sobre como usar o app (11/10/2026).
 *
 * Antes eram 12 janelas de tutorial que cobriam a tela na primeira visita, e
 * voltavam a cada visita se a pessoa não marcasse "não mostrar novamente" — o
 * "visto" ficava só no navegador, então noutro computador abriam todas de novo.
 * Pedido do Guilherme: "muitos não irão ler as explicações". Hoje nada abre
 * sozinho; a explicação fica a um toque, e o Norte responde a dúvida.
 *
 * Uma fonte só para as duas: o guia que vai no prompt do Norte é montado
 * daqui (`guiaDoAppParaNorte`), para a dica da tela e a resposta do Norte não
 * discordarem.
 */

export type TelaAjuda =
  | 'inicio' | 'lancamentos' | 'planejamento' | 'radar'
  | 'configuracoes' | 'simulador' | 'revisao'

export type Ajuda = {
  titulo: string
  /** Uma frase: para que serve a tela. */
  resumo: string
  /** Até 4 dicas curtas, uma linha cada. */
  dicas: string[]
  /** Perguntas prontas para o Norte. */
  perguntas: string[]
}

export const AJUDA: Record<TelaAjuda, Ajuda> = {
  inicio: {
    titulo: 'Início',
    resumo: 'Mostra com quanto o mês termina e o que pede a sua atenção agora.',
    dicas: [
      'No topo, o saldo previsto para o fim do mês e quanto ainda dá para gastar nas despesas variáveis.',
      '"Como cheguei nesse número" abre a conta linha a linha.',
      'Os avisos só aparecem quando há algo a fazer: conta vencendo, grupo que passou do plano, mês negativo à frente.',
      'O detalhe mês a mês e por categoria fica em Análises.',
    ],
    perguntas: ['O que significa "ainda dá para gastar"?', 'Como o app calcula o saldo previsto?'],
  },
  lancamentos: {
    titulo: 'Lançamentos',
    resumo: 'Onde se registra o que entra e o que sai: banco, cartão e dinheiro, cada um na sua aba.',
    dicas: [
      'Banco: cada dia do mês é uma linha; toque no "+" do dia para lançar. As contas fixas do plano aparecem para marcar como pagas.',
      'Cartão: cada compra entra na fatura. Parcelada, as parcelas vão sozinhas para os meses seguintes.',
      'Dinheiro: os gastos em espécie, que não passam pelo banco.',
      'A caixa de conciliação compara o saldo do app com o do banco; se diferir, falta lançar algo.',
    ],
    perguntas: ['Como lanço uma compra parcelada no cartão?', 'Como marco uma conta fixa como paga?'],
  },
  planejamento: {
    titulo: 'Planejamento',
    resumo: 'O plano do ano: quanto você espera receber e gastar em cada categoria, mês a mês.',
    dicas: [
      'Clique num mês para editar os valores; ao digitar, o valor se repete até dezembro nas categorias anuais.',
      'A célula aceita conta ("800+300") e itens (Mercado = Supermercado + Feira).',
      '"Planejamento do Zero", no menu, monta o ano inteiro em poucos passos.',
      'Sem saber os números? Registre um mês; quando ele fechar, o app propõe o plano a partir do que aconteceu.',
    ],
    perguntas: ['Como monto meu primeiro plano?', 'Como ajusto o plano de uma categoria?'],
  },
  radar: {
    titulo: 'Radar financeiro',
    resumo: 'Compara, no mês, o que você planejou com o que realmente aconteceu.',
    dicas: [
      'Verde é dentro do plano (o verde-claro está no limite); vermelho passou do planejado.',
      'Cada grupo abre e mostra as categorias, com quanto resta ou quanto passou.',
      'Errou o plano de uma categoria? Abra ela e use "ajustar plano"; vale do mês seguinte em diante.',
      'Passou do plano? "Anotar motivo" guarda o porquê na hora; a Revisão mensal abre com ele.',
      'A barra no pé mostra o saldo final previsto e abre a conta dele.',
    ],
    perguntas: ['O que significam as cores do Radar?', 'Como ajusto o plano pelo Radar?'],
  },
  configuracoes: {
    titulo: 'Configurações',
    resumo: 'O cadastro do app: bancos, cartões, categorias, perfil e preferências.',
    dicas: [
      'Bancos e cartões: o cartão precisa do dia de vencimento e do fechamento para a fatura cair no mês certo.',
      'Categorias: fixa (aluguel, internet) tem dia e valor; variável (mercado, lazer) muda todo mês.',
      'Categoria com variantes (Seguro · Civic, Seguro · March) vira uma linha para cada.',
      'Preferências: o cenário da previsão — pessimista, moderado ou otimista.',
    ],
    perguntas: ['Qual a diferença entre categoria fixa e variável?', 'Como cadastro um cartão?'],
  },
  simulador: {
    titulo: 'Simulador',
    resumo: 'Responde se uma compra, uma dívida ou uma meta cabe no seu plano até o fim dele.',
    dicas: [
      '"Posso comprar?": digite as formas de pagamento que o vendedor ofereceu; o app compara e recomenda a mais barata que cabe.',
      '"Vou comprar" inclui as parcelas no planejamento, numa categoria que você escolhe.',
    ],
    perguntas: ['Como uso o "Posso comprar?"', 'Como incluo uma compra no planejamento?'],
  },
  revisao: {
    titulo: 'Revisão mensal',
    resumo: 'Fecha o mês que passou: o porquê de cada categoria que passou do plano, e como os meses se comportaram contra ele.',
    dicas: [
      'Os motivos anotados durante o mês já vêm preenchidos.',
      '"Mês a mês" e "Por categoria" mostram previsto × realizado ao longo dos meses.',
      'A precisão do plano diz em média quanto o plano erra, e onde.',
    ],
    perguntas: ['Como leio a precisão do plano?'],
  },
}

/**
 * O guia que vai no prompt do Norte. Montado da mesma tabela do "?", mais o
 * caminho de quem está começando.
 */
export function guiaDoAppParaNorte(): string {
  const telas = (Object.values(AJUDA) as Ajuda[])
    .map(a => `- ${a.titulo}: ${a.resumo} ${a.dicas.join(' ')}`)
    .join('\n')
  return `Para começar: cadastrar contas, cartões e categorias (Configurações), montar o plano (Planejamento → "Planejamento do Zero") ou, sem saber os números, registrar um mês para o app propor o plano. No dia a dia: lançar pelo "+" (no celular) ou em Lançamentos, e acompanhar pelo Radar.
No celular a barra de baixo tem Início, Radar, "+" (lançar), Norte e Mais.
${telas}`
}
