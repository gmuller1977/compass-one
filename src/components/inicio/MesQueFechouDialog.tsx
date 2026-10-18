import { useEffect, useRef, useState } from 'react'
import type { ItemDoMesQueFechou, MesQueFechou } from '../../utils/mesQueFechou'
import { parseValor } from '../../utils/moeda'
import { COR } from '../../utils/cores'
import ModalTopo from '../ModalTopo'
import { useToast } from '../Toast'

/** A janela do "Outubro fechou" (useMesQueFechou). */
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const rotulo = (i: ItemDoMesQueFechou) => (i.descricao ? `${i.nome} · ${i.descricao}` : i.nome)

export default function MesQueFechouDialog({ f, onFechar, onLembrarDepois, onResolver }: {
  f: MesQueFechou
  onFechar: () => void
  onLembrarDepois: () => void
  onResolver: (f: MesQueFechou, escolhas: { item: ItemDoMesQueFechou; valor: number | null }[]) => number
}) {
  const { toast } = useToast()
  const [valores, setValores] = useState<Record<string, string>>(
    () => Object.fromEntries(f.itens.map(i => [rotulo(i), String(i.sugerido)])))
  const [umaVez, setUmaVez] = useState<Record<string, boolean>>({})
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])
  const nomeMes = MESES[f.mes]
  const invalido = f.itens.some(i => !umaVez[rotulo(i)] && parseValor(valores[rotulo(i)] ?? '') === null)

  function confirmar() {
    if (invalido) { toast('Confira os valores: algum não é um número.', 'error'); return }
    const n = onResolver(f, f.itens.map(i => ({
      item: i, valor: umaVez[rotulo(i)] ? null : parseValor(valores[rotulo(i)] ?? ''),
    })))
    toast(n === 0 ? 'Pronto, nada mudou no plano' : n === 1 ? 'Colocado no plano' : `${n} categorias colocadas no plano`)
    onFechar()
  }

  const pilula = (ativo: boolean): React.CSSProperties => ({
    border: `1.5px solid ${ativo ? COR.azul : COR.borda}`, borderRadius: 999, padding: '5px 12px',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    background: ativo ? '#eff6ff' : 'transparent', color: ativo ? COR.azul : '#475569',
  })

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="mes-fechou-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 560, overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <ModalTopo icone="ti-calendar-check" rotulo={`${nomeMes} fechou`} titulo="O que vai se repetir?" id="mes-fechou-titulo"
          onFechar={onFechar}
          subtitulo={f.parcial
            ? `Você usou o app só parte de ${nomeMes}: confira se o valor vale para um mês inteiro.`
            : 'O valor entra no plano deste mês até o fim do plano. Dá para mudar no Planejamento.'} />
        <div style={{ padding: '4px 20px 18px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflow: 'auto', marginTop: 12, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {f.itens.map(i => {
              const k = rotulo(i)
              const so = !!umaVez[k]
              return (
                <div key={k} style={{ borderTop: `1px solid ${COR.borda}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 2 }}>
                    {i.tipo === 'chute'
                      ? `Você estimou ${reais(i.plano)} e gastou ${reais(i.gasto)} em ${nomeMes}.`
                      : `Gastou ${reais(i.gasto)} em ${nomeMes}, fora do plano.`}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                    <button type="button" aria-pressed={!so} onClick={() => setUmaVez(s => ({ ...s, [k]: false }))} style={pilula(!so)}>
                      {i.tipo === 'chute' ? 'Ajustar o plano' : 'Colocar no plano'}
                    </button>
                    <button type="button" aria-pressed={so} onClick={() => setUmaVez(s => ({ ...s, [k]: true }))} style={pilula(so)}>
                      {i.tipo === 'chute' ? 'Manter como está' : 'Foi só uma vez'}
                    </button>
                  </div>
                  {!so && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: '#475569' }}>
                      R$
                      <input inputMode="decimal" value={valores[k] ?? ''} aria-label={`Valor por mês de ${k}`}
                        onChange={e => setValores(v => ({ ...v, [k]: e.target.value }))}
                        style={{
                          width: 120, border: `1.5px solid ${COR.borda}`, borderRadius: 8, padding: '7px 10px',
                          fontSize: 16, fontFamily: 'inherit', color: COR.texto, outline: 'none',
                        }} />
                      por mês
                    </label>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" onClick={onLembrarDepois} style={{
              border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', background: '#f1f5f9', color: '#1e3a8a', marginRight: 'auto',
            }}>Lembrar depois</button>
            <button type="button" onClick={confirmar} style={{
              border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', background: COR.azul, color: '#fff',
            }}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
