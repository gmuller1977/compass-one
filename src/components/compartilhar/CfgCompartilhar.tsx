import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import {
  ativarConvite, convidar, emailValido, enviarEmailDoConvite, listarMembros, removerConvite, sairDoCompartilhamento,
  trocarAcesso, TIPOS_DE_ACESSO, type Convite,
} from '../../utils/compartilhamento'

type Acesso = 'lancar' | 'visualizar'

/**
 * "Compartilhar finanças", no Perfil (10/10/2026, pedido do Guilherme: "duas
 * ou mais pessoas acessarem a mesma conta"). Cada pessoa entra com o próprio
 * login e vê e lança nas MESMAS contas, categorias e plano.
 *
 *   - Dono: convida por e-mail, vê quem aceitou e remove.
 *   - Membro: vê de quem são as finanças e pode sair (volta para as próprias,
 *     que ficaram guardadas como estavam).
 *
 * Dois tipos de convite (29/10/2026, pedido do Guilherme, migração 023):
 * "Família" (vê e lança, o de sempre) e "Educador Financeiro" (só vê), com
 * uma chave para ligar o acesso na reunião e desligar ao encerrar. O tipo se
 * troca depois. Quem entrou em várias contas escolhe qual abrir aqui e na
 * faixa do topo (FaixaDeFinancas).
 */
