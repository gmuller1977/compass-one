import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { parseConta, partesDaConta } from '../../utils/moeda'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const paraCampo = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Ajustar o plano de uma categoria sem sair do Radar. Pedido do Guilherme em
 * 06/10/2026: "se eu fiz um planejamento errado para uma categoria, eu
 * poderia estar ajustando o plano direto pelo radar, já que tenho os dados na
 * mão". O Radar está congelado; isto só GRAVA no plano, pelas mesmas funções
 * do Planejamento (comValor / comItens). Nenhuma conta do Radar mudou — ele
 * relê o plano e a linha se redesenha.
 *
 * O campo aceita conta, como a célula do Planejamento. "Usar o que já gastei"
 * é o atalho do caso que motivou o pedido: o plano estava errado, e o
 * realizado é o número certo. Categoria com itens não chega aqui — abre direto
 * o editor de itens.
 */
export default function AjustePlanoDialog({
  nome, mes, prev, real, isEntrada, aviso, onSalvar, onDetalhar, onFechar,
}: {
  nome: string
  mes: number
  prev: number
  real: number
  isEntrada: boolean
  /** Quando não dá para gravar (plano antigo ambíguo): explica e só deixa fechar. */
  aviso?: string
  onSalvar: (valor: number, meses: number[]) => void
  onDetalhar: (partes?: number[]) => void
  onFechar: () => void
}) {
  const [texto, setTexto] = useState(prev > 0 ? paraCampo(prev) : '')
  const [ateDezembro, setAteDezembro] = useState(false)
  const [erro, setErro] = useState('')
  const campo = useRef<HTMLInputElement>(null)
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar

  useEffect(() => {
    campo.current?.select()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const valor = parseConta(texto)
  const ehConta = /[0-9.,]\s*[+-]/.test(texto)
  const nomeMes = MESES[mes].toLowerCase()
  const verbo = isEntrada ? 'Recebeu' : 'Gastou'

  function salvar() {
    if (valor === null) { setErro(`"${texto.trim()}" não é um valor.`); return }
    if (valor < 0) { setErro('O plano não pode ficar negativo.'); return }
    onSalvar(valor, ateDezembro ? Array.from({ length: 12 - mes }, (_, i) => mes + i) : [mes])
  }

  const botao = (primario: boolean): React.CSSProperties => ({
    border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', background: primario ? COR.azul : '#f1f5f9', color: primario ? '#fff' : '#1e3a8a',
  })

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ajuste-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 400, padding: '18px 20px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto,
      }}>
        <h3 id="ajuste-titulo" style={{ margin: 0, fontSize: 16 }}>Ajustar o plano · {nome}</h3>
        <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 4 }}>
          {MESES[mes]}: {verbo.toLowerCase()} {fmt(real)} · plano atual {fmt(prev)}
        </div>

        {aviso ? (
          <div style={{ fontSize: 13, color: COR.avisoTexto, background: COR.avisoFundo, border: `1px solid ${COR.avisoBorda}`,
            borderRadius: 8, padding: '10px 12px', marginTop: 14, lineHeight: 1.5 }}>{aviso}</div>
        ) : (
          <>
            <form onSubmit={e => { e.preventDefault(); salvar() }} style={{ marginTop: 14 }}>
              <label htmlFor="ajuste-valor" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                Novo valor do plano
              </label>
              <input id="ajuste-valor" ref={campo} value={texto} inputMode="decimal"
                onChange={e => { setTexto(e.target.value); setErro('') }}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 15, fontFamily: 'inherit',
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderRadius: 8,
                  border: `1.5px solid ${valor === null && texto.trim() ? COR.erroTexto : COR.azul}` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, fontSize: 12, flexWrap: 'wrap' }}>
                {real > 0.005 && Math.abs(real - prev) > 0.005 ? (
                  <button type="button" onClick={() => { setTexto(paraCampo(real)); setErro('') }} style={{
                    background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                    color: COR.azul, cursor: 'pointer', textDecoration: 'underline' }}>
                    Usar o que já {isEntrada ? 'recebi' : 'gastei'} ({fmt(real)})
                  </button>
                ) : <span />}
                {ehConta && <span role="status" style={{ color: COR.textoSuave }}>{valor === null ? 'conta incompleta' : `= ${fmt(valor)}`}</span>}
              </div>
              <button type="submit" hidden />
            </form>

            <fieldset style={{ border: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <legend style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 4, padding: 0 }}>Aplicar a</legend>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="ajuste-meses" checked={!ateDezembro} onChange={() => setAteDezembro(false)} /> Só {nomeMes}
              </label>
              {mes < 11 && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="ajuste-meses" checked={ateDezembro} onChange={() => setAteDezembro(true)} />
                  De {nomeMes} até dezembro
                </label>
              )}
            </fieldset>
            {erro && <div role="alert" style={{ fontSize: 12, color: COR.erroTexto, marginTop: 8 }}>{erro}</div>}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          {!aviso ? (
            <button type="button" onClick={() => { const p = partesDaConta(texto); onDetalhar(p && p.length > 1 ? p : undefined) }} style={{
              background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12, color: COR.textoSuave,
              textDecoration: 'underline', cursor: 'pointer' }}>detalhar em itens</button>
          ) : <span />}
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onFechar} style={botao(false)}>{aviso ? 'Fechar' : 'Cancelar'}</button>
            {!aviso && <button type="button" onClick={salvar} style={botao(true)}>Salvar</button>}
          </span>
        </div>
      </div>
    </div>
  )
}
