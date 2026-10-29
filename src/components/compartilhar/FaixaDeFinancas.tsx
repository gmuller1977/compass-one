import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { TIPOS_DE_ACESSO } from '../../utils/compartilhamento'

/**
 * Faixa no topo de todas as telas para quem entrou nas finanças de outra
 * pessoa (29/10/2026, pedido do Guilherme: "como vou distinguir uma conta de
 * outra, já que vou visualizar com o mesmo e-mail dados de vários
 * clientes?"). Diz de quem são as finanças abertas e, com mais de uma,
 * "Trocar" lista as outras e "Minhas finanças". Fora da conta compartilhada
 * não desenha nada.
 */
export default function FaixaDeFinancas() {
  const { compartilhamento, trocarDeFinancas } = useApp()
  const [aberta, setAberta] = useState(false)
  const [trocando, setTrocando] = useState(false)
  const { papel, contasDeOutros, soVisualizar } = compartilhamento
  const visivel = papel === 'membro' || contasDeOutros.length > 0
  // As telas de altura fixa (100vh: Lançamentos, Radar, Configurações)
  // descontam a altura da faixa por esta variável.
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const raiz = document.documentElement
    const el = caixa.current
    if (!visivel || !el) { raiz.style.removeProperty('--faixa-financas'); return }
    const medir = () => raiz.style.setProperty('--faixa-financas', `${el.offsetHeight}px`)
    medir()
    const ob = new ResizeObserver(medir)
    ob.observe(el)
    return () => { ob.disconnect(); raiz.style.removeProperty('--faixa-financas') }
  }, [visivel])
  if (!visivel) return null

  const nomeAberto = papel === 'membro' ? (compartilhamento.donoNome || compartilhamento.donoEmail) : 'Minhas finanças'
  const tipo = papel === 'membro' ? (soVisualizar ? TIPOS_DE_ACESSO.visualizar.nome + ' · só visualizar' : TIPOS_DE_ACESSO.lancar.nome) : ''
  const opcoes = [
    { id: null as string | null, nome: 'Minhas finanças', detalhe: '', ativo: true },
    ...contasDeOutros.map(o => ({ id: o.donoId as string | null, nome: o.donoNome || o.donoEmail, detalhe: TIPOS_DE_ACESSO[o.acesso].nome, ativo: o.ativo })),
  ]
  const atual = papel === 'membro' ? compartilhamento.donoId : null

  async function escolher(id: string | null) {
    setAberta(false)
    if (id === atual) return
    setTrocando(true)
    await trocarDeFinancas(id)
    setTrocando(false)
  }

  return (
    <div ref={caixa} style={{ position: 'relative', zIndex: 50, background: COR.infoFundo, borderBottom: '1px solid #bfdbfe',
      fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', minHeight: 44, }}>
        <i aria-hidden className={`ti ${soVisualizar ? 'ti-eye' : papel === 'membro' ? 'ti-users' : 'ti-user'}`}
          style={{ fontSize: 18, color: COR.infoTexto }} />
        <div style={{ flex: 1, minWidth: 0, color: COR.infoTexto, lineHeight: 1.3 }}>
          <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {papel === 'membro' ? `Finanças de ${nomeAberto}` : nomeAberto}
          </div>
          <div style={{ fontSize: 13 }}>{tipo || 'As suas'}</div>
        </div>
        {opcoes.length > 1 && (
          <button onClick={() => setAberta(a => !a)} aria-expanded={aberta} disabled={trocando} style={{
            border: '1.5px solid #93c5fd', background: COR.branco, color: COR.infoTexto, borderRadius: 999,
            padding: '6px 14px', minHeight: 36, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>{trocando ? 'Abrindo…' : 'Trocar ▾'}</button>
        )}
      </div>
      {aberta && (
        <div role="menu" style={{ position: 'absolute', right: 16, top: '100%', marginTop: 4, width: 'min(320px, calc(100vw - 32px))',
          background: COR.branco, borderRadius: 14, boxShadow: '0 12px 32px rgba(15,23,42,.2)', border: `1px solid ${COR.borda}`,
          padding: 6 }}>
          {opcoes.map(o => (
            <button key={o.id ?? 'proprias'} role="menuitem" disabled={!o.ativo} onClick={() => escolher(o.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none',
              background: o.id === atual ? COR.infoFundo : 'transparent', borderRadius: 10, padding: '10px 12px', minHeight: 48,
              cursor: o.ativo ? 'pointer' : 'default', fontFamily: 'inherit',
            }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: o.ativo ? COR.texto : '#475569',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nome}</span>
                <span style={{ display: 'block', fontSize: 13, color: o.ativo ? COR.textoSuave : '#b45309' }}>
                  {!o.ativo ? 'Acesso desligado pela pessoa' : o.detalhe || 'As suas'}
                </span>
              </span>
              {o.id === atual && <i aria-hidden className="ti ti-check" style={{ color: COR.infoTexto, fontSize: 18 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
