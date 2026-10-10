import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import {
  convidar, emailValido, listarMembros, removerConvite, sairDoCompartilhamento, type Convite,
} from '../../utils/compartilhamento'

/**
 * "Compartilhar finanças", no Perfil (10/10/2026, pedido do Guilherme: "duas
 * ou mais pessoas acessarem a mesma conta"). Cada pessoa entra com o próprio
 * login e vê e lança nas MESMAS contas, categorias e plano.
 *
 *   - Dono: convida por e-mail, vê quem aceitou e remove.
 *   - Membro: vê de quem são as finanças e pode sair (volta para as próprias,
 *     que ficaram guardadas como estavam).
 */
export default function CfgCompartilhar() {
  const { user, perfil, compartilhamento, recarregarCompartilhamento } = useApp()
  const [membros, setMembros] = useState<Convite[]>([])
  const [erroLista, setErroLista] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const membro = compartilhamento.papel === 'membro'

  const atualizar = useCallback(async () => {
    if (!user || membro) return
    const r = await listarMembros(user.id)
    setMembros(r.membros); setErroLista(r.erro)
  }, [user, membro])
  useEffect(() => { atualizar() }, [atualizar])

  async function enviar() {
    if (!user || ocupado) return
    const e = email.trim().toLowerCase()
    if (!emailValido(e)) { setMsg({ ok: false, texto: 'Confira o e-mail.' }); return }
    if (e === (user.email ?? '').toLowerCase()) { setMsg({ ok: false, texto: 'Esse é o seu próprio e-mail.' }); return }
    setOcupado(true)
    const erro = await convidar({ donoId: user.id, donoNome: perfil.apelido || perfil.nome, donoEmail: user.email ?? '', email: e })
    setOcupado(false)
    if (erro) { setMsg({ ok: false, texto: erro }); return }
    setEmail('')
    setMsg({ ok: true, texto: `Convite criado. Peça para ${e} entrar no Compass One com esse e-mail: o convite aparece na hora.` })
    atualizar()
  }

  async function remover(c: Convite) {
    const quem = c.status === 'aceito' ? `Tirar ${c.email} das suas finanças?` : `Cancelar o convite para ${c.email}?`
    if (!window.confirm(quem)) return
    const erro = await removerConvite(c.id)
    if (erro) setMsg({ ok: false, texto: erro })
    else { atualizar(); recarregarCompartilhamento() }
  }

  async function sair() {
    if (!user) return
    if (!window.confirm(`Sair das finanças de ${compartilhamento.donoNome || compartilhamento.donoEmail}? Você volta a ver só as suas.`)) return
    const erro = await sairDoCompartilhamento(user.id)
    if (erro) { setMsg({ ok: false, texto: erro }); return }
    await recarregarCompartilhamento()
  }

  const cartao = { background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: 24 } as const
  const titulo = <h3 style={{ fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 6px' }}>👥 Compartilhar finanças</h3>
  const aviso = msg && (
    <div role="status" style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, borderRadius: 10, padding: '10px 12px',
      color: msg.ok ? COR.sucessoTexto : COR.erroTexto, background: msg.ok ? COR.sucessoFundo : COR.erroFundo }}>{msg.texto}</div>
  )

  if (membro) {
    return (
      <div style={cartao}>
        {titulo}
        <p style={{ fontSize: 14, color: COR.texto, margin: '0 0 14px', lineHeight: 1.55 }}>
          Você está nas finanças de <b>{compartilhamento.donoNome || compartilhamento.donoEmail}</b>
          {compartilhamento.donoNome && compartilhamento.donoEmail ? ` (${compartilhamento.donoEmail})` : ''}. Tudo o que você lança
          aparece para a outra pessoa, e o que ela lança aparece para você.
        </p>
        <button onClick={sair} style={{ padding: '10px 18px', minHeight: 44, border: `1.5px solid ${COR.borda}`, borderRadius: 10,
          background: COR.branco, color: COR.texto, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sair desta conta compartilhada
        </button>
        {aviso}
      </div>
    )
  }

  return (
    <div style={cartao}>
      {titulo}
      <p style={{ fontSize: 14, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.55 }}>
        Convide quem divide as contas com você. Cada pessoa entra com o próprio e-mail e senha e vê e lança nas mesmas contas,
        categorias e plano.
      </p>
      {erroLista ? (
        <div style={{ fontSize: 14, color: COR.textoSuave, background: '#f8faff', borderRadius: 10, padding: '10px 12px' }}>{erroLista}</div>
      ) : (
        <>
          {membros.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {membros.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#f8faff' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>
                    <div style={{ fontSize: 13, color: c.status === 'aceito' ? COR.sucessoTexto : '#b45309' }}>
                      {c.status === 'aceito' ? '✓ Com acesso' : 'Convite enviado · aguardando'}
                    </div>
                  </div>
                  <button onClick={() => remover(c)} aria-label={`Remover ${c.email}`} style={{ border: 'none', background: 'none',
                    color: COR.erroTexto, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 }}>
                    {c.status === 'aceito' ? 'Remover' : 'Cancelar'}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="email" inputMode="email" autoComplete="off" value={email} placeholder="e-mail da pessoa"
              onChange={e => { setEmail(e.target.value); setMsg(null) }} onKeyDown={e => { if (e.key === 'Enter') enviar() }}
              aria-label="E-mail de quem vai compartilhar"
              style={{ flex: '1 1 200px', minWidth: 0, padding: '11px 14px', fontSize: 16, border: `1.5px solid ${COR.borda}`,
                borderRadius: 10, fontFamily: 'inherit', color: COR.texto, outline: 'none' }} />
            <button onClick={enviar} disabled={ocupado} style={{ padding: '11px 18px', minHeight: 46, border: 'none', borderRadius: 10,
              background: COR.azul, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {ocupado ? 'Convidando…' : 'Convidar'}
            </button>
          </div>
        </>
      )}
      {aviso}
    </div>
  )
}
