/**
 * A frase do topo da Início: uma mensagem curta, SEM NÚMEROS, que diz como o
 * mês vai terminar. Pedido do Guilherme em 13/10/2026: "são muitos números na
 * mesma tela [...] vamos tirar a meta [...] apenas uma mensagem considerando
 * o saldo final previsto, algo simples motivador ou de alerta". Substitui a
 * frase da meta (metaDoMes), que durou meio dia.
 *
 * Nenhuma conta nova: abertura e fechamento são os dois números da memória
 * de cálculo (mês corrente e fechado) ou de `previsaoDoMes` (mês futuro).
 *
 * - vermelho: o saldo final previsto é negativo;
 * - cuidado: termina com menos do que começou (gasta mais do que ganha);
 * - bem: termina com o mesmo ou mais.
 * Meio centavo de folga, para resíduo de ponto flutuante não virar alerta.
 */
export type EstadoMensagem = 'bem' | 'cuidado' | 'vermelho'

export function estadoDoMes(abertura: number, fechamento: number): EstadoMensagem {
  if (fechamento < -0.005) return 'vermelho'
  if (fechamento < abertura - 0.005) return 'cuidado'
  return 'bem'
}

const FRASES: Record<EstadoMensagem, Record<'corrente' | 'fechado' | 'futuro', string>> = {
  bem: {
    corrente: 'Muito bem! Você vai terminar o mês com mais dinheiro do que começou.',
    fechado: 'Muito bem! Você terminou o mês com mais dinheiro do que começou.',
    futuro: 'Bom caminho: o mês deve terminar com mais dinheiro do que começa.',
  },
  cuidado: {
    corrente: 'Cuidado: este mês você está gastando mais do que ganha.',
    fechado: 'Neste mês você gastou mais do que ganhou.',
    futuro: 'Atenção: neste mês você deve gastar mais do que ganha.',
  },
  vermelho: {
    corrente: 'Atenção: do jeito que está, o mês termina no vermelho. Vale segurar os gastos.',
    fechado: 'Este mês terminou no vermelho. Bora virar o jogo no próximo!',
    futuro: 'Atenção: este mês deve terminar no vermelho. Ainda dá tempo de ajustar o plano.',
  },
}

export function mensagemDoMes(estado: EstadoMensagem, quando: 'corrente' | 'fechado' | 'futuro'): string {
  return FRASES[estado][quando]
}

/** Ponto sobre o azul do topo (elemento gráfico, 3:1 no #1e40af). */
export const COR_MENSAGEM: Record<EstadoMensagem, string> = {
  bem: '#86efac',
  cuidado: '#fde047',
  vermelho: '#f87171',
}

/**
 * O mês da chegada (o plano só começa no seguinte): nada a julgar, só o
 * convite para anotar. Ponto azul-claro, neutro (5,2:1 no #1e40af).
 */
export function mensagemDaChegada(mesDoPlano: string, quando: 'corrente' | 'fechado'): string {
  return quando === 'corrente'
    ? `Este mês é para conhecer seus gastos. Anote o que puder: o seu plano começa em ${mesDoPlano}.`
    : `Este foi o mês de conhecer seus gastos. O seu plano começou em ${mesDoPlano}.`
}

export const COR_CHEGADA = '#93c5fd'

/**
 * O primeiro mês do plano costuma abrir apertado por um motivo que a pessoa
 * não escolheu agora: as faturas de cartão que ela informou no primeiro
 * acesso, compras feitas ANTES de chegar (análise da chegada v3, C7). Quando
 * esse valor pesa no mês, a frase diz isso, ainda sem números:
 * - sem essas compras o mês ficaria bem → a frase inteira explica;
 * - ficaria menos ruim → a frase de sempre ganha "Parte disso...".
 * Sem compras de antes, ou mês que já vai bem, é a frase de sempre.
 */
export function mensagemComComprasDeAntes(
  estado: EstadoMensagem, quando: 'corrente' | 'fechado' | 'futuro',
  abertura: number, fechamento: number, deAntes: number,
): string {
  const base = mensagemDoMes(estado, quando)
  if (estado === 'bem' || deAntes <= 0.005) return base
  const sem = estadoDoMes(abertura, fechamento + deAntes)
  if (sem === 'bem') {
    return {
      corrente: 'Este mês fica apertado só por causa das compras no cartão feitas antes de você chegar. Sem elas, o mês fecharia bem.',
      futuro: 'Este mês deve ficar apertado só por causa das compras no cartão feitas antes de você chegar. Sem elas, ele fecharia bem.',
      fechado: 'Este mês ficou apertado só por causa das compras no cartão feitas antes de você chegar. Sem elas, teria fechado bem.',
    }[quando]
  }
  return `${base} ${quando === 'fechado' ? 'Parte disso foram' : 'Parte disso são'} compras no cartão feitas antes de você chegar.`
}
