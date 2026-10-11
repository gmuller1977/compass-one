import { useState, useEffect } from 'react'
import { parseBRL } from '../utils/moeda'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Conta, Categoria } from '../context/AppContext'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'
import { COR } from '../utils/cores'
import { NOMES_MESES } from '../components/novoLancamentoExtrato/NleShared'

const BANCOS = [
  'Banco do Brasil', 'Bradesco', 'C6 Bank', 'Caixa', 'Inter',
  'Itaú', 'Nubank', 'Santander', 'Sicredi', 'XP', 'Outro',
]

const TOP10 = new Set([
  'Salário', 'Mercado / Supermercado', 'Aluguel / Financiamento',
  'Restaurante / Delivery', 'Combustível', 'Plano de Saúde',
  'Energia Elétrica', 'Transporte / Uber', 'Internet / Celular',
  'Streaming / Assinaturas',
])

function newId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

type Phase = 'welcome' | 'banco' | 'cartao' | 'categorias' | 'planejamento' | 'final'

const BG = 'linear-gradient(135deg, #0f2878 0%, #1a56db 100%)'

const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: `1.5px solid ${COR.borda}`, fontSize: 13,
  fontFamily: 'inherit', color: COR.texto, outline: 'none',
  background: '#fff', boxSizing: 'border-box',
}

function FL({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: COR.textoSuave,
      textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{children}</div>
}

function BtnPrimary({ onClick, disabled, children }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '13px 20px', border: 'none', borderRadius: 12,
      background: disabled ? '#e2e8f0' : `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`,
      color: disabled ? '#94a3b8' : '#fff',
      fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', boxShadow: disabled ? 'none' : '0 4px 12px rgba(26,86,219,.25)',
    }}>{children}</button>
  )
}

