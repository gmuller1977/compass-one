import { useState, useRef, useEffect } from 'react'
import { useToast } from '../Toast'
import { fmt, parseConta, COR } from './types'
import { partesDaConta } from '../../utils/moeda'
import type { ItemPlano } from '../../utils/itensPlano'

interface Props {
  valor: number
  readOnly?: boolean
  /** Explicacao mostrada ao clicar numa celula bloqueada. Sem isso o clique
   *  nao dava retorno nenhum e parecia que a tela tinha travado. */
  motivoBloqueio?: string
  onSave: (novoValor: number) => void
  align?: 'right' | 'left'
  /** O detalhe do valor (utils/itensPlano). Com itens, a célula abre o editor
   *  em vez de deixar digitar por cima — senão total e itens discordariam. */
  itens?: ItemPlano[] | null
  /** Abre o editor de itens; `partes` são as parcelas da conta digitada. */
  onItens?: (partes?: number[]) => void
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
export default function PlanCelulaEditavel({ valor, readOnly = false, motivoBloqueio, onSave, align = 'right', itens, onItens }: Props) {
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

  const temItens = !!itens && itens.length > 0

  function iniciar(inicial?: string) {
    if (readOnly) {
      if (motivoBloqueio) toast(motivoBloqueio, 'info')
      return
    }
    if (temItens && onItens) { onItens(); return }
    abriuDigitandoRef.current = inicial !== undefined
    // maximumFractionDigits junto: so o minimum deixa o padrao em 3 casas, e
    // um valor com mais de dois decimais voltava arredondado diferente.
    setTemp(inicial ?? (valor > 0
      ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''))
    setEditando(true)
  }

  /** Sai da edição e abre o editor de itens, começando pela conta digitada. */
  function detalhar() {
    if (!onItens) return
    skipBlurRef.current = true
    const partes = partesDaConta(temp)
    fechar()
    onItens(partes && partes.length > 1 ? partes : undefined)
  }

  function fechar() {
    devolverFocoRef.current = true
    setEditando(false)
  }

  function confirmar() {
    // Aceita conta: "800+300" grava 1.100 (parseConta). Sem operador é o
    // mesmo parseValor de sempre.
    const v = parseConta(temp)
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
    // Enquanto há uma conta no campo, o resultado aparece embaixo — quem
    // digita "800+300" vê o 1.100 antes de confirmar.
    const ehConta = /[0-9.,]\s*[+-]/.test(temp)
    const mostrarBarra = ehConta || !!onItens
    const resultado = ehConta ? parseConta(temp) : null
    return (
      <span style={{ position: 'relative', display: 'block' }}>
      <input
        ref={inputRef}
        autoFocus
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false } else confirmar() }}
        onKeyDown={e => {
          // Ctrl+Enter: em vez de gravar o total, abre o detalhe em itens.
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onItens) { e.preventDefault(); detalhar(); return }
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
      {mostrarBarra && (
        <span style={{
          position: 'absolute', top: 'calc(100% + 3px)', right: align === 'right' ? 0 : undefined,
          left: align === 'left' ? 0 : undefined, zIndex: 20, whiteSpace: 'nowrap',
          background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 6,
          padding: '3px 8px', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', gap: 8, alignItems: 'center',
        }}>
          {ehConta && <span role="status">{resultado === null ? 'conta incompleta' : `= ${fmt(resultado)}`}</span>}
          {/* onMouseDown + preventDefault: o clique não pode tirar o foco do
              campo antes, senão o blur grava o total e fecha a edição. */}
          {onItens && (
            <button type="button" tabIndex={-1} title="Ctrl+Enter"
              onMouseDown={e => { e.preventDefault(); detalhar() }}
              style={{ all: 'unset', cursor: 'pointer', color: '#bfdbfe', textDecoration: 'underline' }}>
              detalhar em itens
            </button>
          )}
        </span>
      )}
      </span>
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
      aria-label={`Valor ${fmt(valor)}${temItens ? `, ${itens!.length} itens` : ''}${readOnly ? ', somente leitura' : temItens ? ', Enter para ver os itens' : ', Enter para editar'}`}
      onClick={() => iniciar()}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); iniciar() }
        // Digitar um numero ja comeca a edicao com ele, como numa planilha.
        else if (/^\d$/.test(e.key)) { e.preventDefault(); iniciar(e.key) }
      }}
      title={readOnly ? motivoBloqueio
        : temItens ? itens!.map(i => `${i.descricao || 'Sem nome'}: ${fmt(i.valor)}`).join('\n') : undefined}
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
      {/* infoTexto #0369a1 sobre #dbeafe: 5,0. */}
      {temItens && (
        <span aria-hidden style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: COR.infoTexto,
          background: '#dbeafe', borderRadius: 999, padding: '1px 6px', verticalAlign: 1 }}>
          {itens!.length === 1 ? '1 item' : `${itens!.length} itens`}
        </span>
      )}
    </span>
  )
}
