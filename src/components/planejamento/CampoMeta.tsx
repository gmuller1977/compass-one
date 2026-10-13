import { useEffect, useRef, useState } from 'react'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import { COR } from '../../utils/cores'
import { MESES_FULL, fmt } from './types'

/**
 * O campo da meta de economia de UM mês — quanto a pessoa quer guardar
 * (ganhar menos gastar) naquele mês, `objetivos[mês]`. Fica no próprio mês, no
 * modal do computador e no mês aberto do celular; o botão "Meta de economia"
 * da barra de ferramentas saiu (pedido do Guilherme em 13/10/2026).
 *
 * A célula é a de sempre (aceita conta). Mês FECHADO não muda: a meta dela é
 * a régua com que ele foi medido no gráfico. Zero apaga a meta do mês.
 *
 * Ao digitar uma meta nova, o mês já fica gravado e a janela PERGUNTA se a
 * mesma meta vale para os meses seguintes até dezembro (pedido dele no mesmo
 * dia: "perguntar se deseja copiar"). Diz quais desses meses já têm outra
 * meta, que seria trocada. Nada é copiado sem a resposta.
 */
export default function CampoMeta({ mi, anoAtual, mesAtual, objetivos, onMetaSave, grande }: {
  mi: number
  anoAtual: number
  mesAtual: number
  objetivos: number[]
  onMetaSave: (objetivos: number[]) => void
  grande?: boolean
}) {
  const anoCorrente = new Date().getFullYear()
  const fechado = anoAtual < anoCorrente || (anoAtual === anoCorrente && mi < mesAtual)
  const [pergunta, setPergunta] = useState<{ valor: number; base: number[] } | null>(null)

  const salvar = (v: number) => {
    const valor = Math.max(0, v)
    const novo = Array.from({ length: 12 }, (_, i) => (i === mi ? valor : objetivos[i] ?? 0))
    onMetaSave(novo)
    const mudou = Math.abs(valor - (objetivos[mi] ?? 0)) >= 0.005
    const algumDiferente = novo.slice(mi + 1).some(o => Math.abs((o ?? 0) - valor) >= 0.005)
    if (mudou && valor > 0 && mi < 11 && algumDiferente) setPergunta({ valor, base: novo })
  }

  return (
    <>
      <PlanCelulaEditavel grande={grande}
        valor={objetivos[mi] ?? 0}
        readOnly={fechado}
        motivoBloqueio="Mês fechado: a meta fica como estava quando ele foi medido"
        onSave={salvar}
      />
      {pergunta && (
        <CopiarMetaDialog mi={mi} valor={pergunta.valor} base={pergunta.base}
          onCopiar={() => {
            onMetaSave(pergunta.base.map((o, i) => (i > mi ? pergunta.valor : o)))
            setPergunta(null)
          }}
          onFechar={() => setPergunta(null)} />
      )}
    </>
  )
}

function CopiarMetaDialog({ mi, valor, base, onCopiar, onFechar }: {
  mi: number; valor: number; base: number[]; onCopiar: () => void; onFechar: () => void
}) {
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])
  const proximo = MESES_FULL[mi + 1].toLowerCase()
  const periodo = mi + 1 === 11 ? 'dezembro' : `${proximo} a dezembro`
  const outras = base.map((o, i) => ({ i, o: o ?? 0 }))
    .filter(x => x.i > mi && x.o > 0 && Math.abs(x.o - valor) >= 0.005)
  const btn = (primario: boolean): React.CSSProperties => ({
    border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', background: primario ? COR.azul : '#f1f5f9', color: primario ? '#fff' : '#1e3a8a',
  })
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="copiar-meta-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 420, padding: '18px 20px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto, textAlign: 'left',
      }}>
        <div style={{ fontSize: 12, color: COR.textoSuave }}>Meta de economia · {MESES_FULL[mi]}</div>
        <h3 id="copiar-meta-titulo" style={{ margin: '4px 0 0', fontSize: 16, lineHeight: 1.35 }}>
          Copiar a meta para os próximos meses?
        </h3>
        <div style={{ fontSize: 14, color: COR.texto, marginTop: 6, lineHeight: 1.45 }}>
          Guardar <b>{fmt(valor, true)}</b> também de {periodo}.
        </div>
        {outras.length > 0 && (
          <div style={{ marginTop: 10, border: `1px solid ${COR.avisoBorda}`, background: COR.avisoFundo, borderRadius: 10,
            padding: '8px 12px', fontSize: 13, color: COR.avisoTexto, lineHeight: 1.45 }}>
            {outras.length === 1 ? 'Este mês já tem outra meta, que será trocada: ' : 'Estes meses já têm outra meta, que será trocada: '}
            {outras.map(x => `${MESES_FULL[x.i].toLowerCase()} (${fmt(x.o, true)})`).join(', ')}.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          <button type="button" onClick={onFechar} style={btn(false)}>Só {MESES_FULL[mi].toLowerCase()}</button>
          <button type="button" autoFocus onClick={onCopiar} style={btn(true)}>Copiar até dezembro</button>
        </div>
      </div>
    </div>
  )
}
