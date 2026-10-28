// "Baixar meus dados" (25/10/2026, revisão técnica, pacote 2; LGPD art. 18,
// direito de acesso e portabilidade). Junta num arquivo JSON tudo o que o
// banco guarda com o login de quem pede, tabela por tabela, como está
// gravado. Lê com o login da própria pessoa, então o RLS garante que só
// vêm as linhas dela. Fica de fora a chave do aparelho para notificações
// (push_inscricoes): é um segredo do navegador, não um dado da pessoa.
import { supabase } from '../lib/supabase'
import { lerTudo } from './lerTudo'

type Filtro = { coluna: string } | { ou: (id: string) => string }
type Tabela = { nome: string; filtro: Filtro; ordem: string[] }

export const TABELAS_EXPORTADAS: Tabela[] = [
  { nome: 'contas', filtro: { coluna: 'user_id' }, ordem: ['id'] },
  { nome: 'categorias', filtro: { coluna: 'user_id' }, ordem: ['id'] },
  { nome: 'user_preferences', filtro: { coluna: 'user_id' }, ordem: ['user_id'] },
  { nome: 'extrato_data', filtro: { coluna: 'user_id' }, ordem: ['ano', 'mes', 'conta_id'] },
  { nome: 'fatura_data', filtro: { coluna: 'user_id' }, ordem: ['ano', 'mes', 'conta_id'] },
  { nome: 'planejamento_data', filtro: { coluna: 'user_id' }, ordem: ['ano', 'tipo_plano'] },
  { nome: 'simulacoes', filtro: { coluna: 'user_id' }, ordem: ['id'] },
  { nome: 'objetivos_investimento', filtro: { coluna: 'user_id' }, ordem: ['id'] },
  { nome: 'licoes_aprendidas', filtro: { coluna: 'user_id' }, ordem: ['id'] },
  { nome: 'aurix', filtro: { coluna: 'user_id' }, ordem: ['id'] },
  { nome: 'conquistas', filtro: { coluna: 'user_id' }, ordem: ['id'] },
  { nome: 'uso_lancamentos', filtro: { coluna: 'user_id' }, ordem: ['id'] },
  { nome: 'indicacao_codigos', filtro: { coluna: 'user_id' }, ordem: ['user_id'] },
  { nome: 'compartilhamentos', filtro: { ou: id => `dono_id.eq.${id},membro_id.eq.${id}` }, ordem: ['id'] },
  { nome: 'indicacoes', filtro: { ou: id => `indicador_id.eq.${id},indicado_id.eq.${id}` }, ordem: ['id'] },
]

export type MeusDados = {
  geradoEm: string
  conta: { id: string; email: string | null; criadaEm: string | null }
  tabelas: Record<string, unknown[]>
  /** Tabelas que não puderam ser lidas (ex.: migração não rodada). */
  naoLidas: Record<string, string>
}

export async function juntarMeusDados(user: { id: string; email?: string | null; created_at?: string | null }): Promise<MeusDados> {
  const tabelas: Record<string, unknown[]> = {}
  const naoLidas: Record<string, string> = {}
  await Promise.all(TABELAS_EXPORTADAS.map(async t => {
    const { data, error } = await lerTudo<unknown>((de, ate) => {
      let q = supabase.from(t.nome).select('*')
      q = 'coluna' in t.filtro ? q.eq(t.filtro.coluna, user.id) : q.or(t.filtro.ou(user.id))
      for (const o of t.ordem) q = q.order(o)
      return q.range(de, ate)
    })
    if (error) naoLidas[t.nome] = (error as { message?: string }).message ?? 'erro'
    else tabelas[t.nome] = data ?? []
  }))
  return {
    geradoEm: new Date().toISOString(),
    conta: { id: user.id, email: user.email ?? null, criadaEm: user.created_at ?? null },
    tabelas, naoLidas,
  }
}

/** Gera o arquivo e entrega para o navegador salvar. */
export function baixarJson(dados: MeusDados) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `compass-one-meus-dados-${dados.geradoEm.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
