// prova133 — Simulador (24/11/2026, revisão de 24/11, A4). Refaz o que as
// provas 27 e 46 trancavam:
//   - simularCompra === série + simularCompraSobre (o motor partido em dois);
//   - a série é o saldo previsto de cada mês (o mesmo do Planejamento/Início);
//   - o horizonte do plano: parcela além do fim não some, é marcada;
//   - no cartão a 1ª parcela sai no mês em que a fatura VENCE;
//   - a recomendada é a mais barata ENTRE AS QUE CABEM;
//   - juro só contra o à vista; editar parcela marca manual e o re-semeio a respeita;
//   - incluir no plano SOMA, desfazer SUBTRAI e volta ao plano de antes;
//   - a meta separa "a compra derruba" de "já estava abaixo".
import {
  fimDoPlanejamento, primeiroMesDoParcelamento, saidasDoParcelamento, mesesQueOPlanoCobre, parcelasQueOPlanoCobre,
  serieBaseDoPlano, simularCompraSobre, simularCompra, piorMesDaSerie, diagnosticar,
} from '../src/utils/simulacaoCompra'
import { saldoTotalNoFim, type Deps } from '../src/utils/saldoConta'
import { compararOpcoes, opcoesPadrao, editarOpcao, resemear, taxaMensal, precoAVista } from '../src/utils/comparativoCompra'
import { dividirEmParcelas, parcelasDesde, incluirNoPlano, desfazerNoPlano, integracoesNoPlano, resumoDasParcelas } from '../src/utils/simuladorNoPlano'
import { itensDoMes } from '../src/utils/itensPlano'
import { metaNaSimulacao } from '../src/utils/metaNaSimulacao'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const hoje = new Date(2026, 10, 15)
const doze = (x: number) => Array(12).fill(x)
const deMes = (de: number, x: number) => Array.from({ length: 12 }, (_, i) => (i >= de ? x : 0))

const contas = [
  { id: 'sic', nome: 'Sicredi', tipo: 'corrente', saldoInicial: 1000, preferida: true, cor: '', icone: '' },
  // fecha dia 3, vence dia 10: compra de 15/11 cai na fatura de dezembro
  { id: 'xp', nome: 'XP', tipo: 'cartao', diaFechamento: 3, diaVencimento: 10, contaPagamentoId: 'sic', formaPagamentoFatura: 'boleto', cor: '', icone: '' },
] as any[]
const cat = (o: object) => ({ cor: '', icone: '', ativa: true, fixa: false, tipoMovimento: 'banco', contaDebitoId: 'sic', ...o }) as any
const categorias = [
  cat({ id: 'sal', nome: 'Salário', tipo: 'entrada', fixa: true, diaVencimento: 5, grupo: 'Renda' }),
  cat({ id: 'mer', nome: 'Mercado', tipo: 'saida', grupo: 'Alimentação' }),
  cat({ id: 'laz', nome: 'Lazer', tipo: 'saida', grupo: 'Lazer' }),
]
const planos: any = {
  2026: { saldoInicialJan: 0, entradas: [{ id: 'sal', nome: 'Salário', v: deMes(10, 3000) }],
    saidas: [{ id: 'mer', nome: 'Mercado', v: deMes(10, 2500) }, { id: 'laz', nome: 'Lazer', v: deMes(10, 300) }], objetivos: deMes(10, 150) },
  2027: { saldoInicialJan: 0, entradas: [{ id: 'sal', nome: 'Salário', v: deMes(0, 3000).map((x, i) => (i < 6 ? x : 0)) }],
    saidas: [{ id: 'mer', nome: 'Mercado', v: doze(2500).map((x, i) => (i < 6 ? x : 0)) }, { id: 'laz', nome: 'Lazer', v: doze(300).map((x, i) => (i < 6 ? x : 0)) }], objetivos: doze(150) },
}
const deps: Deps = { extratoData: {}, faturaData: {}, contas, categorias, planos, saldoInicialDinheiro: 0 }

