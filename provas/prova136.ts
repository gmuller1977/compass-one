// prova136 — Avisos da Início e revisão do plano (24/11/2026, revisão de
// 24/11, A4). Refaz o que as provas 35, 36, 43, 50, 54 e 55 trancavam, sobre
// a família de teste (provas/familia.ts) com uma bicicleta parcelada no XP
// que passa do plano de Vestuário nos meses seguintes, e uma compra futura
// numa categoria desativada (Academia).
//   - previsão do mês futuro: inicial + entradas − saídas + ajuste = final,
//     final === saldo previsto, inicial === final do mês anterior;
//   - estouradas = real − plano das linhas do Radar; sem plano não entra;
//   - avisos: contas → passou → revisão → negativo à frente, no máximo 3;
//   - já lançado acima do plano: só meses futuros; a revisão confirmada faz o
//     aviso sumir; linha sem cadastro ativo exato não é gravada.
import { hoje, contas, categoriasBase, planos, extratoData, faturaData, depsDe } from './familia'
import { previsaoDoMes } from '../src/utils/previsaoDoMes'
import { saldoTotalNoFim, memoriaDoRadar, type Deps } from '../src/utils/saldoConta'
import { construirRealizadoMes } from '../src/utils/realizadoMes'
import { totaisDoMes, nomesDeCartao } from '../src/components/acompanhamento/evolucaoCalcs'
import { categoriasEstouradas, maisPertoDoLimite } from '../src/utils/categoriasEstouradas'
import { avisosDoMes } from '../src/utils/avisosDoMes'
import { gruposQuePassaram } from '../src/utils/resumoRadar'
import { lancadoAcimaDoPlano } from '../src/utils/lancadoAcimaDoPlano'
import { linhasDaRevisao, gravarRevisao, textoDaRevisao, cadastroPlanejavel, sugestaoDoMes } from '../src/utils/revisaoDoPlano'
import { contasAVencer } from '../src/utils/contasAVencer'
import { itensDoMes } from '../src/utils/itensPlano'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6
void contas; void planos; void extratoData

// Bicicleta: 6× de 250 no XP a partir da fatura de dezembro (Vestuário, plano 200).
const bike = (p: number) => ({ id: `bk-${p}`, tipo: 'entrada', valor: 250, categoria: 'Vestuário', descricao: 'Bicicleta', parcelas: 6, parcelaAtual: p })
const faturas: any = { ...faturaData }
for (let p = 1; p <= 6; p++) {
  const t0 = 11 + (p - 1)
  const ano = 2026 + Math.floor(t0 / 12), mes = (t0 % 12) + 1
  const k = `xp-${ano}-${String(mes).padStart(2, '0')}`
  faturas[k] = { lancamentos: { 1: [...(faturas[k]?.lancamentos?.[1] ?? []), bike(p)] } }
}
// Academia (desativada) com uma compra em janeiro.
faturas['nub-2027-01'] = { lancamentos: { 2: [{ id: 'ac1', tipo: 'entrada', valor: 90, categoria: 'Academia', descricao: 'Academia' }] } }

for (const cen of ['pessimista', 'otimista'] as const) {
  const deps: Deps = { ...depsDe(cen), faturaData: faturas }

  // ---------- Previsão do mês ----------
  let anterior = saldoTotalNoFim(2026, 10, deps, { comoAbertura: true, hoje }).valor
  for (const [a, m] of [[2026, 11], [2027, 0], [2027, 1]] as const) {
    const p = previsaoDoMes(a, m, deps, hoje)
    t(`${cen} ${m + 1}/${a}: inicial + entradas − saídas + ajuste = final`, perto(p.inicial + p.entradas - p.saidas + p.memoria.ajusteConciliacao, p.final), p)
    t(`${cen} ${m + 1}/${a}: final === saldo previsto`, p.final === saldoTotalNoFim(a, m, deps, { comoAbertura: true, hoje }).valor)
    t(`${cen} ${m + 1}/${a}: inicial === final do mês anterior`, p.inicial === anterior, { inicial: p.inicial, anterior })
    anterior = p.final
  }
  const pNov = previsaoDoMes(2026, 10, deps, hoje), mNov = memoriaDoRadar(2026, 10, deps, { hoje })
  t(`${cen} nov (corrente): previsão === memória do Radar no fechamento`, pNov.final === mNov.fechamento)
}

const deps: Deps = { ...depsDe('pessimista'), faturaData: faturas }
const linhasDe = (ano: number, mes: number) => {
  const r = construirRealizadoMes({ ano, mes, extratoData: deps.extratoData as any, faturaData: deps.faturaData, contas: deps.contas, categorias: deps.categorias, planoAno: deps.planos[ano] })
  return totaisDoMes({ mes, planoAno: deps.planos[ano], categorias: deps.categorias, cartaoNomes: nomesDeCartao(deps.contas), entradasMap: r.entradasMap, saidasMap: r.saidasMap }).saida.linhas
}

// ---------- Estouradas ----------
const nov = linhasDe(2026, 10)
const est = categoriasEstouradas(nov, 10)
t('estouradas: todas = real − plano da linha do Radar', est.every(e => perto(e.excesso, e.real - e.prev) && e.excesso > 0.005))
t('estouradas: Lazer (450 de 300) está lá com 150', perto(est.find(e => e.nome === 'Lazer')?.excesso ?? -1, 150), est)
t('estouradas: em ordem do maior excesso', est.every((e, i) => i === 0 || est[i - 1].excesso >= e.excesso))
t('estouradas: linha sem plano não entra (Academia desativada)', !est.some(e => e.prev <= 0.005) && !est.some(e => e.nome === 'Academia'))
t('estouradas: n corta a lista', categoriasEstouradas(nov, 1).length === Math.min(1, est.length))
const perto3 = maisPertoDoLimite(nov, categoriasBase)
t('mais perto do limite: sem fixa, sem estourada, com gasto', perto3.every(l => !categoriasBase.find(c => c.nome === l.nome)?.fixa && l.real <= l.prev + 0.005 && l.real > 0.005), perto3)

