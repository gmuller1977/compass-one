import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { parseConta, partesDaConta } from '../../utils/moeda'
import type { JaLancado } from '../../utils/historicoDaCategoria'
import { valorMesAMes, somaDeParcelas } from '../../utils/ajustePlano'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const paraCampo = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export type SugestaoAjuste = { rotulo: string; valor: number }
export type MesRef = { ano: number; mes: number }
/**
 * Um mês que o ajuste mostra: o plano de hoje e o que já está lançado nele.
 * `semPlano`: o mês cai num ano que ainda não tem plano — aparece só como
 * aviso (a parcela de janeiro de uma compra feita em agosto), nada é gravado.
 */
export type MesDoAjuste = MesRef & { planoAtual: number; jaLancado: number; itens: JaLancado[]; semPlano?: boolean }

/**
 * Ajustar o plano de uma categoria a partir do Radar — dos PRÓXIMOS meses.
 * Pedido do Guilherme em 06/10/2026; no mesmo dia, as regras:
 *
 *   - o mês corrente não se mexe (utils/ajustePlano): ele aparece como
 *     referência, "Outubro: gastou X de Y";
 *   - o que JÁ ESTÁ LANÇADO nos próximos meses — as parcelas que a fatura
 *     grava adiante — entra na conta (utils/historicoDaCategoria), e a
 *     sugestão "média + já lançado" dá um valor POR MÊS;
 *   - o ajuste vai até o FIM DO PLANO, atravessando o ano — o mesmo horizonte
 *     do alerta e do Simulador. Parcela que cai em ano ainda sem plano aparece
 *     como aviso, sem gravar: o app não cria plano de ano sozinho.
 *
 * Isto só GRAVA no plano (comValor / comItens); nenhuma conta do Radar mudou.
 */
