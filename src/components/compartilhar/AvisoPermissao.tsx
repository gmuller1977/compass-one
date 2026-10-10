import { useEffect, useState } from 'react'
import { COR } from '../../utils/cores'

/**
 * "Só quem lançou (ou o administrador) altera este lançamento." Aparece
 * quando a gravação devolveu um lançamento de outra pessoa que um membro da
 * conta compartilhada tentou alterar ou apagar (utils/autorDoLancamento).
 */
export default function AvisoPermissao() {
  const [n, setN] = useState(0)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const ouvir = (e: Event) => {
      setN((e as CustomEvent<number>).detail || 1)
      clearTimeout(t)
      t = setTimeout(() => setN(0), 6000)
    }
    window.addEventListener('compass-permissao', ouvir)
    return () => { window.removeEventListener('compass-permissao', ouvir); clearTimeout(t) }
  }, [])
  if (!n) return null
  return (
    <div role="alert" style={{
      position: 'fixed', left: 16, right: 16, bottom: 'calc(110px + env(safe-area-inset-bottom))', zIndex: 300,
      maxWidth: 440, margin: '0 auto', background: COR.erroFundo, color: COR.erroTexto, border: '1.5px solid #fecaca',
      borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 600, lineHeight: 1.45,
      boxShadow: '0 8px 24px rgba(15,23,42,.15)', fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      {n === 1 ? 'Esse lançamento é de outra pessoa e voltou como estava.' : `${n} lançamentos de outras pessoas voltaram como estavam.`}
      {' '}Só quem lançou, ou o administrador da conta, pode alterar ou excluir.
    </div>
  )
}
