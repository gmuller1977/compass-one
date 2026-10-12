import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
 * - Os passos seguem a ordem do menu (Contas, Cartões, Categorias); salvar
 *   uma conta leva aos cartões, e um cartão às categorias. Pedido do
 *   Guilherme em 12/10/2026, ao testar o primeiro acesso.
 * - Membro de conta compartilhada nunca vê: o cadastro é do administrador.
 */
export default function PrimeirosPassos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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

  // Os passos seguem a ordem do menu. Salvar uma conta leva aos cartões, e
  // salvar um cartão às categorias (Configuracoes.salvarConta).
  const abaAtual = searchParams.get('aba') ?? 'home'
  const temCartao = contas.some(c => c.tipo === 'cartao')
  const passos = [
    { aba: 'bancos',     rotulo: 'Contas',     feito: temConta },
    { aba: 'cartoes',    rotulo: 'Cartões',    feito: temCartao, opcional: true },
    { aba: 'categorias', rotulo: 'Categorias', feito: temCategoria },
  ]
  const proximo = passos.find(p => !p.feito && !p.opcional) ?? passos[2]

  return (
    <div style={{ margin: '12px 16px 0', padding: '14px 18px', borderRadius: 12, flexShrink: 0,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COR.infoTexto }}>Bem-vindo! Três passos para começar</div>
            <div style={{ fontSize: 13, color: COR.texto, marginTop: 2 }}>
              {abaAtual === 'categorias'
                ? 'Ligue as categorias que você usa. Dá para criar outras a qualquer momento.'
                : 'Onde está o seu dinheiro, seus cartões e os tipos de gasto que você usa.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {passos.map((p, i) => {
              const atual = abaAtual === p.aba
              return (
                <button key={p.aba} onClick={() => navigate(`/configuracoes?aba=${p.aba}`)}
                  aria-current={atual ? 'step' : undefined} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                  border: `1.5px solid ${atual ? COR.azul : COR.infoBorda}`,
                  background: atual ? COR.azul : '#fff',
                  color: atual ? '#fff' : p.feito ? COR.sucessoTexto : COR.texto,
                }}>
                  <span aria-hidden>{p.feito ? '✓' : `${i + 1}`}</span>
                  {p.rotulo}{p.opcional && !p.feito ? ' (opcional)' : ''}
                </button>
              )
            })}
            {abaAtual === 'cartoes' && !temCartao ? (
              <button onClick={() => navigate('/configuracoes?aba=categorias')} style={botao(false)}>
                Pular cartões →
              </button>
            ) : abaAtual === 'home' ? (
              <button onClick={() => navigate(`/configuracoes?aba=${proximo.aba}`)} style={botao(true)}>
                Começar →
              </button>
            ) : null}
          </div>
        </div>
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