export default function CfgCompartilhar() {
  const { user, perfil, compartilhamento, recarregarCompartilhamento, trocarDeFinancas } = useApp()
  const [membros, setMembros] = useState<Convite[]>([])
  const [erroLista, setErroLista] = useState('')
  const [email, setEmail] = useState('')
  const [acesso, setAcesso] = useState<Acesso>('lancar')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const membro = compartilhamento.papel === 'membro'
  const outras = compartilhamento.contasDeOutros

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
    const { erro, envio } = await convidar({ donoId: user.id, donoNome: perfil.apelido || perfil.nome, donoEmail: user.email ?? '', email: e, acesso })
    setOcupado(false)
    if (erro) { setMsg({ ok: false, texto: erro }); return }
    setEmail('')
    const tipo = acesso === 'visualizar' ? ' O acesso de Educador Financeiro começa ligado: desligue aqui quando a reunião terminar.' : ''
    setMsg({ ok: true, texto: (envio === 'enviado'
      ? `Convite enviado para ${e}. É só a pessoa entrar no Compass One com esse e-mail: o convite aparece na hora.`
      : envio === 'limite'
        ? `Convite criado. Você chegou ao limite de e-mails de convite por hoje, então peça para ${e} entrar no Compass One com esse e-mail: o convite aparece na hora.`
        : `Convite criado, mas o e-mail não saiu agora. Peça para ${e} entrar no Compass One com esse e-mail: o convite aparece na hora.`) + tipo })
    atualizar()
  }

  async function reenviar(c: Convite) {
    if (ocupado) return
    setOcupado(true)
    const envio = await enviarEmailDoConvite(c.id)
    setOcupado(false)
    setMsg(envio === 'enviado' ? { ok: true, texto: `E-mail reenviado para ${c.email}.` }
      : envio === 'limite' ? { ok: false, texto: 'Esse convite já foi enviado há pouco, ou você chegou ao limite de e-mails de convite por hoje. O convite continua valendo: a pessoa o vê ao entrar com esse e-mail.' }
      : { ok: false, texto: 'O e-mail não saiu agora. Tente de novo mais tarde.' })
  }

  async function remover(c: Convite) {
    const quem = c.status === 'aceito' ? `Tirar ${c.email} das suas finanças?` : `Cancelar o convite para ${c.email}?`
    if (!window.confirm(quem)) return
    const erro = await removerConvite(c.id)
    if (erro) setMsg({ ok: false, texto: erro })
    else { atualizar(); recarregarCompartilhamento() }
  }

  async function mudarTipo(c: Convite, novo: Acesso) {
    if (ocupado || (c.acesso ?? 'lancar') === novo) return
    setOcupado(true)
    const erro = await trocarAcesso(c.id, novo)
    setOcupado(false)
    if (erro) setMsg({ ok: false, texto: erro })
    else { setMsg(null); atualizar() }
  }

  async function ligar(c: Convite, ligado: boolean) {
    if (ocupado) return
    setOcupado(true)
    const erro = await ativarConvite(c.id, ligado)
    setOcupado(false)
    if (erro) setMsg({ ok: false, texto: erro })
    else { setMsg(null); atualizar() }
  }

  async function sair() {
    if (!user || !compartilhamento.donoId) return
    if (!window.confirm(`Sair das finanças de ${compartilhamento.donoNome || compartilhamento.donoEmail}? Para ver de novo, a pessoa precisa convidar outra vez.`)) return
    const erro = await sairDoCompartilhamento(user.id, compartilhamento.donoId)
    if (erro) { setMsg({ ok: false, texto: erro }); return }
    await recarregarCompartilhamento()
  }

  /** Quem entrou em várias contas (ou também tem as próprias) escolhe qual abrir. */
  const listaDeFinancas = outras.length > 0 && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 0 14px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COR.textoSuave }}>Finanças que você acessa</div>
      {[{ id: null as string | null, nome: 'Minhas finanças', tipo: '', ativo: true },
        ...outras.map(o => ({ id: o.donoId as string | null, nome: o.donoNome || o.donoEmail, tipo: TIPOS_DE_ACESSO[o.acesso].nome, ativo: o.ativo }))].map(f => {
        const aberta = membro ? f.id === compartilhamento.donoId : f.id === null
        return (
          <div key={f.id ?? 'proprias'} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
            background: aberta ? COR.infoFundo : '#f8faff', border: `1.5px solid ${aberta ? '#93c5fd' : 'transparent'}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nome}</div>
              <div style={{ fontSize: 13, color: f.ativo ? COR.textoSuave : '#b45309' }}>
                {!f.ativo ? 'Acesso desligado pela pessoa' : f.tipo || 'As suas'}
              </div>
            </div>
            {aberta ? <span style={{ fontSize: 13, fontWeight: 700, color: COR.infoTexto }}>Aberta</span>
              : f.ativo && (
                <button onClick={() => trocarDeFinancas(f.id)} style={{ border: 'none', background: 'none', color: COR.azul,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 }}>Abrir</button>
              )}
          </div>
        )
      })}
    </div>
  )

  const cartao = { background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: 24 } as const
  const titulo = <h3 style={{ fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 6px' }}><i aria-hidden className="ti ti-users" style={{ marginRight: 6, verticalAlign: -2 }} />Compartilhar finanças</h3>
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
          {compartilhamento.donoNome && compartilhamento.donoEmail ? ` (${compartilhamento.donoEmail})` : ''}
          {compartilhamento.soVisualizar
            ? ', como Educador Financeiro: você vê tudo e não lança nem altera nada. A pessoa liga e desliga o seu acesso.'
            : '. Tudo o que você lança aparece para a outra pessoa, e o que ela lança aparece para você.'}
        </p>
        {listaDeFinancas}
        <button onClick={sair} style={{ padding: '10px 18px', minHeight: 44, border: `1.5px solid ${COR.borda}`, borderRadius: 10,
          background: COR.branco, color: COR.texto, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sair das finanças de {compartilhamento.donoNome || compartilhamento.donoEmail}
        </button>
        {aviso}
      </div>
    )
  }

  return (
    <div style={cartao}>
      {titulo}
      <p style={{ fontSize: 14, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.55 }}>
        Convide quem divide as contas com você, ou o seu educador financeiro. Cada pessoa entra com o próprio e-mail e senha.
      </p>
      {listaDeFinancas}
      {erroLista ? (
        <div style={{ fontSize: 14, color: COR.textoSuave, background: '#f8faff', borderRadius: 10, padding: '10px 12px' }}>{erroLista}</div>
      ) : (
        <>
          {membros.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {membros.map(c => (
                <div key={c.id} style={{ padding: '10px 12px', borderRadius: 10, background: '#f8faff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>
                    <div style={{ fontSize: 13, color: c.ativo === false ? COR.textoSuave : c.status === 'aceito' ? COR.sucessoTexto : '#b45309' }}>
                      {TIPOS_DE_ACESSO[c.acesso ?? 'lancar'].nome} · {c.ativo === false ? 'acesso desligado'
                        : c.status === 'aceito' ? '✓ Com acesso' : 'Convite enviado · aguardando'}
                    </div>
                  </div>
                  {c.status === 'pendente' && (
                    <button onClick={() => reenviar(c)} disabled={ocupado} aria-label={`Reenviar o convite para ${c.email}`} style={{ border: 'none',
                      background: 'none', color: COR.azul, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 }}>
                      Reenviar
                    </button>
                  )}
                  <button onClick={() => remover(c)} aria-label={`Remover ${c.email}`} style={{ border: 'none', background: 'none',
                    color: COR.erroTexto, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 }}>
                    {c.status === 'aceito' ? 'Remover' : 'Cancelar'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  <EscolhaDeAcesso valor={c.acesso ?? 'lancar'} onChange={v => mudarTipo(c, v)} pequeno rotulo={`Tipo de acesso de ${c.email}`} />
                  {(c.acesso ?? 'lancar') === 'visualizar' && (
                    <ChaveLigada ligado={c.ativo !== false} onChange={v => ligar(c, v)} rotulo={`Acesso de ${c.email}`} />
                  )}
                </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <EscolhaDeAcesso valor={acesso} onChange={setAcesso} rotulo="Tipo de convite" />
            <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 6 }}>{TIPOS_DE_ACESSO[acesso].explica}.</div>
          </div>
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

/** "Família" | "Educador Financeiro", em controle segmentado. */
function EscolhaDeAcesso({ valor, onChange, pequeno, rotulo }: { valor: Acesso; onChange: (v: Acesso) => void; pequeno?: boolean; rotulo: string }) {
  return (
    <div role="radiogroup" aria-label={rotulo} style={{ display: 'inline-flex', background: '#e8edf5', borderRadius: 10, padding: 3, gap: 3 }}>
      {(['lancar', 'visualizar'] as const).map(v => {
        const marcado = v === valor
        return (
          <button key={v} role="radio" aria-checked={marcado} onClick={() => onChange(v)} style={{
            border: 'none', borderRadius: 8, padding: pequeno ? '6px 10px' : '8px 14px', minHeight: pequeno ? 34 : 40,
            background: marcado ? COR.branco : 'transparent', color: marcado ? COR.infoTexto : '#475569',
            boxShadow: marcado ? '0 1px 3px rgba(15,23,42,.15)' : 'none',
            fontSize: pequeno ? 13 : 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>{TIPOS_DE_ACESSO[v].nome}</button>
        )
      })}
    </div>
  )
}

/** A chave do Educador Financeiro: ligado na reunião, desligado ao encerrar. */
function ChaveLigada({ ligado, onChange, rotulo }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <button role="switch" aria-checked={ligado} aria-label={rotulo} onClick={() => onChange(!ligado)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer',
      fontFamily: 'inherit', minHeight: 40, padding: 0,
    }}>
      <span aria-hidden style={{ width: 42, height: 24, borderRadius: 12, background: ligado ? COR.sucessoTexto : '#94a3b8',
        position: 'relative', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: ligado ? 21 : 3, width: 18, height: 18, borderRadius: 9,
          background: '#fff', transition: 'left .15s' }} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: ligado ? COR.sucessoTexto : '#475569' }}>{ligado ? 'Ativado' : 'Desativado'}</span>
    </button>
  )
}
