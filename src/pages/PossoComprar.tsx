import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes, PlanoAnoData } from '../context/AppContext'
import type { Deps } from '../utils/saldoConta'
import { simularCompra, fimDoPlanejamento, type Parcelamento } from '../utils/simulacaoCompra'
import { parseValor } from '../utils/moeda'
import { Resposta } from '../components/simulacao/SimCompra'
import BottomNav from '../components/BottomNav'
import { COR } from '../utils/cores'
import { M } from '../components/mobile/estilo'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PARCELAS = [1, 2, 3, 4, 5, 6, 10, 12]

/**
 * "Posso comprar?" no celular (Fase 3 do plano mobile). A decisão de compra
 * acontece na loja, com o celular na mão: valor, parcelas e como paga — e a
 * resposta.
 *
 * É o Simulador reduzido a uma opção: a conta é `simularCompra` e a resposta
 * é o MESMO componente `Resposta` da aba Compra, com a mesma frase ("Sim, dá
 * para comprar", "Aperta, mas você se recupera"...) e o mês a mês. Comparar
 * formas de pagamento lado a lado e incluir no plano continuam no Simulador,
 * que tem a tabela.
 */
export default function PossoComprar() {
  const navigate = useNavigate()
  const { contas, categorias, planos, extratoData, faturaData, saldoInicialDinheiro, cenarioPrevisao } = useApp()

  const [nome, setNome] = useState('')
  const [valorStr, setValorStr] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const [ondeId, setOndeId] = useState('')   // '' = débito ou Pix
  const [erro, setErro] = useState('')
  const [pedido, setPedido] = useState<Parcelamento | null>(null)

  const cartoes = contas.filter(c => c.tipo === 'cartao')
  const valor = parseValor(valorStr) ?? 0

  const deps: Deps = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Deps['faturaData'],
    contas, categorias,
    planos: planos as Record<number, PlanoAnoData | undefined>,
    saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])

  const fimDoPlano = useMemo(() => fimDoPlanejamento(deps.planos), [deps.planos])
  const resultado = useMemo(() => (pedido ? simularCompra(pedido, deps, { piso: 0 }) : null), [pedido, deps])

  function verSeCabe() {
    if (parseValor(valorStr) === null || valor <= 0) return setErro('Quanto custa? Preencha o valor.')
    setErro('')
    const hoje = new Date()
    setPedido({ valorTotal: valor, parcelas, cartaoId: ondeId || undefined, ano: hoje.getFullYear(), mes: hoje.getMonth() })
  }
  // Mudou qualquer campo, a resposta de antes deixa de valer.
  const mudou = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPedido(null) }

  const chip = (ativo: boolean): React.CSSProperties => ({
    padding: '10px 16px', minHeight: 44, borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15,
    border: `1.5px solid ${ativo ? COR.azul : COR.borda}`, background: ativo ? '#eff6ff' : COR.branco,
    color: ativo ? COR.azul : COR.textoSuave, fontWeight: ativo ? 700 : 500,
  })
  const rotulo: React.CSSProperties = { display: 'block', fontSize: 15, fontWeight: 700, color: COR.texto, margin: '18px 0 8px' }
  const campo: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '13px 16px', border: `1.5px solid ${COR.borda}`, borderRadius: 14,
    fontSize: 17, fontFamily: 'inherit', outline: 'none', background: COR.branco, color: COR.texto,
  }

  return (
    <div style={{ minHeight: '100vh', background: M.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <header style={{ background: 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)', borderRadius: '0 0 28px 28px',
        padding: 'calc(20px + env(safe-area-inset-top)) 20px 52px', color: '#fff' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Posso comprar? <span aria-hidden>🛒</span></div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.75)', marginTop: 4 }}>Veja se cabe no plano antes de pagar.</div>
        </div>
      </header>
      <div style={{ padding: '0 16px 110px', maxWidth: 560, margin: '-36px auto 0' }}>

        {!fimDoPlano ? (
          <div style={{ background: COR.branco, borderRadius: M.raio, boxShadow: M.sombra, padding: 18 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: COR.texto }}>Antes, monte o seu planejamento</div>
            <div style={{ fontSize: 15, color: COR.textoSuave, marginTop: 6, lineHeight: 1.5 }}>
              Para dizer se uma compra cabe, a conta precisa saber o que entra e o que sai nos próximos meses.
            </div>
            <button onClick={() => navigate('/planejamento')} style={{
              marginTop: 12, border: 'none', background: 'transparent', color: COR.azul, padding: 0,
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Ir para o Planejamento →</button>
          </div>
        ) : (
          <>
            <div style={{ background: COR.branco, borderRadius: M.raio, boxShadow: M.sombra, padding: '2px 18px 18px' }}>
              <label style={rotulo}>Quanto custa?
                <input value={valorStr} onChange={e => mudou(setValorStr)(e.target.value)} inputMode="decimal"
                  placeholder="R$ 0,00" style={{ ...campo, marginTop: 8, fontSize: 30, fontWeight: 800, color: COR.azul, background: '#eff6ff', borderColor: COR.azul, textAlign: 'center' }}
                  onKeyDown={e => e.key === 'Enter' && verSeCabe()} />
              </label>
              <label style={rotulo}>O que é? <span style={{ fontWeight: 400, color: COR.textoSuave }}>(opcional)</span>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Uma bicicleta"
                  style={{ ...campo, marginTop: 8, fontWeight: 400 }} />
              </label>

              <span style={rotulo}>Em quantas vezes?</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PARCELAS.map(n => (
                  <button key={n} onClick={() => mudou(setParcelas)(n)} style={chip(parcelas === n)}>
                    {n === 1 ? 'À vista' : `${n}×`}
                  </button>
                ))}
              </div>
              {parcelas > 1 && valor > 0 && (
                <div style={{ fontSize: 15, color: COR.textoSuave, marginTop: 8 }}>
                  {parcelas}× de {fmt(valor / parcelas)}
                </div>
              )}

              <span style={rotulo}>Como vai pagar?</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[{ id: '', nome: '💰 Débito ou Pix' },
                  ...cartoes.map(c => ({ id: c.id, nome: `${c.icone || '💳'} ${c.apelido || c.banco}` }))].map(o => (
                  <button key={o.id || 'debito'} onClick={() => mudou(setOndeId)(o.id)} style={chip(ondeId === o.id)}>{o.nome}</button>
                ))}
              </div>

              {erro && (
                <div role="alert" style={{ background: COR.erroFundo, color: COR.erroTexto, borderRadius: 12,
                  padding: '10px 14px', fontSize: 15, marginTop: 14 }}>{erro}</div>
              )}
              <button onClick={verSeCabe} style={{
                width: '100%', marginTop: 20, padding: 17, border: 'none', borderRadius: 16, cursor: 'pointer',
                background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`, color: '#fff',
                fontSize: 17, fontWeight: 700, fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(26,86,219,.3)',
              }}>Ver se cabe no meu bolso</button>
            </div>

            {resultado && pedido && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                <Resposta nome={nome} r={resultado} isMobile piso={0}
                  valorTotal={pedido.valorTotal} parcelas={pedido.parcelas} />
              </div>
            )}

            <button onClick={() => navigate('/simulacao')} style={{
              display: 'block', margin: '18px auto 0', border: 'none', background: 'transparent', color: COR.azul, padding: 8,
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Comparar formas de pagar ›</button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
