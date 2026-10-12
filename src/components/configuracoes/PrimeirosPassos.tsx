import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { CATEGORIAS_PADRAO } from '../../data/categoriasPadrao'
import { COR } from '../../utils/cores'

/**
 * Primeiros passos de uma conta nova, no topo de Configurações. Substitui o
 * guia de boas-vindas, retirado em 12/10/2026 a pedido do Guilherme: "quem
 * quer arrumar suas finanças precisa saber usar as telas de configurações".
 *
 * - Conta sem nenhuma categoria recebe as sugeridas DESATIVADAS, como o
 *   "importar sugestões" — a pessoa liga as que usa.
 * - O app fica em Configurações até haver uma conta e uma categoria ativa;
 *   aí o onboarding conta como feito (o Modo Descoberta depende disso).
 * - Membro de conta compartilhada nunca vê: o cadastro é do administrador.
 */
export default function PrimeirosPassos() {
  const navigate = useNavigate()
  const { contas, categorias, setCategorias, onboardingCompleto, setOnboardingCompleto, compartilhamento } = useApp()
  const membro = compartilhamento.papel === 'membro'
  // Lido na montagem: quem terminou agora vê o "tudo pronto"; quem já tinha
  // terminado não vê nada.
  const [eraNova] = useState(!onboardingCompleto && !membro)
  const semeou = useRef(false)

  const temConta = contas.length > 0
  const temCategoria = categorias.some(c => c.ativa)
  const pronto = temConta && temCategoria

  useEffect(() => {
    if (!eraNova || semeou.current || categorias.length > 0) return
    semeou.current = true
    const base = `id-${Date.now()}`
    setCategorias(CATEGORIAS_PADRAO.map((c, i) => ({
      ...c, ativa: false, id: `${base}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    })))
  }, [eraNova, categorias.length, setCategorias])

  useEffect(() => {
    if (eraNova && pronto && !onboardingCompleto) setOnboardingCompleto(true)
  }, [eraNova, pronto, onboardingCompleto, setOnboardingCompleto])

  if (!eraNova) return null

  const passo = (feito: boolean, texto: string, aba: string) => (
    <button onClick={() => navigate(`/configuracoes?aba=${aba}`)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', border: 'none',
      background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
      color: COR.texto, textAlign: 'left',
    }}>
      <span aria-hidden style={{ width: 20, textAlign: 'center', color: feito ? COR.sucessoTexto : COR.textoSuave }}>
        {feito ? '✓' : '○'}
      </span>
      <span style={{ textDecoration: feito ? 'line-through' : 'none' }}>{texto}</span>
    </button>
  )

  return (
    <div style={{ margin: '12px 16px 0', padding: '14px 16px', borderRadius: 12, flexShrink: 0,
      background: pronto ? COR.sucessoFundo : COR.infoFundo,
      border: `1px solid ${pronto ? COR.sucessoBorda : COR.infoBorda}` }}>
      {pronto ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: COR.sucessoTexto }}>Tudo pronto para começar</div>
          <div style={{ fontSize: 13, color: COR.texto, margin: '4px 0 10px' }}>
            Lance o que gastar a partir de hoje. Se já sabe quanto ganha e gasta, monte o plano agora.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/lancar')} style={botao(true)}>Começar a lançar</button>
            <button onClick={() => navigate('/wizard-planejamento')} style={botao(false)}>Começar meu plano</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: COR.infoTexto }}>Primeiros passos</div>
          <div style={{ fontSize: 13, color: COR.texto, margin: '4px 0 4px' }}>
            Cadastre onde está o seu dinheiro e escolha os tipos de gasto que você usa.
          </div>
          {passo(temConta, 'Cadastrar uma conta (cartões são opcionais)', 'bancos')}
          {passo(temCategoria, 'Ativar as categorias que você usa', 'categorias')}
        </>
      )}
    </div>
  )
}

function botao(primario: boolean): React.CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', border: primario ? 'none' : `1px solid ${COR.borda}`,
    background: primario ? COR.azul : '#fff', color: primario ? '#fff' : COR.texto,
  }
}
