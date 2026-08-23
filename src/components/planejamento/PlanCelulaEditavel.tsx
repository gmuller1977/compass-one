import { useState, useRef } from 'react'
import { fmt, parseBRL, COR } from './types'

interface Props {
  valor: number
  readOnly?: boolean
  onSave: (novoValor: number) => void
  align?: 'right' | 'left'
}

export default function PlanCelulaEditavel({ valor, readOnly = false, onSave, align = 'right' }: Props) {
  const [editando, setEditando] = useState(false)
  const [temp, setTemp] = useState('')
  const skipBlurRef = useRef(false)

  function iniciar() {
    if (readOnly) return
    setTemp(valor > 0 ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
    setEditando(true)
  }

  function confirmar() {
    const v = parseBRL(temp)
    onSave(v >= 0 ? v : 0)
    setEditando(false)
  }

  if (editando) {
    return (
      <input
        autoFocus
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onFocus={e => e.target.select()}
        onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false } else confirmar() }}
        onKeyDown={e => {
          if (e.key === 'Enter') { skipBlurRef.current = true; confirmar() }
          if (e.key === 'Escape') { skipBlurRef.current = true; setEditando(false) }
        }}
        style={{
          width: '100%', padding: '3px 7px', textAlign: align,
          border: `1.5px solid ${COR.azul}`, outline: 'none',
          background: '#dbeafe', color: COR.azulEscuro, fontSize: 12,
          fontFamily: 'inherit', fontWeight: 600, borderRadius: 6,
          boxSizing: 'border-box',
        }}
      />
    )
  }

  const corVal = readOnly
    ? (valor === 0 ? '#c4b5fd' : '#7c3aed')
    : (valor === 0 ? '#c0cce0' : '#1e293b')

  return (
    <span
      onClick={readOnly ? undefined : iniciar}
      style={{
        padding: '3px 7px', borderRadius: 6,
        cursor: readOnly ? 'default' : 'pointer',
        display: 'inline-block', minWidth: 60,
        textAlign: align, fontVariantNumeric: 'tabular-nums',
        transition: 'background .15s', color: corVal,
      }}
      onMouseEnter={e => { if (!readOnly) { const el = e.currentTarget as HTMLElement; el.style.background = '#eff6ff'; el.style.color = COR.azul } }}
      onMouseLeave={e => { if (!readOnly) { const el = e.currentTarget as HTMLElement; el.style.background = ''; el.style.color = corVal } }}
    >
      {fmt(valor)}
    </span>
  )
}
