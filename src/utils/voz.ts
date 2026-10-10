/** Reconhecimento de voz do navegador (Chrome no Android, Safari no iPhone); null onde não existe. */
export type Reconhecimento = {
  lang: string; interimResults: boolean; maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void
}
type ConstrutorReconhecimento = new () => Reconhecimento

export function reconhecimentoDeVoz(): ConstrutorReconhecimento | null {
  const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecimento; webkitSpeechRecognition?: ConstrutorReconhecimento }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
