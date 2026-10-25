import { ehDividaQuitavel, comParcelasRestantes, dividasNoPlano, simularQuitacao, mesesParaQuitar, quitarNoPlano } from '../src/utils/quitacaoDivida'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const civic = { id: 'civic', nome: 'Financiamento', descricao: 'Civic', tipo: 'saida', fixa: true, recorrencia: 'temporaria', ativa: true, tipoMovimento: 'banco', formaPagamento: 'automatico', grupo: 'Transporte', cor: '', icone: '' } as any
const merc = { id: 'merc', nome: 'Mercado', tipo: 'saida', fixa: false, ativa: true, tipoMovimento: 'banco', grupo: 'Casa', cor: '', icone: '' } as any
const alug = { id: 'alug', nome: 'Aluguel', tipo: 'saida', fixa: true, recorrencia: 'anual', ativa: true, tipoMovimento: 'banco', grupo: 'Casa', cor: '', icone: '' } as any
const P = 1149.72
const linha = (id: string, nome: string, desc: string|undefined, v: number[]) => ({ id, nome, descricao: desc, grupo: 'x', t: 'banco', v })
// 16 parcelas: out/2026 .. jan/2028; plano até dez/2028
const v26 = Array(12).fill(0).map((_, m) => m >= 8 ? P : 0)
const v27 = Array(12).fill(P)
const v28 = Array(12).fill(0); v28[0] = P
const planos: any = {
  2026: { saldoInicialJan: 0, entradas: [linha('sal','Salário',undefined,Array(12).fill(8000))], saidas: [linha('civic','Financiamento','Civic',v26), linha('merc','Mercado',undefined,Array(12).fill(500)), linha('alug','Aluguel',undefined,Array(12).fill(0).map((_,m)=>m<11?1500:0))], objetivos: Array(12).fill(1000) },
  2027: { saldoInicialJan: 0, entradas: [], saidas: [linha('civic','Financiamento','Civic',v27)] },
  2028: { saldoInicialJan: 0, entradas: [linha('sal','Salário',undefined,Array(12).fill(10))], saidas: [linha('civic','Financiamento','Civic',v28)] },
}
const ds = dividasNoPlano(planos, [civic, merc, alug], { ano: 2026, mes: 9 }, { ano: 2028, mes: 11 })
t('acha só a parcelada (aluguel fixo mensal fica fora, mesmo terminando antes)', ds.length === 1 && ds[0].cat.id === 'civic')
const d = ds[0]
t('16 parcelas', d.parcelas.length === 16)
t('mensal', d.valorMensal === P)
t('ultima jan/28', d.ultima.ano === 2028 && d.ultima.mes === 0)
t('não vai até o fim', !d.vaiAteOFim)
// série: saldo começa em 2000 e cresce 1500 por mês (out/26..dez/28 = 27 pontos)
const base = Array.from({ length: 27 }, (_, i) => { const t2 = 9 + i; return { ano: 2026 + Math.floor(t2/12), mes: t2 % 12, semCompra: 2000 + 1500*i, comCompra: 2000 + 1500*i, parcela: 0 } })
const serie = { base, fimDoPlano: { ano: 2028, mes: 11 } }
const V = 15000
// quitar em out/26: 2000 - 15000 + 1149,72 < 0 → não cabe
const r0 = simularQuitacao(serie as any, d, V, { ano: 2026, mes: 9 })
t('out: valor = o digitado', Math.abs(r0.valor - V) < 0.01)
t('out não cabe', !r0.cabe && r0.primeiroAperto!.mes === 9)
const c = mesesParaQuitar(serie as any, d, V)
t('candidatos até jan/28 = 16', c.meses.length === 16)
// precisa saldo ≥ 15000 - 1149,72 = 13850,28 → 2000+1500i ≥ 13850,28 → i ≥ 7.9 → i=8 → jun/2027
t('sugerido existe e depois de out', !!c.sugerido && (c.sugerido.ano > 2026 || c.sugerido.mes > 9))
const r = simularQuitacao(serie as any, d, V, c.sugerido!)
const iq = r.fluxo.findIndex(p => p.ano === r.quando.ano && p.mes === r.quando.mes)
console.log('sugerido', c.sugerido, 'valor', r.valor, 'taxa', r.taxa)
t('economia = parcelas - valor estimado', Math.abs(r.economia - (r.removidas.length*P - r.valor)) < 0.01)
t('valor estimado cai com o tempo', r.valor < V && r.economia > 0)
const fim = r.fluxo[r.fluxo.length-1]
t('fim do plano soma economia', Math.abs(r.noFimDoPlano - r.economia) < 0.01)
t('antes do mês nada muda', r.fluxo.slice(0, iq).every(p => p.comCompra === p.semCompra))
t('mês da quitação tira valor - P', Math.abs(r.fluxo[iq].parcela - (r.valor - P)) < 1e-9)
t('mês seguinte devolve P', Math.abs(r.fluxo[iq+1].parcela + P) < 1e-9)
t('depois da última, nada', r.fluxo[20].parcela === 0)
// já paga no mês corrente: out/26 não volta
const rp = simularQuitacao(serie as any, d, V, { ano: 2026, mes: 9 }, true)
t('já paga: 15 removidas', rp.removidas.length === 15 && rp.fluxo[0].parcela === V)
// aperto preexistente não conta: série negativa sem quitação em dez/28, quitação melhora
const base2 = base.map((p, i) => i === 26 ? { ...p, semCompra: -500, comCompra: -500 } : p)
const r2 = simularQuitacao({ base: base2, fimDoPlano: serie.fimDoPlano } as any, d, 8000, c.sugerido!)
t('aperto que já existia e melhora não reprova', r2.cabe)
const rz = simularQuitacao(serie as any, d, 99999, c.sugerido!)
t('sem desconto: taxa 0, valor = parcelas', rz.taxa === 0 && Math.abs(rz.economia) < 0.01)
const base3 = base.map((p, i) => i === iq + 1 ? { ...p, semCompra: 100, comCompra: 100 } : p)
const r3 = simularQuitacao({ base: base3, fimDoPlano: serie.fimDoPlano } as any, d, V, c.sugerido!)
t('controle: mês seguinte apertado reprova', !r3.cabe)
// gravar
const novos = quitarNoPlano(planos, d, r)
const mq = r.quando.mes, aq = r.quando.ano
t('mês = valor em item', novos[aq].saidas[0].v[mq] === r.valor && novos[aq].saidas[0].itens[mq][0].descricao === 'Quitação à vista')
// && novos[2027].saidas[0].itens[5][0].descricao === 'Quitação à vista')
t('meses depois zerados', r.removidas.filter(p=>!(p.ano===aq&&p.mes===mq)).every(p => novos[p.ano].saidas[0].v[p.mes] === 0))
t('jan/28 zerado', novos[2028].saidas[0].v[0] === 0)
t('mês antes intacto', novos[2026].saidas[0].v[9] === P)
t('outra linha intacta', novos[2026].saidas[1] === planos[2026].saidas[1])
t('original intacto', planos[2027].saidas[0].v[6] === P)
// já paga e quitando no corrente: item Parcela + Quitação
const novosP = quitarNoPlano(planos, d, rp)
t('corrente pago: parcela + quitação', novosP[2026].saidas[0].v[9] === Math.round((P+V)*100)/100 && novosP[2026].saidas[0].itens[9].length === 2)
// depois de gravar, a dívida some (só sobra o mês da quitação)
const ds2 = dividasNoPlano(novos, [civic, merc], { ano: 2026, mes: 9 }, { ano: 2028, mes: 11 })
t('depois de gravar: dívida quitada sai da lista', ds2.length === 0)
// controle: valor enorme nunca cabe
const cz = mesesParaQuitar({ base: base.map(p => ({ ...p, semCompra: 0, comCompra: 0 })), fimDoPlano: serie.fimDoPlano } as any, d, V)
t('controle: saldo zerado só cabe na última parcela', cz.sugerido!.ano === 2028 && cz.sugerido!.mes === 0)

