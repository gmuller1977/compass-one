import { useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { fixasParaLancar, lancarFixaNaFatura } from '../utils/fixaNoCartao'

/**
 * Lança na fatura em aberto as contas fixas pagas no cartão
 * (utils/fixaNoCartao.ts). Montado no AppShell, em qualquer tela; nada com a
 * cópia do aparelho nem durante o load. O id é fixo por categoria e fatura,
 * então dois aparelhos lançando juntos dão um lançamento só na mescla.
 */
export default function LancarFixasNoCartao() {
  const { user, carregando, dadosDoAparelho, contas, categorias, planos, faturaData, setFaturaData } = useApp()
  const pendentes = useMemo(
    () => fixasParaLancar({ contas, categorias, planos, faturaData: faturaData as Record<string, unknown> }),
    [contas, categorias, planos, faturaData],
  )
  useEffect(() => {
    if (!user || carregando || dadosDoAparelho !== null || pendentes.length === 0) return
    setFaturaData(prev => {
      const out = { ...prev }
      for (const f of pendentes) out[f.chave] = lancarFixaNaFatura(out[f.chave] as never, f)
      return out
    })
  }, [user, carregando, dadosDoAparelho, pendentes, setFaturaData])
  return null
}
