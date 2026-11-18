import { useEffect, useSyncExternalStore } from 'react'
import { useApp } from '../../context/AppContext'
import { contarNaoLidas, EVENTO_MENSAGENS, souSuporte } from '../../utils/mensagens'

/**
 * O número do selo de Mensagens (menu do computador, envelope da Início,
 * item do "Mais"). Uma contagem só para as três: guardada aqui, refeita ao
 * entrar, ao voltar para o app, a cada 2 minutos com a tela visível e
 * quando a caixa avisa que algo foi lido ou enviado.
 */
let valor = 0
let ehSuporte = false
let dono: string | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach(f => f())
let montados = 0
let timer: ReturnType<typeof setInterval> | null = null
let contaCriadaEm: string | undefined

async function recontar() {
  if (!dono) return
  const quem = dono
  const n = await contarNaoLidas(quem, contaCriadaEm, ehSuporte)
  if (dono !== quem) return
  if (n !== valor) { valor = n; avisar() }
}

function aoVoltar() { if (document.visibilityState === 'visible') recontar() }

export function useMensagensNaoLidas(): number {
  const { user } = useApp()
  const uid = user?.id ?? null

  useEffect(() => {
    if (!uid) return
    if (dono !== uid) {
      dono = uid; valor = 0; ehSuporte = false; contaCriadaEm = user?.created_at; avisar()
      souSuporte().then(s => { if (dono === uid) { ehSuporte = s; recontar() } })
    }
    montados++
    if (montados === 1) {
      recontar()
      window.addEventListener(EVENTO_MENSAGENS, recontar)
      document.addEventListener('visibilitychange', aoVoltar)
      timer = setInterval(() => { if (document.visibilityState === 'visible') recontar() }, 120_000)
    }
    return () => {
      montados--
      if (montados === 0) {
        window.removeEventListener(EVENTO_MENSAGENS, recontar)
        document.removeEventListener('visibilitychange', aoVoltar)
        if (timer) clearInterval(timer)
        timer = null
      }
    }
  }, [uid, user?.created_at])

  return useSyncExternalStore(f => { ouvintes.add(f); return () => { ouvintes.delete(f) } }, () => (uid ? valor : 0))
}
