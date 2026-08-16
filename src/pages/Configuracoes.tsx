import { useState, useEffect, useRef } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import TutorialCard from '../components/TutorialCard'
import { useToast } from '../components/Toast'
import type { Conta, Categoria, TipoCategoria, FormaPagamentoFatura } from '../context/AppContext'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'
import ModalConfirmacao from '../components/ModalConfirmacao'

import {
  COR, CORES_PRESET, ICONES_CONTA, ICONES_CAT,
  BANCOS,
  gerarId, useIsMobile,
} from '../components/configuracoes/CfgShared'
import type { Aba, ConfirmState } from '../components/configuracoes/CfgShared'
import CfgBancosCartoes from '../components/configuracoes/CfgBancosCartoes'
import CfgCategorias from '../components/configuracoes/CfgCategorias'
import CfgPerfil from '../components/configuracoes/CfgPerfil'
import CfgPreferencias from '../components/configuracoes/CfgPreferencias'

// ── Componente principal ─────────────────────────────────────────────
export default function Configuracoes() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'list'|'form'>('list')
  const [aba,    setAba]    = useState<Aba>(() => {
    if (window.innerWidth < 640) return 'home'
    const p = new URLSearchParams(window.location.search).get('aba')
    if (p === 'grupos') return 'categorias'
    if (p && ['bancos','cartoes','categorias','perfil','preferencias'].includes(p)) return p as Aba
    return 'bancos'
  })
  const { user, contas, categorias, setContas, setCategorias,
          extratoData, faturaData,
          planos, planosReal, setPlanos,
          planejamentoLockado, setPlanejamentoLockado,
          desvioMinPerc, setDesvioMinPerc,
          percentualAlerta, setPercentualAlerta,
          metodoSugestao, setMetodoSugestao,
          perfil, setPerfil, excluirConta: excluirContaUsuario,
          setOnboardingCompleto,
          saldoInicialDinheiro, setSaldoInicialDinheiro } = useApp()
  const [formPerfil, setFormPerfil] = useState({ nome: perfil.nome, apelido: perfil.apelido })
  const [modalExcluirConta, setModalExcluirConta] = useState(false)
  const [confirmInput,      setConfirmInput]      = useState('')
  const [deletando,         setDeletando]         = useState(false)
  const [abaCat,      setAbaCat]      = useState<TipoCategoria>('saida')
  const [filtroAtiva, setFiltroAtiva] = useState<'ativas'|'inativas'|'todas'>('todas')
  const [subAbaCat,   setSubAbaCat]   = useState<'categorias'|'grupos'>(() =>
    new URLSearchParams(window.location.search).get('aba') === 'grupos' ? 'grupos' : 'categorias'
  )
  const [novoGrupoNome,  setNovoGrupoNome]  = useState('')
  const [novoGrupoTipo,  setNovoGrupoTipo]  = useState<TipoCategoria>('saida')
  const [editGrupo,      setEditGrupo]      = useState<string|null>(null)
  const [editGrupoNome,  setEditGrupoNome]  = useState('')
  const [editGrupoTipo,  setEditGrupoTipo]  = useState<TipoCategoria>('saida')
  const [gruposExtra,    setGruposExtra]    = useState<string[]>([])
  const [gruposOcultos,  setGruposOcultos]  = useState<string[]>([])
  const [gruposExtraTipos, setGruposExtraTipos] = useState<Record<string, TipoCategoria>>({})

  useEffect(() => {
    if (perfil.nome || perfil.apelido) {
      setFormPerfil({ nome: perfil.nome, apelido: perfil.apelido })
    }
  }, [perfil.nome, perfil.apelido])

  useEffect(() => {
    const st = location.state as { aba?: string; catNome?: string } | null
    if (!st) return
    if (st.aba === 'categorias') {
      setAba('categorias')
      if (st.catNome) {
        const cat = categorias.find(c => c.nome === st.catNome)
        if (cat) {
          setAbaCat(cat.tipo)
          editarCategoria(cat)
        } else {
          novaCategoria()
        }
      }
    } else if (st.aba === 'perfil') {
      setAba('perfil')
    } else if (st.aba === 'preferencias') {
      setAba('preferencias')
    }
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const abaParam = searchParams.get('aba')
    const acaoParam = searchParams.get('acao')
    if (!abaParam) return
    if (abaParam === 'bancos') {
      setAba('bancos')
      setMobileView(acaoParam === 'novo' ? 'form' : 'list')
      novaConta('bancos')
    } else if (abaParam === 'cartoes') {
      setAba('cartoes')
      setMobileView(acaoParam === 'novo' ? 'form' : 'list')
      novaConta('cartoes')
    } else if (abaParam === 'categorias') {
      setAba('categorias')
      setSubAbaCat('categorias')
      setMobileView('list')
    } else if (abaParam === 'grupos') {
      setAba('categorias')
      setSubAbaCat('grupos')
      setMobileView('list')
    } else if (abaParam === 'perfil') {
      setAba('perfil')
    } else if (abaParam === 'preferencias') {
      setAba('preferencias')
    }
    // URL mantida para que o sub-item ativo na sidebar reflita a aba atual
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  const contaVazia: Omit<Conta,'id'> = {
    nome:'', banco:'', tipo:'corrente', saldoInicial:0,
    cor:CORES_PRESET[0], icone:ICONES_CONTA[0],
  }
  const [formConta,   setFormConta]   = useState<Omit<Conta,'id'>>(contaVazia)
  const [editContaId, setEditContaId] = useState<string|null>(null)
  const [erroConta,   setErroConta]   = useState('')
  const [saldoStr,       setSaldoStr]       = useState('')
  const [limiteStr,      setLimiteStr]      = useState('')
  const [faturaStr,      setFaturaStr]      = useState('')
  const [bancoCustom,    setBancoCustom]    = useState('')
  const nomeContaRef = useRef<HTMLInputElement>(null)

  const catVazia: Omit<Categoria,'id'> = {
    nome:'', tipo:'saida', fixa:false, tipoMovimento:'banco', formaPagamento:'debito',
    cor:CORES_PRESET[0], icone:ICONES_CAT[0], ativa:true, grupo: undefined,
  }
  const [formCat,   setFormCat]   = useState<Omit<Categoria,'id'>>(catVazia)
  const [editCatId, setEditCatId] = useState<string|null>(null)
  const [erroCat,   setErroCat]   = useState('')
  const nomeCatRef = useRef<HTMLInputElement>(null)
  const grupoSelectRef = useRef<HTMLSelectElement>(null)

  const tipoBancoRefs   = useRef<(HTMLButtonElement|null)[]>([])
  const tipoCatRefs     = useRef<(HTMLButtonElement|null)[]>([])
  const freqCatRefs     = useRef<(HTMLButtonElement|null)[]>([])
  const tipoMovRefs     = useRef<(HTMLButtonElement|null)[]>([])
  const formaPagCatRefs = useRef<(HTMLButtonElement|null)[]>([])

  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const confirmar = (state: ConfirmState) => setConfirm(state)
  const fecharConfirm = () => setConfirm(null)

  // ── Ações Conta ──
  function novaConta(tipoAba: Aba = aba) {
    setFormConta({...contaVazia, tipo: tipoAba==='cartoes' ? 'cartao' : 'corrente'})
    setEditContaId(null)
    setErroConta('')
    setSaldoStr(''); setLimiteStr(''); setFaturaStr(''); setBancoCustom('')
    setTimeout(() => nomeContaRef.current?.focus(), 0)
  }
  function editarConta(c: Conta) {
    setMobileView('form')
    const { id, ...rest } = c
    const restFinal = (rest.tipo === 'cartao' && rest.contaPagamentoId && !rest.formaPagamentoFatura)
      ? { ...rest, formaPagamentoFatura: 'automatico' as FormaPagamentoFatura }
      : rest
    const bancoNaLista = BANCOS.includes(c.banco)
    if (c.tipo === 'cartao' && !bancoNaLista && c.banco) {
      setFormConta({ ...restFinal, banco: 'Outro' })
      setBancoCustom(c.banco)
    } else {
      setFormConta(restFinal)
      setBancoCustom('')
    }
    setEditContaId(id)
    setErroConta('')
    setSaldoStr(c.saldoInicial ? String(c.saldoInicial).replace('.', ',') : '')
    setLimiteStr(c.limiteCartao ? String(c.limiteCartao).replace('.', ',') : '')
    if (c.tipo === 'cartao') {
      const ano = new Date().getFullYear()
      const mes = new Date().getMonth()
      const faturaCat = (planos[ano] as import('../context/AppContext').PlanoAnoData | undefined)
        ?.saidas.find(s => s.id === `fatura-${c.id}`)
      const val = faturaCat ? (faturaCat.v[mes] || faturaCat.v.find(v => v > 0) || 0) : 0
      setFaturaStr(val > 0 ? String(val).replace('.', ',') : '')
    } else {
      setFaturaStr('')
    }
  }
  function salvarConta() {
    const ehCartao = formConta.tipo === 'cartao'
    const bancoEfetivo = (ehCartao && formConta.banco === 'Outro') ? bancoCustom.trim() : formConta.banco
    if (!ehCartao && !formConta.nome.trim()) return setErroConta('Informe o titular da conta')
    if (!bancoEfetivo) return setErroConta(ehCartao ? 'Selecione ou informe o banco' : 'Selecione o banco')
    const nomeEfetivo = ehCartao
      ? (formConta.apelido?.trim() || bancoEfetivo)
      : formConta.nome.trim()
    const contaFinal = { ...formConta, nome: nomeEfetivo, banco: bancoEfetivo }
    setErroConta('')
    const contaId = editContaId || gerarId()
    if (editContaId) {
      setContas(prev => prev.map(c => {
        if (c.id === editContaId) return { id: editContaId, ...contaFinal }
        if (contaFinal.preferida && (c.tipo === 'corrente' || c.tipo === 'poupanca')) return { ...c, preferida: false }
        return c
      }))
      toast('Conta atualizada')
    } else {
      setContas(prev => [
        ...prev.map(c =>
          contaFinal.preferida && (c.tipo === 'corrente' || c.tipo === 'poupanca')
            ? { ...c, preferida: false }
            : c
        ),
        { id: contaId, ...contaFinal },
      ])
      toast('Conta cadastrada')
    }
    if (ehCartao && faturaStr.trim()) {
      const faturaVal = parseFloat(faturaStr.replace(',', '.')) || 0
      if (faturaVal > 0) {
        const ano = new Date().getFullYear()
        const mes = new Date().getMonth()
        const nomeCartao = contaFinal.apelido?.trim() || (contaFinal.banco === 'Outro' ? bancoCustom.trim() : contaFinal.banco)
        setPlanos(prev => {
          const planoAtual = prev[ano] as import('../context/AppContext').PlanoAnoData | undefined
          if (!planoAtual) return prev
          const jaExiste = planoAtual.saidas.some(s => s.id === `fatura-${contaId}`)
          const newSaidas = jaExiste
            ? planoAtual.saidas.map(s =>
                s.id === `fatura-${contaId}`
                  ? { ...s, v: s.v.map((v, i) => i === mes ? faturaVal : v) }
                  : s
              )
            : [
                ...planoAtual.saidas,
                { id: `fatura-${contaId}`, nome: nomeCartao, t: 'fatura_cartao', v: Array(12).fill(0).map((_, i) => i === mes ? faturaVal : 0) },
              ]
          return { ...prev, [ano]: { ...planoAtual, saidas: newSaidas } }
        })
      }
    }
    setMobileView('list')
    novaConta()
  }
  function excluirConta(id: string) {
    const conta = contas.find(c => c.id === id)
    const isCartao = conta?.tipo === 'cartao'
    const label = isCartao ? 'cartão' : 'conta'
    const itemRef = isCartao ? 'Este cartão' : 'Esta conta'

    const temExtrato = Object.entries(extratoData).some(([k, v]) =>
      k.startsWith(`${id}-`) &&
      Object.values(v.lancamentos).some(arr => arr.length > 0)
    )
    const temFatura = Object.keys(faturaData).some(k => k.startsWith(`${id}-`))
    const catsVinculadas = categorias.filter(c =>
      c.formaPagamento === 'automatico' && c.contaDebitoId === id
    )

    if (temExtrato || temFatura || catsVinculadas.length > 0) {
      const motivos: string[] = []
      if (temExtrato || temFatura) motivos.push('possui lançamentos registrados')
      if (catsVinculadas.length > 0) {
        const nomes = catsVinculadas.map(c => c.nome).join(', ')
        const qtd = catsVinculadas.length
        motivos.push(`está vinculad${isCartao ? 'o' : 'a'} à${qtd > 1 ? 's' : ''} categoria${qtd > 1 ? 's' : ''} com débito automático: ${nomes}`)
      }
      confirmar({
        titulo: 'Não é possível excluir',
        mensagem: `${itemRef} ${motivos.join(' e ')}. Remova os vínculos antes de excluir.`,
        apenasFechar: true,
        onConfirmar: fecharConfirm,
      })
      return
    }

    confirmar({
      titulo: `Excluir ${label}?`,
      mensagem: 'Esta ação não pode ser desfeita.',
      detalhe: conta?.apelido || conta?.banco || conta?.nome,
      onConfirmar: () => {
        setContas(prev => prev.filter(c => c.id !== id))
        if (editContaId === id) novaConta()
        setMobileView('list')
        toast(`${label.charAt(0).toUpperCase() + label.slice(1)} excluído`, 'info')
        fecharConfirm()
      },
    })
  }
  function moverConta(id: string, dir: 'up' | 'down') {
    setContas(prev => {
      const c = prev.find(x => x.id === id)
      if (!c) return prev
      const grupo = prev.filter(x => x.tipo === c.tipo)
      const idx = grupo.findIndex(x => x.id === id)
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === grupo.length - 1) return prev
      const vizinho = grupo[dir === 'up' ? idx - 1 : idx + 1]
      const posC = prev.findIndex(x => x.id === id)
      const posV = prev.findIndex(x => x.id === vizinho.id)
      const next = [...prev]
      ;[next[posC], next[posV]] = [next[posV], next[posC]]
      return next
    })
  }
  // moverConta preservada para futura reativação do reordenamento
  void (moverConta as unknown as null)

  // ── Ações Categoria ──
  function novaCategoria() {
    setFormCat({...catVazia, tipo:abaCat}); setEditCatId(null)
    setErroCat('')
    setTimeout(() => grupoSelectRef.current?.focus(), 0)
  }
  function editarCategoria(c: Categoria) {
    setMobileView('form')
    const { id, ...rest } = c
    setFormCat(rest); setEditCatId(id)
    setErroCat('')
  }
  function salvarCategoria() {
    if (!formCat.nome.trim()) return setErroCat('Informe o nome da categoria')
    setErroCat('')
    if (editCatId) {
      setCategorias(prev => prev.map(c => c.id===editCatId ? {id:editCatId,...formCat, ativa:true} : c))
      toast('Categoria atualizada')
      setMobileView('list')
    } else {
      const nomeNorm = formCat.nome.trim().toLowerCase()
      const descNorm = (formCat.descricao ?? '').trim().toLowerCase()
      const duplicata = categorias.find(c =>
        c.nome.trim().toLowerCase() === nomeNorm &&
        c.tipo === formCat.tipo &&
        (c.descricao ?? '').trim().toLowerCase() === descNorm
      )
      if (duplicata) return setErroCat(`Já existe uma categoria "${duplicata.nome}${duplicata.descricao ? ` · ${duplicata.descricao}` : ''}" neste tipo`)
      setCategorias(prev => [...prev, {id:gerarId(),...formCat, ativa:true}])
      toast('Categoria criada')
      setMobileView('list')
    }
    novaCategoria()
  }
  function excluirCategoria(id: string) {
    const cat = categorias.find(c => c.id === id)
    confirmar({
      titulo: 'Excluir categoria?',
      mensagem: 'Esta ação não pode ser desfeita.',
      detalhe: cat?.nome,
      onConfirmar: () => {
        setCategorias(prev => prev.filter(c => c.id !== id))
        if (editCatId === id) { setEditCatId(null); setFormCat({...catVazia, tipo:abaCat}) }
        setMobileView('list')
        toast('Categoria excluída', 'info')
        fecharConfirm()
      },
    })
  }
  function toggleAtiva(id: string) {
    const cat = categorias.find(c => c.id === id)
    if (!cat) return
    if (cat.ativa) {
      const anoAtual = new Date().getFullYear()
      const mesAtual = new Date().getMonth()
      const temLancFuturo = (lista: { id?: string; nome: string; v: number[] }[]) => {
        const entry = lista.find(c => (c.id && c.id === id) || c.nome === cat.nome)
        return entry ? entry.v.some((v, i) => i > mesAtual && v !== 0) : false
      }
      const anoFuturo = Object.entries(planos)
        .filter(([ano]) => Number(ano) > anoAtual)
        .some(([, pd]) => {
          const lista = cat.tipo === 'entrada' ? pd.entradas : pd.saidas
          return lista.some(c => ((c.id && c.id === id) || c.nome === cat.nome) && c.v.some(v => v !== 0))
        })
      const listaAtual = cat.tipo === 'entrada' ? (planos[anoAtual]?.entradas ?? []) : (planos[anoAtual]?.saidas ?? [])
      const listaRealAtual = cat.tipo === 'entrada' ? (planosReal[anoAtual]?.entradas ?? []) : (planosReal[anoAtual]?.saidas ?? [])
      if (temLancFuturo(listaAtual) || temLancFuturo(listaRealAtual) || anoFuturo) {
        window.alert('Não é possível inativar esta categoria pois ela possui lançamentos planejados em meses futuros. Remova os valores dos meses futuros no planejamento antes de inativar.')
        return
      }
    }
    setCategorias(prev => prev.map(c => c.id===id ? {...c, ativa:!c.ativa} : c))
  }
  function importarSugestoes() {
    const nomesExistentes = new Set(categorias.map(c => c.nome.toLowerCase()))
    const novas = CATEGORIAS_PADRAO
      .filter(c => !nomesExistentes.has(c.nome.toLowerCase()))
      .map((c, i) => ({ ...c, ativa: false, id: `id-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}` }))
    if (novas.length === 0) return
    setCategorias(prev => [...prev, ...novas])
    setFiltroAtiva('inativas')
    setAbaCat(novas[0].tipo)
  }

  const catsFiltradas = categorias
    .filter(c => c.tipo === abaCat)
    .filter(c => filtroAtiva === 'todas' ? true : filtroAtiva === 'ativas' ? c.ativa : !c.ativa)
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))

  const temSugestoesPendentes = CATEGORIAS_PADRAO.some(
    p => !categorias.some(c => c.nome.toLowerCase() === p.nome.toLowerCase())
  )

  const contasFiltradas = contas.filter(c => aba === 'bancos' ? c.tipo !== 'cartao' : c.tipo === 'cartao')
  const nenhumaConta = (aba === 'bancos' || aba === 'cartoes') && !isMobile && contasFiltradas.length === 0

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column',
      background:COR.fundo, fontFamily:"-apple-system,'Inter',sans-serif", overflow:'hidden' }}>
      <style>{`
        .campo-cfg:focus {
          border-color: #1a56db !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(26,86,219,0.12);
          outline: none;
        }
      `}</style>

      <AppHeader currentPath="/configuracoes" hideBottomTab />
      <BottomNav />

      {/* HOME SCREEN — apenas mobile */}
      {isMobile && aba === 'home' && (
        <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '24px 16px' : '40px 24px',
          display:'flex', flexDirection:'column', alignItems:'center' }}>
          <TutorialCard
            tela="configuracoes"
            icon="⚙️"
            title="Ajuste tudo do seu jeito"
            description="Aqui você gerencia seus bancos, cartões e categorias. Tudo que você configurou no início pode ser ajustado quando quiser."
            tips={[
              { icon: '🏦', text: 'Adicione novos bancos e cartões' },
              { icon: '🏷️', text: 'Ative ou desative categorias de gasto' },
              { icon: '⚙️', text: 'Personalize preferências como desvio de planejamento' },
            ]}
            buttonLabel="Explorar configurações →"
          />
          <h1 style={{ fontSize:22, fontWeight:800, color:COR.texto, marginBottom:28, textAlign:'center' }}>
            Configurações
          </h1>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, width:'100%', maxWidth:420 }}>
            {[
              { icon:'🏦', label:'Minhas contas', fn: () => { setAba('bancos');     setMobileView('list'); novaConta('bancos') } },
              { icon:'💳', label:'Cartões',      fn: () => { setAba('cartoes');    setMobileView('list'); novaConta('cartoes') } },
              { icon:'🏷', label:'Categorias',   fn: () => { setAba('categorias'); setSubAbaCat('categorias'); setMobileView('list') } },
              { icon:'📁', label:'Grupos',       fn: () => { setAba('categorias'); setSubAbaCat('grupos');     setMobileView('list') } },
              { icon:'👤', label:'Perfil',       fn: () => setAba('perfil') },
              { icon:'⚙️', label:'Preferências', fn: () => setAba('preferencias') },
            ].map(card => (
              <button key={card.label} onClick={card.fn} style={{
                background:COR.branco, borderRadius:20, padding:'20px 10px 16px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:10,
                border:`1px solid ${COR.borda}`, boxShadow:'0 2px 10px rgba(0,0,0,.06)',
                cursor:'pointer', fontFamily:'inherit', transition:'box-shadow .15s',
              }}>
                <span style={{ fontSize:30 }}>{card.icon}</span>
                <span style={{ fontSize:12, fontWeight:700, color:COR.texto }}>{card.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BACK BAR — apenas mobile */}
      {isMobile && aba !== 'home' && (
        <div style={{ background:COR.branco, borderBottom:`1px solid ${COR.borda}`,
          padding:'10px 16px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <button onClick={() => { setAba('home'); setMobileView('list') }} style={{
            border:'none', background:'transparent', color:COR.azul,
            fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
            ‹ Voltar
          </button>
          <span style={{ fontSize:14, fontWeight:700, color:COR.texto, marginLeft:4 }}>
            {aba === 'bancos' ? '🏦 Minhas contas'
              : aba === 'cartoes' ? '💳 Cartões'
              : aba === 'categorias' ? (subAbaCat === 'grupos' ? '📁 Grupos' : '🏷 Categorias')
              : aba === 'perfil' ? '👤 Perfil' : '⚙️ Preferências'}
          </span>
        </div>
      )}

      {/* Tutoriais por seção */}
      {aba === 'bancos' && <TutorialCard tela="config_bancos" icon="🏦" title="Seus bancos"
        description="Cadastre e gerencie suas contas bancárias. Cada conta que você adiciona aparece nos lançamentos."
        tips={[
          { icon: '➕', text: 'Adicione contas correntes e poupanças' },
          { icon: '✏️', text: 'Edite saldo, nome e ícone a qualquer momento' },
          { icon: '🎨', text: 'Personalize com cores para identificar rápido' },
        ]} buttonLabel="Gerenciar bancos →" />}

      {aba === 'cartoes' && <TutorialCard tela="config_cartoes" icon="💳" title="Seus cartões"
        description="Cadastre seus cartões de crédito para acompanhar faturas e controlar o uso do limite."
        tips={[
          { icon: '📅', text: 'Informe dia de vencimento para organizar seus pagamentos' },
          { icon: '💰', text: 'Defina o limite para acompanhar o uso' },
          { icon: '🏷️', text: 'Dê um apelido para identificar cada cartão' },
        ]} buttonLabel="Gerenciar cartões →" />}

      {aba === 'categorias' && <TutorialCard tela="config_categorias" icon="📁" title="Tipos de gasto"
        description="Categorias são os tipos de gasto do seu dia a dia — como Mercado, Conta de Luz, Uber. Organize do seu jeito."
        tips={[
          { icon: '✅', text: 'Ative ou desative categorias conforme sua necessidade' },
          { icon: '➕', text: 'Crie categorias personalizadas' },
          { icon: '📂', text: 'Organize em grupos para facilitar a visualização' },
        ]} buttonLabel="Ver categorias →" />}

      {aba === 'perfil' && <TutorialCard tela="config_perfil" icon="👤" title="Seus dados"
        description="Atualize seu nome, como quer ser chamado e outras informações da sua conta."
        tips={[
          { icon: '✏️', text: 'O apelido aparece na saudação do Início' },
          { icon: '🔒', text: 'Seu email está vinculado ao login' },
        ]} buttonLabel="Ver perfil →" />}

      {aba === 'preferencias' && <TutorialCard tela="config_preferencias" icon="⚙️" title="Personalize o app"
        description="Ajuste o Compass One do seu jeito — moeda, formato de números, alertas e tutoriais."
        tips={[
          { icon: '💱', text: 'Escolha moeda e formato de exibição' },
          { icon: '🔔', text: 'Configure alertas de saldo baixo' },
          { icon: '📚', text: 'Reative tutoriais quando quiser rever' },
        ]} buttonLabel="Ajustar preferências →" />}

      {/* CONTEÚDO */}
      {aba !== 'home' && (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? 12 : 20, gap:16 }}>

          {(aba==='bancos' || aba==='cartoes') && (
            <CfgBancosCartoes
              aba={aba}
              isMobile={isMobile}
              mobileView={mobileView}
              setMobileView={setMobileView}
              nenhumaConta={nenhumaConta}
              contas={contas}
              editContaId={editContaId}
              formConta={formConta}
              setFormConta={setFormConta}
              bancoCustom={bancoCustom}
              setBancoCustom={setBancoCustom}
              saldoStr={saldoStr}
              setSaldoStr={setSaldoStr}
              limiteStr={limiteStr}
              setLimiteStr={setLimiteStr}
              faturaStr={faturaStr}
              setFaturaStr={setFaturaStr}
              saldoInicialDinheiro={saldoInicialDinheiro}
              onSaveSaldoDinheiro={setSaldoInicialDinheiro}
              erroConta={erroConta}
              nomeContaRef={nomeContaRef}
              tipoBancoRefs={tipoBancoRefs}
              novaConta={novaConta}
              editarConta={editarConta}
              salvarConta={salvarConta}
              excluirConta={excluirConta}
            />
          )}

          {aba==='categorias' && (
            <CfgCategorias
              isMobile={isMobile}
              mobileView={mobileView}
              setMobileView={setMobileView}
              subAbaCat={subAbaCat}

              abaCat={abaCat}
              setAbaCat={setAbaCat}
              filtroAtiva={filtroAtiva}
              setFiltroAtiva={setFiltroAtiva}
              categorias={categorias}
              setCategorias={setCategorias}
              contas={contas}
              formCat={formCat}
              setFormCat={setFormCat}
              editCatId={editCatId}
              erroCat={erroCat}
              nomeCatRef={nomeCatRef}
              grupoSelectRef={grupoSelectRef}
              tipoCatRefs={tipoCatRefs}
              freqCatRefs={freqCatRefs}
              tipoMovRefs={tipoMovRefs}
              formaPagCatRefs={formaPagCatRefs}
              catsFiltradas={catsFiltradas}
              temSugestoesPendentes={temSugestoesPendentes}
              gruposExtra={gruposExtra}
              setGruposExtra={setGruposExtra}
              gruposOcultos={gruposOcultos}
              setGruposOcultos={setGruposOcultos}
              gruposExtraTipos={gruposExtraTipos}
              setGruposExtraTipos={setGruposExtraTipos}
              novoGrupoNome={novoGrupoNome}
              setNovoGrupoNome={setNovoGrupoNome}
              novoGrupoTipo={novoGrupoTipo}
              setNovoGrupoTipo={setNovoGrupoTipo}
              editGrupo={editGrupo}
              setEditGrupo={setEditGrupo}
              editGrupoNome={editGrupoNome}
              setEditGrupoNome={setEditGrupoNome}
              editGrupoTipo={editGrupoTipo}
              setEditGrupoTipo={setEditGrupoTipo}
              novaCategoria={novaCategoria}
              editarCategoria={editarCategoria}
              salvarCategoria={salvarCategoria}
              excluirCategoria={excluirCategoria}
              toggleAtiva={toggleAtiva}
              importarSugestoes={importarSugestoes}
              confirmar={confirmar}
              fecharConfirm={fecharConfirm}
            />
          )}

          {aba==='perfil' && (
            <CfgPerfil
              user={user}
              contas={contas}
              categorias={categorias}
              perfil={perfil}
              setPerfil={setPerfil}
              formPerfil={formPerfil}
              setFormPerfil={setFormPerfil}
              toast={toast}
              onAbrirModalExcluir={() => { setModalExcluirConta(true); setConfirmInput('') }}
            />
          )}

          {aba==='preferencias' && (
            <CfgPreferencias
              desvioMinPerc={desvioMinPerc}
              setDesvioMinPerc={setDesvioMinPerc}
              percentualAlerta={percentualAlerta}
              setPercentualAlerta={setPercentualAlerta}
              metodoSugestao={metodoSugestao}
              setMetodoSugestao={setMetodoSugestao}
              planejamentoLockado={planejamentoLockado}
              setPlanejamentoLockado={setPlanejamentoLockado}
              setOnboardingCompleto={setOnboardingCompleto}
              navigate={navigate}
              toast={toast}
            />
          )}

        </div>
      )}

      {/* Modal confirmação de exclusão de conta */}
      {modalExcluirConta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
          zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:COR.branco, borderRadius:14, padding:28,
            maxWidth:420, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:COR.vermelho, margin:'0 0 10px' }}>
              Excluir conta permanentemente
            </h3>
            <p style={{ fontSize:13, color:COR.textoSuave, margin:'0 0 18px', lineHeight:1.6 }}>
              Esta ação é <strong>irreversível</strong>. Todos os seus dados serão apagados e não poderão ser recuperados.<br /><br />
              Para confirmar, digite <strong style={{ color:COR.texto }}>EXCLUIR</strong> no campo abaixo:
            </p>
            <input
              autoFocus
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder="EXCLUIR"
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, boxSizing:'border-box',
                border:`1.5px solid ${confirmInput === 'EXCLUIR' ? COR.vermelho : COR.borda}`,
                fontSize:14, fontFamily:'inherit', outline:'none', letterSpacing:.5 }} />
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              <button
                onClick={() => setModalExcluirConta(false)}
                disabled={deletando}
                style={{ flex:1, padding:'10px 0', border:`1px solid ${COR.borda}`, borderRadius:8,
                  background:COR.branco, color:COR.texto, fontSize:13, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit', opacity: deletando ? .5 : 1 }}>
                Cancelar
              </button>
              <button
                disabled={confirmInput !== 'EXCLUIR' || deletando}
                onClick={async () => {
                  setDeletando(true)
                  const { error } = await excluirContaUsuario()
                  if (error) {
                    toast('Erro ao excluir: ' + error)
                    setDeletando(false)
                  }
                }}
                style={{ flex:1, padding:'10px 0', border:'none', borderRadius:8,
                  background: confirmInput === 'EXCLUIR' && !deletando ? COR.vermelho : '#fca5a5',
                  color:'#fff', fontSize:13, fontWeight:600, fontFamily:'inherit',
                  cursor: confirmInput === 'EXCLUIR' && !deletando ? 'pointer' : 'not-allowed',
                  transition:'background .2s' }}>
                {deletando ? 'Excluindo...' : 'Excluir conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirmacao
        open={!!confirm}
        titulo={confirm?.titulo ?? ''}
        mensagem={confirm?.mensagem}
        detalhe={confirm?.detalhe}
        apenasFechar={confirm?.apenasFechar}
        onConfirmar={() => confirm?.onConfirmar()}
        onCancelar={fecharConfirm}
      />
    </div>
  )
}
