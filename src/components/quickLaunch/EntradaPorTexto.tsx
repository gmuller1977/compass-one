import { useRef, useState } from 'react'
import { COR } from '../../utils/cores'

type Reconhecimento = {
  lang: string; interimResults: boolean; maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void
}
type ConstrutorReconhecimento = new () => Reconhecimento

function reconhecimentoDeVoz(): ConstrutorReconhecimento | null {
  const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecimento; webkitSpeechRecognition?: ConstrutorReconhecimento }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Lançar escrevendo ou falando: "47 mercado nubank". Quem entende o texto é
 * `interpretarLancamento`; aqui é só a caixa e o microfone. A voz usa o
 * reconhecimento do próprio navegador (Chrome no Android, Safari no iPhone);
 * onde ele não existe, o microfone não aparece. O resultado só PREENCHE o
 * lançamento — a pessoa confere e confirma.
 */
export default function EntradaPorTexto({ onTexto }: { onTexto: (texto: string) => string | null }) {
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [ouvindo, setOuvindo] = useState(false)
  const rec = useRef<Reconhecimento | null>(null)
  const Voz = reconhecimentoDeVoz()

  function enviar(t: string) {
    if (!t.trim()) return
    const r = onTexto(t)
    setAviso(r)
    if (!r) setTexto('')
  }

  function ouvir() {
    if (!Voz) return
    if (ouvindo) { rec.current?.stop(); return }
    const r = new Voz()
    r.lang = 'pt-BR'; r.interimResults = false; r.maxAlternatives = 1
    r.onresult = e => {
      const falado = e.results[0]?.[0]?.transcript ?? ''
      setTexto(falado)
      enviar(falado)
    }
    r.onerror = () => setAviso('Não consegui ouvir. Tente de novo ou escreva.')
    r.onend = () => setOuvindo(false)
    rec.current = r
    setAviso(null)
    setOuvindo(true)
    r.start()
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={texto}
          onChange={e => { setTexto(e.target.value); setAviso(null) }}
          onKeyDown={e => e.key === 'Enter' && enviar(texto)}
          placeholder={ouvindo ? 'Ouvindo…' : 'Ex.: 47 mercado nubank'}
          aria-label="Lançar escrevendo"
          enterKeyHint="go"
          style={{
            flex: 1, minWidth: 0, border: `1.5px solid ${COR.borda}`, borderRadius: 12,
            padding: '10px 12px', fontSize: 14, color: COR.texto, background: '#fff',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        {Voz && (
          <button
            onClick={ouvir}
            aria-label={ouvindo ? 'Parar de ouvir' : 'Lançar falando'}
            style={{
              width: 44, flexShrink: 0, borderRadius: 12, cursor: 'pointer', fontSize: 18,
              border: `1.5px solid ${ouvindo ? COR.erroTexto : COR.borda}`,
              background: ouvindo ? COR.erroFundo : '#fff',
            }}
          >{ouvindo ? '■' : '🎤'}</button>
        )}
        {texto.trim() && (
          <button
            onClick={() => enviar(texto)}
            style={{
              flexShrink: 0, border: 'none', borderRadius: 12, padding: '0 14px', cursor: 'pointer',
              background: COR.azul, color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
            }}
          >OK</button>
        )}
      </div>
      {aviso && <div role="status" style={{ fontSize: 12, color: COR.avisoTexto, marginTop: 4 }}>{aviso}</div>}
    </div>
  )
}
