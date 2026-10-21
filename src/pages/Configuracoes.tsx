import { ehFaturaDoCartao, MSG_FATURA_NAO_E_CATEGORIA } from '../utils/novaCategoria'
import { dataDoSaldo } from '../utils/saldoDesde'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import ModalTopo from '../components/ModalTopo'
import BottomNav from '../components/BottomNav'
import { useToast } from '../components/Toast'
import { parseValor } from '../utils/moeda'
import type { Conta, Categoria, TipoCategoria, FormaPagamentoFatura, PlanoCat } from '../context/AppContext'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'

const MESES_CURTOS_CFG = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
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
import PrimeirosPassos from '../components/configuracoes/PrimeirosPassos'
import AvisoSoAdministrador from '../components/compartilhar/AvisoSoAdministrador'
import { nomeCanonico, mesmoNome } from '../utils/nomeCategoria'
import { mudouIdentidade, renomearNoExtrato, renomearNaFaturaDaCategoria, renomearNosPlanos } from '../utils/renomearCategoria'
import CfgPreferencias from '../components/configuracoes/CfgPreferencias'

// ── Componente principal ─────────────────────────────────────────────
export default function Configuracoes() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'list'|'form'>('list')
  // Sem ?aba, Configurações abre na tela de ícones (computador e celular),
  // na ordem do menu. Pedido do Guilherme em 12/10/2026, ao testar uma conta
  // nova: o formulário de conta sozinho no meio da página "ficou muito ruim".
  const [aba,    setAba]    = useState<Aba>(() => {
    const p = new URLSearchParams(window.location.search).get('aba')
    if (p === 'grupos') return 'categorias'
    if (p && ['bancos','cartoes','categorias','perfil','preferencias'].includes(p)) return p as Aba
    return 'home'
  })
  const { user, contas, categorias, setContas, setCategorias,
          extratoData, faturaData, setExtratoData, setFaturaData, compartilhamento,
          planos, setPlanos,
          perfil, setPerfil, excluirConta: excluirContaUsuario,
          saldoInicialDinheiro, salvarSaldoInicialDinheiro,
          cenarioPrevisao, setCenarioPrevisao, onboardingCompleto } = useApp()
  // Primeiro acesso: salvar um cadastro leva ao próximo, na ordem do menu.
  const primeiroAcesso = !onboardingCompleto && compartilhamento.papel !== 'membro'
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
    if (!abaParam) { setAba('home'); setMobileView('list'); return }
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
    // Conta nova: o saldo é o de hoje (utils/saldoDesde); dá para trocar no formulário.
    saldoInicialDesde: dataDoSaldo('hoje'),
  }
  const [formConta,   setFormConta]   = useState<Omit<Conta,'id'>>(contaVazia)
  const [editContaId, setEditContaId] = useState<string|null>(null)
  const [erroConta,   setErroConta]   = useState('')
  const [saldoStr,       setSaldoStr]       = useState('')
  const [faturaStr,      setFaturaStr]      = useState('')
  const [bancoCustom,    setBancoCustom]    = useState('')
  const nomeContaRef = useRef<HTMLInputElement>(null)

  // Toda categoria de banco — e toda fatura de cartao — diz em qual conta
  // aparece. A favorita ja vem sugerida: e o caso comum, e sem um dono a fixa
  // aparecia em todas as contas, deixando o saldo previsto de cada uma errado.
  const contaFavoritaId = useMemo(
    () => (contas.find(c => c.tipo !== 'cartao' && c.preferida)
        ?? contas.find(c => c.tipo !== 'cartao'))?.id,
    [contas],
  )

  const catVazia: Omit<Categoria,'id'> = {
    nome:'', tipo:'saida', fixa:false, tipoMovimento:'banco', formaPagamento:'debito',
    cor:CORES_PRESET[0], icone:ICONES_CAT[0], ativa:true, grupo: undefined,
    contaDebitoId: contaFavoritaId,
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
    const ehCartaoNovo = tipoAba === 'cartoes'
    setFormConta({
      ...contaVazia,
      tipo: ehCartaoNovo ? 'cartao' : 'corrente',
      ...(ehCartaoNovo ? {
        formaPagamentoFatura: 'automatico' as FormaPagamentoFatura,
        contaPagamentoId: contaFavoritaId,
      } : {}),
    })
    setEditContaId(null)
    setErroConta('')
    setSaldoStr(''); setFaturaStr(''); setBancoCustom('')
    setTimeout(() => nomeContaRef.current?.focus(), 0)
  }
  function editarConta(c: Conta) {
    setMobileView('form')
    const { id, ...rest } = c
    // Cartao cadastrado antes de os campos existirem nao diz como a fatura e
    // paga. Ter conta gravada ja significava debito automatico; sem nada,
    // sugere o caso comum para o campo nunca abrir vazio.
    const restFinal = rest.tipo === 'cartao'
      ? {
          ...rest,
          formaPagamentoFatura: rest.formaPagamentoFatura
            ?? ('automatico' as FormaPagamentoFatura),
          contaPagamentoId: rest.contaPagamentoId ?? contaFavoritaId,
        }
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
    // Cartão novo não trava: a data dele é a da fatura informada no primeiro acesso.
    if (ehCartao && !editContaId) delete contaFinal.saldoInicialDesde
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
      toast(ehCartao ? 'Cartão cadastrado' : 'Conta cadastrada')
      if (primeiroAcesso) navigate(`/configuracoes?aba=${ehCartao ? 'categorias' : 'cartoes'}`)
    }
    if (ehCartao && faturaStr.trim()) {
      const faturaVal = parseValor(faturaStr)
      if (faturaVal === null) { toast(`"${faturaStr.trim()}" não é um valor de fatura`, 'error'); return }
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
    // Categoria antiga, cadastrada antes de o campo existir, nao tem conta de
    // debito. Sugere a favorita para o campo nunca abrir vazio — quem paga de
    // outra conta troca ali, e a troca vale a partir do proximo salvamento.
    setFormCat({
      ...rest,
      contaDebitoId: rest.tipoMovimento === 'banco'
        ? (rest.contaDebitoId ?? contaFavoritaId)
        : rest.contaDebitoId,
    })
    setEditCatId(id)
    setErroCat('')
  }
  function salvarCategoria() {
    if (!formCat.nome.trim()) return setErroCat('Informe o nome da categoria')
    setErroCat('')
    // A fatura do cartão não é categoria (ehFaturaDoCartao). Só barra o nome
    // novo: quem já tem uma assim consegue editar o resto até excluí-la.
    const nomeAntigo = editCatId ? categorias.find(c => c.id === editCatId)?.nome : undefined
    if (formCat.nome.trim() !== nomeAntigo && ehFaturaDoCartao(formCat.nome, contas.filter(c => c.tipo === 'cartao').flatMap(c => [c.nome, c.banco, c.apelido ?? ''])))
      return setErroCat(MSG_FATURA_NAO_E_CATEGORIA)
    // A validacao ja usava trim, mas o que ia para o banco era o texto cru.
    // Um "Financiamento " com espaco no fim nao casava com a linha do plano
    // em nenhuma comparacao por nome, e a categoria sumia do Radar.
    // Nome de categoria que já existe vai com a grafia DELA ("academia" →
    // "Academia"): o app casa por nome exato. Ver utils/nomeCategoria.
    const limpo = {
      ...formCat,
      nome: nomeCanonico(formCat.nome, formCat.tipo, categorias, editCatId),
      descricao: formCat.descricao?.trim() || undefined,
      grupo: formCat.grupo?.trim() || undefined,
    }
    const descNorm = (limpo.descricao ?? '').toLowerCase()
    const duplicata = categorias.find(c =>
      c.id !== editCatId &&
      mesmoNome(c.nome, limpo.nome) &&
      c.tipo === formCat.tipo &&
      (c.descricao ?? '').trim().toLowerCase() === descNorm
    )
    // Editando também: renomear para um par que já existe juntaria os
    // lançamentos das duas categorias numa só, sem volta.
    if (duplicata) return setErroCat(`Já existe uma categoria "${duplicata.nome}${duplicata.descricao ? ` · ${duplicata.descricao}` : ''}" neste tipo`)
    if (editCatId) {
      const antiga = categorias.find(c => c.id === editCatId)
      // Nome ou variante mudou: lançamentos, faturas e plano vão junto
      // (utils/renomearCategoria). Membro não edita cadastro — o
      // setCategorias dele não muda nada, e o resto não pode mudar sozinho.
      if (antiga && compartilhamento.papel !== 'membro' && mudouIdentidade(antiga, limpo)) {
        const antes = { nome: antiga.nome, descricao: antiga.descricao }
        const depois = { nome: limpo.nome, descricao: limpo.descricao }
        setExtratoData(renomearNoExtrato(extratoData, antiga, antes, depois, categorias))
        setFaturaData(f => renomearNaFaturaDaCategoria(f, antiga, antes, depois, categorias))
        setPlanos(p => renomearNosPlanos(p, antiga, antes, depois, categorias))
      }
      setCategorias(prev => prev.map(c => c.id===editCatId ? {id:editCatId,...limpo, ativa:true} : c))
      toast('Categoria atualizada')
      setMobileView('list')
    } else {
      setCategorias(prev => [...prev, {id:gerarId(),...limpo, ativa:true}])
      toast('Categoria criada')
      setMobileView('list')
    }
    novaCategoria()
  }
  /**
   * Meses com planejamento futuro desta categoria + variante, por ano.
   * Casa por id, ou por nome + variante. Casar so pelo nome faria uma variante
   * bloquear pelos valores de outra (ex.: Seguro·Civic travando Seguro·March).
   */
  function planejamentoFuturo(cat: Categoria): { ano: number; meses: number[] }[] {
    const anoAtual = new Date().getFullYear()
    const mesAtual = new Date().getMonth()
    const nomeNorm = cat.nome.trim().toLowerCase()
    const descNorm = (cat.descricao ?? '').trim().toLowerCase()

    const mesmaCat = (c: PlanoCat) =>
      (c.id && cat.id && c.id === cat.id) ||
      (c.nome.trim().toLowerCase() === nomeNorm &&
       (c.descricao ?? '').trim().toLowerCase() === descNorm)

    const porAno = new Map<number, Set<number>>()
    // So o plano vigente. planosReal virou historico inerte na migracao para
    // plano unico — bloquear exclusao por causa dele travaria por dado morto.
    for (const fonte of [planos]) {
      for (const [anoStr, pd] of Object.entries(fonte)) {
        const ano = Number(anoStr)
        if (ano < anoAtual) continue
        // no ano corrente so contam os meses depois do atual
        const limite = ano === anoAtual ? mesAtual : -1
        const lista = cat.tipo === 'entrada' ? (pd.entradas ?? []) : (pd.saidas ?? [])
        for (const c of lista) {
          if (!mesmaCat(c)) continue
          c.v.forEach((valor, i) => {
            if (i > limite && valor !== 0) {
              const s = porAno.get(ano) ?? new Set<number>()
              s.add(i)
              porAno.set(ano, s)
            }
          })
        }
      }
    }
    return [...porAno.entries()]
      .map(([ano, s]) => ({ ano, meses: [...s].sort((a, b) => a - b) }))
      .sort((a, b) => a.ano - b.ano)
  }

  /** Bloqueia e orienta quando a categoria ainda tem planejamento futuro. */
  function bloqueadoPorPlanejamento(cat: Categoria, acao: 'excluir' | 'desativar'): boolean {
    const futuros = planejamentoFuturo(cat)
    if (futuros.length === 0) return false
    const rotulo = cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome
    const onde = futuros
      .map(({ ano, meses }) => `${ano} (${meses.map(m => MESES_CURTOS_CFG[m]).join(', ')})`)
      .join(' · ')
    confirmar({
      titulo: `Não é possível ${acao}`,
      mensagem:
        `"${rotulo}" ainda tem planejamento em meses futuros. Abra o Planejamento, ` +
        `zere os valores desta categoria nesses meses e tente ${acao} de novo.`,
      detalhe: `Meses planejados: ${onde}`,
      apenasFechar: true,
      onConfirmar: fecharConfirm,
    })
    return true
  }

  function excluirCategoria(id: string) {
    const cat = categorias.find(c => c.id === id)
    if (!cat) return
    if (bloqueadoPorPlanejamento(cat, 'excluir')) return
    confirmar({
      titulo: 'Excluir categoria?',
      mensagem: 'Esta ação não pode ser desfeita.',
      detalhe: cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome,
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
    if (cat.ativa && bloqueadoPorPlanejamento(cat, 'desativar')) return
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
      <PrimeirosPassos />

      {/* TELA DE ÍCONES — as opções do menu, na mesma ordem */}
      {aba === 'home' && (() => {
        const nBancos = contas.filter(c => c.tipo !== 'cartao').length
        const nCartoes = contas.filter(c => c.tipo === 'cartao').length
        const nAtivas = categorias.filter(c => c.ativa).length
        const nGrupos = new Set(categorias.filter(c => c.ativa).map(c => c.grupo).filter(Boolean)).size
        const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
        const cards = [
          { icon:'ti-building-bank', label:'Minhas contas', aba:'bancos', desc:'Bancos e poupanças onde está o seu dinheiro',
            status: nBancos ? plural(nBancos, 'conta', 'contas') : 'Nenhuma ainda', ok: nBancos > 0 },
          { icon:'ti-credit-card', label:'Cartões', aba:'cartoes', desc:'Cartões de crédito, fechamento e vencimento da fatura',
            status: nCartoes ? plural(nCartoes, 'cartão', 'cartões') : 'Opcional', ok: nCartoes > 0 },
          { icon:'ti-tags', label:'Categorias', aba:'categorias', desc:'Os tipos de receita e de gasto que você usa',
            status: nAtivas ? plural(nAtivas, 'ativa', 'ativas') : 'Nenhuma ativa', ok: nAtivas > 0 },
          { icon:'ti-folders', label:'Grupos', aba:'grupos', desc:'Como as categorias se juntam no Radar e no plano',
            status: nGrupos ? plural(nGrupos, 'grupo', 'grupos') : '', ok: false },
          { icon:'ti-user-circle', label:'Perfil', aba:'perfil', desc:'Seu nome, digital, senha e compartilhamento',
            status: '', ok: false },
          { icon:'ti-adjustments-horizontal', label:'Preferências', aba:'preferencias', desc:'Cenário da previsão, alertas e ajustes do app',
            status: '', ok: false },
        ]
        return (
          <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '12px 12px 120px' : 20 }}>
            <PageHeader icon="ti-settings" breadcrumb="Minha conta" title="Configurações"
              subtitle="Tudo o que você cadastra no app mora aqui" ajuda="configuracoes" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: isMobile ? 14 : 18,
              width:'100%' }}>
              {cards.map(card => (
                // Caixas no azul-escuro dos cartões do app (#0f2878 → #1e40af,
                // a regra do #1e40af): branco 10,4:1, descrição a 75% 5,1:1,
                // selo verde #86efac 4,8:1 no pior caso.
                <button key={card.label} onClick={() => navigate(`/configuracoes?aba=${card.aba}`)} style={{
                  background:'linear-gradient(135deg, #0f2878 0%, #1e40af 100%)', borderRadius:20,
                  padding: isMobile ? '18px 8px 14px' : '24px 18px 20px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap: isMobile ? 10 : 8,
                  border:'none', boxShadow:'0 8px 20px rgba(15,40,120,.22)',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'center',
                }}>
                  <span aria-hidden style={{ width: isMobile ? 46 : 56, height: isMobile ? 46 : 56, borderRadius:16,
                    background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className={`ti ${card.icon}`} style={{ color:'#fff', fontSize: isMobile ? 24 : 30 }} />
                  </span>
                  <span style={{ fontSize: isMobile ? 13 : 16, fontWeight:700, color:'#fff' }}>{card.label}</span>
                  {!isMobile && (
                    <span style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.4 }}>{card.desc}</span>
                  )}
                  {!isMobile && card.status && (
                    <span style={{ marginTop:4, fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:999,
                      background:'rgba(15,23,42,.35)',
                      color: card.ok ? '#86efac' : '#ffffff' }}>
                      {card.ok ? '✓ ' : ''}{card.status}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* VOLTAR para a tela de ícones */}
      {aba !== 'home' && (
        <div style={{ background:COR.branco, borderBottom:`1px solid ${COR.borda}`,
          padding: isMobile ? '10px 16px' : '10px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <button onClick={() => navigate('/configuracoes')} style={{
            border:'none', background:'transparent', color:COR.azul,
            fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
            ‹ {isMobile ? 'Voltar' : 'Configurações'}
          </button>
          <span style={{ fontSize:14, fontWeight:700, color:COR.texto, marginLeft:4 }}>
            <i aria-hidden className={`ti ${aba === 'bancos' ? 'ti-building-bank'
              : aba === 'cartoes' ? 'ti-credit-card'
              : aba === 'categorias' ? (subAbaCat === 'grupos' ? 'ti-folders' : 'ti-tag')
              : aba === 'perfil' ? 'ti-user-circle' : 'ti-adjustments-horizontal'}`} style={{ fontSize: 16, verticalAlign: '-2px', marginRight: 6 }} />
            {aba === 'bancos' ? 'Minhas contas'
              : aba === 'cartoes' ? 'Cartões'
              : aba === 'categorias' ? (subAbaCat === 'grupos' ? 'Grupos' : 'Categorias')
              : aba === 'perfil' ? 'Perfil' : 'Preferências'}
          </span>
        </div>
      )}

      {(aba === 'bancos' || aba === 'cartoes' || aba === 'categorias' || aba === 'preferencias') && <AvisoSoAdministrador style={{ margin: '0 0 12px' }} />}

      {/* CONTEÚDO */}
      {aba !== 'home' && (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '12px 12px 120px' : 20, gap:16 }}>

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
              faturaStr={faturaStr}
              setFaturaStr={setFaturaStr}
              contaFavoritaId={contaFavoritaId}
              saldoInicialDinheiro={saldoInicialDinheiro}
              onSaveSaldoDinheiro={salvarSaldoInicialDinheiro}
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
              cenarioPrevisao={cenarioPrevisao}
              setCenarioPrevisao={setCenarioPrevisao}
              navigate={navigate}
            />
          )}

        </div>
      )}

      {/* Modal confirmação de exclusão de conta */}
      {modalExcluirConta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
          zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="excluir-conta-titulo" style={{ background:COR.branco, borderRadius:16, overflow:'hidden',
            maxWidth:420, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
            <ModalTopo icone="ti-trash" rotulo="Perfil" titulo="Excluir conta permanentemente" id="excluir-conta-titulo"
              onFechar={deletando ? undefined : () => setModalExcluirConta(false)} />
            <div style={{ padding:'18px 24px 22px' }}>
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
