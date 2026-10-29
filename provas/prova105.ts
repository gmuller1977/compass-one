// prova105 (29/10/2026): importar o extrato do banco em Lançamentos > Banco
// (utils/importarExtrato). Roda sobre a conta de teste "Ana Teste"
// (teste/ana.ts) e os extratos fictícios (teste/extratos), com o resultado
// esperado de cada linha que está em teste/LEIA-ME.md. Hoje = 29/10/2026,
// com salário e luz já confirmados sozinhos (débito automático), como o app
// faz ao abrir.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contas, categorias, planos, extrato as extratoAna, faturas } from '../teste/ana'
import {
  aplicarMudancas, classificar, decodificarArquivo, descricaoLimpa, lerArquivoDoBanco, mudancasDaImportacao,
  numeroDoBanco, podeGravar, type ArquivoDoBanco, type ContextoImportacao, type Escolha, type LinhaImportada,
} from '../src/utils/importarExtrato'
import { confirmarDebito, debitosParaConfirmar } from '../src/utils/debitoAutomatico'
import { saldoFinalConta, type Deps } from '../src/utils/saldoConta'
import type { DadosMes } from '../src/context/AppContext'

let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const pasta = join(dirname(fileURLToPath(import.meta.url)), '..', 'teste', 'extratos')
const ler = (f: string) => lerArquivoDoBanco(decodificarArquivo(new Uint8Array(readFileSync(join(pasta, f)))))

const hoje = new Date(2026, 9, 29, 12)
const sicredi = contas.find(c => c.banco === 'Sicredi')!
const caixa = contas.find(c => c.banco === 'Caixa')!
const cat = (nome: string) => categorias.find(c => c.nome === nome)!
const k = (id: string) => `${id}-2026-10`

// O app aberto em 29/10 confirma salário e luz sozinho.
let extrato: Record<string, DadosMes> = JSON.parse(JSON.stringify(extratoAna))
const depsDe = (e: Record<string, DadosMes>): Deps => ({ extratoData: e, faturaData: faturas as Deps['faturaData'], contas, categorias, planos, saldoInicialDinheiro: 0 })
for (const d of debitosParaConfirmar(depsDe(extrato), hoje)) extrato = { ...extrato, [d.chave]: confirmarDebito(extrato[d.chave], d) }
t('salário e luz confirmados ao abrir', extrato[k(sicredi.id)]?.fixasConsolidadas?.[cat('Salário').id] === true
  && extrato[k(sicredi.id)]?.fixasConsolidadas?.[cat('Energia Elétrica').id] === true)

const ctx = (e: Record<string, DadosMes>, contaId: string): ContextoImportacao => ({ ...depsDe(e), contaId, hoje })
const padrao = (ls: LinhaImportada[]): Escolha[] => ls.map(l => {
  const e: Escolha = { marcada: true, categoriaId: l.categoriaId, destinoId: l.destinoId }
  return { ...e, marcada: podeGravar(l, e) }
})
const semInformado = (e: Record<string, DadosMes>, id: string) => saldoFinalConta(contas.find(c => c.id === id)!, 2026, 9,
  { ...depsDe(e), extratoData: { ...e, [k(id)]: { ...e[k(id)], saldoBanco: '' } } })

// ── Leitura ──
t('número BR', numeroDoBanco('1.234,56') === 1234.56 && numeroDoBanco('-150,00') === -150)
t('número US', numeroDoBanco('1234.56') === 1234.56 && numeroDoBanco('-80.00') === -80)
t('número entre parênteses', numeroDoBanco('(45,90)') === -45.9)
t('descrição limpa', descricaoLimpa('COMPRA DEBITO FARMACIA DROGASIL') === 'Farmacia Drogasil')
t('descrição limpa mantém o acento', descricaoLimpa('TARIFA PACOTE SERVIÇOS') === 'Tarifa Pacote Serviços')
const sic = ler('sicredi-conta-out2026.ofx') as ArquivoDoBanco
t('OFX 1.02 lido', !('erro' in sic) && sic.transacoes.length === 14)
t('acento em Windows-1252', sic.transacoes.some(x => x.descricao === 'TARIFA PACOTE SERVIÇOS'))
t('saldo do arquivo', sic.saldo?.valor === 3479.15 && sic.saldo?.data === '2026-10-28')
t('OFX de cartão recusado (por ora)', 'erro' in ler('xp-cartao-out2026.ofx'))
t('CSV de cartão (Nubank) recusado (por ora)', 'erro' in ler('formato-nubank-cartao.csv'))

// ── Classificação do Sicredi ──
const linhas = classificar(sic, ctx(extrato, sicredi.id))
const por = (memo: string, n = 0) => linhas.filter(l => l.t.descricao.startsWith(memo))[n]
t('28/09 fora: antes do saldo', por('PIX ENVIADO CARLOS').acao === 'fora')
t('PIX recebido: novo, sem sugestão', por('PIX RECEBIDO').acao === 'novo' && !por('PIX RECEBIDO').categoriaId)
t('salário: fixa já confirmada, mesmo valor', por('CRED SALARIO').acao === 'fixa' && por('CRED SALARIO').fixa!.jaConfirmada
  && por('CRED SALARIO').fixa!.id === cat('Salário').id)