// ---------- Horizonte e série ----------
const fim = fimDoPlanejamento(planos)
t('fim do plano = junho/2027 (último mês com valor, não o ano)', fim?.ano === 2027 && fim?.mes === 5, fim)
t('sem plano nenhum, null', fimDoPlanejamento({}) === null && serieBaseDoPlano({ ...deps, planos: {} }, hoje) === null)
t('meses que o plano cobre de nov/2026: 8', mesesQueOPlanoCobre(planos, { ano: 2026, mes: 10 }) === 8)
t('cartão come um mês do teto (1ª parcela em dez)', parcelasQueOPlanoCobre(planos, { ano: 2026, mes: 10, dia: 15, cartaoId: 'xp' }, contas) === 7
  && parcelasQueOPlanoCobre(planos, { ano: 2026, mes: 10, dia: 15 }, contas) === 8)
const pm = primeiroMesDoParcelamento({ ano: 2026, mes: 10, dia: 15, cartaoId: 'xp' }, contas)
t('cartão: 1ª parcela no mês em que a fatura vence (dezembro)', pm.ano === 2026 && pm.mes === 11, pm)
t('cartão: compra antes do fechamento (02/11) vence em novembro', primeiroMesDoParcelamento({ ano: 2026, mes: 10, dia: 2, cartaoId: 'xp' }, contas).mes === 10)
const sp = saidasDoParcelamento({ valorTotal: 1200, parcelas: 3, ano: 2026, mes: 11, cartaoId: undefined }, contas)
t('parcelas atravessam o ano', sp.map(s => `${s.mes}/${s.ano}:${s.valor}`).join() === '11/2026:400,0/2027:400,1/2027:400', sp)

const serie = serieBaseDoPlano(deps, hoje)!
t('série: um ponto por mês até o fim do plano', serie.base.length === 8, serie.base.length)
let igualPrevisto = true
for (const p of serie.base) if (p.semCompra !== saldoTotalNoFim(p.ano, p.mes, deps, { comoAbertura: true, hoje }).valor) igualPrevisto = false
t('série === saldo previsto de cada mês (bit a bit)', igualPrevisto)
t('série cresce 200 por mês (3000 − 2800)', Math.abs(serie.base[2].semCompra - serie.base[1].semCompra - 200) < 1e-6)

// ---------- simularCompra === série + Sobre ----------
const compras = [
  { valorTotal: 3000, parcelas: 1, ano: 2026, mes: 10, dia: 15 },
  { valorTotal: 3000, parcelas: 12, ano: 2026, mes: 10, dia: 15 },
  { valorTotal: 1800, parcelas: 6, ano: 2026, mes: 10, dia: 15, cartaoId: 'xp' },
  { valorTotal: 9000, parcelas: 3, ano: 2026, mes: 10, dia: 2, cartaoId: 'xp' },
]
for (const c of compras) {
  const a = simularCompra(c, deps, { hoje })
  const b = simularCompraSobre(serie, c, contas)
  t(`atalho === série + Sobre (${c.valorTotal} em ${c.parcelas}×${c.cartaoId ? ' cartão' : ''})`, JSON.stringify(a) === JSON.stringify(b))
}
const aVista = simularCompraSobre(serie, compras[0], contas)
t('à vista de 3000 com ~1200 de saldo não cabe', !aVista.cabe && !!aVista.primeiroAperto)
t('não cabe: o pior mês e o primeiro aperto existem e o pior é o mais fundo da janela',
  aVista.janela.every(p => p.comCompra >= aVista.pior.comCompra))
