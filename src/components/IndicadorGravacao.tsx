import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { COR } from '../utils/cores'

/**
 * Diz se o que foi lançado já está no banco. Antes o Quick Launch mostrava
 * "registrado" mesmo quando a gravação falhava, e o erro ia só para o console:
 * no celular, sem sinal, o lançamento sumia ao fechar o app sem ninguém saber.
 *
 * "Salvando" só aparece se demorar (meio segundo): numa conexão boa a pílula
 * pisca "✓ Salvo" e some. Falha fica na tela até gravar — o contexto tenta de
 * novo sozinho, e de imediato quando a conexão volta.
 *
 * Cores de estado de cores.ts, com o par fundo + texto já medido.
 */
export default function IndicadorGravacao() {
  const { gravacao } = useApp()
  const [mostrarSalvando, setMostrarSalvando] = useState(false)
  const [mostrarSalvo, setMostrarSalvo] = useState(false)
  const anterior = useRef(gravacao)

  useEffect(() => {
    const antes = anterior.current
    anterior.current = gravacao
    if (gravacao === 'salvando') {
      const t = setTimeout(() => setMostrarSalvando(true), 500)
      return () => clearTimeout(t)
    }
    setMostrarSalvando(false)
    if (gravacao === 'salvo' && antes !== 'salvo') {
      setMostrarSalvo(true)
      const t = setTimeout(() => setMostrarSalvo(false), 1500)
      return () => clearTimeout(t)
    }
  }, [gravacao])

  let texto = '', fundo = '', cor = '', borda = ''
  if (gravacao === 'semConexao') {
    texto = 'Sem internet · o lançamento ficou guardado neste aparelho e vai para o banco quando a conexão voltar.'
    fundo = COR.avisoFundo; cor = COR.avisoTexto; borda = COR.avisoBorda
  } else if (gravacao === 'erro') {
    texto = 'Não foi possível salvar · tentando de novo'
    fundo = COR.erroFundo; cor = COR.erroTexto; borda = '#fecdd3'
  } else if (gravacao === 'salvando' && mostrarSalvando) {
    texto = 'Salvando…'
    fundo = COR.infoFundo; cor = COR.infoTexto; borda = COR.infoBorda
  } else if (mostrarSalvo) {
    texto = '✓ Salvo'
    fundo = COR.sucessoFundo; cor = COR.sucessoTexto; borda = COR.sucessoBorda
  } else {
    return null
  }

  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10000, maxWidth: 'calc(100vw - 32px)',
      background: fundo, color: cor, border: `1px solid ${borda}`,
      borderRadius: 20, padding: '6px 14px',
      fontSize: 12, fontWeight: 700, textAlign: 'center',
      fontFamily: "-apple-system,'Inter',sans-serif",
      boxShadow: '0 4px 14px rgba(0,0,0,.10)', pointerEvents: 'none',
    }}>
      {texto}
    </div>
  )
}
