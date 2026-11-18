import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { aceitouOfertas, gravarAceiteOfertas } from '../../utils/ofertasEmail'

/**
 * "Novidades e ofertas por e-mail", no Perfil (18/11/2026): onde a pessoa
 * dá ou retira o aceite a qualquer hora (LGPD). Regras em utils/ofertasEmail.ts.
 */
export default function CfgOfertas() {
  const { user } = useApp()
  const [marcado, setMarcado] = useState(() => aceitouOfertas(user))
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { setMarcado(aceitouOfertas(user)) }, [user])

  async function trocar(v: boolean) {
    setOcupado(true); setMsg(null); setMarcado(v)
    const ok = await gravarAceiteOfertas(v)
    setOcupado(false)
    if (!ok) { setMarcado(!v); setMsg({ ok: false, texto: 'Não foi possível salvar agora. Tente de novo.' }); return }
    setMsg({ ok: true, texto: v ? '✓ Você vai receber as novidades por e-mail.' : '✓ Pronto, você não recebe mais novidades por e-mail.' })
  }

  return (
    <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 6px' }}>
        <i aria-hidden className="ti ti-mail" style={{ fontSize: 17, verticalAlign: '-2px', marginRight: 6 }} />Novidades e ofertas por e-mail
      </h3>
      <p style={{ fontSize: 14, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.55 }}>
        Comunicados, aulas e ofertas do Compass One. Os avisos da sua conta (nova senha, respostas do suporte) chegam de qualquer jeito.
      </p>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: COR.texto, cursor: ocupado ? 'default' : 'pointer' }}>
        <input type="checkbox" checked={marcado} disabled={ocupado} onChange={e => trocar(e.target.checked)}
          style={{ width: 20, height: 20, flexShrink: 0, accentColor: COR.azul }} />
        Quero receber novidades e ofertas por e-mail
      </label>
      {msg && <div role="status" style={{ marginTop: 10, fontSize: 13, color: msg.ok ? COR.sucessoTexto : COR.erroTexto }}>{msg.texto}</div>}
    </div>
  )
}