// ---------- Já lançado acima do plano ----------
const acima = lancadoAcimaDoPlano(deps, hoje)
const ves = acima.find(a => a.nome === 'Vestuário')
t('acima: Vestuário aparece', !!ves, acima.map(a => a.nome))
t('acima: só meses depois do corrente', acima.every(a => a.meses.every(m => m.ano * 12 + m.mes > 2026 * 12 + 10)))
t('acima: excesso = já lançado − plano', !!ves && ves.meses.every(m => perto(m.excesso, Math.round((m.jaLancado - m.plano) * 100) / 100)))
t('acima: os itens trazem a parcela', !!ves && ves.meses.every(m => m.itens.some(i => i.parcela?.total === 6)))
const texto = textoDaRevisao(acima)!
t('texto da revisão: título e detalhe', !!texto && texto.titulo.includes('revisão de planejamento'))
t('texto da revisão: com uma só categoria, cita a parcela', textoDaRevisao([ves!])!.detalhe.includes('Bicicleta'))
t('sem nada acima, sem texto', textoDaRevisao([]) === null)

// ---------- Revisão: sugerir, gravar, sumir ----------
const linhas = linhasDaRevisao(acima, deps, hoje)
t('revisão: sugerido nunca abaixo do já lançado', linhas.every(l => l.sugerido + 0.005 >= l.jaLancado), linhas.map(l => [l.nome, l.mes, l.sugerido, l.jaLancado]))
const ac = linhas.filter(l => l.nome === 'Academia')
t('revisão: Academia desativada vem com motivo', ac.length > 0 && ac.every(l => !!l.motivo && l.motivo.includes('desativada')), ac.map(l => l.motivo))
t('revisão: Vestuário sem motivo', linhas.filter(l => l.nome === 'Vestuário').every(l => l.motivo === null))
t('cadastroPlanejavel: exato e ativo', cadastroPlanejavel('Vestuário', '', categoriasBase)?.id === 'ves' && !cadastroPlanejavel('Academia', '', categoriasBase))
t('sugestão sem média cobre o já lançado', sugestaoDoMes(null, 200, [], 450) === 450)
const g = gravarRevisao(deps.planos as any, linhas.map(l => ({ linha: l, valor: l.sugerido })), categoriasBase)
t('gravar: Academia não é gravada', g.naoGravadas.length === ac.length && g.naoGravadas.every(l => l.nome === 'Academia'))
const dez = g.planos[2026].saidas.find(l => l.id === 'ves')!
t('gravar: com parcela, o mês vai em itens (gasto normal + parcela)', (itensDoMes(dez, 11) ?? []).some(i => i.descricao === 'Bicicleta · 1 de 6'), itensDoMes(dez, 11))
t('gravar: o plano original não muda', (deps.planos as any)[2026].saidas.find((l: any) => l.id === 'ves').v[11] === 200)
const depois = lancadoAcimaDoPlano({ ...deps, planos: g.planos }, hoje)
t('confirmar tudo faz o Vestuário sumir do aviso', !depois.some(a => a.nome === 'Vestuário'), depois.map(a => a.nome))
const digitado = gravarRevisao(deps.planos as any, [{ linha: linhas.find(l => l.nome === 'Vestuário')!, valor: 999 }], categoriasBase)
const lDig = linhas.find(l => l.nome === 'Vestuário')!
const linhaDig = digitado.planos[lDig.ano].saidas.find(l => l.id === 'ves')!
t('valor digitado vai só como valor, sem itens', linhaDig.v[lDig.mes] === 999 && itensDoMes(linhaDig, lDig.mes) === null)

// ---------- Avisos da Início ----------
{
  const contasSemana = contasAVencer(deps, hoje)
  const av = avisosDoMes({ contas: contasSemana, linhasSaida: nov, negativo: { ano: 2027, mes: 2, valor: 500 }, lancadoAcima: acima, hoje })
  t('avisos: no máximo 3', av.length <= 3)
  const ordem = ['contas', 'passou', 'parcelas', 'negativo']
  t('avisos: na ordem da urgência', av.every((a, i) => i === 0 || ordem.indexOf(av[i - 1].id) < ordem.indexOf(a.id)), av.map(a => a.id))
  t('avisos: "passou" quando um grupo passou do plano', (gruposQuePassaram(nov).length > 0) === av.some(a => a.id === 'passou'))
  const soNeg = avisosDoMes({ contas: [], linhasSaida: [], negativo: { ano: 2026, mes: 10, valor: 50 }, hoje })
  t('avisos: mês corrente negativo não vira aviso (o topo já mostra)', soNeg.length === 0)
  const frente = avisosDoMes({ contas: [], linhasSaida: [], negativo: { ano: 2027, mes: 2, valor: 50 }, hoje })
  t('avisos: mês negativo à frente vira aviso', frente.length === 1 && frente[0].id === 'negativo' && frente[0].titulo.startsWith('Março'))
  t('avisos: sem nada, lista vazia (a tela diz "Tudo em dia")', avisosDoMes({ contas: [], linhasSaida: [], negativo: null, hoje }).length === 0)
}

console.log(`prova136: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
