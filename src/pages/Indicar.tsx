import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { FONTE_SITE, NOITE, BORDA_CLARA, TINTA } from '../components/mobile/estilo'
import { CabecalhoCartao } from '../components/mobile/ui'
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

  const cartao = { background: COR.branco, border: `1px solid ${BORDA_CLARA}`, borderRadius: 20, boxShadow: '0 10px 28px rgba(11,37,69,.08)', padding: isMobile ? 18 : 24 } as const
  const botao = (solido: boolean) => ({
    padding: '10px 18px', minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
    border: solido ? 'none' : `1.5px solid ${TINTA}`,
    background: solido ? NOITE : COR.branco, color: solido ? COR.branco : TINTA,
  } as const)

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: FONTE_SITE }}>
      <AppHeader currentPath={pathname} />
      {/* O topo escuro da página do Educador (19/11/2026), de ponta a ponta. */}
      <PageHeader site fundo={COR.fundo} mb={4} icon="ti-gift" rotulo="Compartilhe o Compass One" title="Indicar amigos"
        subtitle="Compartilhe o seu link: quem criar a conta por ele fica registrado como sua indicação" />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '4px 14px 90px' : '8px 28px 40px',
        display: 'grid', gap: 16 }}>
        <div style={cartao}>
          <CabecalhoCartao icone="ti-gift" rotulo="Envie para quem quer se organizar">Seu link de indicação</CabecalhoCartao>
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
            <CabecalhoCartao icone="ti-users" rotulo="Suas indicações">
              {indicados.length === 0 ? 'Nenhuma indicação ainda'
                : indicados.length === 1 ? '1 pessoa criou a conta pelo seu link'
                : `${indicados.length} pessoas criaram a conta pelo seu link`}
            </CabecalhoCartao>
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
