/**
 * Lançamentos que ainda não chegaram ao banco, guardados NESTE aparelho.
 *
 * Sem sinal, a gravação falha e o mês fica só na memória da aba — fechar o
 * app perdia o lançamento. Agora, enquanto um mês não é confirmado pelo
 * banco, a cópia dele fica no localStorage do aparelho, por usuário; na
 * próxima abertura o AppContext devolve esses meses ao estado e grava.
 *
 * Guarda o MÊS inteiro, não o lançamento: é a unidade que a gravação já usa
 * (ver gravacaoPorMes). Consequência aceita: se o mesmo mês for mudado em
 * outro aparelho antes de este voltar a ter sinal, a cópia daqui vence.
 *
 * localStorage pode faltar (modo privado, cota cheia): toda leitura e escrita
 * é protegida, e o app segue funcionando — só sem essa rede de segurança.
 */
export type Pendentes = { extrato: Record<string, unknown>; fatura: Record<string, unknown> }

const chave = (uid: string) => `compass-pendentes-${uid}`

export function lerPendentes(uid: string): Pendentes {
  try {
    const bruto = localStorage.getItem(chave(uid))
    if (!bruto) return { extrato: {}, fatura: {} }
    const p = JSON.parse(bruto) as Partial<Pendentes>
    return { extrato: p.extrato ?? {}, fatura: p.fatura ?? {} }
  } catch {
    return { extrato: {}, fatura: {} }
  }
}

/** Grava a lista atual de pendentes (vazia = apaga). Devolve se conseguiu. */
export function guardarPendentes(uid: string, p: Pendentes): boolean {
  try {
    if (Object.keys(p.extrato).length === 0 && Object.keys(p.fatura).length === 0) localStorage.removeItem(chave(uid))
    else localStorage.setItem(chave(uid), JSON.stringify(p))
    return true
  } catch {
    return false
  }
}
