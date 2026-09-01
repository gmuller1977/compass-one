import type { Conta, Categoria, PlanoAnoData } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import { mkCatReal, type CatReal } from '../components/acompanhamento/AcShared'
import { catKey, norm, acharPlanCat, resolverPlanCats } from '../components/acompanhamento/evolucaoCalcs'
import { resolverFixaDoMes, dadosBancariosDoMes } from './fixasDoMes'

/**
 * Realizado do mês por categoria — a única fonte para "quanto entrou e quanto
 * saiu neste mês".
 *
 * Vivia dentro do RadarFinanceiro, enquanto a Revisão Mensal tinha o próprio
 * cálculo (`lancadoPorCatMes`). Os dois somavam a mesma coisa por caminhos
 * diferentes e discordavam em silêncio:
 *
 *   - receita sem linha no plano: o Radar contava (extraCats), a Revisão não
 *   - linha do plano de categoria excluída: a Revisão contava, o Radar não
 *   - categoria com nome de cartão: só o Radar excluía
 *
 * Function pura de propósito: quem chama decide o useMemo e as dependências.
 */
export function construirRealizadoMes(params: {
  ano: number
  mes: number
  extratoData: Record<string, DadosMes>
  faturaData: Record<string, unknown>
  contas: Conta[]
  categorias: Categoria[]
  planoAno: PlanoAnoData | undefined
}): { saidasMap: Record<string, CatReal>; entradasMap: Record<string, CatReal> } {
  const { ano, mes, extratoData, faturaData, contas, categorias } = params
  const dadosAno = params.planoAno
  const mesStr = String(mes + 1).padStart(2, '0')
  const totalDias = new Date(ano, mes + 1, 0).getDate()

    const saidas:  Record<string, CatReal> = {}
    const entradas: Record<string, CatReal> = {}
    const sufixo = `-${ano}-${mesStr}`

    // catKey normaliza nome/variante: "Civic " e "Civic" viram a mesma chave
    const rKey = catKey

    function resolverSub(nome: string, tipo: 'saida' | 'entrada', sub?: string): string | undefined {
      if (norm(sub)) return norm(sub)
      const variantes = categorias.filter(
        (c: Categoria) => norm(c.nome) === norm(nome) && c.tipo === tipo && c.ativa && norm(c.descricao)
      )
      return variantes.length === 1 ? norm(variantes[0].descricao) : undefined
    }

    const getSaida   = (k: string) => { if (!saidas[k])   saidas[k]  = mkCatReal(); return saidas[k] }
    const getEntrada = (k: string) => { if (!entradas[k]) entradas[k] = mkCatReal(); return entradas[k] }

    for (const [key, dados] of Object.entries(extratoData)) {
      if (!key.endsWith(sufixo)) continue
      const isDinheiroKey = key.startsWith('dinheiro')
      if (!isDinheiroKey && !contas.some(c => key.startsWith(c.id))) continue
      if (!isDinheiroKey && contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))) continue
      const dm = dados as DadosMes

      for (let d = 1; d <= totalDias; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          const fonte = isDinheiroKey ? 'dinheiro' : (l.formaPagamento === 'dinheiro' ? 'dinheiro' : 'banco')
          const sub   = resolverSub(l.categoria, l.tipo === 'saida' ? 'saida' : 'entrada',
            (l as { subCategoria?: string }).subCategoria)
          if (l.tipo === 'saida') {
            const c = getSaida(rKey(l.categoria, sub))
            c.total += l.valor
            if (fonte === 'dinheiro') c.totalDinheiro += l.valor; else c.totalBanc += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao, valor:l.valor, sub:l.formaPagamento, fonte })
          } else {
            const c = getEntrada(rKey(l.categoria, sub))
            c.total += l.valor
            if (fonte === 'dinheiro') c.totalDinheiro += l.valor; else c.totalBanc += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao, valor:l.valor, sub:l.formaPagamento, fonte })
          }
        }
      }

    }

    // Fixas sao do MES, nao da conta: somadas uma vez so, fora do laco.
    // Ver utils/fixasDoMes — antes cada conta bancaria somava de novo.
    const dmsBanco = dadosBancariosDoMes(
      extratoData as Record<string, DadosMes>,
      sufixo,
      key => contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id)),
    )
    const planResolvidas = {
      saida:   resolverPlanCats('saida',   dadosAno?.saidas   ?? [], categorias),
      entrada: resolverPlanCats('entrada', dadosAno?.entradas ?? [], categorias),
    }
    for (const fixaCat of categorias.filter((c: Categoria) => c.fixa && c.ativa)) {
      const { consolidada, override } = resolverFixaDoMes(fixaCat.id, dmsBanco)
      if (!consolidada) continue
      // O plano tem de ser o RESOLVIDO, nao o cru. Plano antigo guarda a linha
      // so com o nome; e o resolverPlanCats que atribui a variante por posicao
      // — e por isso que a tela mostra "Financiamento · Casa" e
      // "Financiamento · Civic". Procurando no cru, as duas linhas se chamam
      // "Financiamento", acharPlanCat se recusa a escolher (certo) e o valor
      // some. Aqui olhamos a mesma lista que a tela olha.
      const planList = fixaCat.tipo === 'saida' ? planResolvidas.saida : planResolvidas.entrada
      const planVal = acharPlanCat(planList, fixaCat.nome, fixaCat.descricao)?.v[mes] ?? 0
      const val = override ?? (planVal > 0 ? planVal : 0)
      if (val <= 0) continue
      const fixaSub = resolverSub(fixaCat.nome, fixaCat.tipo as 'saida' | 'entrada', fixaCat.descricao)
      const alvo = fixaCat.tipo === 'saida' ? getSaida(rKey(fixaCat.nome, fixaSub)) : getEntrada(rKey(fixaCat.nome, fixaSub))
      alvo.total += val; alvo.totalBanc += val
      alvo.lancamentos.push({ dia:1, descricao:fixaCat.nome, valor:val, sub:'automático', fonte:'banco' })
    }

    const fat = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; categoria: string; subCategoria?: string; descricao?: string; valor: number }[]> }>
    for (const card of contas.filter(c => c.tipo === 'cartao')) {
      const billingOff = (card.diaVencimento ?? 1) < (card.diaFechamento ?? 1) ? 1 : 0
      let pMes = mes - billingOff, pAno = ano
      if (pMes < 0) { pMes += 12; pAno-- }
      const pMesStr = String(pMes + 1).padStart(2, '0')
      const key = `${card.id}-${pAno}-${pMesStr}`
      const dm = fat[key]
      if (!dm) continue
      const pTotalDias = new Date(pAno, pMes + 1, 0).getDate()
      for (let d = 1; d <= pTotalDias; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          const sub = resolverSub(l.categoria, 'saida', l.subCategoria)
          const k   = rKey(l.categoria, sub)
          if (l.tipo === 'entrada') {
            const c = getSaida(k)
            c.total += l.valor; c.totalCart += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao??l.categoria, valor:l.valor, sub:card.apelido??card.nome, fonte:'cartao' })
          } else if (l.tipo === 'saida') {
            // Estorno: abate da categoria de saída
            const c = getSaida(k)
            c.total -= l.valor; c.totalCart -= l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao??l.categoria, valor:-l.valor, sub:card.apelido??card.nome, fonte:'cartao' })
          }
        }
      }
    }

    for (const c of Object.values(saidas))   c.lancamentos.sort((a,b) => a.dia-b.dia)
    for (const c of Object.values(entradas))  c.lancamentos.sort((a,b) => a.dia-b.dia)

    return { saidasMap: saidas, entradasMap: entradas }
}
