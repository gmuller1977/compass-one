// prova105 (29/10/2026): a janela do valor da fatura só abre sozinha quando
// há compra nova desde a última vez que perguntou (pedido do Guilherme: "para
// não ficar pedindo sempre").
import { pedeValorDaFatura, momentoDePerguntar, type MomentoDaFatura } from '../src/utils/pedirValorDaFatura'
// 30/10/2026: a janela só abre num MOMENTO (tudo conferido ou fatura fechada
// antes do vencimento). As regras abaixo valem dentro dele; fora, nunca abre.
const pede = (p: Omit<Parameters<typeof pedeValorDaFatura>[0], 'momento'>, momento: MomentoDaFatura = 'tudo-conferido') =>
  pedeValorDaFatura({ ...p, momento })
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

t('nunca perguntou: pede', pede({ perguntouHoje: false, totalAgora: 1725.65, informado: 0 }))
t('já perguntou hoje: não pede', !pede({ perguntouHoje: true, totalAgora: 1725.65, informado: 0 }))
t('sem compra nova: não pede', !pede({ perguntouHoje: false, totalAgora: 1694.66, totalNaUltimaVez: 1694.66, informado: 1694.66 }))
t('compra nova (30,99): pede', pede({ perguntouHoje: false, totalAgora: 1725.65, totalNaUltimaVez: 1694.66, informado: 1694.66 }))
t('estorno também muda: pede', pede({ perguntouHoje: false, totalAgora: 1600, totalNaUltimaVez: 1694.66, informado: 1694.66 }))
t('compra nova mas já confere: não pede', !pede({ perguntouHoje: false, totalAgora: 1725.65, totalNaUltimaVez: 1694.66, informado: 1725.65 }))
t('fatura antiga sem total guardado e diferente: pede uma vez', pede({ perguntouHoje: false, totalAgora: 900, informado: 800 }))
t('resíduo de ponto flutuante não conta', !pede({ perguntouHoje: false, totalAgora: 0.1 + 0.2, totalNaUltimaVez: 0.3, informado: 0 }))
t('999.999,99 com 1 centavo a mais: pede', pede({ perguntouHoje: false, totalAgora: 1000000, totalNaUltimaVez: 999999.99, informado: 0 }))

t('fora do momento: nunca pede', !pede({ perguntouHoje: false, totalAgora: 1725.65, informado: 0 }, null))
t('aberta e com compra sem bolinha: sem momento', momentoDePerguntar({ status: 'aberta', tudoConferido: false, antesDoVencimento: true }) === null)
t('tudo conferido: momento', momentoDePerguntar({ status: 'aberta', tudoConferido: true, antesDoVencimento: true }) === 'tudo-conferido')
t('fechada antes do vencimento: momento', momentoDePerguntar({ status: 'fechada', tudoConferido: false, antesDoVencimento: true }) === 'fechada')
t('fechada e vencida: sem momento', momentoDePerguntar({ status: 'fechada', tudoConferido: false, antesDoVencimento: false }) === null)
t('paga, mesmo tudo conferido: sem momento', momentoDePerguntar({ status: 'paga', tudoConferido: true, antesDoVencimento: true }) === null)

console.log(`prova105: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
