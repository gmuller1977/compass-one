import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { COR } from '../../utils/cores'

type SimAtivaRow = {
  id: string
  tipo: 'divida' | 'meta'
  nome: string
  valor_total: number
  parcela: number
  resultado_meses: number
  data_conclusao: string
  integrado_planejamento: boolean
  created_at: string
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * "Minhas metas e dívidas" — saiu da Início para Análises em 06/10/2026, sem
 * mudar o conteúdo. As simulações ativas do Simulador; some quando não há.
 */
export default function MetasDividasCard() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [simAtivas, setSimAtivas] = useState<SimAtivaRow[]>([])
  const hoje = new Date()

  useEffect(() => {
    if (!user) return
    supabase.from('simulacoes').select('*').eq('ativo', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('simulacoes (analises):', error.message); return }
        if (data) setSimAtivas(data as SimAtivaRow[])
      })
  }, [user])

  if (simAtivas.length === 0) return null
  return (
    <div style={{ background: COR.branco, borderRadius: 12, padding: '18px 20px', border: `.5px solid ${COR.borda}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Minhas metas e dívidas</div>
        <button onClick={() => navigate('/simulacao')} style={{
          border: 'none', background: 'transparent', color: COR.azul,
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
        }}>Ver todas →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {simAtivas.slice(0, 4).map(sim => {
          const isDivida = sim.tipo === 'divida'
          const inicio = new Date(sim.created_at)
          const mesesPassados = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth())
          const progresso = Math.max(0, Math.min(100, Math.round((mesesPassados / sim.resultado_meses) * 100)))
          return (
            <div key={sim.id} style={{ border: '1px solid #eef2f7', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
                <span style={{ fontSize: 19 }}>{isDivida ? '💳' : '🐷'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sim.nome}
                  </div>
                  <div style={{ fontSize: 11, color: COR.textoMuted }}>
                    {fmt(sim.valor_total)} · {fmt(sim.parcela)}/mês
                  </div>
                </div>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: 5, borderRadius: 3, background: isDivida ? COR.vermelho : COR.verde, width: `${progresso}%`, transition: 'width .4s' }}/>
              </div>
              <div style={{ fontSize: 11, color: COR.textoMuted, display: 'flex', justifyContent: 'space-between' }}>
                <span>{progresso}% {isDivida ? 'quitado' : 'poupado'}</span>
                <span>{isDivida ? 'Quitada' : 'Alcançada'} em {sim.data_conclusao}</span>
              </div>
              {sim.integrado_planejamento && (
                <div style={{ fontSize: 10, fontWeight: 600, color: COR.azul, marginTop: 5 }}>✓ No planejamento</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