t('pagamento da fatura XP', por('PAGTO FATURA').acao === 'fatura' && Math.abs(por('PAGTO FATURA').fixa!.previsto - 1240.3) < 0.005)
t('TED para a Caixa: transferência', por('TED ENVIADA').acao === 'transferencia' && por('TED ENVIADA').destinoId === caixa.id)
t('aluguel: fixa (nome do banco não lembra)', por('PIX ENVIADO IMOB').acao === 'fixa' && por('PIX ENVIADO IMOB').fixa!.id === cat('Aluguel / Financiamento').id)
t('Drogasil 49,80 corrige o manual de 48,90', por('COMPRA DEBITO FARMACIA').acao === 'corrigir' && por('COMPRA DEBITO FARMACIA').existente!.valor === 48.9)
t('luz com outro valor', por('DEB AUT CEEE').acao === 'fixa' && por('DEB AUT CEEE').fixa!.previsto === 180)
t('Zaffari já lançado (1 dia antes)', por('COMPRA DEBITO SUPERMERCADO').acao === 'ja_lancado')
t('saque: transferência para a carteira', por('SAQUE').acao === 'transferencia' && por('SAQUE').destinoId === 'dinheiro')
t('aplicação sem investimento: novo, avisando', por('APLICACAO').acao === 'novo' && !!por('APLICACAO').motivo)
t('duas padarias: duas novas', por('COMPRA DEBITO PADARIA', 0).acao === 'novo' && por('COMPRA DEBITO PADARIA', 1).acao === 'novo')
t('tarifa: sem categoria de tarifa, sem sugestão', por('TARIFA').acao === 'novo')

// ── Gravar com as escolhas da janela ──
const esc = padrao(linhas)
// A pessoa escolhe as categorias que faltam (PIX recebido, aplicação, padarias, tarifa).
linhas.forEach((l, i) => {
  if (l.acao !== 'novo' || l.categoriaId) return
  const c = l.tipo === 'entrada' ? cat('Renda Extra') : l.t.descricao.includes('PADARIA') ? cat('Mercado / Supermercado') : cat('Presentes / Datas')
  esc[i] = { marcada: true, categoriaId: c.id }
})
const depois = aplicarMudancas(extrato, mudancasDaImportacao(linhas, esc, ctx(extrato, sicredi.id), 1))
const saldoDepois = semInformado(depois, sicredi.id)
t(`saldo do Sicredi = o do banco (${saldoDepois.toFixed(2)})`, Math.abs(saldoDepois - 3479.15) < 0.005)
const dmS = depois[k(sicredi.id)]
t('fatura XP confirmada no valor', dmS.fixasConsolidadas?.['cartao-' + contas.find(c => c.tipo === 'cartao')!.id] === true)
t('luz: valor do banco e conferida', dmS.fixasValorOverride?.[cat('Energia Elétrica').id] === 196.4 && dmS.debitosConferidos?.[cat('Energia Elétrica').id] === true)
t('aluguel pago', dmS.fixasConsolidadas?.[cat('Aluguel / Financiamento').id] === true)
t('Drogasil corrigida, uma linha só', (dmS.lancamentos[12] ?? []).length === 1 && dmS.lancamentos[12][0].valor === 49.8)
t('espelho na Caixa', (depois[k(caixa.id)]?.lancamentos[8] ?? []).some(l => l.tipo === 'entrada' && l.valor === 500 && l.categoria === 'Transferência'))
t('espelho na carteira (saque)', (depois[k('dinheiro')]?.lancamentos[18] ?? []).some(l => l.tipo === 'entrada' && l.valor === 200))
t('todas as marcadas guardam o código', Object.keys(dmS.importados ?? {}).length === 13)

// Importar o mesmo arquivo de novo não traz nada.
const denovo = classificar(sic, ctx(depois, sicredi.id))
t('reimportar: tudo fora', denovo.every(l => l.acao === 'fora'))
t('reimportar: nada a gravar', mudancasDaImportacao(denovo, padrao(denovo), ctx(depois, sicredi.id)).size === 0)

// Linha desmarcada não é marcada como importada: volta na próxima vez.
const so = linhas.map((_, i) => ({ ...esc[i], marcada: i === linhas.indexOf(por('PAGTO FATURA')) }))
const parcial = aplicarMudancas(extrato, mudancasDaImportacao(linhas, so, ctx(extrato, sicredi.id), 2))
const volta = classificar(sic, ctx(parcial, sicredi.id))
t('desmarcada volta; marcada não', volta.filter(l => l.acao !== 'fora').length === 12)

// ── Caixa (CSV), depois do Sicredi ──
const cx = ler('caixa-conta-out2026.csv') as ArquivoDoBanco
t('CSV brasileiro lido', !('erro' in cx) && cx.transacoes.length === 3 && cx.saldo?.valor === 1462.65)
const lc = classificar(cx, ctx(depois, caixa.id))
t('TED recebida do Sicredi: já está (a outra ponta)', lc[0].acao === 'ja_lancado')
t('pet shop: sugere Pet', lc[2].acao === 'novo' && lc[2].categoriaId === cat('Pet').id)
const escCx = padrao(lc); escCx[1] = { marcada: true, categoriaId: cat('Manutenção / Reparos').id }
const depoisCx = aplicarMudancas(depois, mudancasDaImportacao(lc, escCx, ctx(depois, caixa.id), 3))
t('saldo da Caixa = o do banco', Math.abs(semInformado(depoisCx, caixa.id) - 1462.65) < 0.005)

// Controle: a Caixa importada ANTES do Sicredi cria a transferência, e o
// Sicredi depois não cria o espelho de novo.
const lc0 = classificar(cx, ctx(extrato, caixa.id))
t('controle: Caixa primeiro, TED vira transferência', lc0[0].acao === 'transferencia' && lc0[0].destinoId === sicredi.id)
const antesSic = aplicarMudancas(extrato, mudancasDaImportacao(lc0, padrao(lc0), ctx(extrato, caixa.id), 4))
const ls2 = classificar(sic, ctx(antesSic, sicredi.id))
const ted = ls2.find(l => l.t.descricao.startsWith('TED ENVIADA'))!
t('controle: no Sicredi a TED já está (o espelho da Caixa)', ted.acao === 'ja_lancado')

console.log(`prova105: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
