import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import type { Motivo } from '../../utils/motivoDoEstouro'
import { desvioPerc } from '../../utils/motivoDoEstouro'

/**
 * Os motivos anotados de um mês (`licoes_aprendidas`), do login atual — como a
 * Revisão mensal sempre gravou: numa conta compartilhada, cada pessoa anota os
 * seus. Um evento de janela mantém o Radar, a Início e a Revisão em dia quando
 * um deles grava.
 */
const EVENTO = 'compass-motivos'

type Linha = {
  id: string; ano: number; mes: number; categoria_nome: string
  justificativa: string; tipo_evento: Motivo['tipoEvento']; acao_tomada: string | null
}

export function useMotivosDoMes(ano: number, mes: number) {
  const { user } = useApp()
  const uid = user?.id ?? null
  const [motivos, setMotivos] = useState<Motivo[]>([])

  const recarregar = useCallback(async () => {
    if (!uid) { setMotivos([]); return }
    const { data, error } = await supabase.from('licoes_aprendidas')
      .select('id, ano, mes, categoria_nome, justificativa, tipo_evento, acao_tomada')
      .eq('user_id', uid).eq('ano', ano).eq('mes', mes).eq('tipo', 'despesa')
    if (error) { console.warn('motivos do mês:', error.message); return }
    setMotivos(((data ?? []) as Linha[]).map(l => ({
      id: l.id, ano: l.ano, mes: l.mes, categoria: l.categoria_nome,
      justificativa: l.justificativa ?? '', tipoEvento: l.tipo_evento ?? null, revisado: !!l.acao_tomada,
    })))
  }, [uid, ano, mes])

  useEffect(() => {
    void recarregar()
    const h = () => { void recarregar() }
    window.addEventListener(EVENTO, h)
    return () => window.removeEventListener(EVENTO, h)
  }, [recarregar])

  /** Grava (ou apaga, com texto vazio) o motivo de uma categoria do mês. */
  const salvar = useCallback(async (p: {
    rotulo: string; prev: number; real: number
    justificativa: string; tipoEvento: Motivo['tipoEvento']
  }): Promise<string | null> => {
    if (!uid) return 'Sem login.'
    const existente = motivos.find(m => m.categoria === p.rotulo)
    const texto = p.justificativa.trim()
    let error: { message: string } | null = null
    if (!texto) {
      if (existente && !existente.revisado) {
        ({ error } = await supabase.from('licoes_aprendidas').delete().eq('id', existente.id))
      }
    } else {
      const d = desvioPerc(p.prev, p.real)
      const valores = {
        valor_previsto: p.prev, valor_realizado: p.real, desvio: p.real - p.prev,
        desvio_percentual: Number.isFinite(d) ? Math.round(d) : 0,
        justificativa: texto, tipo_evento: p.tipoEvento,
      }
      if (existente) {
        ({ error } = await supabase.from('licoes_aprendidas').update(valores).eq('id', existente.id))
      } else {
        ({ error } = await supabase.from('licoes_aprendidas').insert({
          user_id: uid, ano, mes, categoria_nome: p.rotulo, tipo: 'despesa', ...valores,
        }))
      }
    }
    if (error) { console.error('salvar motivo:', error.message); return error.message }
    window.dispatchEvent(new Event(EVENTO))
    return null
  }, [uid, ano, mes, motivos])

  return { motivos, salvar, recarregar }
}

export function avisarMotivosMudaram() {
  window.dispatchEvent(new Event(EVENTO))
}
