// Leitura em páginas (25/10/2026, revisão técnica, pacote 2).
// O Supabase devolve no máximo 1.000 linhas por consulta e corta o resto SEM
// erro. Extrato e fatura têm uma linha por conta e por mês, e o saldo de hoje
// depende de TODO o histórico (cada mês abre com o fechamento do anterior):
// uma conta com muitos meses perderia os mais novos em silêncio e o saldo
// sairia errado. Por isso a leitura vai de mil em mil até a página vir menor.
// A consulta precisa ter ordem estável (a chave inteira), senão uma página
// pode repetir ou pular linhas.

export const LINHAS_POR_PAGINA = 1000

type Pagina<T> = PromiseLike<{ data: T[] | null; error: unknown }>

export async function lerTudo<T>(
  pagina: (de: number, ate: number) => Pagina<T>,
  tamanho = LINHAS_POR_PAGINA,
): Promise<{ data: T[] | null; error: unknown }> {
  const todas: T[] = []
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await pagina(de, de + tamanho - 1)
    if (error) return { data: null, error }
    const linhas = data ?? []
    todas.push(...linhas)
    if (linhas.length < tamanho) return { data: todas, error: null }
  }
}
