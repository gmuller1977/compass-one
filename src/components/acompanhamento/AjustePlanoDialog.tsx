import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { parseConta, partesDaConta } from '../../utils/moeda'
import type { JaLancado } from '../../utils/historicoDaCategoria'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const paraCampo = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const centavos = (v: number) => Math.round(v * 100) / 100

export type SugestaoAjuste = { rotulo: string; valor: number }
/** Um mês que o ajuste pode mudar: o plano de hoje e o que já está lançado nele. */
export type MesDoAjuste = { mes: number; planoAtual: number; jaLancado: number; itens: JaLancado[] }

/**
 * Ajustar o plano de uma categoria a partir do Radar — dos PRÓXIMOS meses.
 * Pedido do Guilherme em 06/10/2026; no mesmo dia, duas regras:
 *
 *   - o mês corrente não se mexe (utils/ajustePlano): ele aparece como
 *     referência, "Outubro: gastou X de Y";
 *   - o que JÁ ESTÁ LANÇADO nos próximos meses — as parcelas que a fatura
 *     grava adiante — entra na conta (utils/historicoDaCategoria). A
 *     sugestão "média + já lançado" dá um valor POR MÊS: novembro com a
 *     parcela 3 de 6, e janeiro, depois que ela acaba, sem.
 *
 * Com um valor só, todos os meses escolhidos recebem o mesmo número. Mês em
 * que esse número fica abaixo do já lançado é apontado: o plano estouraria
 * antes de o mês começar.
 *
 * Isto só GRAVA no plano (comValor / comItens); nenhuma conta do Radar mudou.
 */
