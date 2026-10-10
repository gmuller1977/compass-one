import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import type { Deps } from '../utils/saldoConta'
import { contasAVencer } from '../utils/contasAVencer'
import {
  ativarLembrete, atualizarContasProximas, contasParaLembrete, desativarLembrete, estadoLembrete, type EstadoLembrete,
} from '../utils/lembretes'
import { COR } from '../utils/cores'

/** As contas dos próximos 7 dias, do jeito que o lembrete lê. */
function useContasDoLembrete() {
  const { contas, categorias, extratoData, faturaData, planos, saldoInicialDinheiro, cenarioPrevisao } = useApp()
  return useMemo(() => {
    const deps: Deps = {
      extratoData: extratoData as Record<string, DadosMes>, faturaData: faturaData as Deps['faturaData'],
      contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao,
    }
    return contasParaLembrete(contasAVencer(deps))
  }, [contas, categorias, extratoData, faturaData, planos, saldoInicialDinheiro, cenarioPrevisao])
}

/**
 * Mantém no servidor a lista de contas que o lembrete das 21h lê. Montado no
 * AppShell, em qualquer aparelho — pagar no computador também vale. Nada com
 * a cópia do aparelho (os números podem ser velhos) nem durante o load.
 */
export function SincronizarLembrete() {
  const { user, carregando, dadosDoAparelho } = useApp()
  const lista = useContasDoLembrete()
  useEffect(() => {
    if (!user || carregando || dadosDoAparelho !== null) return
    const t = setTimeout(() => atualizarContasProximas(user.id, lista), 3000)
    return () => clearTimeout(t)
  }, [user, carregando, dadosDoAparelho, lista])
  return null
}

/**
 * O convite na Bússola: "Quer um lembrete às 21h?". Só aparece quando faz
 * sentido — chave configurada, navegador com push e permissão não negada. No
 * iPhone fora do app instalado, explica que precisa instalar.
 */
export default function LembreteDiarioCard() {
  const { user } = useApp()
  const lista = useContasDoLembrete()
  const [estado, setEstado] = useState<EstadoLembrete>('indisponivel')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { estadoLembrete().then(setEstado) }, [])

  if (estado === 'indisponivel' || estado === 'negado') return null

  const caixa: React.CSSProperties = {
    background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: '12px 14px', marginTop: 18,
    display: 'flex', alignItems: 'center', gap: 12,
  }
  if (estado === 'instalar') {
    return (
      <div style={caixa}>
        <span aria-hidden style={{ fontSize: 22 }}>🔔</span>
        <span style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.45 }}>
          Para receber o lembrete das 21h no iPhone, instale o app: <b style={{ color: COR.texto }}>Compartilhar → Adicionar à Tela de Início</b>.
        </span>
      </div>
    )
  }
  if (estado === 'ativo') {
    return (
      <div style={{ ...caixa, padding: '8px 14px' }}>
        <span style={{ flex: 1, fontSize: 12, color: COR.textoSuave }}>🔔 Lembrete das 21h ativo neste aparelho</span>
        <button disabled={ocupado} onClick={async () => { setOcupado(true); await desativarLembrete().catch(() => {}); setEstado(await estadoLembrete()); setOcupado(false) }}
          style={{ border: 'none', background: 'none', color: COR.azul, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          Desativar
        </button>
      </div>
    )
  }
  return (
    <div style={{ ...caixa, flexWrap: 'wrap' }}>
      <span aria-hidden style={{ fontSize: 22 }}>🔔</span>
      <span style={{ flex: '1 1 180px' }}>
        <b style={{ display: 'block', fontSize: 14, color: COR.texto }}>Quer um lembrete às 21h?</b>
        <span style={{ fontSize: 12, color: COR.textoSuave, lineHeight: 1.4 }}>Avisa quando uma conta vence no dia seguinte e quando o dia passou sem lançamento.</span>
      </span>
      <button disabled={ocupado || !user} onClick={async () => {
        if (!user) return
        setOcupado(true); setErro('')
        try { setEstado(await ativarLembrete(user.id, lista)) } catch { setErro('Não deu para ativar agora. Tente de novo com internet.') }
        setOcupado(false)
      }} style={{
        border: 'none', background: COR.azul, color: '#fff', borderRadius: 999, padding: '8px 16px',
        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      }}>{ocupado ? 'Ativando…' : 'Ativar'}</button>
      {erro && <span role="alert" style={{ flexBasis: '100%', fontSize: 12, color: COR.erroTexto }}>{erro}</span>}
    </div>
  )
}
