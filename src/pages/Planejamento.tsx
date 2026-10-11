import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import AvisoSoAdministrador from '../components/compartilhar/AvisoSoAdministrador'
import { SeletorAno } from '../components/SeletorMesAno'
import { usePlanejamento } from '../components/planejamento/usePlanejamento'
import { COR } from '../components/planejamento/types'
import { useApp } from '../context/AppContext'
import DescobertaBanner from '../components/DescobertaBanner'
import DescobertaModal from '../components/DescobertaModal'
import { jaViu, marcarVisto } from '../utils/vistoNaConta'
import PrimeiroPlanoModal from '../components/PrimeiroPlanoModal'
import { medirDescoberta } from '../utils/descoberta'
import { propostaDoMes } from '../utils/primeiroPlano'
import PlanGrade from '../components/planejamento/PlanGrade'
import PlanMobile from '../components/planejamento/PlanMobile'
import PlanItensEditor from '../components/planejamento/PlanItensEditor'
import { ItensPlanoContexto, LancadoNoMesContexto, type AbrirItens, type LancadoNoMes } from '../components/planejamento/itensContexto'
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
import { jaLancadoNosMeses } from '../utils/historicoDaCategoria'
import { compraDoItem, renomearNaFatura, renomearNosPlanos, type CompraRef } from '../utils/renomearCompra'
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
    setPlanos, faturaData, setFaturaData, categorias, saldoInicialDinheiro, cenarioPrevisao } = useApp()

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
        const r = mudarLinhaDoPlano(novo[a], tipo === 'e' ? 'entrada' : 'saida', cat, l => doAno.reduce((acc, m) => fn(acc, m), l), categorias)
        if (r) novo[a] = r
      }
      return novo
    })
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
    const real = pickReal(p.tipo === 'entrada' ? entradasMap : saidasMap, p.nome, p.descricao, categorias)?.total ?? 0
    setAjuste({ ...p, mes, real })
  }, [anoAtual, plan.mesAtual, extratoData, faturaData, contas, categorias, planos])

  // Mês FUTURO com algo já lançado (parcelas da fatura): a célula abre o
  // editor com o lançado e pede só o que ainda vai ser gasto. Um
  // construirRealizadoMes por mês futuro do ano, uma vez por mudança de dado.
  const hojeIdx = new Date().getFullYear() * 12 + new Date().getMonth()
  const lancadoNoMes = useMemo<LancadoNoMes>(() => {
    const mapas = new Map<number, ReturnType<typeof construirRealizadoMes>>()
    return (tipo, ri, mi) => {
      if (anoAtual * 12 + mi <= hojeIdx) return 0
      const cat = (tipo === 'e' ? dadosAtivos.entradas : dadosAtivos.saidas)[ri]
      if (!cat) return 0
      let m = mapas.get(mi)
      if (!m) {
        m = construirRealizadoMes({ ano: anoAtual, mes: mi, extratoData: extratoData as Record<string, DadosMes>,
          faturaData, contas, categorias, planoAno: planos[anoAtual] })
        mapas.set(mi, m)
      }
      return pickReal(tipo === 'e' ? m.entradasMap : m.saidasMap, cat.nome, cat.descricao, categorias)?.total ?? 0
    }
  }, [anoAtual, hojeIdx, dadosAtivos, extratoData, faturaData, contas, categorias, planos])

  // A fase e DERIVADA: onboarding feito e nenhum plano em lugar nenhum. Ver
  // utils/descoberta — nao existe campo guardado que possa discordar disso.
  const descoberta = useMemo(() => medirDescoberta({
    onboardingCompleto, planos, extratoData, contas,
  }), [onboardingCompleto, planos, extratoData, contas])

  // A explicação da fase abre só pelo "Como funciona" da faixa. Até
  // 11/10/2026 ela abria sozinha na primeira entrada, com o "visto" no
  // navegador — noutro computador abria de novo. A faixa já diz o que está
  // acontecendo; a explicação fica a um toque.
  const [verIntro, setVerIntro] = useState(false)
  const fecharIntro = useCallback(() => setVerIntro(false), [])

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
    ? `proposta:${descoberta.mesBase.ano}-${descoberta.mesBase.mes}`
    : ''

  // Abre sozinha UMA vez por mês-base. É o momento que a fase inteira
  // prometeu; deixá-lo atrás de um clique seria esconder a entrega. Depois
  // disso, só pelo botão da faixa.
  useEffect(() => {
    if (propostaAvaliada.current || !chaveProposta || !proposta) return
    propostaAvaliada.current = true
    // O "visto" mora na conta (utils/vistoNaConta); a chave antiga, deste
    // navegador, vale para quem já tinha visto antes da mudança.
    let vistoAntigo = false
    try { vistoAntigo = localStorage.getItem(`compass:proposta:${user?.id}:${chaveProposta.slice(9)}`) === '1' } catch { /* aba anônima */ }
    if (!vistoAntigo && !jaViu(user, chaveProposta)) setVerProposta(true)
  }, [chaveProposta, proposta, user])

  const fecharProposta = useCallback(() => {
    setVerProposta(false)
    if (chaveProposta) void marcarVisto(user, chaveProposta)
  }, [chaveProposta, user])

  const dialogos = (
    <>
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
          categorias={categorias} onFechar={() => setRevisando(false)}
 />
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
        // Parcelas de compra lançada: o nome pode ser trocado para a compra
        // inteira (utils/renomearCompra). Só parcelado.
        // O já lançado no mês: em mês futuro, o piso do plano (lançado + a gastar).
        const ja = jaLancadoNosMeses(depsAjuste, tipo === 'e' ? 'entrada' : 'saida', cat.nome, cat.descricao, [{ ano: anoAtual, mes: mi }])[0]?.itens ?? []
        const compras: Record<string, CompraRef> = {}
        for (const i of itens ?? []) { const r = compraDoItem(i, ja); if (r) compras[i.id] = r }
        return (
          <PlanItensEditor
            key={`${tipo}-${ri}-${mi}`}
            nome={nomeExibicao(cat)} grupo={cat.grupo} mes={mi}
            valorAtual={cat.v[mi] ?? 0} itens={itens} partes={partes}
            onSalvar={(novos, meses) => { plan.editarItens(tipo, ri, meses, novos); fechar() }}
            onTirar={itens ? () => { plan.editarItens(tipo, ri, [mi], null); fechar() } : undefined}
            onFechar={fechar}
            compras={compras}
            jaLancado={ja} futuro={anoAtual * 12 + mi > hojeIdx}
            onSalvarValor={v => { plan.editarValor(tipo, ri, mi, v); fechar() }}
            onRenomear={(ref, antigo, novo) => {
              setFaturaData(f => renomearNaFatura(f, ref, novo))
              setPlanos(p => renomearNosPlanos(p, cat.nome, antigo, ref.total, novo))
              toast(`"${novo}" nas ${ref.total} parcelas da compra.`, 'success')
            }}
          />
        )
      })()}

    </>
  )

  // Celular: uma tela própria no padrão do kit mobile (PlanMobile), com as
  // mesmas fontes de número e a mesma gravação da Grade.
  if (isMobile) return (
    <>
      <ItensPlanoContexto.Provider value={abrirItens}><LancadoNoMesContexto.Provider value={lancadoNoMes}>
      <AjustePlanoContexto.Provider value={abrirAjuste}>
        <PlanMobile
          anoAtual={anoAtual}
          setAnoAtual={setAnoAtual}
          mesAtual={plan.mesAtual}
          dadosPrevisto={plan.dadosPrevistoFinal}
          dadosAnoAnterior={plan.planoAnoAnterior}
          previsto={plan.previsto}
          hasFaturaCat={plan.hasFaturaCat}
          categorias={plan.categorias}
          onSave={handleSave}
          onBulkSave={handleBulkSave}
          objetivos={plan.objetivos}
          sobraPrevista={sobraPrevista}
          onMetaSave={plan.editarMetas}
          descoberta={descoberta}
          fechamentoReal={plan.saldoFinalReal}
          avisos={<>
            <AvisoSoAdministrador />
            {descoberta.ativa && (
              <DescobertaBanner d={descoberta}
                onComoFunciona={() => setVerIntro(true)} onVerProposta={() => setVerProposta(true)} />
            )}
            {lancadoAcima.length > 0 && <RevisaoPlanoFaixa acima={lancadoAcima} onRevisar={() => setRevisando(true)} />}
          </>}
        />
      </AjustePlanoContexto.Provider>
      </LancadoNoMesContexto.Provider></ItensPlanoContexto.Provider>
      {dialogos}
    </>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: COR.fundo,
      fontFamily: "-apple-system, 'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* PageHeader */}
      {(
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <PageHeader
            icon="ti-target"
            breadcrumb="TODO ANO"
            title="Planejamento"
            ajuda="planejamento"
            mb={12}
            rightContent={<SeletorAno ano={anoAtual} onChange={setAnoAtual} />}
          />
        </div>
      )}

      <AvisoSoAdministrador style={{ margin: '8px 16px 0', flexShrink: 0 }} />

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

        {lancadoAcima.length > 0 && (
          <div style={{ padding: isMobile ? '10px 12px 0' : '0 20px 12px' }}>
            <RevisaoPlanoFaixa acima={lancadoAcima} onRevisar={() => setRevisando(true)} />
          </div>
        )}

        <ItensPlanoContexto.Provider value={abrirItens}><LancadoNoMesContexto.Provider value={lancadoNoMes}>
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
        </LancadoNoMesContexto.Provider></ItensPlanoContexto.Provider>
      </div>

      {dialogos}
    </div>
  )
}
