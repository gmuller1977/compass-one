import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { useIsMobile } from '../components/configuracoes/CfgShared'
import { COR } from '../utils/cores'
import { linkDeIndicacao, meuCodigo, minhasIndicacoes, textoDoConvite, type Indicado } from '../utils/indicacao'

/**
 * "Indicar amigos" (11/10/2026): o link de indicação de quem está logado e
 * quantas pessoas criaram conta por ele. Substitui a tela do Aurix. O
 * desconto na mensalidade por indicação vem depois; aqui só se conta.
 */
export default function Indicar() {
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const [codigo, setCodigo] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [indicados, setIndicados] = useState<Indicado[]>([])
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let vivo = true
    meuCodigo().then(r => {
      if (!vivo) return
      setCodigo(r.codigo); setErro(r.erro); setCarregando(false)
      if (r.codigo) minhasIndicacoes().then(l => { if (vivo) setIndicados(l) })
    })
    return () => { vivo = false }
  }, [])

  const link = codigo ? linkDeIndicacao(codigo) : ''
  const texto = link ? textoDoConvite(link) : ''
  const podeCompartilhar = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true); setTimeout(() => setCopiado(false), 2500)
    } catch { window.prompt('Copie o link:', link) }
  }
  function compartilhar() {
    navigator.share({ title: 'Compass One', text: texto }).catch(() => { /* cancelado */ })
  }

  const cartao = { background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: isMobile ? 18 : 24 } as const
  const botao = (solido: boolean) => ({
    padding: '10px 18px', minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
    border: solido ? 'none' : `1.5px solid ${COR.borda}`,
    background: solido ? COR.azul : COR.branco, color: solido ? COR.branco : COR.texto,
  } as const)

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath={pathname} />
      <div style={{ padding: isMobile ? '12px 14px 0' : '16px 28px 0' }}>
        <PageHeader icon="ti-gift" breadcrumb="MINHA CONTA" title="Indicar amigos"
          subtitle="Compartilhe o seu link: quem criar a conta por ele fica registrado como sua indicação" />
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '16px 14px 90px' : '24px 28px 40px',
        display: 'grid', gap: 16 }}>
        <div style={cartao}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 6px' }}>🎁 Seu link de indicação</h3>
          {carregando && <p style={{ fontSize: 14, color: COR.textoSuave, margin: 0 }}>Carregando…</p>}
          {!carregando && erro && (
            <div role="status" style={{ fontSize: 14, lineHeight: 1.5, borderRadius: 10, padding: '10px 12px',
              color: COR.avisoTexto, background: COR.avisoFundo }}>{erro}</div>
          )}
          {link && (
            <>
              <p style={{ fontSize: 14, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.55 }}>
                Envie para quem quer organizar as finanças. Cada pessoa que criar a conta pelo link conta como uma indicação sua.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input readOnly value={link} aria-label="Seu link de indicação" onFocus={e => e.currentTarget.select()}
                  style={{ flex: '1 1 260px', minWidth: 0, minHeight: 44, padding: '0 12px', borderRadius: 10,
                    border: `1.5px solid ${COR.borda}`, fontSize: 14, color: COR.texto, fontFamily: 'inherit', background: COR.superficie }} />
                <button onClick={copiar} style={botao(true)}>{copiado ? '✓ Copiado' : 'Copiar link'}</button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" style={botao(false)}>
                  Enviar pelo WhatsApp
                </a>
                {podeCompartilhar && <button onClick={compartilhar} style={botao(false)}>Compartilhar…</button>}
              </div>
              <p style={{ fontSize: 13, color: COR.textoSuave, margin: '12px 0 0' }}>
                Seu código: <b style={{ color: COR.texto, letterSpacing: 1 }}>{codigo}</b>
              </p>
            </>
          )}
        </div>

        {link && (
          <div style={cartao}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 6px' }}>
              {indicados.length === 0 ? 'Nenhuma indicação ainda'
                : indicados.length === 1 ? '1 pessoa criou a conta pelo seu link'
                : `${indicados.length} pessoas criaram a conta pelo seu link`}
            </h3>
            {indicados.length === 0 ? (
              <p style={{ fontSize: 14, color: COR.textoSuave, margin: 0, lineHeight: 1.55 }}>
                Quando alguém se cadastrar pelo seu link, aparece aqui.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                {indicados.map((p, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0',
                    borderTop: i ? `1px solid ${COR.bordaSuave}` : 'none', fontSize: 14, color: COR.texto }}>
                    <span>{p.email}</span>
                    <span style={{ color: COR.textoSuave }}>{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
