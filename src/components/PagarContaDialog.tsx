import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import type { ContaAVencer } from '../utils/contasAVencer'
import { contaDoPagamento, confirmarPagamento, ehFatura } from '../utils/pagarConta'
import { faltouPagar, levarParaProximaFatura, vencimentoDaSeguinte } from '../utils/saldoDaFatura'
import { nomeDaContaAVencer, quandoVence } from '../utils/quandoVence'
import { parseBRL } from '../utils/moeda'
import { COR } from '../utils/cores'
import { nomeDaConta } from '../utils/nomeDaConta'
import ModalTopo from './ModalTopo'
import { ehContaDisponivel } from '../utils/saldoConta'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const chave = (conta: string, ano: number, mes: number) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`

/**
 * A janela do "Pagar" de uma conta a vencer — a mesma no Lançar do celular e
 * na Início do computador. Grava o MESMO que marcar a fixa em Lançamentos:
 * `fixasConsolidadas`, e o valor real em `fixasValorOverride` quando é outro,
 * na conta onde a fixa aparece (`contaDoPagamento`). A conta vem escolhida e
 * pode ser trocada, como no "Pagar de qual conta?" de Lançamentos. No celular
 * é folha de baixo; no computador, janela central.
 */
export default function PagarContaDialog({ conta: pagando, onFechar, central = false }: {
  conta: ContaAVencer
  onFechar: () => void
  central?: boolean
}) {
  const { contas, categorias, extratoData, updateExtratoMes, setFaturaData } = useApp()
  const destinos = useMemo(() => [
    ...contas.filter(ehContaDisponivel).map(c => ({ id: c.id, nome: nomeDaConta(c, contas) })),
    { id: 'dinheiro', nome: 'Dinheiro' },
  ], [contas])
  const [valor, setValor] = useState(() => pagando.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  const [conta, setConta] = useState<string>(() =>
    contaDoPagamento(pagando.id, pagando.ano, pagando.mes, contas, categorias, extratoData as Record<string, DadosMes>)
      ?? destinos[0]?.id ?? '')

  // Fatura paga em parte: o que faltou vai para a fatura seguinte, se a
  // pessoa quiser (utils/saldoDaFatura, 24/11/2026).
  const cartao = ehFatura(pagando.id) ? contas.find(c => c.id === pagando.id.slice(7)) : undefined
  const faltou = cartao ? faltouPagar(pagando.valor, parseBRL(valor)) : 0
  const [levar, setLevar] = useState(true)

  function confirmar() {
    if (!conta) return
    const v = parseBRL(valor)
    if (v <= 0) return
    updateExtratoMes(chave(conta, pagando.ano, pagando.mes), dm => confirmarPagamento(dm, pagando.id, v, pagando.valor))
    if (cartao) setFaturaData(prev => levarParaProximaFatura(prev, cartao, pagando.ano, pagando.mes, levar ? faltou : 0))
    onFechar()
  }

  const nome = nomeDaContaAVencer(pagando)
  const raio = 20
  return (
    <div role="dialog" aria-modal="true" aria-label={`Pagar ${nome}`} onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 300, display: 'flex',
        alignItems: central ? 'center' : 'flex-end', justifyContent: 'center', padding: central ? 16 : 0 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', width: '100%', maxWidth: central ? 420 : undefined,
        borderRadius: central ? raio : `${raio}px ${raio}px 0 0`, overflow: 'hidden',
        fontFamily: "-apple-system,'Inter',sans-serif", animation: central ? undefined : 'slideUp .2s ease',
      }}>
        <ModalTopo icone="ti-receipt" rotulo="Pagar conta" titulo={nome} raio={raio}
          subtitulo={`Previsto ${fmt(pagando.valor)} · ${quandoVence(pagando)}`} onFechar={onFechar} />
        <div style={{ padding: central ? '18px 20px 22px' : '16px 16px 28px' }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: COR.textoSuave }}>Valor pago
            <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" autoFocus={central} style={{
              display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, marginBottom: 10,
              border: `2px solid ${COR.azul}`, borderRadius: 12, padding: '10px 12px', fontSize: 18, fontWeight: 700,
              color: COR.azul, background: '#eff6ff', fontFamily: 'inherit', outline: 'none',
            }} />
          </label>
          <label style={{ fontSize: 14, fontWeight: 600, color: COR.textoSuave }}>Pago de
            <select value={conta} onChange={e => setConta(e.target.value)} style={{
              display: 'block', width: '100%', marginTop: 4, marginBottom: 14, border: `1.5px solid ${COR.borda}`,
              borderRadius: 12, padding: '10px 12px', fontSize: 14, color: COR.texto, background: '#fff', fontFamily: 'inherit',
            }}>
              {destinos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </label>
          {faltou > 0 && (
            <div style={{ background: COR.avisoFundo, borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COR.avisoTexto }}>Faltaram {fmt(faltou)} desta fatura</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {([[true, `Levar para a fatura de ${vencimentoDaSeguinte(pagando.ano, pagando.mes)}`], [false, 'Não levar']] as const).map(([v, rotulo]) => (
                  <button key={String(v)} onClick={() => setLevar(v)} aria-pressed={levar === v} style={{
                    flex: v ? '1 1 auto' : '0 0 auto', padding: '9px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 700, border: `2px solid ${COR.avisoTexto}`,
                    background: levar === v ? COR.avisoTexto : '#fff', color: levar === v ? '#fff' : COR.avisoTexto,
                  }}>{rotulo}</button>
                ))}
              </div>
              <div style={{ fontSize: 13, color: COR.avisoTexto, marginTop: 8, lineHeight: 1.4 }}>
                {levar
                  ? 'Entra no total da próxima fatura, sem contar de novo como gasto. Os juros aparecem quando você informar o valor da fatura do banco.'
                  : 'A diferença fica fora do Compass. Use quando a fatura foi negociada ou parcelada com o banco.'}
              </div>
            </div>
          )}
          <button onClick={confirmar} style={{
            width: '100%', padding: 16, border: 'none', borderRadius: 16, cursor: 'pointer',
            background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`, color: '#fff',
            fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
          }}>✓ Marcar como paga</button>
        </div>
      </div>
    </div>
  )
}