export default function AjustePlanoDialog({
  nome, mesVisto, prevVisto, realVisto, isEntrada, meses, base, sugestoes, aviso,
  onSalvar, onSalvarPorMes, onDetalhar, onFechar,
}: {
  nome: string
  mesVisto: number
  prevVisto: number
  realVisto: number
  isEntrada: boolean
  /** Do mês-alvo em diante, em ordem. O primeiro é o mês-alvo. */
  meses: MesDoAjuste[]
  /** O gasto normal (média sem parcelas), base da sugestão mês a mês. */
  base: SugestaoAjuste | null
  sugestoes: SugestaoAjuste[]
  aviso?: string
  onSalvar: (valor: number, meses: MesRef[]) => void
  /** Mês a mês (valorMesAMes): média + parcelas já lançadas, ou cobrir o já lançado. */
  onSalvarPorMes: (meses: MesRef[]) => void
  onDetalhar: (partes?: number[]) => void
  onFechar: () => void
}) {
  const editaveis = meses.filter(m => !m.semPlano)
  const foraDoPlano = meses.filter(m => m.semPlano && m.jaLancado > 0.005)
  const alvo = editaveis[0]
  const [texto, setTexto] = useState(alvo && alvo.planoAtual > 0 ? paraCampo(alvo.planoAtual) : '')
  const [porMes, setPorMes] = useState(false)
  const [ateOFim, setAteOFim] = useState(editaveis.length > 1)
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

  const anoHoje = new Date().getFullYear()
  const nomeMes = (m: MesRef, minusculo = false) => {
    const n = minusculo ? MESES[m.mes].toLowerCase() : MESES[m.mes]
    return m.ano !== anoHoje ? `${n} de ${m.ano}` : n
  }
  const valor = parseConta(texto)
  const ehConta = /[0-9.,]\s*[+-]/.test(texto)
  const visto = MESES[mesVisto]
  const escolhidos = alvo ? (ateOFim ? editaveis : [alvo]) : []
  const temLancado = meses.some(m => m.jaLancado > 0.005)
  const baseValor = base?.valor ?? 0
  const doMes = (m: MesDoAjuste) => valorMesAMes(base ? base.valor : null, m.planoAtual, m.jaLancado, somaDeParcelas(m.itens))
  const ultimo = editaveis[editaveis.length - 1]

  function salvar() {
    const ms = escolhidos.map(m => ({ ano: m.ano, mes: m.mes }))
    if (porMes) { onSalvarPorMes(ms); return }
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
  const linhaMes = (m: MesDoAjuste, conteudoDireita: React.ReactNode) => (
    <div key={`${m.ano}-${m.mes}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '7px 10px',
      borderTop: `1px solid ${COR.borda}`, fontSize: 12 }}>
      <div style={{ minWidth: 0 }}>
        <b>{nomeMes(m)}</b>{' '}
        <span style={{ color: COR.textoSuave }}>
          {m.jaLancado > 0.005 ? `${fmt(m.jaLancado)} já lançado` : 'nada lançado'}
        </span>
        {m.itens.length > 0 && (
          <div style={{ color: COR.textoSuave, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={resumoItens(m.itens)}>{resumoItens(m.itens)}</div>
        )}
      </div>
      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{conteudoDireita}</div>
    </div>
  )

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

        {aviso || !alvo ? (
          <div style={{ fontSize: 13, color: COR.avisoTexto, background: COR.avisoFundo, border: `1px solid ${COR.avisoBorda}`,
            borderRadius: 8, padding: '10px 12px', marginTop: 14, lineHeight: 1.5 }}>
            {aviso ?? 'Não há meses planejados à frente para ajustar.'}
          </div>
        ) : (
          <>
            <form onSubmit={e => { e.preventDefault(); salvar() }} style={{ marginTop: 14 }}>
              <label htmlFor="ajuste-valor" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                Plano a partir de {nomeMes(alvo, true)} <span style={{ fontWeight: 400 }}>· hoje {fmt(alvo.planoAtual)}</span>
              </label>
              <input id="ajuste-valor" ref={campo} value={porMes ? 'varia por mês ↓' : texto} inputMode="decimal"
                readOnly={porMes} onFocus={() => { if (porMes) { setPorMes(false); setTexto(paraCampo(doMes(alvo))) } }}
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

            {/* O já lançado de cada mês escolhido, e o plano que fica. Depois, as
                parcelas que caem em ano ainda sem plano — só aviso. */}
            {(temLancado || foraDoPlano.length > 0) && (
              <div style={{ marginTop: 12, border: `1px solid ${COR.borda}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, letterSpacing: '.05em', textTransform: 'uppercase',
                  padding: '7px 10px', background: '#f8fafc' }}>Já lançado nos próximos meses</div>
                {escolhidos.map(m => {
                  const novo = porMes ? doMes(m) : valor
                  const curto = !porMes && novo !== null && novo + 0.005 < m.jaLancado
                  return linhaMes(m, <>
                    {novo !== null && <b style={{ color: curto ? COR.erroTexto : COR.texto }}>{fmt(novo)}</b>}
                    {porMes && base && m.jaLancado > 0.005 && (
                      <div style={{ color: COR.textoSuave }}>{fmt(baseValor)} + {fmt(m.jaLancado)}</div>
                    )}
                    {curto && <div style={{ color: COR.erroTexto }}>abaixo do já lançado</div>}
                  </>)
                })}
                {foraDoPlano.map(m => linhaMes(m, (
                  // #b45309 no branco: 5,0.
                  <span style={{ color: '#b45309', fontWeight: 600 }}>ainda não há plano para {m.ano}</span>
                )))}
              </div>
            )}

            <fieldset style={{ border: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <legend style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 4, padding: 0 }}>Aplicar a</legend>
              {editaveis.length > 1 && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="ajuste-meses" checked={ateOFim} onChange={() => setAteOFim(true)} />
                  De {nomeMes(alvo, true)} até {nomeMes(ultimo, true)} <span style={{ color: COR.textoSuave }}>(fim do plano)</span>
                </label>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="ajuste-meses" checked={!ateOFim} onChange={() => setAteOFim(false)} /> Só {nomeMes(alvo, true)}
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
          {!aviso && alvo ? (
            <button type="button" onClick={() => { const p = partesDaConta(texto); onDetalhar(!porMes && p && p.length > 1 ? p : undefined) }} style={{
              background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12, color: COR.textoSuave,
              textDecoration: 'underline', cursor: 'pointer' }}>detalhar em itens</button>
          ) : <span />}
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onFechar} style={botao(false)}>{aviso || !alvo ? 'Fechar' : 'Cancelar'}</button>
            {!aviso && alvo && <button type="button" onClick={salvar} style={botao(true)}>Salvar</button>}
          </span>
        </div>
      </div>
    </div>
  )
}
