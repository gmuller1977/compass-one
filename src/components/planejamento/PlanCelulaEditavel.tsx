import { useState, useRef, useEffect } from 'react'
import { useToast } from '../Toast'
import { fmt, parseValor, COR } from './types'

interface Props {
  valor: number
  readOnly?: boolean
  /** Explicacao mostrada ao clicar numa celula bloqueada. Sem isso o clique
   *  nao dava retorno nenhum e parecia que a tela tinha travado. */
  motivoBloqueio?: string
  onSave: (novoValor: number) => void
  align?: 'right' | 'left'
}

export default function PlanCelulaEditavel({ valor, readOnly = false, motivoBloqueio, onSave, align = 'right' }: Props) {
  const { toast } = useToast()
  const [editando, setEditando] = useState(false)
  const [temp, setTemp] = useState('')
  const skipBlurRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Seleciona UMA vez ao abrir. Antes isso vinha de onFocus, que podia
  // disparar de novo e reselecionar o que ja havia sido digitado.
  useEffect(() => {
    if (!editando) return
    requestAnimationFrame(() => inputRef.current?.select())
  }, [editando])

  function iniciar() {
    if (readOnly) {
      if (motivoBloqueio) toast(motivoBloqueio, 'info')
      return
    }
    setTemp(valor > 0 ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
    setEditando(true)
  }

  function confirmar() {
    const v = parseValor(temp)
    // Ver PlanCelulaNav: valor invalido nao vira zero, senao apaga a celula.
    if (v === null) {
      toast(`"${temp.trim()}" não é um valor. A célula ficou como estava.`, 'error')
      setEditando(false)
      return
    }
    onSave(v >= 0 ? v : 0)
    setEditando(false)
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={temp}
        onChange={e => setTemp(e.target.value)}
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
      onClick={iniciar}
      title={readOnly ? motivoBloqueio : undefined}
      style={{
        padding: '3px 7px', borderRadius: 6,
        cursor: readOnly ? (motivoBloqueio ? 'not-allowed' : 'default') : 'pointer',
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