// ── Só dívida que já começou; "k de N" corta o que o plano repete além do fim ──
{
  const cat = (id: string, nome: string) => ({ id, nome, tipo: 'saida', fixa: true, recorrencia: 'temporaria', ativa: true, tipoMovimento: 'banco', formaPagamento: 'boleto', grupo: 'x', cor: '', icone: '' }) as any
  const ipva = cat('ipva', 'IPVA'), moto = cat('moto', 'Moto'), tv = cat('tv', 'TV')
  const it = (d: string, v: number) => ({ id: d, descricao: d, valor: v })
  const linhaI = (id: string, nome: string, v: number[], itens?: any) => ({ id, nome, grupo: 'x', t: 'banco', v, ...(itens ? { itens } : {}) })
  const pl: any = {
    2026: { saidas: [
      linhaI('ipva', 'IPVA', Array(12).fill(0)),
      // Moto: começa em outubro, sem parcela antes nem rótulo → não começou
      linhaI('moto', 'Moto', Array(12).fill(0).map((_, m) => m >= 9 ? 300 : 0)),
      // TV: outubro com "TV · 5 de 8", e o plano repetido até o fim
      linhaI('tv', 'TV', Array(12).fill(0).map((_, m) => m >= 9 ? 200 : 0), { 9: [it('TV · 5 de 8', 200)] }),
    ] },
    2027: { saidas: [
      linhaI('ipva', 'IPVA', Array(12).fill(0).map((_, m) => m < 4 ? 400 : 0)),
      linhaI('moto', 'Moto', Array(12).fill(300)),
      linhaI('tv', 'TV', Array(12).fill(200)),
    ] },
  }
  const de = { ano: 2026, mes: 9 }, fim = { ano: 2027, mes: 11 }
  const ds2 = dividasNoPlano(pl, [ipva, moto, tv], de, fim)
  t('IPVA que começa no ano que vem fica fora', !ds2.some(d => d.cat.id === 'ipva'))
  t('parcelamento que começa este mês, sem pagar, fica fora', !ds2.some(d => d.cat.id === 'moto'))
  const tvd = ds2.find(d => d.cat.id === 'tv')!
  t('rótulo 5 de 8: faltam 4', !!tvd && tvd.parcelas.length === 4 && tvd.ultima.ano === 2027 && tvd.ultima.mes === 0)
  t('o plano tinha 15 meses', tvd.noPlano.length === 15)
  const ds3 = dividasNoPlano(pl, [moto], de, fim, c => c.id === 'moto')
  t('controle: a deste mês já paga conta como começada', ds3.length === 1)
  t('a deste mês já paga não entra: começa em novembro', ds3[0].parcelas[0].mes === 10 && ds3[0].parcelas.length === 14)
  t('nem no plano em aberto', ds3[0].noPlano.every(p => !(p.ano === 2026 && p.mes === 9)))
  const tvPaga = dividasNoPlano(pl, [tv], de, fim, () => true)[0]
  t('5 de 8 com a de outubro paga: faltam 3, de nov/26 a jan/27', tvPaga.parcelas.length === 3 && tvPaga.parcelas[0].mes === 10 && tvPaga.ultima.ano === 2027 && tvPaga.ultima.mes === 0)
  const c3 = comParcelasRestantes(tvd, 6, fim)
  t('comParcelasRestantes 6', c3.parcelas.length === 6 && c3.total === 1200)
  // quitar em nov/26 zera dez/26 e jan/27 (contrato) e também fev–dez/27 (repetição)
  const serie2 = Array.from({ length: 15 }, (_, i) => { const m = 9 + i; return { ano: 2026 + Math.floor(m / 12), mes: m % 12, semCompra: 5000, comCompra: 5000, parcela: 0 } })
  const rq = simularQuitacao({ base: serie2, fimDoPlano: fim } as any, tvd, 700, { ano: 2026, mes: 10 }, false)
  const pq = quitarNoPlano(pl, tvd, rq)
  t('quitar zera também o que passava do contrato', pq[2027].saidas[2].v.every((x: number) => x === 0))
}
// ── Lista: só fixa parcelada, no banco, por débito automático ou boleto ──
{
  t('civic em débito automático entra', ehDividaQuitavel(civic))
  t('boleto entra', ehDividaQuitavel({ ...civic, formaPagamento: 'boleto' }))
  t('PIX não entra', !ehDividaQuitavel({ ...civic, formaPagamento: 'pix' }))
  t('sem forma de pagamento não entra', !ehDividaQuitavel({ ...civic, formaPagamento: undefined }))
  t('no cartão não entra', !ehDividaQuitavel({ ...civic, tipoMovimento: 'cartao', formaPagamento: 'parcelado' }))
  t('em dinheiro não entra', !ehDividaQuitavel({ ...civic, tipoMovimento: 'dinheiro', formaPagamento: undefined }))
  t('variável parcelada não entra', !ehDividaQuitavel({ ...civic, fixa: false }))
  t('fixa mensal não entra', !ehDividaQuitavel({ ...civic, recorrencia: 'anual' }))
  t('inativa não entra', !ehDividaQuitavel({ ...civic, ativa: false }))
  const pl: any = { 2026: { saidas: [linha('civic', 'Financiamento', 'Civic', v26)] }, 2027: { saidas: [linha('civic', 'Financiamento', 'Civic', v27)] } }
  t('dividasNoPlano aplica a regra', dividasNoPlano(pl, [{ ...civic, formaPagamento: 'pix' }], { ano: 2026, mes: 9 }, { ano: 2027, mes: 11 }, () => true).length === 0)
}
console.log(`prova95: ${ok} ok, ${falha} falha`)