function BtnGhost({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
      background: 'transparent', color: COR.textoSuave,
      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { contas, categorias, setContas, setCategorias, setOnboardingCompleto } = useApp()

  const [phase, setPhase]   = useState<Phase>('welcome')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── Banco ──────────────────────────────────────────────────────────────
  const [bancosLocal, setBancosLocal]   = useState<Conta[]>([])
  const [bancoBanco,  setBancoBanco]    = useState('')
  const [bancoNome,   setBancoNome]     = useState('')
  const [bancoTipo,   setBancoTipo]     = useState<'corrente'|'poupanca'>('corrente')
  const [bancoSaldo,  setBancoSaldo]    = useState('')

  // ── Cartão ─────────────────────────────────────────────────────────────
  const [cartoesLocal, setCartoesLocal]   = useState<Conta[]>([])
  const [cartaoBanco,   setCartaoBanco]   = useState('')
  const [cartaoVenc,    setCartaoVenc]    = useState('')
  const [cartaoFech,    setCartaoFech]    = useState('')
  const [cartaoApelido, setCartaoApelido] = useState('')

  // ── Categorias ─────────────────────────────────────────────────────────
  const [catSel, setCatSel]     = useState<Set<string>>(() => new Set(TOP10))
  const [verMais, setVerMais]   = useState(false)

  // ── Banco helpers ──────────────────────────────────────────────────────
  function addBancoCurrent() {
    if (!bancoBanco) return
    const c: Conta = {
      id: newId(), nome: bancoNome || bancoBanco, banco: bancoBanco,
      tipo: bancoTipo, saldoInicial: parseBRL(bancoSaldo),
      cor: '#1a56db', icone: '🏦',
      preferida: bancosLocal.length === 0, incluirNoSaldoInicial: true,
    }
    setBancosLocal(prev => [...prev, c])
    setBancoBanco(''); setBancoNome(''); setBancoSaldo(''); setBancoTipo('corrente')
  }

  function removeBanco(id: string) { setBancosLocal(prev => prev.filter(c => c.id !== id)) }

  function submitBanco(pular = false) {
    if (!pular) {
      const tudo = [...bancosLocal]
      if (bancoBanco) {
        tudo.push({
          id: newId(), nome: bancoNome || bancoBanco, banco: bancoBanco,
          tipo: bancoTipo, saldoInicial: parseBRL(bancoSaldo),
          cor: '#1a56db', icone: '🏦',
          preferida: tudo.length === 0, incluirNoSaldoInicial: true,
        })
      }
      if (tudo.length > 0) setContas(prev => [...prev.filter(c => c.tipo === 'cartao'), ...tudo])
    }
    setPhase('cartao')
  }

  // ── Cartão helpers ─────────────────────────────────────────────────────
  function addCartaoCurrent() {
    if (!cartaoBanco) return
    const c: Conta = {
      id: newId(), nome: cartaoApelido || cartaoBanco, banco: cartaoBanco,
      tipo: 'cartao', saldoInicial: 0,
      cor: '#7c3aed', icone: '💳',
      diaVencimento: parseInt(cartaoVenc) || undefined,
      diaFechamento: parseInt(cartaoFech) || undefined,
      preferida: false, incluirNoSaldoInicial: false,
    }
    setCartoesLocal(prev => [...prev, c])
    setCartaoBanco(''); setCartaoVenc(''); setCartaoFech(''); setCartaoApelido('')
  }

  function removeCartao(id: string) { setCartoesLocal(prev => prev.filter(c => c.id !== id)) }

  function submitCartao(pular = false) {
    if (!pular) {
      const tudo = [...cartoesLocal]
      if (cartaoBanco) {
        tudo.push({
          id: newId(), nome: cartaoApelido || cartaoBanco, banco: cartaoBanco,
          tipo: 'cartao', saldoInicial: 0, cor: '#7c3aed', icone: '💳',
          diaVencimento: parseInt(cartaoVenc) || undefined,
          diaFechamento: parseInt(cartaoFech) || undefined,
          preferida: false, incluirNoSaldoInicial: false,
        })
      }
      if (tudo.length > 0) setContas(prev => [...prev.filter(c => c.tipo !== 'cartao'), ...tudo])
    } else if (cartoesLocal.length > 0) {
      setContas(prev => [...prev.filter(c => c.tipo !== 'cartao'), ...cartoesLocal])
    }
    setPhase('categorias')
  }

  // ── Categorias helpers ─────────────────────────────────────────────────
  function toggleCat(nome: string) {
    setCatSel(prev => { const n = new Set(prev); if (n.has(nome)) n.delete(nome); else n.add(nome); return n })
  }

  function submitCategorias() {
    const atuais: Categoria[] = categorias.length > 0
      ? categorias.map(c => ({ ...c, ativa: catSel.has(c.nome) }))
      : CATEGORIAS_PADRAO.map((c, i) => ({ ...c, id: newId() + i, ativa: catSel.has(c.nome) }))
    setCategorias(atuais)

    // Até 11/10/2026 vinham aqui três subtelas — forma de pagamento, fixa ou
    // variável com o dia, e conta padrão de cada despesa — que não gravavam
    // nada: o que se escolhia era descartado. Saíram; o ajuste fino é em
    // Configurações → Categorias.
    setOnboardingCompleto(true)
    setPhase('planejamento')
  }

  // ── Back navigation ────────────────────────────────────────────────────
  function goBack() {
    switch (phase) {
      case 'banco':      setPhase('welcome'); break
      case 'cartao':     setPhase('banco');    break
      case 'categorias': setPhase('cartao');   break
      case 'planejamento': setPhase('categorias'); break
      default: break
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────
  const STEP_PCT: Partial<Record<Phase, number>> = {
    banco: 25, cartao: 50, categorias: 75, planejamento: 100,
  }
  const STEP_LBL: Partial<Record<Phase, string>> = {
    banco: 'Etapa 1 de 4 — Suas contas',
    cartao: 'Etapa 2 de 4 — Seus cartões',
    categorias: 'Etapa 3 de 4 — Tipos de gasto',
    planejamento: 'Etapa 4 de 4 — Como começar',
  }

  // ─────────────────────────────────────────────────────────────────────
  // ── WELCOME PHASE ────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div style={{
        minHeight: '100dvh', background: BG,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '40px 20px' : '48px 32px',
        fontFamily: "-apple-system,'Inter',sans-serif", textAlign: 'center',
      }}>
        <div style={{ maxWidth: 420, width: '100%' }}>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 18 }}>🧭</div>
          <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
            Bem-vindo ao Compass One!
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.85)', lineHeight: 1.6, marginBottom: 22 }}>
            Cadastre suas contas, cartões e tipos de gasto em 3 passos rápidos.
            Depois é só lançar o que entra e o que sai.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 30 }}>
            {['① Contas', '② Cartões', '③ Categorias'].map(t => (
              <span key={t} style={{
                background: 'rgba(255,255,255,.14)', borderRadius: 8, padding: '5px 11px',
                fontSize: 13, fontWeight: 600, color: '#fff',
              }}>{t}</span>
            ))}
          </div>
          <button onClick={() => setPhase('banco')} style={{
            width: '100%', padding: '14px 20px', border: 'none', borderRadius: 12,
            background: '#fff', color: COR.azulEscuro,
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,.2)', marginBottom: 8,
          }}>Começar →</button>
          <button onClick={() => { setOnboardingCompleto(true); navigate('/') }} style={{
            width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
            background: 'transparent', color: 'rgba(255,255,255,.85)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>Explorar o app primeiro</button>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', marginTop: 22, lineHeight: 1.5 }}>
            Ficou com dúvida em alguma tela? Toque no <b style={{ color: '#fff' }}>?</b> do
            cabeçalho ou pergunte ao <b style={{ color: '#fff' }}>Norte</b>, o assistente do app.
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // ── FINAL PHASE ──────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  if (phase === 'final') {
    const nContas   = contas.filter(c => c.tipo !== 'cartao').length
    const nCartoes  = contas.filter(c => c.tipo === 'cartao').length
    const nCats     = categorias.filter(c => c.ativa).length

    return (
      <div style={{
        minHeight: '100dvh', background: BG,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 24px',
        fontFamily: "-apple-system,'Inter',sans-serif",
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
          Tudo pronto!
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', marginBottom: 28 }}>
          Seu Compass One está configurado.
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16, padding: '20px 28px', marginBottom: 24,
          display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
          maxWidth: 360, width: '100%',
        }}>
          {[
            `✅ ${nContas} conta${nContas !== 1 ? 's' : ''} cadastrada${nContas !== 1 ? 's' : ''}`,
            `✅ ${nCartoes} cartão${nCartoes !== 1 ? 'ões' : ''} cadastrado${nCartoes !== 1 ? 's' : ''}`,
            `✅ ${nCats} categorias configuradas`,
          ].map(txt => (
            <div key={txt} style={{ fontSize: 13, color: '#fff' }}>{txt}</div>
          ))}
          {nContas === 0 && nCartoes === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
              ⚠️ Adicione contas em Configurações quando quiser.
            </div>
          )}
        </div>


        {/* Só se chega aqui pela porta "ainda não faço ideia", e por isso o
            destino é Lançamentos e não o Dashboard: o combinado que a porta
            fez é registrar um mês. Mandar para um painel vazio seria
            prometer uma coisa e entregar outra.

            Branco a 0,85 sobre #1a56db (o extremo mais claro do gradiente)
            dá 4,92:1. A 0,75 daria 4,18:1 e reprovaria. */}
        <div style={{
          maxWidth: 360, width: '100%', fontSize: 13, lineHeight: 1.6,
          color: 'rgba(255,255,255,0.85)', marginBottom: 18,
        }}>
          A partir de agora é só registrar o que entra e o que sai. Quando{' '}
          <b style={{ color: '#fff' }}>{NOMES_MESES[new Date().getMonth()].toLowerCase()}</b>{' '}
          fechar, o Planejamento propõe o seu primeiro plano a partir do que
          você registrou.
        </div>

        <div style={{ maxWidth: 360, width: '100%' }}>
          <button onClick={() => navigate('/novo-lancamento')} style={{
            width: '100%', padding: '14px 20px', border: 'none', borderRadius: 12,
            background: '#fff', color: COR.azulEscuro,
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
          }}>
            Começar a registrar →
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // ── CONFIG PHASES ────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────

  const pct = STEP_PCT[phase] ?? 0
  const lbl = STEP_LBL[phase] ?? ''
  const hasBack = true

  function renderConfig() {
    // ── BANCO ──────────────────────────────────────────────────────────
    if (phase === 'banco') return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
            Cadastre suas contas bancárias
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.5 }}>
            Adicione as contas que você usa no dia a dia. Pode ser corrente, poupança ou digital.
          </div>
        </div>

        {/* Contas já adicionadas */}
        {bancosLocal.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {bancosLocal.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 18 }}>🏦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#0284c7' }}>{c.tipo === 'corrente' ? 'Corrente' : 'Poupança'}</div>
                </div>
                <button onClick={() => removeBanco(c.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', fontSize: 18, padding: 4,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <FL>Banco</FL>
            <select value={bancoBanco} onChange={e => setBancoBanco(e.target.value)}
              style={{ ...inputSt, background: bancoBanco ? '#fff' : '#f8fafc' }}>
              <option value="">Selecione o banco...</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <FL>Nome da conta</FL>
            <input value={bancoNome} onChange={e => setBancoNome(e.target.value)}
              placeholder="Ex: Minha corrente, Conta Principal"
              style={inputSt} />
          </div>
          <div>
            <FL>Tipo</FL>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['corrente','poupanca'] as const).map(t => (
                <button key={t} onClick={() => setBancoTipo(t)} style={{
                  flex: 1, padding: '9px 0', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
                  border: `1.5px solid ${bancoTipo === t ? COR.azul : COR.borda}`, borderRadius: 8,
                  background: bancoTipo === t ? '#eff6ff' : '#fff',
                  color: bancoTipo === t ? COR.azul : COR.textoSuave,
                  fontWeight: bancoTipo === t ? 600 : 400,
                }}>{t === 'corrente' ? 'Corrente' : 'Poupança'}</button>
              ))}
            </div>
          </div>
          <div>
            <FL>Saldo atual aproximado</FL>
            <input value={bancoSaldo} onChange={e => setBancoSaldo(e.target.value)}
              placeholder="0,00" style={inputSt} />
            <Hint>Pode ser aproximado — você ajusta depois.</Hint>
          </div>
        </div>

        {bancoBanco && (
          <button onClick={addBancoCurrent} style={{
            width: '100%', marginTop: 14, padding: '10px 20px', border: `1.5px solid ${COR.azul}`,
            borderRadius: 10, background: '#eff6ff', color: COR.azul,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>+ Adicionar conta</button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <BtnPrimary onClick={() => submitBanco(false)}>Próximo →</BtnPrimary>
          <BtnGhost onClick={() => submitBanco(true)}>Pular por agora</BtnGhost>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
            Você pode adicionar mais contas depois em Configurações.
          </div>
        </div>
      </>
    )

    // ── CARTÃO ─────────────────────────────────────────────────────────
    if (phase === 'cartao') return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
            Tem cartão de crédito?
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.5, marginBottom: 8 }}>
            Cadastre para acompanhar as faturas.
          </div>
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, padding: '8px 12px',
            fontSize: 12, color: '#16a34a', lineHeight: 1.5,
          }}>
            Se está endividado no cartão, cadastrar é o primeiro passo para retomar o controle.
          </div>
        </div>

        {cartoesLocal.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {cartoesLocal.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#faf5ff', border: '1px solid #e9d5ff',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 18 }}>💳</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto }}>{c.nome}</div>
                  {c.diaVencimento && (
                    <div style={{ fontSize: 11, color: '#7c3aed' }}>Vence dia {c.diaVencimento}</div>
                  )}
                </div>
                <button onClick={() => removeCartao(c.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', fontSize: 18, padding: 4,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <FL>Banco / Bandeira</FL>
            <select value={cartaoBanco} onChange={e => setCartaoBanco(e.target.value)}
              style={{ ...inputSt, background: cartaoBanco ? '#fff' : '#f8fafc' }}>
              <option value="">Selecione...</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <FL>Apelido (opcional)</FL>
            <input value={cartaoApelido} onChange={e => setCartaoApelido(e.target.value)}
              placeholder="Ex: Nubank Gold, Cartão do Trabalho"
              style={inputSt} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FL>Dia de vencimento</FL>
              <input type="number" min={1} max={31} value={cartaoVenc}
                onChange={e => setCartaoVenc(e.target.value)}
                placeholder="15" style={inputSt} />
            </div>
            <div style={{ flex: 1 }}>
              <FL>Dia de fechamento</FL>
              <input type="number" min={1} max={31} value={cartaoFech}
                onChange={e => setCartaoFech(e.target.value)}
                placeholder="8" style={inputSt} />
            </div>
          </div>
          <Hint>O fechamento decide em qual fatura cai cada compra. Está no app do banco; dá para preencher depois.</Hint>
        </div>

        {cartaoBanco && (
          <button onClick={addCartaoCurrent} style={{
            width: '100%', marginTop: 14, padding: '10px 20px', border: `1.5px solid #7c3aed`,
            borderRadius: 10, background: '#faf5ff', color: '#7c3aed',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>+ Adicionar cartão</button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <BtnPrimary onClick={() => submitCartao(false)}>Próximo →</BtnPrimary>
          <BtnGhost onClick={() => submitCartao(true)}>Pular por agora (adiciono depois)</BtnGhost>
        </div>
      </>
    )

    // ── CATEGORIAS ─────────────────────────────────────────────────────
    if (phase === 'categorias') {
      const lista = verMais ? CATEGORIAS_PADRAO : CATEGORIAS_PADRAO.slice(0, 14)
      return (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginBottom: 6 }}>
              Quais são seus tipos de gasto?
            </div>
            <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.55 }}>
              Já selecionamos as mais comuns — desative as que não se aplicam a você.
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {lista.map(c => {
              const sel = catSel.has(c.nome)
              return (
                <button key={c.nome} onClick={() => toggleCat(c.nome)} style={{
                  padding: '6px 10px', border: `1.5px solid ${sel ? COR.azul : COR.borda}`,
                  borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                  background: sel ? '#eff6ff' : '#fff',
                  color: sel ? COR.azul : COR.textoSuave,
                  fontWeight: sel ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span>{c.icone}</span>
                  <span>{c.nome}</span>
                </button>
              )
            })}
          </div>
          {!verMais && CATEGORIAS_PADRAO.length > 14 && (
            <button onClick={() => setVerMais(true)} style={{
              fontSize: 12, color: COR.azul, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', padding: '4px 0', marginBottom: 8,
            }}>
              Ver mais ({CATEGORIAS_PADRAO.length - 14} categorias) +
            </button>
          )}
          <div style={{ marginTop: 12 }}>
            <BtnPrimary onClick={submitCategorias}>Próximo →</BtnPrimary>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            Você pode criar categorias personalizadas depois em Configurações.
          </div>
        </>
      )
    }

    if (phase === 'planejamento') return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🧭</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: COR.texto, marginBottom: 8 }}>
            Como você quer começar?
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.6 }}>
            Nenhuma das duas é errada. A diferença é só se você já sabe
            quanto entra e quanto sai por mês.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              icone: '🎯',
              titulo: 'Já sei meus números',
              corpo: 'Você tem ideia de quanto recebe e quanto gasta. Monte o plano agora, em cerca de 5 minutos — dá para ajustar mês a mês depois.',
              acao: () => navigate('/wizard-planejamento', { replace: true }),
              cta: 'Montar meu plano',
            },
            {
              icone: '🔍',
              titulo: 'Ainda não faço ideia',
              corpo: 'Quase ninguém sabe de cabeça. Registre o que entra e o que sai por um mês; quando ele fechar, o app propõe o seu primeiro plano a partir do que aconteceu de verdade.',
              acao: () => setPhase('final'),
              cta: 'Começar registrando',
            },
          ].map(p => (
            <button
              key={p.titulo}
              onClick={p.acao}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                background: COR.branco, border: `1.5px solid ${COR.borda}`,
                borderRadius: 14, padding: '16px 18px', fontFamily: 'inherit',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = COR.azul
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(26,86,219,.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = COR.borda
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{p.icone}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: COR.texto }}>{p.titulo}</span>
              </div>
              <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.55, marginBottom: 10 }}>
                {p.corpo}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: COR.azul }}>{p.cta} →</div>
            </button>
          ))}
        </div>
      </>
    )

    return null
  }

  return (
    <div style={{
      minHeight: '100dvh', background: COR.fundo,
      display: 'flex', flexDirection: 'column',
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      {/* Blue header */}
      <div style={{
        background: BG, padding: '20px 24px 24px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {hasBack && (
            <button onClick={goBack} style={{
              background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8,
              padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>← Voltar</button>
          )}
          <div style={{ flex: 1, textAlign: hasBack ? 'center' : 'left' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>Compass One</div>
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.85)', marginBottom: 10 }}>
          {lbl}
        </div>
        <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: '#fff', width: `${pct}%`, transition: 'width .4s ease',
          }} />
        </div>
      </div>

      {/* Card content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px 20px 40px',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20,
          padding: '24px 20px',
          maxWidth: 480, width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
        }}>
          {renderConfig()}
        </div>
      </div>
    </div>
  )
}
