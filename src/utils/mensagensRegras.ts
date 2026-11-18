import type { User } from '@supabase/supabase-js'

/**
 * Regras puras da caixa de mensagens e do aceite de ofertas (18/11/2026),
 * sem banco, para as provas rodarem fora do navegador. O resto mora em
 * mensagens.ts e ofertasEmail.ts.
 */

type ComData = { id: number; criado_em: string }

/**
 * Comunicado conta como novo só se foi publicado depois que o login foi
 * criado: quem chega hoje não abre a caixa com o histórico inteiro aceso.
 */
export function comunicadosNaoLidos(comunicados: ComData[], lidos: Set<number>, contaCriadaEm: string | undefined): number {
  const desde = contaCriadaEm ? new Date(contaCriadaEm).getTime() : 0
  return comunicados.filter(c => !lidos.has(c.id) && new Date(c.criado_em).getTime() >= desde).length
}

export function ehNovo(c: ComData, lidos: Set<number>, contaCriadaEm: string | undefined): boolean {
  return comunicadosNaoLidos([c], lidos, contaCriadaEm) === 1
}

/** Texto do selo: até 9, depois "9+". */
export function textoDoSelo(n: number): string {
  return n > 9 ? '9+' : String(n)
}

export function aceiteDeOfertas(aceitou: boolean, agora: Date = new Date()) {
  return { ofertas_email: aceitou, ofertas_email_em: agora.toISOString() }
}

export function respondeuOfertas(user: Pick<User, 'user_metadata'> | null | undefined): boolean {
  return typeof user?.user_metadata?.ofertas_email === 'boolean'
}

export function aceitouOfertas(user: Pick<User, 'user_metadata'> | null | undefined): boolean {
  return user?.user_metadata?.ofertas_email === true
}

