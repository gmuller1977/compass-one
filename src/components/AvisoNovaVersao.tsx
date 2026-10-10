import { useEffect, useState } from 'react'
import { COR } from '../utils/cores'

/**
 * "Versão nova do app · Atualizar". O app aberto no celular não recarrega
 * sozinho depois de uma publicação: a tela continua no código antigo até
 * alguém fechar e abrir. Em 10/10/2026 o Norte respondeu "ainda não consigo
 * lançar" horas depois de a Fase B estar no ar, por isso.
 *
 * Ao voltar para o app e a cada 5 minutos, lê o index.html publicado (sem
 * cache) e compara o script principal com o que está rodando. Mudou: avisa.
 * Só no build publicado — em desenvolvimento não há /assets.
 */
function scriptAtual(): string | null {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')
  return s ? new URL(s.src, location.href).pathname : null
}

export default function AvisoNovaVersao() {
  const [nova, setNova] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV) return
    const atual = scriptAtual()
    if (!atual) return
    let parado = false
    async function conferir() {
      if (parado || document.visibilityState !== 'visible' || !navigator.onLine) return
      try {
        const r = await fetch('/', { cache: 'no-store' })
        if (!r.ok) return
        const m = (await r.text()).match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/[^"]+)"/)
        if (m && new URL(m[1], location.href).pathname !== atual) setNova(true)
      } catch { /* sem rede: confere na próxima */ }
    }
    const t = setInterval(conferir, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', conferir)
    return () => { parado = true; clearInterval(t); document.removeEventListener('visibilitychange', conferir) }
  }, [])

  if (!nova) return null
  return (
    <div role="status" style={{
      position: 'fixed', top: 'calc(10px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 300,
      display: 'flex', alignItems: 'center', gap: 10, background: '#0f172a', color: '#fff', borderRadius: 999,
      padding: '8px 8px 8px 16px', boxShadow: '0 6px 24px rgba(15,23,42,.3)', fontSize: 14, fontWeight: 600,
      fontFamily: "-apple-system,'Inter',sans-serif", whiteSpace: 'nowrap',
    }}>
      Versão nova do app
      <button onClick={() => location.reload()} style={{
        border: 'none', borderRadius: 999, background: '#fff', color: COR.azul, padding: '8px 14px', minHeight: 36,
        fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
      }}>Atualizar</button>
    </div>
  )
}
