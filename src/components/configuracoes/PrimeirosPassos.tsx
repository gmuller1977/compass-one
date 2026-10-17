import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { CATEGORIAS_PADRAO } from '../../data/categoriasPadrao'
import { COR } from '../../utils/cores'
import { LogoCompass } from '../LogoCompass'
import ModalTopo from '../ModalTopo'
import { jaViu, marcarVisto } from '../../utils/vistoNaConta'

/**
 * Primeiros passos de uma conta nova, no topo de Configurações. Substitui o
 * guia de boas-vindas, retirado em 12/10/2026 a pedido do Guilherme: "quem
 * quer arrumar suas finanças precisa saber usar as telas de configurações".
 *
 * - Conta sem nenhuma categoria recebe as sugeridas JÁ LIGADAS — a pessoa
 *   desliga as que não usa. Até 17/10/2026 vinham desligadas, e quem não
 *   entende de finanças travava escolhendo do zero (decisão do Guilherme no
 *   card, etapa 1 da jornada do cliente). O "importar sugestões" de
 *   Configurações continua trazendo desligadas: ali a pessoa já tem as dela.
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
  const { user, contas, categorias, setCategorias, onboardingCompleto, setOnboardingCompleto, compartilhamento } = useApp()
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
      ...c, ativa: true, id: `${base}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    })))
  }, [eraNova, categorias.length, setCategorias])

  useEffect(() => {
    if (eraNova && pronto && !onboardingCompleto) setOnboardingCompleto(true)
  }, [eraNova, pronto, onboardingCompleto, setOnboardingCompleto])


  // Os passos seguem a ordem do menu. Salvar uma conta leva aos cartões, e
  // salvar um cartão às categorias (Configuracoes.salvarConta).
  const abaAtual = searchParams.get('aba') ?? 'home'
  // Com as categorias já ligadas, o passo só conta depois de a pessoa abrir a
  // lista: senão o "tudo pronto" aparecia logo ao salvar a conta.
  const [viuCategorias, setViuCategorias] = useState(false)
  useEffect(() => { if (abaAtual === 'categorias') setViuCategorias(true) }, [abaAtual])
  const temCartao = contas.some(c => c.tipo === 'cartao')
  const passos = [
    { aba: 'bancos',     rotulo: 'Contas',     feito: temConta,
      texto: 'O banco onde o seu dinheiro está hoje. O saldo pode ser aproximado.' },
    { aba: 'cartoes',    rotulo: 'Cartões',    feito: temCartao, opcional: true,
      texto: 'Se usa cartão de crédito: fechamento e vencimento da fatura.' },
    { aba: 'categorias', rotulo: 'Categorias', feito: temCategoria && viuCategorias,
      texto: 'Já vêm prontas as mais comuns. Confira e desligue as que não usa.' },
  ]
  const proximo = passos.find(p => !p.feito && !p.opcional) ?? passos[2]

  // As boas-vindas são uma janela, aberta UMA vez por login ao chegar na tela
  // de ícones (pedido do Guilherme em 12/10/2026). O "visto" mora na conta.
  const [bemVindo, setBemVindo] = useState(() => !jaViu(user, CHAVE_BEM_VINDO))
  const [prontoAberto, setProntoAberto] = useState(true)
  const fecharBemVindo = () => { setBemVindo(false); void marcarVisto(user, CHAVE_BEM_VINDO) }

  if (!eraNova) return null

  if (pronto && viuCategorias) {
    if (!prontoAberto) return null
    return (
      <Janela onFechar={() => setProntoAberto(false)} titulo="Tudo pronto para começar">
        <p style={textoSt}>
          Ainda não sabe quanto gasta por mês? Comece lançando o que gastar a partir de hoje.
          Quando o mês fechar, o Compass One monta o seu primeiro plano com os seus números de verdade.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
          <button onClick={() => navigate('/lancar')} style={botao(true)}>Começar a lançar</button>
          <button onClick={() => navigate('/wizard-planejamento')} style={botao(false)}>Já sei meus números: montar o plano</button>
        </div>
      </Janela>
    )
  }

  if (abaAtual === 'home') {
    if (!bemVindo) return null
    return (
      <Janela onFechar={fecharBemVindo} titulo="Bem-vindo ao Compass One!">
        <p style={textoSt}>
          A sua jornada começa hoje com apenas 3 passos rápidos. Com eles, a sua bússola
          já sabe onde está o seu dinheiro e para onde ele vai.
        </p>
        <ol style={{ margin: '18px 0 0', padding: '16px 18px', listStyle: 'none', display: 'grid', gap: 12,
          background: '#eff6ff', borderRadius: 12 }}>
          {passos.map((p, i) => (
            <li key={p.aba} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: COR.azul,
                color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                <b style={{ color: COR.texto }}>{p.rotulo}{p.opcional ? ' (opcional)' : ''}</b> · {p.texto}
              </span>
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
          <button onClick={() => { fecharBemVindo(); navigate(`/configuracoes?aba=${proximo.aba}`) }} style={botao(true)}>
            Começar →
          </button>
          <button onClick={fecharBemVindo} style={botao(false)}>Explorar primeiro</button>
        </div>
      </Janela>
    )
  }

  // Dentro de cada cadastro, uma barra fina com os passos.
  return (
    <div style={{ margin: '12px 16px 0', padding: '8px 12px', borderRadius: 12, flexShrink: 0,
      background: COR.infoFundo, border: `1px solid ${COR.infoBorda}`,
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: COR.infoTexto, marginRight: 4 }}>Primeiros passos</span>
      {passos.map((p, i) => {
        const atual = abaAtual === p.aba
        return (
          <button key={p.aba} onClick={() => navigate(`/configuracoes?aba=${p.aba}`)}
            aria-current={atual ? 'step' : undefined} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            border: `1.5px solid ${atual ? COR.azul : COR.infoBorda}`,
            background: atual ? COR.azul : '#fff',
            color: atual ? '#fff' : p.feito ? COR.sucessoTexto : COR.texto,
          }}>
            <span aria-hidden>{p.feito ? '✓' : `${i + 1}`}</span>
            {p.rotulo}{p.opcional && !p.feito ? ' (opcional)' : ''}
          </button>
        )
      })}
      {abaAtual === 'cartoes' && !temCartao && (
        <button onClick={() => navigate('/configuracoes?aba=categorias')} style={{ ...botao(false), padding: '5px 11px', fontSize: 13 }}>
          Pular cartões →
        </button>
      )}
    </div>
  )
}

const CHAVE_BEM_VINDO = 'boas-vindas-configuracoes'

const textoSt: React.CSSProperties = { fontSize: 14, color: COR.textoSuave, lineHeight: 1.6, margin: 0 }

function Janela({ onFechar, titulo, children }: { onFechar: () => void; titulo: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])
  return (
    <div onClick={onFechar} role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="primeiros-passos-titulo" style={{
        background: COR.branco, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxWidth: 500, width: '100%', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <ModalTopo icone={<LogoCompass size={24} />} rotulo="Primeiros passos" titulo={titulo} id="primeiros-passos-titulo" onFechar={onFechar} />
        <div style={{ overflowY: 'auto', padding: '20px 28px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

function botao(primario: boolean): React.CSSProperties {
  return {
    padding: '11px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', border: primario ? 'none' : `1px solid ${COR.borda}`,
    background: primario ? COR.azul : '#fff', color: primario ? '#fff' : COR.texto,
  }
}