t('adiar ou esticar oferecido, ou o limite do plano avisado', !!aVista.adiarPara || aVista.parcelasQueCabem !== null || aVista.limitadoPeloPlano, aVista)
const doze12 = simularCompraSobre(serie, { ...compras[0], parcelas: 12 }, contas)
t('12× passa do fim do plano: limitadoPeloPlano', doze12.limitadoPeloPlano)
const tres = simularCompraSobre(serie, { valorTotal: 600, parcelas: 3, ano: 2026, mes: 10 }, contas)
t('600 em 3× cabe, comCompra = semCompra − acumulado', tres.cabe && Math.abs(tres.fluxo[2].comCompra - (tres.fluxo[2].semCompra - 600)) < 1e-6)
t('diagnóstico: cabe com folga é ok', diagnosticar(tres, 0, 200).gravidade === 'ok')
t('diagnóstico: vermelho é atencao ou nao', diagnosticar(aVista, 0, 3000).gravidade !== 'ok')
const pior = piorMesDaSerie(serie)
t('pior mês da série sem negativo', pior.primeiroNegativo === null && pior.pior === serie.base.reduce((a, b) => (b.semCompra < a.semCompra ? b : a)))

// ---------- Comparar formas ----------
{
  const opcoes = opcoesPadrao(1800)
  t('opções padrão: à vista, 3, 6, 12', opcoes.map(o => o.parcelas).join() === '1,3,6,12' && opcoes[2].valorParcela === 300)
  const linhas = compararOpcoes(opcoes, { serie, contas, alvo: { ano: 2026, mes: 10, dia: 15 }, teto: 8 })
  const rec = linhas.filter(l => l.recomendada)
  t('uma recomendada só', rec.length === 1)
  t('recomendada cabe e é a mais barata entre as que cabem',
    rec[0].veredito!.cabe && linhas.filter(l => l.veredito?.cabe).every(l => l.total >= rec[0].total))
  t('à vista (mais barata e que não cabe) não é recomendada', !linhas[0].veredito?.cabe && !linhas[0].recomendada)
  t('12× além do teto: sem veredito, com o teto marcado', linhas[3].veredito === null && linhas[3].tetoDoPlano === 8)
  t('6× recomendada: 3× tem o mesmo total e não cabe', rec[0].opcao.parcelas === 6 && !linhas[1].veredito!.cabe && linhas[1].total === linhas[2].total)
  const empate = compararOpcoes(opcoesPadrao(900).slice(0, 3), { serie, contas, alvo: { ano: 2026, mes: 10, dia: 15 }, teto: 8 })
  t('empate no total com todas cabendo: a que aperta menos (6×)', empate.every(l => l.veredito?.cabe) && empate.find(l => l.recomendada)?.opcao.parcelas === 6)

  const semAVista = compararOpcoes(opcoes.slice(1), { serie, contas, alvo: { ano: 2026, mes: 10 }, teto: 8 })
  t('sem linha à vista: juro é null (não inventa taxa)', semAVista.every(l => l.juroEmbutido === null && l.taxaMes === null) && precoAVista(opcoes.slice(1)) === null)
  const vazio = compararOpcoes([{ id: 'x', parcelas: 3, valorParcela: 0 }], { serie, contas, alvo: { ano: 2026, mes: 10 }, teto: 8 })
  t('linha sem valor não é "fora do plano"', vazio[0].veredito === null && vazio[0].tetoDoPlano === undefined)

  // Price: 1000 à vista, 12× de 100 → ~2,92% a.m.
  const i = taxaMensal(1000, 100, 12)!
  t('taxa ao mês confere com a tabela Price', Math.abs(100 * (1 - Math.pow(1 + i, -12)) / i - 1000) < 0.01 && i > 0.029 && i < 0.0295, i)
  t('sem juro, sem taxa', taxaMensal(1200, 100, 12) === null && taxaMensal(1000, 1000, 1) === null)

  let ed = editarOpcao(opcoes, 'p3', 'parcelas', '4', 2400)
  t('trocar quantidade recalcula a parcela pelo total', ed[1].parcelas === 4 && ed[1].valorParcela === 600 && !ed[1].manual)
  ed = editarOpcao(ed, 'p6', 'valorParcela', '450,00')
  t('digitar a parcela marca manual', ed[2].valorParcela === 450 && ed[2].manual === true)
  ed = editarOpcao(ed, 'p6', 'parcelas', '5', 2400)
  t('manual: trocar a quantidade não muda a parcela', ed[2].parcelas === 5 && ed[2].valorParcela === 450)
  const re = resemear(ed, 3000)
  t('re-semear: automáticas seguem o total, manual fica', re[0].valorParcela === 3000 && re[1].valorParcela === 750 && re[2].valorParcela === 450)
}

