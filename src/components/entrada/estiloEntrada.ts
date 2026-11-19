import { useEffect, useState, type CSSProperties } from 'react'
import { TINTA, BORDA_CLARA } from '../mobile/estilo'
import { useLarguraMenorQue } from '../../utils/larguraTela'

export const FUNDO_ENTRADA = '#f3f7fd'

export function useTelaBaixa(limite: number) {
  const [v, setV] = useState(() => window.innerHeight < limite)
  useEffect(() => {
    const h = () => setV(window.innerHeight < limite)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [limite])
  return v
}

export function useCelularEntrada() {
  return useLarguraMenorQue(640)
}

export const botaoPrincipal = (carregando = false): CSSProperties => ({
  width: '100%', padding: '15px', border: 'none', borderRadius: 14,
  background: TINTA, color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '.02em',
  cursor: carregando ? 'default' : 'pointer', opacity: carregando ? .75 : 1, fontFamily: 'inherit',
  boxShadow: '0 6px 18px rgba(11,37,69,.25)', transition: 'all .15s',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
})

export const botaoClaro: CSSProperties = {
  width: '100%', padding: '13px', border: `1.5px solid ${BORDA_CLARA}`, borderRadius: 14,
  background: '#fff', color: TINTA, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all .15s',
}

export const linkEntrada: CSSProperties = {
  border: 'none', background: 'transparent', color: TINTA, padding: 0, textDecoration: 'underline',
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}

