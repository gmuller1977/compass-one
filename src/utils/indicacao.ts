import { supabase } from '../lib/supabase'
import { SITE_URL } from './site'

/**
 * Link de indicação (11/10/2026, pedido do Guilherme no lugar da
 * gamificação Aurix): cada login tem um código, o link é /i/<código>, e o
 * indicado fica registrado com quem o indicou. É a base do desconto na
 * mensalidade por quantidade de indicações, que ainda não existe.
 *
 * Quem GRAVA a indicação é o banco (migração 018, `registrar_indicacao`):
 * o indicador não consegue inserir indicação para si, e o indicado só
 * conta uma vez, para um indicador, e só com conta nova (até 30 dias).
 *
 * O código viaja de duas formas, para sobreviver aos dois caminhos de
 * cadastro:
 *   - localStorage, gravado ao abrir o link (Google volta no mesmo navegador);
 *   - user_metadata.indicado_por, gravado no signUp por e-mail (a pessoa
 *     pode confirmar o e-mail em outro aparelho).
 */

export { normalizarCodigo, guardarCodigoRecebido, codigoRecebido, esquecerCodigoRecebido } from './indicacaoLocal'
import { codigoRecebido, esquecerCodigoRecebido, normalizarCodigo, CHAVE_INDICACAO as CHAVE } from './indicacaoLocal'

export function linkDeIndicacao(codigo: string, origem = SITE_URL): string {
  return `${origem}/i/${codigo}`
}

export function textoDoConvite(link: string): string {
  return `Estou usando o Compass One para organizar minhas finanças: planejamento, radar do mês e previsão do saldo. Crie a sua conta pelo meu link: ${link}`
}

export async function meuCodigo(): Promise<{ codigo: string | null; erro: string }> {
  const { data, error } = await supabase.rpc('meu_codigo_indicacao')
  if (error) {
    const faltaMigracao = /function|does not exist|schema cache/i.test(error.message)
    return { codigo: null, erro: faltaMigracao ? 'O link de indicação ainda não foi ativado.' : 'Não foi possível carregar o seu link agora.' }
  }
  return { codigo: (data as string) ?? null, erro: '' }
}

export type Indicado = { email: string; status: string; criado_em: string }

export async function minhasIndicacoes(): Promise<Indicado[]> {
  const { data, error } = await supabase.rpc('minhas_indicacoes')
  if (error) return []
  return (data ?? []) as Indicado[]
}

/**
 * Chamado no 1º acesso de quem tem um código recebido. Erro de rede mantém
 * o código para a próxima abertura; qualquer resposta do banco o encerra
 * (registrou, ou não vale — próprio, conta antiga, já indicado).
 */
export async function registrarIndicacaoPendente(uid: string, metadataCodigo: unknown): Promise<void> {
  const feita = `${CHAVE}-feita-${uid}`
  try { if (localStorage.getItem(feita)) { esquecerCodigoRecebido(); return } } catch { /* sem storage */ }
  const codigo = codigoRecebido() ?? (typeof metadataCodigo === 'string' ? normalizarCodigo(metadataCodigo) : null)
  if (!codigo) return
  const { error } = await supabase.rpc('registrar_indicacao', { p_codigo: codigo })
  if (error) {
    console.warn('[indicacao] não registrada:', error.message)
    return
  }
  esquecerCodigoRecebido()
  try { localStorage.setItem(feita, '1') } catch { /* sem storage */ }
}
