import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import { SeletorAno } from '../components/SeletorMesAno'
import { usePlanejamento } from '../components/planejamento/usePlanejamento'
import { COR } from '../components/planejamento/types'
import { useApp } from '../context/AppContext'
import DescobertaBanner from '../components/DescobertaBanner'
import DescobertaModal from '../components/DescobertaModal'
import PrimeiroPlanoModal from '../components/PrimeiroPlanoModal'
import { medirDescoberta } from '../utils/descoberta'
import { propostaDoMes } from '../utils/primeiroPlano'
import PlanGrade from '../components/planejamento/PlanGrade'
import PlanItensEditor from '../components/planejamento/PlanItensEditor'
import { ItensPlanoContexto, type AbrirItens } from '../components/planejamento/itensContexto'
import { itensDoMes } from '../utils/itensPlano'
import { nomeExibicao } from '../components/planejamento/types'
import { AjustePlanoContexto, type AbrirAjuste } from '../components/acompanhamento/ajustePlanoContexto'
import AjustePlanoRadar, { type AjusteAberto } from '../components/acompanhamento/AjustePlanoRadar'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { pickReal, cadastroDaLinha } from '../components/acompanhamento/evolucaoCalcs'
import RepetirValorDialog from '../components/planejamento/RepetirValorDialog'
import { mesesParaRepetir, separarDestinos, rotuloParcela, nomeDoMes, type MesRef } from '../utils/recorrencia'
import { useToast } from '../components/Toast'
import RevisaoPlanoFaixa from '../components/acompanhamento/RevisaoPlanoFaixa'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { lancadoAcimaDoPlano } from '../utils/lancadoAcimaDoPlano'
import { acharLinhaDoPlano, mudarLinhaDoPlano } from '../utils/linhaDoPlano'
import { comItens, comValor, novoIdItem } from '../utils/itensPlano'
import type { Categoria, PlanoCat } from '../context/AppContext'
import type { Deps } from '../utils/saldoConta'
import type { DadosMes } from '../context/AppContext'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