// ---------- Incluir no plano e desfazer ----------
{
  const p = dividirEmParcelas(1000, 3)
  t('dividir: centavos somam o total, a última leva a sobra', p.join() === '333.33,333.33,333.34')
  const meses = parcelasDesde(2026, 11, p)
  t('parcelas desde dez/2026 atravessam o ano', meses.map(m => `${m.mes}/${m.ano}`).join() === '11/2026,0/2027,1/2027')
  const lazer = categorias.find(c => c.id === 'laz')
  const r = incluirNoPlano(planos, lazer, meses, 'Bicicleta', 'sim1')
  const linDez = r.planos[2026]!.saidas.find(l => l.id === 'laz')!
  t('incluir SOMA ao que estava (300 + 333,33)', Math.abs(linDez.v[11] - 633.33) < 1e-9, linDez.v[11])
  t('o que estava vira item base, a parcela entra ao lado', itensDoMes(linDez, 11)?.map(i => i.descricao).join('|') === 'Lazer|Bicicleta · 1 de 3')
  t('todas gravadas, nada fora', r.gravadas.length === 3 && r.fora.length === 0)
  t('plano original intacto', planos[2026].saidas[1].v[11] === 300 && !planos[2026].saidas[1].itens)
  const integ = integracoesNoPlano(r.planos)
  t('integração lida dos itens', integ.length === 1 && integ[0].descricao === 'Bicicleta' && integ[0].total === 1000 && integ[0].meses.length === 3, integ)
  const des = desfazerNoPlano(r.planos, 'sim1')
  t('desfazer volta exatamente ao plano de antes', JSON.stringify(des[2026]!.saidas) === JSON.stringify(planos[2026].saidas)
    && JSON.stringify(des[2027]!.saidas) === JSON.stringify(planos[2027].saidas))
  const foraDoAno = incluirNoPlano(planos, lazer, parcelasDesde(2027, 11, [100, 100]), 'X', 'sim2')
  t('mês de ano sem plano volta em "fora"', foraDoAno.gravadas.length === 1 && foraDoAno.fora.length === 1 && foraDoAno.fora[0].ano === 2028)
  // desfazer depois de alguém mexer no valor: subtrai e tira o detalhe
  const mexido = JSON.parse(JSON.stringify(r.planos))
  mexido[2026].saidas.find((l: any) => l.id === 'laz').v[11] = 700
  const des2 = desfazerNoPlano(mexido, 'sim1')
  const l2 = des2[2026]!.saidas.find(l => l.id === 'laz')!
  t('valor mexido depois: subtrai a parcela e tira o detalhe', Math.abs(l2.v[11] - 366.67) < 1e-9 && itensDoMes(l2, 11) === null, l2.v[11])
  t('resumo das parcelas', resumoDasParcelas(parcelasDesde(2026, 10, [300, 300])).includes('por mês · nov/2026 a dez/2026 (2 meses)'))
}

// ---------- Meta na simulação ----------
{
  const doMes = (ano: number, mes: number) => (ano === 2027 && mes === 1 ? { guarda: 100, meta: 150 } : { guarda: 200, meta: 150 })
  const m = metaNaSimulacao(parcelasDesde(2026, 11, [100, 30, 10]), doMes)!
  t('meta: dez cai (200−100 < 150), jan fica (200−30), fev já estava abaixo', m.caem.map(x => x.mes).join() === '11' && m.jaAbaixo.map(x => x.mes).join() === '1', m)
  t('meta: pior = o mais longe da meta com a compra', m.pior?.mes === 1 && m.pior.ano === 2027)
  t('sem meta nos meses, null', metaNaSimulacao(parcelasDesde(2026, 11, [100]), () => ({ guarda: 0, meta: 0 })) === null)
}

console.log(`prova133: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
