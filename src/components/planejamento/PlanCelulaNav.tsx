import { useRef, useEffect, useState } from 'react'
import { useToast } from '../Toast'
import { parseValor } from './types'

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
  /** Digito que abriu a edicao: entra no campo e o cursor vai para o fim. */
  initChar?: string
  /** Explicacao mostrada ao clicar numa celula bloqueada. */
  motivoBloqueio?: string
}

export default function PlanCelulaNav({
  valor, editavel, ativa, editando,
  onChange, onNavigate, onStartEdit, onCancelEdit, onClick, color, style, initChar, motivoBloqueio,
}: Props) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputVal, setInputVal] = useState('')
  // Evita a segunda gravacao: ao navegar, o input antigo perde o foco e o
  // onBlur reescreveria o mesmo valor — outro round-trip ate o Supabase.
  const jaSalvouRef = useRef(false)

  useEffect(() => {
    if (!editando) return
    jaSalvouRef.current = false
    const seed = initChar ?? ''
    setInputVal(seed || (valor === 0
      ? ''
      : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })))
    // Um unico rAF, nunca um setTimeout: o timer competia com a insercao do
    // caractere e reselecionava o que ja tinha sido digitado, fazendo o
    // segundo digito substituir o primeiro.
    requestAnimationFrame(() => {
      const inp = inputRef.current
      if (!inp) return
      if (seed) inp.setSelectionRange(inp.value.length, inp.value.length) // segue digitando
      else inp.select()                                                   // pronto para redigitar
    })
  }, [editando])

  function save(dir?: 'up' | 'down' | 'left' | 'right') {
    jaSalvouRef.current = true
    const v = parseValor(inputVal || '0')
    // Texto invalido nao pode virar zero: gravar 0 aqui apagaria o valor que
    // ja estava na celula. Avisa e devolve a celula como estava.
    if (v === null) {
      toast(`"${inputVal.trim()}" não é um valor. A célula ficou como estava.`, 'error')
      onCancelEdit()
      return
    }
    onChange(v)
    if (dir) onNavigate(dir)
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter desce, Tab anda para a direita — Shift inverte os dois, como no Excel
    if (e.key === 'Enter') { e.preventDefault(); save(e.shiftKey ? 'up' : 'down'); return }
    if (e.key === 'Tab')   { e.preventDefault(); save(e.shiftKey ? 'left' : 'right'); return }
    if (e.key === 'Escape') { e.preventDefault(); onCancelEdit(); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); save('up'); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); save('down'); return }
    // Lateral: muda de celula quando o conteudo esta todo selecionado (celula
    // recem-aberta, intencao de andar) ou quando o cursor ja esta na borda.
    // No meio do texto a seta so move o cursor, para poder corrigir um digito.
    const inp = inputRef.current
    const tudoSelecionado = !!inp && inp.value.length > 0
      && inp.selectionStart === 0 && inp.selectionEnd === inp.value.length
    if (e.key === 'ArrowLeft') {
      const naBorda = inp?.selectionStart === 0 && inp.selectionEnd === 0
      if (tudoSelecionado || naBorda) { e.preventDefault(); save('left') }
    }
    if (e.key === 'ArrowRight') {
      const naBorda = !!inp && inp.selectionStart === inp.value.length && inp.selectionEnd === inp.value.length
      if (tudoSelecionado || naBorda) { e.preventDefault(); save('right') }
    }
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleInputKey}
        onBlur={() => { if (!jaSalvouRef.current) save() }}
        autoFocus
        style={{
          width: '100%', height: '100%',
          background: '#fff',
          border: '2px solid #1a56db',
          borderRadius: 4,
          fontSize: 10, fontWeight: 600,
          textAlign: 'right',
          padding: '0 4px',
          color: '#0f172a',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
    )
  }

  return (
    <div
      onClick={() => {
        if (!editavel) { if (motivoBloqueio) toast(motivoBloqueio, 'info'); return }
        ;(onClick ?? (() => onStartEdit()))()
      }}
      title={!editavel ? motivoBloqueio : undefined}
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 8px',
        cursor: editavel ? 'pointer' : (motivoBloqueio ? 'not-allowed' : 'default'),
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
