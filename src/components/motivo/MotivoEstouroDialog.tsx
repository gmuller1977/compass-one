import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { useToast } from '../Toast'
import type { EstouroComMotivo, Motivo } from '../../utils/motivoDoEstouro'

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const TIPOS: { v: NonNullable<Motivo['tipoEvento']>; label: string }[] = [
  { v: 'pontual', label: 'Foi só desta vez' },
  { v: 'anual',   label: 'Acontece todo ano' },
  { v: 'sazonal', label: 'Acontece em certos meses' },
]

/**
 * "Por que passou do plano?" — uma caixa de texto por categoria, sem
 * obrigação. Os mesmos campos da etapa de justificativa da Revisão mensal
 * (texto e tipo do evento), para ela abrir com eles preenchidos.
 */
export default function MotivoEstouroDialog({ estouros, nomeMes, salvar, onFechar }: {
  estouros: EstouroComMotivo[]
  nomeMes: string
  salvar: (p: { rotulo: string; prev: number; real: number; justificativa: string; tipoEvento: Motivo['tipoEvento'] }) => Promise<string | null>
  onFechar: () => void
}) {
  const { toast } = useToast()
  const [textos, setTextos] = useState<Record<string, string>>(
    () => Object.fromEntries(estouros.map(e => [e.rotulo, e.motivo?.justificativa ?? ''])))
  const [tipos, setTipos] = useState<Record<string, Motivo['tipoEvento']>>(
    () => Object.fromEntries(estouros.map(e => [e.rotulo, e.motivo?.tipoEvento ?? null])))
  const [salvando, setSalvando] = useState(false)
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const mudou = (e: EstouroComMotivo) =>
    (textos[e.rotulo] ?? '').trim() !== (e.motivo?.justificativa ?? '').trim()
    || (tipos[e.rotulo] ?? null) !== (e.motivo?.tipoEvento ?? null)
  const alteradas = estouros.filter(mudou)

  async function confirmar() {
    if (alteradas.length === 0) { onFechar(); return }
    setSalvando(true)
    let erro: string | null = null
    for (const e of alteradas) {
      erro = await salvar({ rotulo: e.rotulo, prev: e.prev, real: e.real,
        justificativa: textos[e.rotulo] ?? '', tipoEvento: tipos[e.rotulo] ?? null }) ?? erro
    }
    setSalvando(false)
    if (erro) { toast(`Não foi possível salvar: ${erro}`, 'error'); return }
    toast(alteradas.length === 1 ? 'Motivo anotado' : `${alteradas.length} motivos anotados`)
    onFechar()
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="motivo-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 560, padding: '18px 20px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <h3 id="motivo-titulo" style={{ margin: 0, fontSize: 17 }}>Por que passou do plano?</h3>
        <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 4, lineHeight: 1.4 }}>
          Uma frase basta. No fim de {nomeMes}, a Revisão mensal abre com o que você anotar aqui.
        </div>

        <div style={{ overflow: 'auto', marginTop: 12, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {estouros.map(e => (
            <div key={e.rotulo} style={{ borderTop: `1px solid ${COR.borda}`, paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{e.rotulo}</span>
                <span style={{ fontSize: 13, color: COR.erroTexto, fontWeight: 700 }}>
                  {e.semPlano ? `${reais(e.real)} sem plano` : `passou ${reais(e.excesso)}`}
                </span>
              </div>
              {!e.semPlano && (
                <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>
                  gastou {reais(e.real)} de {reais(e.prev)}
                </div>
              )}
              <textarea value={textos[e.rotulo] ?? ''} rows={2}
                aria-label={`Motivo de ${e.rotulo}`}
                placeholder="Ex.: troquei o pneu do carro"
                onChange={ev => setTextos(t => ({ ...t, [e.rotulo]: ev.target.value }))}
                style={{
                  width: '100%', boxSizing: 'border-box', marginTop: 8, border: `1.5px solid ${COR.borda}`,
                  borderRadius: 8, padding: '8px 10px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit',
                  color: COR.texto, outline: 'none',
                }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {TIPOS.map(t => {
                  const ativo = tipos[e.rotulo] === t.v
                  return (
                    <button key={t.v} type="button" aria-pressed={ativo}
                      onClick={() => setTipos(s => ({ ...s, [e.rotulo]: ativo ? null : t.v }))}
                      style={{
                        border: `1.5px solid ${ativo ? COR.azul : COR.borda}`, borderRadius: 999,
                        padding: '5px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: ativo ? '#eff6ff' : 'transparent', color: ativo ? COR.azul : '#475569',
                      }}>{t.label}</button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onFechar} style={{
            border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', background: '#f1f5f9', color: '#1e3a8a',
          }}>Agora não</button>
          <button type="button" onClick={confirmar} disabled={salvando} style={{
            border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            cursor: salvando ? 'default' : 'pointer', background: COR.azul, color: '#fff', opacity: salvando ? 0.6 : 1,
          }}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}