export default function Planejamento() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const anoCorrente = new Date().getFullYear()
  // ?ano= permite cair direto no ano que se quer montar — o Simulador manda
  // para ca quando a compra alcanca um ano sem planejamento.
  const [searchParams] = useSearchParams()
  const [anoAtual, setAnoAtual] = useState(
    () => Number(searchParams.get('ano')) || anoCorrente,
  )

  const plan = usePlanejamento(anoAtual)
  const { planos, extratoData, contas, onboardingCompleto, user,
    setPlanos, faturaData, categorias, saldoInicialDinheiro, cenarioPrevisao } = useApp()

  // Uma tela só (06/10/2026): a Grade. A planilha mora no modal que abre ao
  // clicar num mês (PlanModalMeses), e a Lista saiu. Link antigo com
  // ?modo=painel, ?modo=lista ou ?modo=planilha cai aqui, sem quebrar.

  // Plano unico: nao ha mais aba nem escolha de qual plano editar
  const dadosAtivos = plan.dadosPrevistoFinal

  // A meta e comparada com o resultado do mes: entradas menos saidas.
  const sobraPrevista = plan.previsto.totalEntradas.map(
    (e: number, i: number) => e - plan.previsto.totalSaidas[i])

  // Digitou um valor (utils/recorrencia), em qualquer categoria — fixa ou
  // variável, pedido do Guilherme em 08/10/2026. ANUAL repete sozinho até
  // dezembro, e só pergunta pelos meses que tinham outro
  // valor; TEMPORÁRIA pergunta quantas parcelas. Só quando o valor mudou.
  const { toast } = useToast()
  const [repetir, setRepetir] = useState<{
    tipo: 'e' | 's'; mi: number; valor: number
    cat: { id?: string; nome: string; descricao?: string; grupo?: string; tipoMovimento?: string }
    cad: Categoria
    repetidoAte: MesRef | null
    diferentes: { m: MesRef; atual: number; itens: boolean }[]
  } | null>(null)

  function handleSave(tipo: 'e' | 's', ri: number, mi: number, valor: number) {
    const linha = (tipo === 'e' ? dadosAtivos.entradas : dadosAtivos.saidas)[ri]
    const anterior = linha?.v[mi] ?? 0
    plan.editarValor(tipo, ri, mi, valor)
    if (!linha || Math.abs(anterior - valor) < 0.005) return
    const cad = (linha.id ? categorias.find(c => c.id === linha.id) : undefined)
      ?? cadastroDaLinha({ nome: linha.nome, descricao: linha.descricao ?? '' }, categorias)
    if (!cad) return
    const cat = { id: linha.id ?? cad.id, nome: linha.nome, descricao: linha.descricao, grupo: linha.grupo, tipoMovimento: cad.tipoMovimento }
    if (cad.recorrencia === 'temporaria') {
      setRepetir({ tipo, mi, valor, cat, cad, repetidoAte: null, diferentes: [] })
      return
    }
    // Anual: os meses seguintes, até dezembro.
    const destinos = mesesParaRepetir(anoAtual, mi)
    if (destinos.length === 0) return
    const { livres, diferentes } = separarDestinos(destinos.map(m => {
      const l = linhaEm(tipo, cat, m)
      return { m, v: l?.v[m.mes] ?? 0, itens: !!(l && itensDoMes(l, m.mes)) }
    }), anterior, valor)
    const repetidoAte = livres.length ? livres[livres.length - 1] : null
    if (livres.length) gravarMeses(tipo, cat, livres, (l, m) => comValor(l, m.mes, valor))
    if (diferentes.length) setRepetir({ tipo, mi, valor, cat, cad, repetidoAte, diferentes })
    else if (repetidoAte) toast(`Repetido até ${nomeDoMes(repetidoAte, anoAtual)}`, 'info')
  }

  /** A linha da categoria no plano CRU de um ano (para ler o valor de outro mês). */
  function linhaEm(tipo: 'e' | 's', cat: NonNullable<typeof repetir>['cat'], m: MesRef): PlanoCat | undefined {
    const lista = (tipo === 'e' ? planos[m.ano]?.entradas : planos[m.ano]?.saidas) ?? []
    const i = acharLinhaDoPlano(lista, cat)
    return typeof i === 'number' ? lista[i] : undefined
  }

  /** Grava meses de um ou mais anos, cada um no plano dele. */
  function gravarMeses(tipo: 'e' | 's', cat: NonNullable<typeof repetir>['cat'], meses: MesRef[], fn: (l: PlanoCat, m: MesRef) => PlanoCat) {
    setPlanos(prev => {
      const novo = { ...prev }
      for (const a of [...new Set(meses.map(m => m.ano))]) {
        const doAno = meses.filter(m => m.ano === a)
        const r = mudarLinhaDoPlano(novo[a], tipo === 'e' ? 'entrada' : 'saida', cat, l => doAno.reduce((acc, m) => fn(acc, m), l))
        if (r) novo[a] = r
      }
      return novo
    })
  }

  const BTN_ANO_MOB: React.CSSProperties = {
    border: 'none', background: '#f1f5f9', borderRadius: 6, cursor: 'pointer',
    padding: '5px 8px', color: COR.textoSuave, fontSize: 11, lineHeight: 1,
  }


  function handleBulkSave(ops: Parameters<typeof plan.editarMultiplosValores>[0]) {
    plan.editarMultiplosValores(ops)
  }

  // O editor de itens de uma célula (Mercado = Supermercado + Feira). Lista,
  // Painel e o modal da Grade abrem por contexto; aqui ele é desenhado uma vez.
  const [itensAbertos, setItensAbertos] = useState<{ tipo: 'e' | 's'; ri: number; mi: number; partes?: number[] } | null>(null)
  const abrirItens = useCallback<AbrirItens>((tipo, ri, mi, partes) => setItensAbertos({ tipo, ri, mi, partes }), [])

  // O nome da categoria na planilha do modal abre o MESMO ajuste do Radar:
  // já lançado nos próximos meses, média sem parcelas, "mês a mês". O mês de
  // referência é o primeiro que o modal mostra; o realizado dele sai de
  // construirRealizadoMes, como no Radar.
  const depsAjuste = useMemo<Deps>(() => ({
    extratoData: extratoData as Record<string, DadosMes>, faturaData: faturaData as Deps['faturaData'],
    contas, categorias, planos: planos as Deps['planos'], saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])
  const [ajuste, setAjuste] = useState<AjusteAberto | null>(null)

  // Categorias cujo já lançado passa do plano de um mês que ainda não começou
  // — o mesmo aviso da Início e do Radar, com "Revisar agora" abrindo a
  // tabela da revisão (utils/revisaoDoPlano).
  const lancadoAcima = useMemo(() => lancadoAcimaDoPlano(depsAjuste), [depsAjuste])
  const [revisando, setRevisando] = useState(false)
  const abrirAjuste = useCallback<AbrirAjuste>(p => {
    const mes = p.mes ?? plan.mesAtual
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano: anoAtual, mes, extratoData: extratoData as Record<string, DadosMes>,
      faturaData, contas, categorias, planoAno: planos[anoAtual],
    })
    const real = pickReal(p.tipo === 'entrada' ? entradasMap : saidasMap, p.nome, p.descricao)?.total ?? 0
    setAjuste({ ...p, mes, real })
  }, [anoAtual, plan.mesAtual, extratoData, faturaData, contas, categorias, planos])

  // A fase e DERIVADA: onboarding feito e nenhum plano em lugar nenhum. Ver
  // utils/descoberta — nao existe campo guardado que possa discordar disso.
  const descoberta = useMemo(() => medirDescoberta({
    onboardingCompleto, planos, extratoData, contas,
  }), [onboardingCompleto, planos, extratoData, contas])

  // A explicação da fase aparece UMA vez, na primeira entrada sem plano.
  // Depois só pelo "Como funciona" da faixa: um modal que volta a cada visita
  // vira obstáculo, e a tela por trás dele se explica sozinha.
  //
  // O "visto" é por usuário e vive no localStorage — conveniência de leitura
  // de um navegador só, não estado do app. Em aba anônima ou noutro aparelho
  // ele volta, e reaparecer custa um clique; uma coluna no banco custaria
  // migração e mais um estado capaz de discordar dos outros.
  const chaveIntro = `compass:descoberta-intro:${user?.id ?? 'anon'}`
  const [verIntro, setVerIntro] = useState(false)
  const introAvaliada = useRef(false)

  useEffect(() => {
    if (introAvaliada.current || !descoberta.ativa) return
    introAvaliada.current = true
    let visto = false
    try { visto = localStorage.getItem(chaveIntro) === '1' } catch { /* aba anônima */ }
    if (!visto) setVerIntro(true)
  }, [descoberta.ativa, chaveIntro])

  const fecharIntro = useCallback(() => {
    setVerIntro(false)
    try { localStorage.setItem(chaveIntro, '1') } catch { /* aba anônima */ }
  }, [chaveIntro])

  // ── A proposta do primeiro plano ────────────────────────────────────
  //
  // Só existe quando há um mês fechado com registro. O valor de cada linha é
  // o realizado daquele mês, pela MESMA função que alimenta o Radar — ver
  // utils/primeiroPlano.
  const proposta = useMemo(() => {
    if (!descoberta.ativa || !descoberta.mesBase) return null
    return propostaDoMes({
      ano: descoberta.mesBase.ano, mes: descoberta.mesBase.mes,
      extratoData, faturaData, contas, categorias,
    })
  }, [descoberta.ativa, descoberta.mesBase, extratoData, faturaData, contas, categorias])

  const [verProposta, setVerProposta] = useState(false)
  const propostaAvaliada = useRef(false)
  const chaveProposta = descoberta.mesBase
    ? `compass:proposta:${user?.id ?? 'anon'}:${descoberta.mesBase.ano}-${descoberta.mesBase.mes}`
    : ''

  // Abre sozinha UMA vez por mês-base. É o momento que a fase inteira
  // prometeu; deixá-lo atrás de um clique seria esconder a entrega. Depois
  // disso, só pelo botão da faixa.
  useEffect(() => {
    if (propostaAvaliada.current || !chaveProposta || !proposta) return
    propostaAvaliada.current = true
    let visto = false
    try { visto = localStorage.getItem(chaveProposta) === '1' } catch { /* aba anônima */ }
    if (!visto) setVerProposta(true)
  }, [chaveProposta, proposta])

  const fecharProposta = useCallback(() => {
    setVerProposta(false)
    try { if (chaveProposta) localStorage.setItem(chaveProposta, '1') } catch { /* aba anônima */ }
  }, [chaveProposta])

  return (
    <div style={{
      minHeight: '100vh',
      background: COR.fundo,
      fontFamily: "-apple-system, 'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {isMobile && <AppHeader currentPath={location.pathname} />}

      {/* PageHeader — desktop only */}
      {!isMobile && (
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <PageHeader
            icon="ti-target"
            breadcrumb="TODO ANO"
            title="Planejamento"
            mb={12}
            rightContent={<SeletorAno ano={anoAtual} onChange={setAnoAtual} />}
          />
        </div>
      )}

      {/* Mobile: o ano */}
      {isMobile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '8px 12px', background: COR.branco, borderBottom: `1px solid ${COR.borda}`,
        }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: COR.texto }}>Planejamento</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={() => setAnoAtual(a => a - 1)} aria-label="Ano anterior" style={BTN_ANO_MOB}>◄</button>
            <span style={{ fontSize: 13, fontWeight: 800, color: COR.texto, minWidth: 38,
              textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{anoAtual}</span>
            <button onClick={() => setAnoAtual(a => a + 1)} aria-label="Próximo ano" style={BTN_ANO_MOB}>►</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* A faixa da fase, acima de qualquer visao: e ela que troca doze
            cartoes cinzas dizendo "Sem Planejamento" por um progresso. */}
        {descoberta.ativa && (
          <div style={{ padding: isMobile ? '10px 12px 0' : '0 20px' }}>
            <DescobertaBanner
              d={descoberta}
              onComoFunciona={() => setVerIntro(true)}
              onVerProposta={() => setVerProposta(true)}
            />
          </div>
        )}

        {/* A explicação da fase só faz sentido enquanto ainda se observa. Com
            o mês fechado, quem manda é a proposta. */}
        {verIntro && descoberta.ativa && !descoberta.mesBase && (
          <DescobertaModal
            d={descoberta}
            onFechar={fecharIntro}
            onMontarPlano={() => { fecharIntro(); navigate('/wizard-planejamento') }}
          />
        )}

        {verProposta && proposta && (
          <PrimeiroPlanoModal
            proposta={proposta}
            mesInicio={new Date().getMonth()}
            onFechar={fecharProposta}
            onCriar={p => {
              // O plano nasce no ano CORRENTE, não no ano do mês-base: um
              // plano é do ano que ele cobre, e a cobertura começa hoje.
              setPlanos(prev => ({ ...prev, [anoCorrente]: p }))
              fecharProposta()
              setAnoAtual(anoCorrente)
            }}
          />
        )}

        {lancadoAcima.length > 0 && (
          <div style={{ padding: isMobile ? '10px 12px 0' : '0 20px 12px' }}>
            <RevisaoPlanoFaixa acima={lancadoAcima} onRevisar={() => setRevisando(true)} />
          </div>
        )}

        <ItensPlanoContexto.Provider value={abrirItens}>
        <AjustePlanoContexto.Provider value={abrirAjuste}>
          <PlanGrade
            descoberta={descoberta}
            anoAtual={anoAtual}
            mesAtual={plan.mesAtual}
            dadosPrevisto={plan.dadosPrevistoFinal}
            dadosAnoAnterior={plan.planoAnoAnterior}
            previsto={plan.previsto}
            planoRef={plan.planoRef}
            categorias={plan.categorias}
            hasFaturaCat={plan.hasFaturaCat}
            somaCartaoMes={plan.somaCartaoMes}
            onSave={handleSave}
            onBulkSave={handleBulkSave}
            objetivos={plan.objetivos}
            sobraPrevista={sobraPrevista}
            onMetaSave={plan.editarMetas}
            fechamentoReal={plan.saldoFinalReal}
          />
        </AjustePlanoContexto.Provider>
        </ItensPlanoContexto.Provider>
      </div>

      {repetir && (() => {
        const { tipo, mi, valor, cat, cad, repetidoAte, diferentes } = repetir
        const nome = cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome
        const temporaria = cad.recorrencia === 'temporaria'
        // Temporária: o último mês pode ser qualquer um adiante, nos anos que
        // têm plano (até 23 parcelas).
        const candidatos: MesRef[] = []
        if (temporaria) for (let n = anoAtual * 12 + mi + 1; candidatos.length < 23; n++) {
          const m = { ano: Math.floor(n / 12), mes: n % 12 }
          if (!planos[m.ano] && m.ano !== anoAtual) break
          candidatos.push(m)
        }
        const fechar = () => setRepetir(null)
        return (
          <RepetirValorDialog nome={nome} tipo={temporaria ? 'temporaria' : 'anual'} ano={anoAtual} mes={mi} valor={valor}
            repetidoAte={repetidoAte} diferentes={diferentes} candidatos={candidatos}
            onAlterar={meses => { gravarMeses(tipo, cat, meses, (l, m) => comValor(l, m.mes, valor)); fechar() }}
            onParcelas={ultimo => {
              // Do mês digitado até o escolhido, cada um com a sua parcela.
              const meses: MesRef[] = []
              for (let n = anoAtual * 12 + mi; n <= ultimo.ano * 12 + ultimo.mes; n++) meses.push({ ano: Math.floor(n / 12), mes: n % 12 })
              const total = meses.length
              gravarMeses(tipo, cat, meses, (l, m) => {
                const k = meses.findIndex(x => x.ano === m.ano && x.mes === m.mes) + 1
                return comItens(l, [m.mes], [{ id: novoIdItem(), descricao: rotuloParcela(cat.nome, k, total), valor }])
              })
              fechar()
            }}
            onFechar={fechar} />
        )
      })()}

      {revisando && (
        <RevisaoPlanoDialog acima={lancadoAcima} deps={depsAjuste} planos={planos} setPlanos={setPlanos}
          categorias={categorias} onFechar={() => setRevisando(false)} />
      )}

      {ajuste && (
        <AjustePlanoRadar ajuste={ajuste} setAjuste={setAjuste} planos={planos} setPlanos={setPlanos}
          ano={anoAtual} mes={ajuste.mes ?? plan.mesAtual} categorias={categorias} deps={depsAjuste} />
      )}

      {itensAbertos && (() => {
        const { tipo, ri, mi, partes } = itensAbertos
        const cat = (tipo === 'e' ? dadosAtivos.entradas : dadosAtivos.saidas)[ri]
        if (!cat) return null
        const itens = itensDoMes(cat, mi)
        const fechar = () => setItensAbertos(null)
        return (
          <PlanItensEditor
            key={`${tipo}-${ri}-${mi}`}
            nome={nomeExibicao(cat)} grupo={cat.grupo} mes={mi}
            valorAtual={cat.v[mi] ?? 0} itens={itens} partes={partes}
            onSalvar={(novos, meses) => { plan.editarItens(tipo, ri, meses, novos); fechar() }}
            onTirar={itens ? () => { plan.editarItens(tipo, ri, [mi], null); fechar() } : undefined}
            onFechar={fechar}
          />
        )
      })()}

      {isMobile && <BottomNav />}
    </div>
  )
}
