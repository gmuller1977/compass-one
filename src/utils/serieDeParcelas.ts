/**
 * Mudar a QUANTIDADE de parcelas ao editar a 1ª parcela de uma compra na
 * fatura (06/11/2026, bug relatado pelo Guilherme: compra editada para 6×
 * aparecia só "de 6", sem "1 de 6", e as parcelas não iam para os meses
 * seguintes).
 *
 * A compra nova já nasce em série (`<base>-1` … `<base>-N`, cada uma no mês
 * seguinte). Na EDIÇÃO, o campo "parcelas" só trocava o número da própria
 * linha: uma compra à vista (ou a fixa lançada sozinha) virava "de 6" sem
 * `parcelaAtual` e sem as outras cinco. Aqui a série é refeita a partir da
 * mãe, com as mesmas regras da compra nova:
 *
 * - de 1 para N: a mãe vira a parcela 1 e as 2..N nascem nos meses
 *   seguintes, no mesmo dia (ou no último do mês), não consolidadas, sem
 *   `fixaId` (só a mãe é a fixa daquele mês);
 * - de N para M: as que faltam nascem, as que sobram saem (com a bolinha de
 *   conferida), e todas passam a dizer "de M";
 * - de N para 1: as outras saem e a mãe volta a ser à vista.
 *
 * Uma linha com `parcelas` > 1 e SEM `parcelaAtual` é o defeito acima: conta
 * como à vista, e salvar de novo conserta.
 *
 * A mãe precisa do id `<base>-1`, porque as telas acham a série tirando o
 * `-<número>` do fim. Quando o id não é desse formato (a fixa lançada
 * sozinha, `fixa-<cat>-2026-11`, cujo "-11" daria colisão com a fixa de
 * dezembro), a mãe ganha `<novoBase>-1` e a bolinha de conferida vai junto.
 */
import { diaNoMes } from './diasDaFatura'

type Lanc = { id: string; parcelas?: number; parcelaAtual?: number; consolidado?: boolean; fixaId?: string }
type Mes<L> = { lancamentos: Record<number, L[]>; conferidos?: Record<string, boolean> }

export function chaveDoMes(contaId: string, ano: number, mes: number) {
  return `${contaId}-${ano}-${String(mes + 1).padStart(2, '0')}`
}

/** Está numa série de verdade (tem o número da parcela)? */
export function emSerie(l: { parcelas?: number; parcelaAtual?: number }): boolean {
  return (l.parcelas ?? 1) > 1 && (l.parcelaAtual ?? 0) >= 1
}

