// prova121 (16/11/2026): o valor digitado numa fixa NÃO confirmada acompanha o
// plano (relatado pelo Guilherme: 13º da Pricila de 2 parcelas para 1, plano
// de novembro em 12.051,57, e Lançamentos seguia com "A receber +5.774,00").
import { comValorDigitado, semValorDigitado, valoresDigitadosVencidos } from '../src/utils/valorDigitadoFixa'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const hoje = new Date(2026, 10, 16)
const decimo = { id: 'd13', nome: 'Pricila', descricao: '13 Salário', tipo: 'entrada', fixa: true, ativa: true, tipoMovimento: 'banco', diaVencimento: 30, cor: '', icone: '' } as any
const planoCom = (nov: number, dez: number): any => {
  const v = Array(12).fill(0); v[10] = nov; v[11] = dez
  return { 2026: { saldoInicialJan: 0, entradas: [{ id: 'd13', nome: 'Pricila', descricao: '13 Salário', v }], saidas: [] } }
}
const deps = (extratoData: any, planos: any) => ({ extratoData, faturaData: {}, contas: [], categorias: [decimo], planos, saldoInicialDinheiro: 0 } as any)
const vazio = { lancamentos: {}, saldoBanco: '' } as any

// Editar só o dia (valor do campo = plano) não grava valor digitado.
const soDia = comValorDigitado(vazio, 'd13', 5774, 5774)
t('valor igual ao plano não grava', soDia.fixasValorOverride?.d13 === undefined && soDia.fixasValorBase?.d13 === undefined)
// Valor diferente grava com o plano de hoje ao lado.
const outro = comValorDigitado(vazio, 'd13', 6000, 5774)
t('outro valor grava com a base', outro.fixasValorOverride?.d13 === 6000 && outro.fixasValorBase?.d13 === 5774)
t('voltar ao plano tira os dois', comValorDigitado(outro, 'd13', 5774, 5774).fixasValorOverride?.d13 === undefined)

// O caso dele: valor antigo gravado sem base, plano mudou para 12.051,57.
const caso = { 'sic-2026-11': { ...vazio, fixasValorOverride: { d13: 5774 } }, 'sic-2026-12': { ...vazio, fixasValorOverride: { d13: 5774 } } }
const venc = valoresDigitadosVencidos(deps(caso, planoCom(12051.57, 0)), hoje)
t('novembro e dezembro saem', venc.length === 2 && venc.every(v => v.id === 'd13'))
t('limpar tira override e base', semValorDigitado({ ...outro }, 'd13').fixasValorOverride?.d13 === undefined)

// Digitado sobre o plano de hoje fica; o plano mudou, sai.
const novo = { 'sic-2026-11': outro }
t('base igual ao plano: fica', valoresDigitadosVencidos(deps(novo, planoCom(5774, 5774)), hoje).length === 0)
t('plano mudou: sai', valoresDigitadosVencidos(deps(novo, planoCom(12051.57, 0)), hoje).length === 1)

// Confirmada: vale o real, nada sai.
const pago = { 'sic-2026-11': { ...vazio, fixasConsolidadas: { d13: true }, fixasValorOverride: { d13: 5774 } } }
t('confirmada não se mexe', valoresDigitadosVencidos(deps(pago, planoCom(12051.57, 0)), hoje).length === 0)
// Mês fechado não se mexe.
const antigo = { 'sic-2026-10': { ...vazio, fixasValorOverride: { d13: 5774 } } }
t('mês fechado não se mexe', valoresDigitadosVencidos(deps(antigo, planoCom(12051.57, 0)), hoje).length === 0)
// Fatura fica de fora.
const fatura = { 'sic-2026-11': { ...vazio, fixasValorOverride: { 'cartao-xp': 900 } } }
t('fatura fica de fora', valoresDigitadosVencidos(deps(fatura, planoCom(12051.57, 0)), hoje).length === 0)

console.log(`prova121: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
