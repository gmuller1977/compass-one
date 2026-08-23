import { useRef, useEffect, useState } from 'react'
import { parseBRL } from './types'

interface Props {
  valor: number
  editavel: boolean
  ativa: boolean
  editando: boolean
  onChange: (v: number) => void
  onNavigate: (dir: 'up' | 'down' | 'left' | 'right') => void
  onStartEdit: (initChar?: string) => void
  onCancelEdit: () => void
  onClick?: () => void
  color?: string
  style?: React.CSSProperties
}

export default function PlanCelulaNav({
  valor, editavel, ativa, editando,
  onChange, onNavigate, onStartEdit, onCancelEdit, onClick, color, style,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputVal, setInputVal] = useState('')

  useEffect(() => {
    if (editando) {
      const formatted = valor === 0
        ? ''
        : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      setInputVal(formatted)
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [editando])

  function save(dir?: 'up' | 'down' | 'left' | 'right') {
    onChange(parseBRL(inputVal || '0'))
    if (dir) onNavigate(dir)
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); save('down'); return }
    if (e.key === 'Escape') { e.preventDefault(); onCancelEdit(); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); save('up'); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); save('down'); return }
    if (e.key === 'ArrowLeft') {
      const inp = inputRef.current
      if (inp?.selectionStart === 0 && inp.selectionEnd === 0) { e.preventDefault(); save('left') }
    }
    if (e.key === 'ArrowRight') {
      const inp = inputRef.current
      if (inp && inp.selectionStart === inp.value.length && inp.selectionEnd === inp.value.length) {
        e.preventDefault(); save('right')
      }
    }
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleInputKey}
        onBlur={() => save()}
        autoFocus
        style={{
          width: '100%', height: '100%',
          background: '#fff',
          border: '2px solid #1a56db',
          borderRadius: 4,
          fontSize: 10, fontWeight: 600,
          textAlign: 'right',
          padding: '0 4px',
          color: '#1e293b',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
    )
  }

  return (
    <div
      onClick={editavel ? (onClick ?? (() => onStartEdit())) : undefined}
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 8px',
        cursor: editavel ? 'pointer' : 'default',
        color,
        userSelect: 'none',
        boxSizing: 'border-box',
        fontVariantNumeric: 'tabular-nums',
        borderRadius: 4,
        outline: ativa ? '2px solid #1a56db' : 'none',
        outlineOffset: -2,
        background: ativa ? 'rgba(26,86,219,0.12)' : undefined,
        transition: 'all 100ms ease',
        ...style,
      }}
    >
      {valor === 0 ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
    </div>
  )
}
