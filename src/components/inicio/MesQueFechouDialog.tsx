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
type Modo = 'plano' | 'parcelas' | 'uma' | 'esperar'

export default function MesQueFechouDialog({ f, onFechar, onLembrarDepois, onResolver }: {
  f: MesQueFechou
  onFechar: () => void
  onLembrarDepois: () => void
  onResolver: (f: MesQueFechou, escolhas: { item: ItemDoMesQueFechou; valor: number | null; meses?: number }[]) => number
}) {
  const { toast } = useToast()
  const [valores, setValores] = useState<Record<string, string>>(
    () => Object.fromEntries(f.itens.map(i => [rotulo(i), String(i.sugerido)])))
  // "plano": todo mês até o fim do plano; "parcelas": só N meses (IPVA,
  // matrícula, seguro); "uma": foi só uma vez / manter como está;
  // "esperar": o mês foi anotado pela metade e a pessoa decide na próxima
  // virada, com um mês inteiro (C9). "Esperar" e "uma" não gravam nada.
  const [modo, setModo] = useState<Record<string, Modo>>({})
  const [parcelas, setParcelas] = useState<Record<string, string>>({})
  const modoDe = (k: string): Modo => modo[k] ?? 'plano'
  const nDe = (k: string) => parseInt(parcelas[k] ?? '') || 0
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])
  const nomeMes = MESES[f.mes]
  const grava = (m: Modo) => m === 'plano' || m === 'parcelas'
  const invalido = f.itens.some(i => grava(modoDe(rotulo(i))) && parseValor(valores[rotulo(i)] ?? '') === null)
  const semMeses = f.itens.some(i => modoDe(rotulo(i)) === 'parcelas' && nDe(rotulo(i)) < 1)
  const mesSeguinte = MESES[(f.mes + 1) % 12]
  const diasAnotados = f.anotado ? f.anotado.ate - f.anotado.de + 1 : 0
  const hoje = new Date()
  const ateMes = (n: number) => {
    const ym = hoje.getFullYear() * 12 + hoje.getMonth() + n - 1
    const a = Math.floor(ym / 12)
    return `${MESES[ym % 12]}${a !== hoje.getFullYear() ? ` de ${a}` : ''}`
  }

  function confirmar() {
    if (invalido) { toast('Confira os valores: algum não é um número.', 'error'); return }
    if (semMeses) { toast('Diga em quantos meses ainda vai pagar.', 'error'); return }
    const n = onResolver(f, f.itens.map(i => {
      const k = rotulo(i), m = modoDe(k)
      return { item: i, valor: grava(m) ? parseValor(valores[k] ?? '') : null, ...(m === 'parcelas' ? { meses: nDe(k) } : {}) }
    }))
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
          subtitulo={f.anotado
            ? `Você anotou ${diasAnotados} dias de ${nomeMes} (${f.anotado.de} a ${f.anotado.ate}). Para um mês inteiro, o app sugere a média por dia; dá para usar só o anotado ou esperar ${mesSeguinte}.`
            : f.parcial
            ? `Você usou o app só parte de ${nomeMes}: confira se o valor vale para um mês inteiro.`
            : 'Todo mês: entra deste mês até o fim do plano. Em parcelas: só nos meses que faltam. Dá para mudar no Planejamento.'} />
        <div style={{ padding: '4px 20px 18px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflow: 'auto', marginTop: 12, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {f.itens.map(i => {
              const k = rotulo(i)
              const m = modoDe(k)
              const so = !grava(m)
              const n = nDe(k)
              const valorAtual = parseValor(valores[k] ?? '')
              const escolherValor = (v: number) => setValores(s => ({ ...s, [k]: String(v) }))
              return (
                <div key={k} style={{ borderTop: `1px solid ${COR.borda}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 2 }}>
                    {i.tipo === 'chute'
                      ? `Você estimou ${reais(i.plano)} e gastou ${reais(i.gasto)} em ${nomeMes}.`
                      : `Gastou ${reais(i.gasto)} em ${nomeMes} · sem plano neste mês.`}
                    {i.media !== undefined && ` Em ${diasAnotados} dias anotados, uma média de ${reais(i.gasto / diasAnotados)} por dia: no mês inteiro, seriam cerca de ${reais(i.media)}.`}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                    <button type="button" aria-pressed={m === 'plano'} onClick={() => setModo(s => ({ ...s, [k]: 'plano' }))} style={pilula(m === 'plano')}>
                      {i.tipo === 'chute' ? 'Ajustar o plano' : 'Todo mês'}
                    </button>
                    {i.tipo === 'nova' && (
                      <button type="button" aria-pressed={m === 'parcelas'} onClick={() => setModo(s => ({ ...s, [k]: 'parcelas' }))} style={pilula(m === 'parcelas')}>
                        Em parcelas
                      </button>
                    )}
                    <button type="button" aria-pressed={m === 'uma'} onClick={() => setModo(s => ({ ...s, [k]: 'uma' }))} style={pilula(m === 'uma')}>
                      {i.tipo === 'chute' ? 'Manter como está' : 'Foi só uma vez'}
                    </button>
                    {i.media !== undefined && i.tipo === 'nova' && (
                      <button type="button" aria-pressed={m === 'esperar'} onClick={() => setModo(s => ({ ...s, [k]: 'esperar' }))} style={pilula(m === 'esperar')}>
                        Esperar {mesSeguinte}
                      </button>
                    )}
                  </div>
                  {i.media !== undefined && !so && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      <button type="button" aria-pressed={valorAtual === i.media} onClick={() => escolherValor(i.media!)} style={pilula(valorAtual === i.media)}>
                        Usar a média: {reais(i.media)}
                      </button>
                      <button type="button" aria-pressed={valorAtual === Math.round(i.gasto)} onClick={() => escolherValor(Math.round(i.gasto))} style={pilula(valorAtual === Math.round(i.gasto))}>
                        Só o anotado: {reais(Math.round(i.gasto))}
                      </button>
                    </div>
                  )}
                  {m === 'esperar' && (
                    <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 8 }}>
                      Na virada de {mesSeguinte}, com o mês inteiro anotado, o app pergunta de novo.
                    </div>
                  )}
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
                  {m === 'parcelas' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: '#475569', flexWrap: 'wrap' }}>
                      Ainda faltam
                      <input inputMode="numeric" value={parcelas[k] ?? ''} aria-label={`Quantos meses ainda faltam de ${k}`}
                        onChange={e => setParcelas(v => ({ ...v, [k]: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                        placeholder="0"
                        style={{
                          width: 56, border: `1.5px solid ${COR.borda}`, borderRadius: 8, padding: '7px 10px',
                          fontSize: 16, fontFamily: 'inherit', color: COR.texto, outline: 'none', textAlign: 'center',
                        }} />
                      {n === 1 ? 'mês' : 'meses'}
                      {n > 0 && <span style={{ color: COR.textoSuave }}>{n === 1 ? `só ${ateMes(1)}` : `de ${ateMes(1)} a ${ateMes(n)}`}</span>}
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
