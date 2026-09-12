import { useEffect, useMemo, useState } from 'react'
import { COR } from '../utils/cores'
import { NOMES_MESES } from './novoLancamentoExtrato/NleShared'
import { parseBRL } from '../utils/moeda'
import { chaveDaLinha, planoDaProposta, type LinhaProposta, type Proposta } from '../utils/primeiroPlano'
import type { PlanoAnoData } from '../context/AppContext'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * O primeiro plano, proposto a partir do mês que fechou.
 *
 * É o momento que o modal da descoberta promete. A tela não pergunta "quanto
 * você gasta em mercado?" — ela mostra o que aconteceu e pede confirmação.
 * A diferença é toda: a primeira pergunta exige um número que ninguém tem de
 * cabeça; a segunda exige só reconhecer o próprio extrato.
 *
 * Os valores são editáveis linha a linha porque um mês não é lei: quem gastou
 * 500 em mercado num mês de festa corrige para 400 antes de aceitar. Zerar
 * uma linha a remove do plano — é como dizer "isso foi exceção".
 */
export default function PrimeiroPlanoModal({
  proposta, mesInicio, onCriar, onFechar,
}: {
  proposta: Proposta
  /** Primeiro mês que o plano cobre. Meses anteriores ficam zerados. */
  mesInicio: number
  onCriar: (p: PlanoAnoData) => void
  onFechar: () => void
}) {
  const [valores, setValores] = useState<Record<string, string>>({})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  // parseBRL, e não parseValor: o onChange roda a cada tecla e null travaria
  // o campo na vírgula. Ver CLAUDE.md, seção Dinheiro.
  const numeros = useMemo(() => {
    const r: Record<string, number> = {}
    for (const k of Object.keys(valores)) r[k] = parseBRL(valores[k])
    return r
  }, [valores])

  const valorDe = (l: LinhaProposta) => {
    const k = chaveDaLinha(l)
    return k in numeros ? numeros[k] : l.valor
  }
  const somar = (ls: LinhaProposta[]) => ls.reduce((s, l) => s + valorDe(l), 0)

  const totalE = somar(proposta.entradas)
  const totalS = somar(proposta.saidas)
  const sobra = totalE - totalS
  const mesBase = NOMES_MESES[proposta.mes]
  const nada = !proposta.entradas.length && !proposta.saidas.length

  function linha(l: LinhaProposta) {
    const k = chaveDaLinha(l)
    const zerada = valorDe(l) <= 0
    return (
      <div key={k} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 0', borderBottom: `1px solid ${COR.bordaSuave}`,
        opacity: zerada ? 0.45 : 1,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {l.nome}{l.descricao ? ' · ' + l.descricao : ''}
          </div>
          <div style={{ fontSize: 10.5, color: COR.textoSuave }}>
            {l.grupo ?? 'Outros'}{l.fixa ? ' · fixa' : ''}
          </div>
        </div>
        <input
          value={k in valores ? valores[k] : l.valor.toFixed(2).replace('.', ',')}
          onChange={e => setValores(v => ({ ...v, [k]: e.target.value }))}
          inputMode="decimal"
          aria-label={'Valor de ' + l.nome}
          style={{
            width: 106, textAlign: 'right', boxSizing: 'border-box',
            border: `1.5px solid ${COR.borda}`, borderRadius: 8, padding: '6px 9px',
            fontSize: 13, color: COR.texto, background: COR.branco,
            outline: 'none', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>
    )
  }

  function bloco(titulo: string, ls: LinhaProposta[], total: number, cor: string) {
    if (!ls.length) return null
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 2,
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: COR.textoSuave,
            textTransform: 'uppercase', letterSpacing: '.5px' }}>{titulo}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: cor,
            fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
        </div>
        {ls.map(linha)}
      </div>
    )
  }

  return (
    <div
      onClick={onFechar}
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Seu primeiro plano"
        style={{
          background: COR.branco, borderRadius: 16, padding: '26px 26px 22px',
          maxWidth: 520, width: '100%', maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,.22)',
        }}
      >
        <div style={{ fontSize: 28, lineHeight: 1 }}>📋</div>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: COR.texto,
          margin: '12px 0 8px', textWrap: 'balance' }}>
          {mesBase} fechou. Aqui está o seu primeiro plano.
        </h2>

        <p style={{ fontSize: 13.5, color: COR.textoSuave, lineHeight: 1.6, margin: 0 }}>
          {nada
            ? <>Não encontrei lançamentos em {mesBase.toLowerCase()}. Sem eles não há
                do que partir — registre um mês e eu volto com a proposta.</>
            : <>Estes são os valores que <b style={{ color: COR.texto }}>aconteceram</b> em{' '}
                {mesBase.toLowerCase()}. Eles viram o seu plano de{' '}
                <b style={{ color: COR.texto }}>{NOMES_MESES[mesInicio].toLowerCase()}</b> até
                dezembro. Ajuste o que foi fora do normal — zerar uma linha a tira do plano.</>}
        </p>

        {!nada && (
          <>
            {bloco('Receitas', proposta.entradas, totalE, '#15803d')}
            {bloco('Despesas', proposta.saidas, totalS, '#b91c1c')}

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginTop: 16, padding: '12px 14px', borderRadius: 10,
              background: sobra >= 0 ? '#f0fdf4' : '#fef2f2',
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: COR.texto }}>
                {sobra >= 0 ? 'Sobra por mês' : 'Falta por mês'}
              </span>
              <span style={{ fontSize: 17, fontWeight: 800,
                color: sobra >= 0 ? '#15803d' : '#b91c1c',
                fontVariantNumeric: 'tabular-nums' }}>{fmt(sobra)}</span>
            </div>
          </>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => onCriar(planoDaProposta(proposta, mesInicio, numeros))}
            disabled={nada || (totalE <= 0 && totalS <= 0)}
            style={{
              flex: '1 1 180px', padding: '12px 20px', border: 'none', borderRadius: 10,
              background: nada ? '#cbd5e1' : `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
              color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: nada ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >Criar meu plano</button>
          <button onClick={onFechar} style={{
            flex: '1 1 150px', padding: '12px 20px', borderRadius: 10,
            border: `1.5px solid ${COR.borda}`, background: COR.branco,
            color: COR.texto, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>Agora não</button>
        </div>

        {!nada && (
          <p style={{ fontSize: 12, color: COR.textoSuave, margin: '10px 0 0', lineHeight: 1.5 }}>
            Nada disso é definitivo: depois de criado, o plano se ajusta mês a mês na Grade.
          </p>
        )}
      </div>
    </div>
  )
}
