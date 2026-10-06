import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { parseConta, partesDaConta } from '../../utils/moeda'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const paraCampo = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export type SugestaoAjuste = { rotulo: string; valor: number }

/**
 * Ajustar o plano de uma categoria a partir do Radar — dos PRÓXIMOS meses.
 * Pedido do Guilherme em 06/10/2026, e no mesmo dia a regra: o mês corrente
 * não se mexe (ver utils/ajustePlano). O mês que está na tela aparece como
 * referência — "Outubro: gastou X de Y" — e o valor novo vale do mês-alvo em
 * diante.
 *
 * As sugestões são os números que já estão na mão: a média dos meses
 * fechados e o gasto do mês até agora, com o rótulo dizendo que é parcial.
 * Isto só GRAVA no plano (comValor / comItens); nenhuma conta do Radar mudou.
 */
export default function AjustePlanoDialog({
  nome, mesVisto, prevVisto, realVisto, isEntrada, mesAlvo, anoAlvo, prevAlvo, sugestoes, aviso,
  onSalvar, onDetalhar, onFechar,
}: {
  nome: string
  mesVisto: number
  prevVisto: number
  realVisto: number
  isEntrada: boolean
  mesAlvo: number
  anoAlvo: number
  prevAlvo: number
  sugestoes: SugestaoAjuste[]
  /** Quando não dá para gravar: explica e só deixa fechar. */
  aviso?: string
  onSalvar: (valor: number, meses: number[]) => void
  onDetalhar: (partes?: number[]) => void
  onFechar: () => void
}) {
  const [texto, setTexto] = useState(prevAlvo > 0 ? paraCampo(prevAlvo) : '')
  const [ateDezembro, setAteDezembro] = useState(mesAlvo < 11)
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
  const alvo = MESES[mesAlvo].toLowerCase()
  const visto = MESES[mesVisto]
  const doAno = (m: string) => (anoAlvo !== new Date().getFullYear() ? `${m} de ${anoAlvo}` : m)

  function salvar() {
    if (valor === null) { setErro(`"${texto.trim()}" não é um valor.`); return }
    if (valor < 0) { setErro('O plano não pode ficar negativo.'); return }
    onSalvar(valor, ateDezembro ? Array.from({ length: 12 - mesAlvo }, (_, i) => mesAlvo + i) : [mesAlvo])
  }

  const botao = (primario: boolean): React.CSSProperties => ({
    border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', background: primario ? COR.azul : '#f1f5f9', color: primario ? '#fff' : '#1e3a8a',
  })
  const chip: React.CSSProperties = {
    border: `1px solid ${COR.borda}`, background: '#f8fafc', color: '#1e3a8a', borderRadius: 999,
    padding: '5px 10px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ajuste-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 420, padding: '18px 20px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h3 id="ajuste-titulo" style={{ margin: 0, fontSize: 16 }}>Ajustar o plano · {nome}</h3>
        <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 4 }}>
          {visto}: {isEntrada ? 'recebeu' : 'gastou'} {fmt(realVisto)} de {fmt(prevVisto)}
        </div>

        {aviso ? (
          <div style={{ fontSize: 13, color: COR.avisoTexto, background: COR.avisoFundo, border: `1px solid ${COR.avisoBorda}`,
            borderRadius: 8, padding: '10px 12px', marginTop: 14, lineHeight: 1.5 }}>{aviso}</div>
        ) : (
          <>
            <form onSubmit={e => { e.preventDefault(); salvar() }} style={{ marginTop: 14 }}>
              <label htmlFor="ajuste-valor" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                Plano a partir de {doAno(alvo)} <span style={{ fontWeight: 400 }}>· hoje {fmt(prevAlvo)}</span>
              </label>
              <input id="ajuste-valor" ref={campo} value={texto} inputMode="decimal"
                onChange={e => { setTexto(e.target.value); setErro('') }}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 15, fontFamily: 'inherit',
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderRadius: 8,
                  border: `1.5px solid ${valor === null && texto.trim() ? COR.erroTexto : COR.azul}` }} />
              {ehConta && (
                <div role="status" style={{ textAlign: 'right', fontSize: 12, color: COR.textoSuave, marginTop: 4 }}>
                  {valor === null ? 'conta incompleta' : `= ${fmt(valor)}`}
                </div>
              )}
              <button type="submit" hidden />
            </form>

            {sugestoes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {sugestoes.map(s => (
                  <button key={s.rotulo} type="button" onClick={() => { setTexto(paraCampo(s.valor)); setErro('') }} style={chip}>
                    {s.rotulo}: {fmt(s.valor)}
                  </button>
                ))}
              </div>
            )}

            <fieldset style={{ border: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <legend style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 4, padding: 0 }}>Aplicar a</legend>
              {mesAlvo < 11 && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="ajuste-meses" checked={ateDezembro} onChange={() => setAteDezembro(true)} />
                  De {alvo} até dezembro
                </label>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="ajuste-meses" checked={!ateDezembro} onChange={() => setAteDezembro(false)} /> Só {alvo}
              </label>
            </fieldset>
            <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 10, lineHeight: 1.5 }}>
              {visto} fica como está: ele mostra o que aconteceu.
            </div>
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
