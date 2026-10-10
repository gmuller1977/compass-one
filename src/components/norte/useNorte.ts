import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { useMesDaInicio } from '../inicio/useMesDaInicio'
import { dadosDoNorte, contextoNorte, SYSTEM_NORTE, type DadosNorte } from '../../utils/contextoNorte'
import { creditarAurix } from '../../utils/aurix'
import { dispararToastAurix } from '../aurix/AurixToast'

export type Mensagem = { role: 'user' | 'assistant'; content: string; ts: number }

// A conversa fica no aparelho, por usuário: fechar a tela não apaga mais.
// Só as últimas 40 — o Gemini recebe as últimas 20 de qualquer jeito.
const chave = (uid: string) => `compass-norte-${uid}`
const MAX = 40

function lerConversa(uid: string | undefined): Mensagem[] {
  if (!uid) return []
  try {
    const v = JSON.parse(localStorage.getItem(chave(uid)) ?? '[]')
    return Array.isArray(v) ? v.slice(-MAX) : []
  } catch { return [] }
}

/**
 * O Norte, sem a tela: os dados (pelo motor do app, utils/contextoNorte), a
 * conversa guardada e o envio pela função north-chat. Usado pela tela /norte
 * e pelo painel do computador.
 */
export function useNorte() {
  const { user, perfil } = useApp()
  const uid = user?.id
  const hoje = new Date()
  const { deps } = useMesDaInicio(hoje.getFullYear(), hoje.getMonth())
  const nome = perfil.apelido || perfil.nome.split(' ')[0] || ''

  // Recalcula só quando os dados mudam; o dia não muda durante a conversa.
  const dados: DadosNorte = useMemo(() => dadosDoNorte({ deps, nome }), [deps, nome])

  const [messages, setMessages] = useState<Mensagem[]>(() => lerConversa(uid))
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => { setMessages(lerConversa(uid)) }, [uid])
  useEffect(() => {
    if (!uid) return
    try { localStorage.setItem(chave(uid), JSON.stringify(messages.slice(-MAX))) } catch { /* só nesta sessão */ }
  }, [messages, uid])

  const limpar = useCallback(() => setMessages([]), [])

  const enviar = useCallback(async (texto: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const userMsg: Mensagem = { role: 'user', content: texto, ts: Date.now() }
    const historico = [...messagesRef.current, userMsg]
    setMessages(historico)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('sem sessao')
      const systemPrompt = SYSTEM_NORTE.replace('{CONTEXTO}', contextoNorte(dados, deps.categorias))
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/north-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({
          systemPrompt,
          history: historico.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        }),
        signal: controller.signal,
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json() as { text?: string }
      setMessages(prev => [...prev, { role: 'assistant', content: data.text ?? 'Desculpe, não consegui responder agora.', ts: Date.now() }])
      if (uid) {
        creditarAurix(uid, 'acao', 'Consultou o Norte', 3, 'acao_north').then(r => {
          if (r) dispararToastAurix({ tipo: 'acao', titulo: 'Consultou o Norte', pontos: 3 })
        })
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant', ts: Date.now(),
        content: navigator.onLine ? 'Tive um problema para responder. Tente de novo.' : 'Sem internet agora. Tente de novo quando a conexão voltar.',
      }])
    } finally {
      clearTimeout(timeout)
      loadingRef.current = false
      setLoading(false)
    }
  }, [dados, deps.categorias, uid])

  return { dados, messages, loading, enviar, limpar, nome }
}
