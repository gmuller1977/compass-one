import type { Conta, Categoria, PlanoAnoData } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import { mkCatReal, type CatReal } from '../components/acompanhamento/AcShared'
import { catKey, norm, ehTransferencia } from '../components/acompanhamento/evolucaoCalcs'
import { resolverFixaDoMes, dadosBancariosDoMes } from './fixasDoMes'
import { valorFixaNoMes } from './valorFixa'

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
          // Transferência entre contas próprias fica FORA do realizado: o
          // dinheiro só trocou de conta, não é receita nem despesa. O que ela
          // move aparece no saldo inicial e final das contas — que é o que
          // precisa bater entre o Radar e o extrato. Aqui dentro a pergunta é
          // outra: quanto foi realizado contra o que estava planejado.
          if (ehTransferencia(l.categoria)) continue
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
    // SEM filtro de "ativa": se a fixa esta marcada como paga, o dinheiro saiu
    // da conta. Desativar a categoria depois nao desfaz o pagamento — com o
    // filtro, essa saida existia no extrato e nao virava linha nenhuma aqui, e
    // o total de despesas ficava abaixo da saida da conta. Sem cadastro ativo
    // a linha cai em "Outras", que e onde ela tem de aparecer.
    //
    // O valor sai de valorFixaNoMes, a MESMA funcao que saldoConta usa para
    // debitar a conta. Antes havia duas contas: aqui so por nome/variante, la
    // por id primeiro. Com plano antigo as duas achavam linhas diferentes e
    // discordavam em silencio. valorFixaNoMes ja casa contra o plano resolvido,
    // entao "Financiamento · Casa" continua achando a linha certa.
    for (const fixaCat of categorias.filter((c: Categoria) => c.fixa)) {
      const { consolidada, override } = resolverFixaDoMes(fixaCat.id, dmsBanco)
      if (!consolidada) continue
      const val = valorFixaNoMes(fixaCat, dadosAno, mes, categorias, override)
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
      let compras = 0
      for (let d = 1; d <= pTotalDias; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          const sub = resolverSub(l.categoria, 'saida', l.subCategoria)
          const k   = rKey(l.categoria, sub)
          if (l.tipo === 'entrada') {
            const c = getSaida(k)
            c.total += l.valor; c.totalCart += l.valor
            compras += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao??l.categoria, valor:l.valor, sub:card.apelido??card.nome, fonte:'cartao' })
          } else if (l.tipo === 'saida') {
            // Estorno: abate da categoria de saída
            const c = getSaida(k)
            c.total -= l.valor; c.totalCart -= l.valor
            compras -= l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao??l.categoria, valor:-l.valor, sub:card.apelido??card.nome, fonte:'cartao' })
          }
        }
      }

      // Fatura confirmada com valor diferente da soma das compras.
      //
      // As duas telas medem coisas diferentes de propósito: a despesa acontece
      // na COMPRA (é assim que ela se compara ao plano), mas o que sai da conta
      // é o PAGAMENTO. Enquanto os dois batem, ninguém percebe. Quando você
      // confirma a fatura com outro valor — juros, IOF, uma compra que não foi
      // lançada, arredondamento —, a diferença saía do banco e não aparecia em
      // lugar nenhum.
      //
      // A linha fecha a conta: compras + ajuste = o que foi pago, que é
      // exatamente o que saldoConta debita da conta. Sem cadastro, ela cai em
      // "Outras". Pode ser negativa, quando se paga menos que as compras.
      const { consolidada, override } = resolverFixaDoMes(`cartao-${card.id}`, dmsBanco)
      if (consolidada && override !== undefined && override > 0) {
        // Math.max espelha o clamp de totalFatura: fatura negativa vale zero.
        const ajuste = override - Math.max(compras, 0)
        if (Math.abs(ajuste) >= 0.005) {
          const c = getSaida(rKey('Ajuste de fatura', card.apelido ?? card.nome))
          c.total += ajuste; c.totalBanc += ajuste
          c.lancamentos.push({
            dia: 1, descricao: 'Fatura confirmada com valor ajustado',
            valor: ajuste, sub: 'ajuste', fonte: 'banco',
          })
        }
      }
    }

    for (const c of Object.values(saidas))   c.lancamentos.sort((a,b) => a.dia-b.dia)
    for (const c of Object.values(entradas))  c.lancamentos.sort((a,b) => a.dia-b.dia)

    return { saidasMap: saidas, entradasMap: entradas }
}
