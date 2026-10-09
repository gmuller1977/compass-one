import type { Categoria, TipoCategoria } from '../context/AppContext'

/**
 * O nome da categoria no cadastro: sugerir as que já existem enquanto se
 * digita, e gravar com a grafia EXATA da existente. Pedido do Guilherme em
 * 08/10/2026 — o campo era aberto, e o app identifica a categoria por (nome,
 * variante) com o nome exato: "academia" ou "Alimentacao" virariam outra
 * categoria no plano e no Radar, sem ninguém perceber.
 */
export type NomeSugerido = { nome: string; grupo?: string; variantes: string[] }

/** Sem acento, sem caixa, sem espaço sobrando — só para comparar. */
export const chaveNome = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

export const mesmoNome = (a: string, b: string) => chaveNome(a) === chaveNome(b)

/**
 * As categorias do tipo com uma PALAVRA que começa com o digitado ("sa" acha
 * "Plano de Saúde"; "aca" não acha "Alimentação"), uma por nome, com as
 * variantes. Ordem: começa com o digitado, depois as do grupo escolhido,
 * depois alfabética. Campo vazio com grupo escolhido mostra as do grupo; vazio
 * sem grupo, nada. No máximo `max`.
 */
export function nomesParaSugerir(
  texto: string, tipo: TipoCategoria, grupo: string | undefined, categorias: Categoria[], max = 8,
): NomeSugerido[] {
  const q = chaveNome(texto)
  const porNome = new Map<string, NomeSugerido & { ativa: boolean }>()
  for (const c of categorias) {
    if (c.tipo !== tipo || !c.nome.trim()) continue
    const k = chaveNome(c.nome)
    const atual = porNome.get(k) ?? { nome: c.nome.trim(), grupo: c.grupo, variantes: [], ativa: false }
    // A grafia e o grupo de uma ATIVA valem mais que os de uma desativada.
    if (c.ativa && !atual.ativa) { atual.nome = c.nome.trim(); atual.grupo = c.grupo ?? atual.grupo; atual.ativa = true }
    const d = c.descricao?.trim()
    if (d && !atual.variantes.includes(d)) atual.variantes.push(d)
    porNome.set(k, atual)
  }
  const todas = [...porNome.values()]
  const candidatas = q
    ? todas.filter(s => { const k = chaveNome(s.nome); return k.startsWith(q) || k.includes(` ${q}`) })
    : grupo ? todas.filter(s => s.grupo === grupo) : []
  return candidatas
    .sort((a, b) =>
      Number(chaveNome(b.nome).startsWith(q)) - Number(chaveNome(a.nome).startsWith(q))
      || Number(!!grupo && b.grupo === grupo) - Number(!!grupo && a.grupo === grupo)
      || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, max)
    .map(({ nome, grupo: g, variantes }) => ({ nome, grupo: g, variantes }))
}

/** O nome com a grafia da categoria existente de mesmo nome, se houver. */
export function nomeCanonico(nome: string, tipo: TipoCategoria, categorias: Categoria[], ignorarId?: string | null): string {
  const limpo = nome.trim()
  const doTipo = categorias.filter(c => c.tipo === tipo && c.id !== ignorarId && mesmoNome(c.nome, limpo))
  const existente = doTipo.find(c => c.ativa) ?? doTipo[0]
  return existente ? existente.nome.trim() : limpo
}
