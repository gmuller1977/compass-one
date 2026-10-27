import { saldoInformado, saldoInformadoDaCarteira } from './saldoInformado'
import type { Conta, DadosMes } from '../context/AppContext'
import { detalharProjecaoDaConta, ehContaDisponivel, saldoFinalConta, saldoFinalDinheiro, type Deps } from './saldoConta'
import { ehAutomatica } from './debitoAutomatico'
import { contaDoPagamento } from './pagarConta'
import { diaEfetivoFixa, diaUtilOuProximo } from './diaDaFixa'
import { valorFixaNoMes } from './valorFixa'

/**
 * "Confira o saldo dos bancos", na Início (18/10/2026, pedido do Guilherme).
 *
 * O saldo do app só bate com o do banco enquanto tudo é lançado. Em vez de
 * esperar a pessoa lembrar da conciliação em Lançamentos, a Início pergunta,
 * conta por conta, se o número confere. Não há conta nova: o saldo mostrado
 * é o `saldoFinalConta` do mês corrente, o mesmo do Radar.
 *
 * A resposta grava no MESMO lugar que a caixa de saldo de Lançamentos:
 *   - "Confere" grava só a data (`saldoBancoData`), como a caixa faz quando
 *     se confirma sem digitar valor. Nenhum número muda.
 *   - Outro valor grava `saldoBanco` + data. Daí em diante vale a regra que
 *     já existe: o Radar mostra o informado e Lançamentos mostra a diferença.
 */

/**
 * Quando a conta pede conferência (19/10/2026, decisão do Guilherme sobre a
 * análise da chegada v3, C6: "opção B", só nos dias de movimento). Antes era
 * todo dia, e o cartão no topo da Início virava ruído a partir da segunda
 * semana. Agora pede quando, desde a última conferência (ou nunca), passou um
 * dia em que o dinheiro se mexe sozinho nessa conta: recebimento ou débito
 * automático (`ehAutomatica`) ou o vencimento de uma fatura que ela paga.
 * Quem pulou o dia do salário vê o pedido na próxima vez que abrir.
 *
 * E, pedido dele no mesmo dia, um aviso quando a conta fica muitos dias sem
 * conferir: "isso pode interferir nos resultados". A partir de
 * `DIAS_PARA_AVISAR` dias, a linha diz há quantos dias e oferece conferir.
 */
export const DIAS_PARA_AVISAR = 7


export const chaveDoMes = (contaId: string, ano: number, mes: number) =>
  `${contaId}-${ano}-${String(mes + 1).padStart(2, '0')}`