export function refazerSerieDeParcelas<L extends Lanc, M extends Mes<L>>(
  dados: Record<string, M>,
  o: {
    contaId: string
    /** Mês da fatura em que a mãe está (0–11). */
    ano: number; mes: number
    /** Id da mãe ANTES desta gravação, já gravada com os campos novos. */
    idMae: string
    /** A mãe como estava antes da edição (para saber a série antiga). */
    antes: { parcelas?: number; parcelaAtual?: number }
    /** Quantidade nova. */
    n: number
    /** Base nova, usada quando o id da mãe não é `<base>-1`. */
    novoBase: string
    /** Mês vazio, para o mês da parcela que ainda não tem nada. */
    vazio: M
  },
): Record<string, M> {
  const kMae = chaveDoMes(o.contaId, o.ano, o.mes)
  const dmMae = dados[kMae]
  if (!dmMae) return dados
  let diaMae = -1
  let mae: L | undefined
  for (const [d, lista] of Object.entries(dmMae.lancamentos)) {
    const achou = (lista ?? []).find(l => l.id === o.idMae)
    if (achou) { diaMae = parseInt(d); mae = achou; break }
  }
  if (!mae) return dados
  if (emSerie(o.antes) && (o.antes.parcelaAtual ?? 1) !== 1) return dados // só a mãe refaz

  const nAntes = emSerie(o.antes) ? o.antes.parcelas! : 1
  const n = Math.max(1, Math.floor(o.n))
  const consertar = !emSerie(o.antes) && (mae.parcelas ?? 1) > 1
  if (nAntes === n && !consertar && (n === 1 || mae.parcelaAtual === 1)) return dados

  // Id da mãe no formato da série.
  const baseAtual = o.idMae.replace(/-\d+$/, '')
  const idOk = o.idMae === `${baseAtual}-1`
  const base = emSerie(o.antes) || idOk ? baseAtual : o.novoBase
  const idNovo = `${base}-1`

  const novaMae: L = {
    ...mae, id: idNovo,
    parcelas: n > 1 ? n : undefined,
    parcelaAtual: n > 1 ? 1 : undefined,
  }
  let conferidosMae = dmMae.conferidos
  if (idNovo !== o.idMae && conferidosMae?.[o.idMae] !== undefined) {
    const { [o.idMae]: marca, ...resto } = conferidosMae
    conferidosMae = { ...resto, [idNovo]: marca }
  }
  let result: Record<string, M> = {
    ...dados,
    [kMae]: {
      ...dmMae,
      ...(conferidosMae ? { conferidos: conferidosMae } : {}),
      lancamentos: {
        ...dmMae.lancamentos,
        [diaMae]: dmMae.lancamentos[diaMae].map(l => l.id === o.idMae ? novaMae : l),
      },
    },
  }

  for (let p = 2; p <= Math.max(nAntes, n); p++) {
    let m = o.mes + (p - 1), a = o.ano
    while (m > 11) { m -= 12; a++ }
    const k = chaveDoMes(o.contaId, a, m)
    const id = `${base}-${p}`
    const dm = result[k] ?? o.vazio
    let existe = false
    const lancs: Record<number, L[]> = {}
    for (const [d, lista] of Object.entries(dm.lancamentos)) {
      lancs[parseInt(d)] = (lista ?? []).flatMap(l => {
        if (l.id !== id) return [l]
        existe = true
        return p > n ? [] : [{ ...l, parcelas: n, parcelaAtual: p }]
      })
    }
    let conferidos = dm.conferidos
    if (p > n && conferidos?.[id] !== undefined) {
      const { [id]: _fora, ...resto } = conferidos
      void _fora
      conferidos = resto
    }
    if (!existe && p <= n) {
      const dP = diaNoMes(diaMae, a, m)
      const { fixaId: _fixa, ...semFixa } = novaMae
      void _fixa
      const nova = { ...semFixa, id, parcelas: n, parcelaAtual: p, consolidado: false } as L
      lancs[dP] = [...(lancs[dP] ?? []), nova]
      // Compra conferida: a parcela nova nasce conferida (alternarConferidaDaCompra).
      if (conferidosMae?.[idNovo] === true) conferidos = { ...(conferidos ?? {}), [id]: true }
    }
    if (!existe && p > n) continue
    result = { ...result, [k]: { ...dm, ...(conferidos ? { conferidos } : {}), lancamentos: lancs } }
  }
  return result
}

/**
 * A bolinha de conferida vale para a COMPRA inteira (06/11/2026, Guilherme:
 * "uma compra no crédito parcelada que já foi confirmada, as outras parcelas
 * já devem aparecer confirmadas também"). Marcar ou desmarcar qualquer
 * parcela marca ou desmarca todas, cada uma no mês da fatura dela. Revê o
 * "a parcela de cada mês se confere à parte" de 28/10. Compra à vista (ou o
 * "de N" sem número, o defeito de antes) marca só ela.
 */
export function alternarConferidaDaCompra<L extends Lanc, M extends Mes<L>>(
  dados: Record<string, M>,
  o: { contaId: string; ano: number; mes: number; l: L; vazio: M },
): Record<string, M> {
  const kAqui = chaveDoMes(o.contaId, o.ano, o.mes)
  const marcar = (dados[kAqui]?.conferidos?.[o.l.id]) !== true
  const alvos: Array<{ k: string; id: string }> = []
  if (emSerie(o.l)) {
    const base = o.l.id.replace(/-\d+$/, '')
    for (let p = 1; p <= o.l.parcelas!; p++) {
      let m = o.mes + (p - o.l.parcelaAtual!), a = o.ano
      while (m < 0) { m += 12; a-- }
      while (m > 11) { m -= 12; a++ }
      alvos.push({ k: chaveDoMes(o.contaId, a, m), id: `${base}-${p}` })
    }
  } else {
    alvos.push({ k: kAqui, id: o.l.id })
  }
  let result = dados
  for (const { k, id } of alvos) {
    const dm = result[k]
    // Só onde a parcela existe (a de outro mês pode ter sido excluída).
    const existe = !!dm && Object.values(dm.lancamentos).some(lista => (lista ?? []).some(x => x.id === id))
    if (!existe) continue
    const atual = { ...(dm.conferidos ?? {}) }
    if (marcar) atual[id] = true
    else delete atual[id]
    result = { ...result, [k]: { ...dm, conferidos: atual } }
  }
  return result
}
