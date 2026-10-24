import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { LogoCompass } from './LogoCompass'
import { TOPO_AZUL } from './mobile/estilo'
import { entrarComDigital } from '../utils/digital'

/**
 * O app travado no celular, como nos apps de banco (24/10/2026, pedido do
 * Guilherme: "no mobile, temos que pensar em um mecanismo de acesso mais
 * rápido"). A sessão continua; a tela só some com a digital, que é o mesmo
 * `signInWithPasskey` do login: o servidor confere a chave e renova a sessão.
 * Por baixo, a Início já está carregada, então destravar é cair nela.
 *
 * A leitura abre sozinha ao aparecer (no Android funciona; no iPhone o Safari
 * exige um toque e a tentativa falha calada, ficando o botão).
 */
export default function TelaBloqueio({ onDestravar }: { onDestravar: () => void }) {
  const { perfil, sairDaConta } = useApp()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const tentou = useRef(false)

  async function destravar(sozinho = false) {
    if (ocupado) return
    setErro(''); setOcupado(true)
    const r = await entrarComDigital()
    setOcupado(false)
    if (r.ok) { onDestravar(); return }
    if (r.erro && !sozinho) setErro(r.erro)
  }

  useEffect(() => {
    if (tentou.current || document.visibilityState !== 'visible') return
    tentou.current = true
    void destravar(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const nome = perfil.apelido || perfil.nome.split(' ')[0] || ''

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="bloq-titulo" style={{
      position: 'fixed', inset: 0, zIndex: 10001, background: TOPO_AZUL, color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', textAlign: 'center',
    }}>
      <LogoCompass size={64} />
      <div id="bloq-titulo" style={{ fontSize: 22, fontWeight: 800, marginTop: 18 }}>
        {nome ? `Olá, ${nome}` : 'Compass One'}
      </div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,.85)', marginTop: 6 }}>
        Use a digital para abrir o app.
      </div>
      <button onClick={() => void destravar()} disabled={ocupado} style={{
        marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', maxWidth: 320, minHeight: 52, border: 'none', borderRadius: 14,
        background: '#fff', color: '#1e3a8a', fontSize: 16, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <i aria-hidden className="ti ti-fingerprint" style={{ fontSize: 24 }} />
        {ocupado ? 'Aguardando a digital…' : 'Desbloquear'}
      </button>
      {erro && (
        <div role="alert" style={{ marginTop: 14, maxWidth: 320, fontSize: 14, color: '#fecaca', lineHeight: 1.45 }}>
          {erro}
        </div>
      )}
      <button onClick={() => void sairDaConta()} style={{
        marginTop: 22, minHeight: 44, border: 'none', background: 'none', color: '#fff',
        fontSize: 14, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Entrar com senha ou outra conta
      </button>
    </div>
  )
}
