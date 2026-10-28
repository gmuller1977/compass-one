import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Objetivo } from './investimentos'

/**
 * Leitura e gravação dos objetivos dos investimentos (tabela
 * `objetivos_investimento`, migração 022). Fica fora do AppContext: só a
 * tela de Investimentos lê. Cadastro é do administrador (a regra da 017).
 */

type Linha = {
  id: string; user_id: string; conta_id: string; nome: string
  valor_alvo: number | string | null; ate: string | null
  saldo_inicial: number | string; criado_em: string
}

const deLinha = (l: Linha): Objetivo => ({
  id: l.id, contaId: l.conta_id, nome: l.nome,
  valorAlvo: l.valor_alvo === null ? undefined : Number(l.valor_alvo),
  ate: l.ate ?? undefined, saldoInicial: Number(l.saldo_inicial) || 0, criadoEm: l.criado_em,
})

/** Tabela ainda não criada: o Supabase responde 42P01 ou PGRST205. */
const faltaTabela = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /objetivos_investimento/.test(e.message ?? ''))

/**
 * `userId` é quem fez login. A leitura não filtra: o RLS devolve os do
 * próprio login e, para quem entrou por convite, os do dono. Gravar, só o
 * administrador (`podeGravar`), com o próprio id.
 */
export function useObjetivos(userId: string | undefined, podeGravar: boolean) {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [faltaMigracao, setFaltaMigracao] = useState(false)

  const carregar = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase.from('objetivos_investimento').select('*').order('created_at')
    if (error) {
      if (faltaTabela(error)) setFaltaMigracao(true)
      else console.error('objetivos_investimento (ler):', error.message)
      return
    }
    setFaltaMigracao(false)
    setObjetivos((data as Linha[]).map(deLinha))
  }, [userId])

  useEffect(() => { void carregar() }, [carregar])

  async function salvar(o: Objetivo): Promise<string | null> {
    if (!userId) return 'Entre de novo para salvar.'
    if (!podeGravar) return 'Só o administrador da conta cria e altera objetivos.'
    const { error } = await supabase.from('objetivos_investimento').upsert({
      id: o.id, user_id: userId, conta_id: o.contaId, nome: o.nome.trim(),
      valor_alvo: o.valorAlvo ?? null, ate: o.ate ?? null,
      saldo_inicial: o.saldoInicial, criado_em: o.criadoEm,
    })
    if (error) {
      if (faltaTabela(error)) { setFaltaMigracao(true); return 'Os objetivos ainda não foram ativados no banco de dados.' }
      console.error('objetivos_investimento (gravar):', error.message)
      return 'Não foi possível salvar o objetivo. Tente de novo.'
    }
    await carregar()
    return null
  }

  async function excluir(id: string): Promise<string | null> {
    if (!podeGravar) return 'Só o administrador da conta cria e altera objetivos.'
    const { error } = await supabase.from('objetivos_investimento').delete().eq('id', id)
    if (error) {
      console.error('objetivos_investimento (excluir):', error.message)
      return 'Não foi possível excluir o objetivo. Tente de novo.'
    }
    await carregar()
    return null
  }

  return { objetivos, faltaMigracao, salvar, excluir }
}
