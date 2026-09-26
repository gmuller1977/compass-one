import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { COR } from '../utils/cores'
import {
  estadoInatividade, lerUltimaAtividade, marcarAtividade, marcarSaidaPorInatividade,
} from '../utils/inatividade'

// Atividade que conta como "estou aqui". Movimento do mouse entra: quem lê o
// Radar por meia hora sem clicar ainda está usando o app.
const EVENTOS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'] as const
// Escrever no localStorage a cada movimento seria desperdício; 15 s de atraso
// entre abas não muda nada num prazo de 30 minutos.
const INTERVALO_ESCRITA_MS = 15_000

/**
 * Desconecta depois de 30 minutos sem uso, com aviso no último minuto. Montado
 * uma vez, no AppShell — só existe com alguém logado. Regra e motivo em
 * utils/inatividade.
 */
export default function AvisoInatividade() {
  const { sairDaConta } = useApp()
  const [restanteMs, setRestanteMs] = useState<number | null>(null)

  // O "Sair" SALVA todos os dados antes de desconectar, lendo o estado do
  // contexto. Uma versão antiga dele, presa no efeito de montagem, salvaria
  // dados velhos por cima dos novos. Por isso a chamada é sempre pela ref, que
  // acompanha a versão mais recente a cada render.
  const sairRef = useRef(sairDaConta)
  sairRef.current = sairDaConta
  const ultimaMem = useRef(Date.now())
  const saindo = useRef(false)
  const continuarRef = useRef<HTMLButtonElement>(null)

  async function sair() {
    if (saindo.current) return
    saindo.current = true
    marcarSaidaPorInatividade()
    try { await sairRef.current() } catch (e) { console.error('Falha ao sair por inatividade', e) }
  }

  function continuar() {
    const agora = Date.now()
    ultimaMem.current = agora
    marcarAtividade(agora)
    setRestanteMs(null)
  }

  useEffect(() => {
    // Sessão reaberta depois do prazo — navegador fechado e aberto no dia
    // seguinte — sai na hora. Sem carimbo, é sessão nova: começa a contar agora.
    const guardada = lerUltimaAtividade()
    if (guardada === null) marcarAtividade()
    else if (estadoInatividade(Date.now(), guardada).sair) { void sair(); return }
    else ultimaMem.current = guardada

    let ultimaEscrita = 0
    const onAtividade = () => {
      const agora = Date.now()
      ultimaMem.current = agora
      if (agora - ultimaEscrita > INTERVALO_ESCRITA_MS) { marcarAtividade(agora); ultimaEscrita = agora }
    }
    // A maior das duas: a memória desta aba e o carimbo compartilhado das outras.
    const conferir = () => {
      const ultima = Math.max(lerUltimaAtividade() ?? 0, ultimaMem.current)
      const e = estadoInatividade(Date.now(), ultima)
      if (e.sair) { void sair(); return }
      setRestanteMs(e.restanteMs)
    }

    EVENTOS.forEach(ev => window.addEventListener(ev, onAtividade, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', conferir)
    const id = window.setInterval(conferir, 1000)
    return () => {
      EVENTOS.forEach(ev => window.removeEventListener(ev, onAtividade, { capture: true }))
      document.removeEventListener('visibilitychange', conferir)
      window.clearInterval(id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const avisando = restanteMs !== null
  useEffect(() => { if (avisando) continuarRef.current?.focus() }, [avisando])

  if (!avisando) return null
  const segundos = Math.max(1, Math.ceil(restanteMs / 1000))

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="inat-titulo" aria-describedby="inat-texto"
      onKeyDown={e => { if (e.key === 'Escape') continuar() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
      <div style={{
        background: COR.branco, borderRadius: 14, padding: '22px 22px 18px',
        maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.22)',
      }}>
        <div id="inat-titulo" style={{ fontSize: 17, fontWeight: 800, color: COR.texto }}>
          Você ainda está aí?
        </div>
        <p id="inat-texto" style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, margin: '8px 0 18px' }}>
          Por segurança, você será desconectado em{' '}
          <b style={{ color: COR.texto, fontVariantNumeric: 'tabular-nums' }}>{segundos} s</b>.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button ref={continuarRef} onClick={continuar} style={{
            flex: '1 1 170px', padding: '11px 16px', border: 'none', borderRadius: 10,
            background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`, color: '#fff',
            fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}>Continuar conectado</button>
          <button onClick={() => void sair()} style={{
            flex: '1 1 110px', padding: '11px 16px', borderRadius: 10,
            border: `1.5px solid ${COR.borda}`, background: COR.branco, color: COR.texto,
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Sair agora</button>
        </div>
      </div>
    </div>
  )
}
