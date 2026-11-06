// prova119 (06/11/2026): o valor da fatura no banco é uma foto do dia em que
// foi informado. Compra lançada depois aparece como "depois entraram R$ X",
// não como diferença solta (Guilherme: 679,06 informado, 51,41 lançado depois).
import { faturaLadoALado } from '../src/utils/conferirFatura'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const dm = { lancamentos: {} as Record<number, { id: string; tipo: string; valor: number }[]> }
const b = (p: Parameters<typeof faturaLadoALado>[2]) => faturaLadoALado(dm, 30, p).banco
const r1 = b({ totalFatura: 730.47, informado: 679.06, informadoEm: '2026-11-05', totalQuandoInformado: 679.06 })
t('mudou depois: 51,41 e a data', r1.estado === 'comparado' && Math.abs((r1.mudouDepois ?? 0) - 51.41) < 1e-6 && r1.informadoEm === '05/11')
const r2 = b({ totalFatura: 730.47, informado: 679.06, informadoEm: '2026-11-05', totalQuandoInformado: 730.47 })
t('nada mudou: diferença de sempre', r2.estado === 'comparado' && r2.mudouDepois === null && r2.diferenca < 0)
const r3 = b({ totalFatura: 730.47, informado: 730.47, informadoEm: '2026-11-05', totalQuandoInformado: 679.06 })
t('igual: sem aviso de mudança', r3.estado === 'comparado' && r3.igual && r3.mudouDepois === null)
const r4 = b({ totalFatura: 730.47, informado: 679.06 })
t('sem data (antigo): sem data e sem aviso', r4.estado === 'comparado' && r4.informadoEm === null && r4.mudouDepois === null)
t('não informado', b({ totalFatura: 730.47, informado: null }).estado === 'nao-informada')
console.log(`prova119: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
