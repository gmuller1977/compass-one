// prova111 (05/11/2026): "Desfazer" o "Confere" da Início tocado por engano
// (relatado pelo Guilherme). Volta o saldo como estava antes do toque.
import { marcarConferido, desfazerConferencia, informarSaldo } from '../src/utils/conferirSaldos'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const hoje = new Date(2026, 10, 5)
const ontem = new Date(2026, 10, 3)
const vazio = { lancamentos: {}, saldoBanco: '' }

// Nunca conferida: desfazer volta a sem data.
let d = desfazerConferencia(marcarConferido(vazio as any, hoje))
t('sem data depois de desfazer', d.saldoBancoData === undefined && d.saldoBanco === '' && !d.conferenciaAnterior)

// Conferida dia 3, tocou hoje por engano: volta para o dia 3.
const dia3 = marcarConferido(vazio as any, ontem)
d = desfazerConferencia(marcarConferido(dia3, hoje))
t('volta a data anterior', d.saldoBancoData === '2026-11-03')

// Saldo informado antes: volta o valor e a marca.
const inf = informarSaldo(vazio as any, '-10,00', ontem)
d = desfazerConferencia(marcarConferido(inf, hoje))
t('volta o informado', d.saldoBanco === '-10,00' && d.saldoBancoInformado === true && d.saldoBancoData === '2026-11-03')

// Conferência gravada antes da regra (sem o "antes"): só a data sai.
d = desfazerConferencia({ ...vazio, saldoBancoData: '2026-11-05' } as any)
t('antiga: tira a data', d.saldoBancoData === undefined)

// Lançamentos não mudam.
const comLanc = { lancamentos: { 3: [{ id: 'x', valor: 5 }] }, saldoBanco: '' } as any
d = desfazerConferencia(marcarConferido(comLanc, hoje))
t('lançamentos intactos', d.lancamentos === comLanc.lancamentos)

console.log(`prova111: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
