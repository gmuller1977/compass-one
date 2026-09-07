import { useState } from 'react'
import MesesSelector from './MesesSelector'
import { MESES_FULL, fmt, parseValor } from './types'
import { COR } from '../../utils/cores'

interface Props {
  mesAtual: number
  /** Doze valores; zero significa "sem meta neste mês". */
  objetivos: number[]
  /** Resultado previsto de cada mês: entradas menos saídas. */
  sobraPrevista: number[]
  onSalvar: (objetivos: number[]) => void
}

/**
 * Quanto você quer que sobre em cada mês.
 *
 * O campo já existia no modelo — `PlanoAnoData.objetivos`, doze números, um por
 * mês — declarado, gravado a cada save e nunca lido nem escrito por ninguém.
 * Aqui ele ganha dono.
 *
 * Fica na página, e não na barra de ferramentas, porque a barra é renderizada
 * dentro de cada uma das três visões: colocá-la lá custaria a mesma prop
 * atravessando Grade, Planilha e Lista. Aqui aparece nas três de uma vez.
 *
 * É por MÊS, e não um número só, porque dezembro não é fevereiro — foi para
 * isso que `objetivos` nasceu como array.
 */
export default function PlanMeta({ mesAtual, objetivos, sobraPrevista, onSalvar }: Props) {
  const [aberto, setAberto] = useState(false)
  const [valorStr, setValorStr] = useState('')
  const [erro, setErro] = useState('')
  // O mês corrente ainda está acontecendo, então a meta dele vale. O seletor
  // bloqueia `mi <= mesAtual`; um a menos libera o mês de hoje em diante.
  const [meses, setMeses] = useState(() =>
    Array.from({ length: 12 }, (_, i) => i >= mesAtual))

  const meta = objetivos[mesAtual] ?? 0
  const sobra = sobraPrevista[mesAtual] ?? 0
  const cumpre = sobra >= meta

  function salvar() {
    const v = parseValor(valorStr)
    if (v === null) return setErro(`"${valorStr.trim()}" não é um valor`)
    if (!meses.some(Boolean)) return setErro('Escolha ao menos um mês')
    setErro('')
    onSalvar(objetivos.map((atual, i) => (meses[i] ? v : atual)))
    setAberto(false)
    setValorStr('')
  }

  return (
    <div style={{
      margin: '0 16px 12px', background: COR.branco,
      border: `1px solid ${COR.borda}`, borderRadius: 10, padding: '10px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>
          🎯 Meta de sobra
        </span>
        {meta > 0 ? (
          <span style={{ fontSize: 13, color: COR.textoSuave }}>
            em {MESES_FULL[mesAtual].toLowerCase()}: <b style={{ color: COR.texto }}>{fmt(meta, true)}</b>
            {' · '}previsto sobrar{' '}
            <b style={{ color: cumpre ? COR.sucessoTexto : COR.avisoTexto }}>
              {fmt(sobra, true)}
            </b>
            {cumpre ? ' ✓' : ' ⚠'}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: COR.textoSuave }}>
            ainda não definida — quanto você quer que sobre por mês?
          </span>
        )}
        <button onClick={() => setAberto(v => !v)} style={{
          marginLeft: 'auto', background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          color: COR.azul, fontWeight: 600,
        }}>
          {aberto ? 'Cancelar' : meta > 0 ? 'Alterar' : 'Definir'}
        </button>
      </div>

      {aberto && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COR.bordaSuave}` }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: COR.texto,
            display: 'block', marginBottom: 4 }}>
            Quanto quer que sobre
          </label>
          <input value={valorStr} onChange={e => setValorStr(e.target.value)}
            placeholder="R$ 500,00" onKeyDown={e => e.key === 'Enter' && salvar()}
            style={{ border: `1px solid ${COR.borda}`, borderRadius: 8, padding: '8px 12px',
              fontSize: 13, width: 180, fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box', color: COR.texto, background: COR.branco }} />

          <div style={{ fontSize: 12, fontWeight: 600, color: COR.texto,
            margin: '12px 0 4px' }}>
            Em quais meses
          </div>
          <MesesSelector mesAtual={mesAtual - 1} selecionados={meses} onChange={setMeses} />

          {erro && (
            <div style={{ background: COR.erroFundo, color: COR.erroTexto, borderRadius: 8,
              padding: '7px 11px', fontSize: 12, marginTop: 10 }}>⚠ {erro}</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={salvar} style={{
              background: COR.azul, color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>Salvar</button>
            <button onClick={() => { setAberto(false); setErro('') }} style={{
              background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>Cancelar</button>
          </div>

          <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 10, lineHeight: 1.5 }}>
            Zero apaga a meta do mês. O Simulador usa esse valor para dizer se uma
            compra deixaria o mês abaixo do que você quer guardar.
          </div>
        </div>
      )}
    </div>
  )
}