export const dataDeHoje = (hoje: Date) =>
  `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

/** A última data em que o saldo da conta foi conferido, em qualquer mês. */
export function ultimaConferencia(contaId: string, extratoData: Record<string, DadosMes>): string | null {
  const prefixo = contaId + '-'
  let ultima: string | null = null
  for (const [k, dm] of Object.entries(extratoData)) {
    if (!k.startsWith(prefixo)) continue
    const d = dm?.saldoBancoData
    if (d && (!ultima || d > ultima)) ultima = d
  }
  return ultima
}

function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

/**
 * Os dias do mês corrente, até hoje, em que o dinheiro se mexe sozinho nesta
 * conta: fixas automáticas (salário, débito automático) e o vencimento das
 * faturas que ela paga. Só com valor no plano e categoria ativa, como as
 * contas a vencer; o dia é o de Lançamentos (`diaEfetivoFixa`).
 */
export function diasDeMovimento(contaId: string, deps: Deps, hoje = new Date()): number[] {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const dias = new Set<number>()
  for (const cat of deps.categorias) {
    if (!cat.ativa || !ehAutomatica(cat)) continue
    if (contaDoPagamento(cat.id, ano, mes, deps.contas, deps.categorias, deps.extratoData) !== contaId) continue
    if (valorFixaNoMes(cat, deps.planos[ano], mes, deps.categorias) <= 0.005) continue
    const dm = deps.extratoData[chaveDoMes(contaId, ano, mes)]
    dias.add(diaEfetivoFixa({ id: cat.id, diaVencimento: cat.diaVencimento ?? 1 }, dm?.fixasMovidas, cat.tipo !== 'entrada', mes, ano, totalDias))
  }
  for (const cartao of deps.contas) {
    if (cartao.tipo !== 'cartao' || !cartao.diaVencimento) continue
    if (contaDoPagamento(`cartao-${cartao.id}`, ano, mes, deps.contas, deps.categorias, deps.extratoData) !== contaId) continue
    dias.add(diaUtilOuProximo(Math.min(cartao.diaVencimento, totalDias), mes, ano, totalDias))
  }
  return [...dias].filter(d => d <= hoje.getDate()).sort((a, b) => a - b)
}

/**
 * A conta pede conferência? Nunca conferida: sim. Senão, só se houve dia de
 * movimento depois da última conferência. O saldo informado no cadastro
 * (`saldoInicialDesde`) vale como conferência: no dia em que a pessoa acabou
 * de digitar o saldo, o app não pede de novo.
 */
export function pedeConferencia(conta: Conta, ultima: string | null, deps: Deps, hoje = new Date()): boolean {
  const base = [ultima, conta.saldoInicialDesde ?? null].filter((x): x is string => !!x).sort().pop() ?? null
  if (!base) return true
  const hojeStr = dataDeHoje(hoje)
  if (base >= hojeStr) return false
  return diasDeMovimento(conta.id, deps, hoje)
    .some(d => dataDeHoje(new Date(hoje.getFullYear(), hoje.getMonth(), d)) > base)
}

/**
 * Todas as contas de banco no mês corrente, com o que a Início mostra
 * (18/10/2026, pedido do Guilherme: o cartão fica logo abaixo do saldo e,
 * conferido, mostra a diferença):
 *   - `calculado`: o saldo pelos lançamentos, SEM o saldo informado neste
 *     mês — o "Sistema" da caixa de Lançamentos;
 *   - `informado`: o saldo do banco digitado neste mês, ou null;
 *   - `diferenca`: informado − calculado (0 sem informado);
 *   - `pendente`: ainda não conferida hoje.
 */
export type SaldoDoBanco = {
  conta: Conta
  calculado: number
  informado: number | null
  diferenca: number
  pendente: boolean
  /** Dias desde a última conferência (ou desde o saldo do cadastro); null se nunca. */
  diasSemConferir: number | null
  /** Ficou `DIAS_PARA_AVISAR` dias ou mais sem conferir, e não pede hoje por movimento. */
  aviso: boolean
  /** Contas desta conta que venceram e ninguém marcou: ver `naoMarcadasDaConta`. */
  naoMarcadas: NaoMarcada[]
}

export type NaoMarcada = { id: string; nome: string; valor: number; entrada: boolean }

/**
 * O que venceu até hoje nesta conta e ainda não está marcado como pago ou
 * recebido: fixas de despesa e de receita e a fatura do cartão. São as linhas
 * que a projeção ainda vai somar (`detalharProjecaoDaConta`, a mesma passagem
 * do saldo previsto), sem as fixas pagas no cartão, que caem na fatura.
 *
 * Existe por causa do "Está diferente" (análise da chegada v3, C1): o saldo
 * digitado vence como saldo atual, mas a projeção continua somando o que não
 * foi marcado. Aluguel pago e não marcado sairia duas vezes; salário
 * recebido e não marcado entraria duas vezes. Antes de aceitar o valor, a
 * Início mostra estas linhas e manda marcar em Lançamentos.
 */
export function naoMarcadasDaConta(contaId: string, deps: Deps, hoje = new Date()): NaoMarcada[] {
  const d = detalharProjecaoDaConta(contaId, hoje.getFullYear(), hoje.getMonth(), deps, hoje)
  return [
    ...d.fixasEntrada.map(i => ({ ...i, entrada: true })),
    ...d.fixasSaida.filter(i => i.balde !== 'cartao').map(i => ({ ...i, entrada: false })),
    ...d.faturas.map(i => ({ ...i, entrada: false })),
  ]
    .filter(i => i.id && i.dia !== undefined && i.dia <= hoje.getDate() && i.valor > 0.005)
    .map(i => ({ id: i.id!, nome: i.descricao ? `${i.nome} · ${i.descricao}` : i.nome, valor: i.valor, entrada: i.entrada }))
}

/**
 * A carteira entra como mais uma linha (pedido do Guilherme, 18/10/2026:
 * "assim a pessoa já tem informação de quanto tem e onde está"), quando a
 * pessoa usa dinheiro: saldo inicial, lançamento ou categoria em espécie.
 * O saldo informado da carteira não vence o calculado (regra de sempre), então
 * a diferença fica à vista o mês inteiro.
 */
export const CARTEIRA: Conta = {
  id: 'dinheiro', nome: 'Dinheiro', banco: 'Dinheiro', tipo: 'corrente',
  saldoInicial: 0, cor: '#16a34a', icone: '💵',
}

export function usaDinheiro(deps: Deps): boolean {
  return (deps.saldoInicialDinheiro ?? 0) !== 0
    || deps.categorias.some(c => c.ativa && c.tipoMovimento === 'dinheiro')
    || Object.entries(deps.extratoData).some(([k, dm]) =>
      k.startsWith('dinheiro-') && Object.keys(dm?.lancamentos ?? {}).length > 0)
}

export function saldosDosBancos(deps: Deps, hoje = new Date()): SaldoDoBanco[] {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const hojeStr = dataDeHoje(hoje)
  const contas = deps.contas.filter(ehContaDisponivel)
  if (usaDinheiro(deps)) contas.push(CARTEIRA)
  return contas
    .map(conta => {
      const k = chaveDoMes(conta.id, ano, mes)
      const dm = deps.extratoData[k]
      const informado = conta.id === CARTEIRA.id ? saldoInformadoDaCarteira(dm) : saldoInformado(dm)
      const semInformado = dm ? { ...deps, extratoData: { ...deps.extratoData, [k]: { ...dm, saldoBanco: '' } } } : deps
      const calculado = conta.id === CARTEIRA.id
        ? saldoFinalDinheiro(ano, mes, deps)
        : saldoFinalConta(conta, ano, mes, semInformado)
      const ultima = ultimaConferencia(conta.id, deps.extratoData)
      const base = [ultima, conta.saldoInicialDesde ?? null].filter((x): x is string => !!x).sort().pop() ?? null
      const diasSemConferir = base ? Math.max(0, diasEntre(base, hojeStr)) : null
      const pendente = pedeConferencia(conta, ultima, deps, hoje)
      return {
        conta, calculado, informado,
        diferenca: informado === null ? 0 : informado - calculado,
        pendente,
        diasSemConferir,
        aviso: !pendente && diasSemConferir !== null && diasSemConferir >= DIAS_PARA_AVISAR,
        naoMarcadas: naoMarcadasDaConta(conta.id, deps, hoje),
      }
    })
}

/** As contas que ainda pedem conferência hoje. */
export function saldosAConferir(deps: Deps, hoje = new Date()): SaldoDoBanco[] {
  return saldosDosBancos(deps, hoje).filter(s => s.pendente)
}

/**
 * "Confere": o saldo do app é o do banco. Grava a data e APAGA o saldo
 * informado antes, se houver (20/10/2026, relatado pelo Guilherme): o
 * informado é uma foto do dia em que foi digitado. Com 580,76 digitado num
 * dia e o débito automático confirmado no seguinte, o app foi a 1,53, a
 * pessoa tocou "Confere" e o "No banco" seguia em 580,76, com "sobram
 * 579,23" e o Radar somando os 580,76 no saldo atual. Sem informado, vale o
 * calculado, que é o número que a pessoa acabou de conferir.
 */
export function marcarConferido(dm: DadosMes, hoje: Date): DadosMes {
  return { ...dm, saldoBanco: '', saldoBancoInformado: false, saldoBancoData: dataDeHoje(hoje) }
}

/** Outro valor: o saldo do banco, com a data — o que a caixa de Lançamentos grava. */
export function informarSaldo(dm: DadosMes, valorFormatado: string, hoje: Date): DadosMes {
  return { ...dm, saldoBanco: valorFormatado, saldoBancoData: dataDeHoje(hoje), saldoBancoInformado: true }
}

/** "conferido hoje" / "conferido em 25/10", para o cartão de Lançamentos. */
export function textoConferido(data: string, hoje = new Date()): string {
  if (data === dataDeHoje(hoje)) return '✓ conferido hoje'
  const [, m, d] = data.split('-')
  return `✓ conferido em ${d}/${m}`
}
