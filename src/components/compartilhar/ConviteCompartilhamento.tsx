import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { aceitarConvite, convitesParaMim, removerConvite, type Convite } from '../../utils/compartilhamento'

/**
 * O convite para compartilhar finanças, ao entrar no app com o e-mail
 * convidado. Aparece antes de tudo — inclusive do Onboarding de quem acabou de
 * criar a conta só para aceitar. Aceitar troca as finanças da tela pelas do
 * dono; as próprias ficam guardadas como estavam e voltam ao sair.
 */
export default function ConviteCompartilhamento() {
  const { user, compartilhamento, recarregarCompartilhamento } = useApp()
  const [convite, setConvite] = useState<Convite | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const navigate = useNavigate()
  const uid = user?.id

  useEffect(() => {
    if (!uid || compartilhamento.papel === 'membro') { setConvite(null); return }
    let vivo = true
    convitesParaMim(uid).then(l => { if (vivo) setConvite(l[0] ?? null) })
    return () => { vivo = false }
  }, [uid, compartilhamento.papel])

  if (!convite) return null
  const quem = convite.dono_nome || convite.dono_email

  async function aceitar() {
    if (!convite) return
    setOcupado(true); setErro('')
    const e = await aceitarConvite(convite.id)
    if (e) { setErro(e); setOcupado(false); return }
    await recarregarCompartilhamento()
    setOcupado(false); setConvite(null)
    // Quem criou a conta só para aceitar estava no Onboarding: as finanças do
    // dono já estão prontas, então vai direto para o início.
    navigate('/', { replace: true })
  }
  async function recusar() {
    if (!convite) return
    setOcupado(true)
    await removerConvite(convite.id)
    setOcupado(false); setConvite(null)
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="convite-titulo" style={{ position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(15,23,42,.3)' }}>
        <div aria-hidden style={{ fontSize: 34 }}>👥</div>
        <h2 id="convite-titulo" style={{ fontSize: 20, fontWeight: 800, color: COR.texto, margin: '8px 0 8px' }}>
          {quem} quer compartilhar as finanças com você
        </h2>
        <p style={{ fontSize: 15, color: COR.texto, lineHeight: 1.55, margin: '0 0 6px' }}>
          Aceitando, você passa a ver e lançar nas contas, categorias e plano {convite.dono_nome ? `de ${convite.dono_nome}` : 'dessa pessoa'},
          com o seu próprio login.
        </p>
        <p style={{ fontSize: 14, color: COR.textoSuave, lineHeight: 1.5, margin: '0 0 16px' }}>
          Se você já tem dados aqui, eles ficam guardados e voltam se você sair do compartilhamento.
        </p>
        {erro && <div role="alert" style={{ fontSize: 14, color: COR.erroTexto, background: COR.erroFundo, borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={recusar} disabled={ocupado} style={{ flex: 1, minHeight: 48, borderRadius: 12, border: `1.5px solid ${COR.borda}`,
            background: '#fff', color: COR.texto, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Recusar</button>
          <button onClick={aceitar} disabled={ocupado} style={{ flex: 1.4, minHeight: 48, borderRadius: 12, border: 'none',
            background: COR.azul, color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            {ocupado ? 'Entrando…' : 'Aceitar'}
          </button>
        </div>
      </div>
    </div>
  )
}
