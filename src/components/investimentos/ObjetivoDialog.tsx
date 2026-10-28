import { useState } from 'react'
import ModalTopo from '../ModalTopo'
import { COR } from '../../utils/cores'
import { mascaraCentavos, parseBRL } from '../../utils/moeda'
import { isoDe, type Objetivo } from '../../utils/investimentos'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const valorEmTexto = (v: number | undefined) => v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''

/**
 * Criar ou alterar um objetivo (a "caixinha") de um investimento. O valor e
 * a data são opcionais: sem valor, o objetivo só separa o dinheiro. Ao criar,
 * pergunta quanto do saldo que está sem objetivo já é dele.
 */
export default function ObjetivoDialog({ contaNome, contaId, objetivo, semObjetivo, onSalvar, onExcluir, onFechar, central }: {
  contaNome: string
  contaId: string
  objetivo?: Objetivo
  /** O saldo da conta que ainda não é de objetivo nenhum. */
  semObjetivo: number
  onSalvar: (o: Objetivo) => Promise<string | null>
  onExcluir?: (id: string) => Promise<string | null>
  onFechar: () => void
  central: boolean
}) {
  const hoje = new Date()
  const [nome, setNome] = useState(objetivo?.nome ?? '')
  const [alvo, setAlvo] = useState(valorEmTexto(objetivo?.valorAlvo))
  const [temData, setTemData] = useState(!!objetivo?.ate)
  const [mesAte, setMesAte] = useState(objetivo?.ate ? Number(objetivo.ate.slice(5, 7)) - 1 : hoje.getMonth())
  const [anoAte, setAnoAte] = useState(objetivo?.ate ? Number(objetivo.ate.slice(0, 4)) : hoje.getFullYear() + 1)
  const [jaTem, setJaTem] = useState(valorEmTexto(objetivo?.saldoInicial))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmarExcluir, setConfirmarExcluir] = useState(false)
  // Disponível para separar: o que está sem objetivo, mais o que este objetivo já separou.
  const podeSeparar = Math.max(0, semObjetivo + (objetivo?.saldoInicial ?? 0))

  async function salvar() {
    setErro('')
    if (!nome.trim()) { setErro('Dê um nome ao objetivo, por exemplo "Viagem" ou "Reserva".'); return }
    const valorAlvo = alvo.trim() ? parseBRL(alvo) : undefined
    const saldoInicial = jaTem.trim() ? parseBRL(jaTem) : 0
    if (saldoInicial > podeSeparar + 0.005) {
      setErro(`Sem objetivo, este investimento tem ${fmt(podeSeparar)}.`); return
    }
    const ate = temData ? `${anoAte}-${String(mesAte + 1).padStart(2, '0')}` : undefined
    if (ate && ate < isoDe(hoje.getFullYear(), hoje.getMonth(), 1).slice(0, 7)) {
      setErro('Escolha este mês ou um mês à frente.'); return
    }
    setSalvando(true)
    const msg = await onSalvar({
      id: objetivo?.id ?? `obj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      contaId, nome: nome.trim(), valorAlvo: valorAlvo && valorAlvo > 0 ? valorAlvo : undefined, ate,
      saldoInicial, criadoEm: objetivo?.criadoEm ?? isoDe(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
    })
    setSalvando(false)
    if (msg) setErro(msg); else onFechar()
  }

  async function excluir() {
    if (!objetivo || !onExcluir) return
    if (!confirmarExcluir) { setConfirmarExcluir(true); return }
    setSalvando(true)
    const msg = await onExcluir(objetivo.id)
    setSalvando(false)
    if (msg) setErro(msg); else onFechar()
  }

  const raio = 20
  const rotulo = { fontSize: 14, fontWeight: 600, color: COR.textoSuave, display: 'block' } as const
  const campo = {
    display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, marginBottom: 12,
    border: `1.5px solid ${COR.borda}`, borderRadius: 12, padding: '10px 12px', fontSize: 16,
    color: COR.texto, background: '#fff', fontFamily: 'inherit',
  } as const
  const anos = Array.from({ length: 31 }, (_, k) => hoje.getFullYear() + k)

  return (
    <div role="dialog" aria-modal="true" aria-label={objetivo ? `Objetivo ${objetivo.nome}` : 'Novo objetivo'} onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 300, display: 'flex',
        alignItems: central ? 'center' : 'flex-end', justifyContent: 'center', padding: central ? 16 : 0 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', width: '100%', maxWidth: central ? 460 : undefined, maxHeight: '92vh', overflowY: 'auto',
        borderRadius: central ? raio : `${raio}px ${raio}px 0 0`,
        fontFamily: "-apple-system,'Inter',sans-serif", animation: central ? undefined : 'slideUp .2s ease',
      }}>
        <ModalTopo icone="ti-target-arrow" rotulo={objetivo ? 'Objetivo' : 'Novo objetivo'} titulo={objetivo?.nome || 'Para que é esse dinheiro?'}
          subtitulo={contaNome} raio={raio} onFechar={onFechar} />
        <div style={{ padding: central ? '18px 20px 22px' : '16px 16px 28px' }}>
          <label style={rotulo}>Nome
            <input value={nome} onChange={e => setNome(e.target.value)} autoFocus={central} maxLength={40}
              placeholder="Viagem, Reserva, Carro novo…" style={campo} />
          </label>
          <label style={rotulo}>Quanto quer juntar <span style={{ fontWeight: 400 }}>(opcional)</span>
            <input value={alvo} onChange={e => setAlvo(mascaraCentavos(e.target.value))} inputMode="numeric"
              placeholder="0,00" style={campo} />
          </label>
          <div style={rotulo}>Até quando <span style={{ fontWeight: 400 }}>(opcional)</span></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {[[false, 'Sem data'], [true, 'Escolher mês']].map(([v, l]) => (
              <button key={String(v)} type="button" onClick={() => setTemData(v as boolean)} style={{
                borderRadius: 999, padding: '8px 14px', minHeight: 36, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', border: `1.5px solid ${temData === v ? COR.azul : COR.borda}`,
                background: temData === v ? '#eff6ff' : '#fff', color: temData === v ? '#1e3a8a' : COR.texto,
              }}>{l as string}</button>
            ))}
          </div>
          {temData && (
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={mesAte} onChange={e => setMesAte(Number(e.target.value))} aria-label="Mês" style={{ ...campo, flex: 2 }}>
                {MESES.map((m, k) => <option key={m} value={k}>{m}</option>)}
              </select>
              <select value={anoAte} onChange={e => setAnoAte(Number(e.target.value))} aria-label="Ano" style={{ ...campo, flex: 1 }}>
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          {podeSeparar > 0.005 && (
            <label style={rotulo}>Quanto do saldo de hoje já é deste objetivo
              <input value={jaTem} onChange={e => setJaTem(mascaraCentavos(e.target.value))} inputMode="numeric"
                placeholder="0,00" style={{ ...campo, marginBottom: 4 }} />
              <span style={{ display: 'block', fontSize: 13, fontWeight: 400, marginBottom: 12 }}>
                Sem objetivo, este investimento tem {fmt(podeSeparar)}.</span>
            </label>
          )}
          {erro && (
            <div role="alert" style={{ fontSize: 14, color: COR.erroTexto, background: COR.erroFundo, borderRadius: 10,
              padding: '9px 12px', marginBottom: 12, lineHeight: 1.45 }}>{erro}</div>
          )}
          <button onClick={salvar} disabled={salvando} style={{
            width: '100%', padding: 16, border: 'none', borderRadius: 16, cursor: 'pointer',
            background: 'var(--cx-azul)', boxShadow: 'var(--cx-bolinha)', color: '#fff',
            fontSize: 16, fontWeight: 700, fontFamily: 'inherit', opacity: salvando ? .7 : 1,
          }}>{objetivo ? 'Salvar' : 'Criar objetivo'}</button>
          {objetivo && onExcluir && (
            <button onClick={excluir} disabled={salvando} style={{
              width: '100%', marginTop: 10, padding: 12, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 14, fontWeight: 700, background: '#fff', color: COR.erroTexto, border: `1.5px solid ${COR.borda}`,
            }}>{confirmarExcluir ? 'Tocar de novo para excluir · o dinheiro fica sem objetivo' : 'Excluir objetivo'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