export default function AjustePlanoDialog({
  nome, mesVisto, prevVisto, realVisto, isEntrada, anoAlvo, meses, base, sugestoes, aviso,
  onSalvar, onSalvarPorMes, onDetalhar, onFechar,
}: {
  nome: string
  mesVisto: number
  prevVisto: number
  realVisto: number
  isEntrada: boolean
  anoAlvo: number
  /** Do mês-alvo até dezembro, em ordem. O primeiro é o mês-alvo. */
  meses: MesDoAjuste[]
  /** O gasto normal (média sem parcelas), base da sugestão mês a mês. */
  base: SugestaoAjuste | null
  sugestoes: SugestaoAjuste[]
  aviso?: string
  onSalvar: (valor: number, meses: number[]) => void
  /** Base + já lançado de cada mês. */
  onSalvarPorMes: (base: number, meses: number[]) => void
  onDetalhar: (partes?: number[]) => void
  onFechar: () => void
}) {
  const alvo = meses[0]
  const [texto, setTexto] = useState(alvo && alvo.planoAtual > 0 ? paraCampo(alvo.planoAtual) : '')
  const [porMes, setPorMes] = useState(false)
  const [ateDezembro, setAteDezembro] = useState(meses.length > 1)
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

  if (!alvo) return null
  const valor = parseConta(texto)
  const ehConta = /[0-9.,]\s*[+-]/.test(texto)
  const nomeAlvo = MESES[alvo.mes].toLowerCase()
  const visto = MESES[mesVisto]
  const doAno = (m: string) => (anoAlvo !== new Date().getFullYear() ? `${m} de ${anoAlvo}` : m)
  const escolhidos = ateDezembro ? meses : [alvo]
  const temLancado = meses.some(m => m.jaLancado > 0.005)
  const baseValor = base?.valor ?? 0

  function salvar() {
    const ms = escolhidos.map(m => m.mes)
    if (porMes) { onSalvarPorMes(baseValor, ms); return }
    if (valor === null) { setErro(`"${texto.trim()}" não é um valor.`); return }
    if (valor < 0) { setErro('O plano não pode ficar negativo.'); return }
    onSalvar(valor, ms)
  }

  const botao = (primario: boolean): React.CSSProperties => ({
    border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', background: primario ? COR.azul : '#f1f5f9', color: primario ? '#fff' : '#1e3a8a',
  })
  const chip = (ativo = false): React.CSSProperties => ({
    border: `1px solid ${ativo ? COR.azul : COR.borda}`, background: ativo ? '#eff6ff' : '#f8fafc', color: '#1e3a8a',
    borderRadius: 999, padding: '5px 10px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  })
  const resumoItens = (it: JaLancado[]) => it.map(i => (i.parcela ? `${i.descricao} ${i.parcela.atual} de ${i.parcela.total}` : i.descricao)).join(', ')

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ajuste-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 460, padding: '18px 20px',
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
                Plano a partir de {doAno(nomeAlvo)} <span style={{ fontWeight: 400 }}>· hoje {fmt(alvo.planoAtual)}</span>
              </label>
              <input id="ajuste-valor" ref={campo} value={porMes ? 'varia por mês ↓' : texto} inputMode="decimal"
                readOnly={porMes} onFocus={() => { if (porMes) { setPorMes(false); setTexto(paraCampo(baseValor + alvo.jaLancado)) } }}
                onChange={e => { setTexto(e.target.value); setErro('') }}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 15, fontFamily: 'inherit',
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderRadius: 8,
                  color: porMes ? COR.textoSuave : COR.texto,
                  border: `1.5px solid ${!porMes && valor === null && texto.trim() ? COR.erroTexto : COR.azul}` }} />
              {!porMes && ehConta && (
                <div role="status" style={{ textAlign: 'right', fontSize: 12, color: COR.textoSuave, marginTop: 4 }}>
                  {valor === null ? 'conta incompleta' : `= ${fmt(valor)}`}
                </div>
              )}
              <button type="submit" hidden />
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {temLancado && (
                <button type="button" onClick={() => { setPorMes(true); setErro('') }} style={chip(porMes)}>
                  {base ? `${base.rotulo} + já lançado, mês a mês` : 'Cobrir o já lançado, mês a mês'}
                </button>
              )}
              {sugestoes.map(s => (
                <button key={s.rotulo} type="button" onClick={() => { setPorMes(false); setTexto(paraCampo(s.valor)); setErro('') }} style={chip()}>
                  {s.rotulo}: {fmt(s.valor)}
                </button>
              ))}
            </div>

            {/* O já lançado de cada mês escolhido, e o plano que fica. */}
            {temLancado && (
              <div style={{ marginTop: 12, border: `1px solid ${COR.borda}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, letterSpacing: '.05em', textTransform: 'uppercase',
                  padding: '7px 10px', background: '#f8fafc' }}>Já lançado nos próximos meses</div>
                {escolhidos.map(m => {
                  const novo = porMes ? centavos(baseValor + m.jaLancado) : valor
                  const curto = !porMes && novo !== null && novo + 0.005 < m.jaLancado
                  return (
                    <div key={m.mes} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '7px 10px',
                      borderTop: `1px solid ${COR.borda}`, fontSize: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <b>{MESES[m.mes]}</b>{' '}
                        <span style={{ color: COR.textoSuave }}>
                          {m.jaLancado > 0.005 ? `${fmt(m.jaLancado)} já lançado` : 'nada lançado'}
                        </span>
                        {m.itens.length > 0 && (
                          <div style={{ color: COR.textoSuave, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={resumoItens(m.itens)}>{resumoItens(m.itens)}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {novo !== null && <b style={{ color: curto ? COR.erroTexto : COR.texto }}>{fmt(novo)}</b>}
                        {porMes && base && m.jaLancado > 0.005 && (
                          <div style={{ color: COR.textoSuave }}>{fmt(baseValor)} + {fmt(m.jaLancado)}</div>
                        )}
                        {curto && <div style={{ color: COR.erroTexto }}>abaixo do já lançado</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <fieldset style={{ border: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <legend style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 4, padding: 0 }}>Aplicar a</legend>
              {meses.length > 1 && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="ajuste-meses" checked={ateDezembro} onChange={() => setAteDezembro(true)} />
                  De {nomeAlvo} até dezembro
                </label>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="ajuste-meses" checked={!ateDezembro} onChange={() => setAteDezembro(false)} /> Só {nomeAlvo}
              </label>
            </fieldset>
            <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 10, lineHeight: 1.5 }}>
              {visto} fica como está: ele mostra o que aconteceu.
              {porMes && ' Nos meses com algo lançado, o plano fica detalhado em itens: o gasto normal e cada parcela.'}
            </div>
            {erro && <div role="alert" style={{ fontSize: 12, color: COR.erroTexto, marginTop: 8 }}>{erro}</div>}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          {!aviso ? (
            <button type="button" onClick={() => { const p = partesDaConta(texto); onDetalhar(!porMes && p && p.length > 1 ? p : undefined) }} style={{
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
