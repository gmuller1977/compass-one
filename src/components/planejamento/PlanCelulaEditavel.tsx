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

/**
 * A célula em repouso é FOCÁVEL, e não só clicável.
 *
 * Ela era um `<span onClick>` sem `tabIndex`: quem não usa mouse não chegava
 * nela de jeito nenhum, em nenhuma das telas que a usam. Agora entra na ordem
 * do Tab, abre com Enter, Espaço ou digitando um número — e devolve o foco a si
 * mesma ao fechar, para a próxima tecla continuar de onde parou.
 *
 * O `data-celula` é o que permite a quem envolve navegar com as setas: basta
 * listar os elementos marcados na ordem do DOM, sem que este componente
 * precise saber onde está na grade.
 */
export default function PlanCelulaEditavel({ valor, readOnly = false, motivoBloqueio, onSave, align = 'right' }: Props) {
  const { toast } = useToast()
  const [editando, setEditando] = useState(false)
  const [temp, setTemp] = useState('')
  const skipBlurRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const spanRef = useRef<HTMLSpanElement>(null)
  /** Ao fechar a edição, o input some. Sem isto o foco voltaria ao body. */
  const devolverFocoRef = useRef(false)
  /** A edição começou digitando um número, e não por clique ou Enter. */
  const abriuDigitandoRef = useRef(false)

  // Seleciona UMA vez ao abrir. Antes isso vinha de onFocus, que podia
  // disparar de novo e reselecionar o que ja havia sido digitado.
  //
  // Aberta DIGITANDO, o cursor vai para o fim: o digito que abriu ja esta no
  // campo, e selecionar tudo fazia o segundo digito substituir o primeiro —
  // digitar "50" gravava 0. Aberta por clique ou Enter, seleciona tudo, que e
  // o comportamento de planilha: redigitar por cima.
  useEffect(() => {
    if (!editando) return
    const digitando = abriuDigitandoRef.current
    abriuDigitandoRef.current = false
    requestAnimationFrame(() => {
      const inp = inputRef.current
      if (!inp) return
      if (digitando) inp.setSelectionRange(inp.value.length, inp.value.length)
      else inp.select()
    })
  }, [editando])

  useEffect(() => {
    if (editando || !devolverFocoRef.current) return
    devolverFocoRef.current = false
    spanRef.current?.focus()
  }, [editando])

  function iniciar(inicial?: string) {
    if (readOnly) {
      if (motivoBloqueio) toast(motivoBloqueio, 'info')
      return
    }
    abriuDigitandoRef.current = inicial !== undefined
    // maximumFractionDigits junto: so o minimum deixa o padrao em 3 casas, e
    // um valor com mais de dois decimais voltava arredondado diferente.
    setTemp(inicial ?? (valor > 0
      ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''))
    setEditando(true)
  }

  function fechar() {
    devolverFocoRef.current = true
    setEditando(false)
  }

  function confirmar() {
    const v = parseValor(temp)
    // Ver PlanCelulaNav: valor invalido nao vira zero, senao apaga a celula.
    if (v === null) {
      toast(`"${temp.trim()}" não é um valor. A célula ficou como estava.`, 'error')
      fechar()
      return
    }
    onSave(v >= 0 ? v : 0)
    fechar()
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
          if (e.key === 'Escape') { skipBlurRef.current = true; fechar() }
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
    : (valor === 0 ? '#c0cce0' : '#0f172a')

  return (
    <span
      ref={spanRef}
      data-celula=""
      tabIndex={0}
      role="button"
      aria-label={`Valor ${fmt(valor)}${readOnly ? ', somente leitura' : ', Enter para editar'}`}
      onClick={() => iniciar()}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); iniciar() }
        // Digitar um numero ja comeca a edicao com ele, como numa planilha.
        else if (/^\d$/.test(e.key)) { e.preventDefault(); iniciar(e.key) }
      }}
      title={readOnly ? motivoBloqueio : undefined}
      style={{
        padding: '3px 7px', borderRadius: 6,
        cursor: readOnly ? (motivoBloqueio ? 'not-allowed' : 'default') : 'pointer',
        display: 'inline-block', minWidth: 60,
        textAlign: align, fontVariantNumeric: 'tabular-nums',
        transition: 'background .15s', color: corVal, outline: 'none',
      }}
      onMouseEnter={e => { if (!readOnly) { const el = e.currentTarget as HTMLElement; el.style.background = '#eff6ff'; el.style.color = COR.azul } }}
      onMouseLeave={e => { if (!readOnly) { const el = e.currentTarget as HTMLElement; el.style.background = ''; el.style.color = corVal } }}
      // O anel de foco e desenhado a mao porque a celula vive tanto sobre
      // branco quanto sobre azul escuro: outline do sistema some num dos dois.
      onFocus={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = `0 0 0 2px ${COR.azul}`
        el.style.background = '#eff6ff'
        el.style.color = COR.azul
      }}
      onBlur={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'none'
        el.style.background = ''
        el.style.color = corVal
      }}
    >
      {fmt(valor)}
    </span>
  )
}
