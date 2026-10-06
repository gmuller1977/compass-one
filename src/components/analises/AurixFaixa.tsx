import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { COR } from '../../utils/cores'
import { saldoAurix, acoesHoje } from '../../utils/aurix'

const ACOES_DIARIAS_REFS = ['acao_login', 'acao_dashboard', 'acao_lancamento', 'acao_north', 'acao_evolucao']
const ACOES_DIARIAS_TOTAL = 5

/**
 * A faixa do Aurix — saiu da Início para Análises em 06/10/2026, sem mudar o
 * conteúdo. Uma faixa, e não um cartão: gamificação não pesa o mesmo que uma
 * conta vencida.
 */
export default function AurixFaixa() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [aurixSaldo, setAurixSaldo] = useState(0)
  const [aurixStreak, setAurixStreak] = useState(0)
  const [aurixAcoes, setAurixAcoes] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    const uid = user.id
    Promise.all([
      saldoAurix(uid),
      acoesHoje(uid),
      supabase.from('user_preferences').select('streak_atual').eq('user_id', uid).single(),
    ]).then(([s, feitas, { data }]) => {
      setAurixSaldo(s)
      setAurixAcoes(feitas)
      if (data) setAurixStreak(data.streak_atual ?? 0)
    })
  }, [user])

  const feitas = aurixAcoes.filter(r => ACOES_DIARIAS_REFS.includes(r)).length
  const aurixHoje = [
    aurixAcoes.includes('acao_login')     ? 3 : 0,
    aurixAcoes.includes('acao_dashboard') ? 2 : 0,
    aurixAcoes.includes('acao_lancamento')? 5 : 0,
    aurixAcoes.includes('acao_north')     ? 3 : 0,
    aurixAcoes.includes('acao_evolucao')  ? 2 : 0,
  ].reduce((a, b) => a + b, 0)
  return (
    <div style={{
      background: COR.branco, borderRadius: 12, padding: '12px 18px',
      border: `.5px solid ${COR.borda}`,
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
        ✨ <b style={{ color: COR.texto }}>{aurixSaldo.toLocaleString('pt-BR')}</b> Aurix
      </span>
      {aurixStreak > 0 && (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
          🔥 <b style={{ color: COR.texto }}>{aurixStreak}</b> dias seguidos
        </span>
      )}
      <div role="img" aria-label={`${feitas} de ${ACOES_DIARIAS_TOTAL} ações de hoje`}
        style={{ flex: 1, minWidth: 120, height: 6, background: '#eef2f7', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${(feitas / ACOES_DIARIAS_TOTAL) * 100}%`, height: '100%', background: COR.azul, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: COR.textoSuave, whiteSpace: 'nowrap' }}>
        {feitas} de {ACOES_DIARIAS_TOTAL} ações de hoje{aurixHoje > 0 && ` (+${aurixHoje} Aurix)`}
      </span>
      <button onClick={() => navigate('/aurix')} style={{
        border: 'none', background: 'transparent', color: COR.azul, padding: 0,
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>Ver →</button>
    </div>
  )
}
