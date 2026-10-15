import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useApp } from '../../context/AppContext'
import type { DadosMes, PlanoAnoData } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { parseValor } from '../../utils/moeda'
import {
  simularCompra, fimDoPlanejamento, parcelasQueOPlanoCobre, diagnosticar,
  serieBaseDoPlano,
  type PontoFluxo, type ResultadoCompra,
} from '../../utils/simulacaoCompra'
import { compararOpcoes, opcoesPadrao, precoAVista, editarOpcao, resemear, type Opcao } from '../../utils/comparativoCompra'
import SimComparativo from './SimComparativo'
import IncluirNoPlano from './IncluirNoPlano'
import { incluirNoPlano, parcelasDesde, dividirEmParcelas, novoIdSimulacao, resumoDasParcelas } from '../../utils/simuladorNoPlano'
import type { Categoria } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import { medirDescoberta } from '../../utils/descoberta'
import { metaNaSimulacao, type MetaNaSimulacao } from '../../utils/metaNaSimulacao'
import { previstoDoAno, type CtxPlano } from '../planejamento/previstoDoAno'
import { NOMES_MESES } from '../novoLancamentoExtrato/NleShared'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
  'Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })


const inputSt: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: `1px solid ${COR.borda}`,
  borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: COR.branco, color: COR.texto,
}
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 7,
}
const card: React.CSSProperties = {
  background: COR.branco, border: `.5px solid ${COR.borda}`, borderRadius: 12, padding: '20px 22px',
}

/**
 * O card do FORMULÁRIO e da tabela é azul; os campos dentro dele seguem
 * brancos com texto escuro.
 *
 * É um estilo à parte, e não o `card` de cima, porque aquele também veste a
 * Resposta, o estado sem plano e a caixa de aviso — três blocos cujo conteúdo
 * foi escrito para fundo claro. Pintar o compartilhado quebraria os três.
 *
 * Medido sobre `#1e40af`, o extremo mais claro do gradiente: branco 8,72:1,
 * `#86efac` 6,21:1, `#fecaca` 6,03:1, `#fde047` 6,62:1. O gradiente não pode
 * clarear além de `#1e40af` — é a regra do CLAUDE.md, e sobre `#1a56db` o
 * verde cairia para 4,40:1.
 */
const cardAzul: React.CSSProperties = {
  background: `linear-gradient(160deg, ${COR.azulEscuro} 0%, #1e40af 100%)`,
  border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '20px 22px',
  // Sem isto, no celular a tabela (460px) alargava o card além da tela.
  minWidth: 0,
}

/**
 * "Posso comprar isso?"
 *
 * Ao contrário das outras duas abas, esta lê o planejamento e os saldos reais e
 * responde sobre o dinheiro do usuário. Toda a matemática vive em
 * utils/simulacaoCompra — aqui só entra formulário e leitura.
 *
 * A tela é escrita para quem não entende de finanças. Por isso: uma pergunta
 * por vez, a resposta em uma frase e UM número grande, os meses como
 * semáforo, e a planilha só para quem pedir. A primeira versão empilhava
 * veredito, gráfico e tabela de quatro colunas — tudo correto e ilegível.
 */
export default function SimCompra({ isMobile }: { isMobile: boolean }) {
  const { contas, categorias, planos, setPlanos, extratoData, faturaData, saldoInicialDinheiro,
    cenarioPrevisao, onboardingCompleto } = useApp()
  const navigate = useNavigate()
  const hoje = new Date()

  const [nome, setNome]         = useState('')
  const [valorStr, setValorStr] = useState('')

  const [ondeId, setOndeId]     = useState('')          // '' = débito/PIX
  const [inicio, setInicio]     = useState(0)           // meses a partir de hoje
  const [guardarStr, setGuardar] = useState('')
  const [maisOpcoes, setMaisOpcoes] = useState(false)
  const [erro, setErro]         = useState('')
  /**
   * Compra parcelada (a tabela de opções do vendedor) ou gasto FIXO todo mês —
   * a mensalidade da academia, a escola, uma assinatura. Pedido do Guilherme
   * em 15/10/2026. Na mensalidade ninguém compara formas de pagamento: o dado
   * é quanto sai por mês e por quanto tempo.
   */
  const [modo, setModo]         = useState<'parcelada' | 'mensal'>('parcelada')
  const [mensalStr, setMensal]  = useState('')
  const [mesesStr, setMeses]    = useState('')

  const cartoes = contas.filter(c => c.tipo === 'cartao')
  const valorNum = parseValor(valorStr) ?? 0
  const guardarNum = parseValor(guardarStr) ?? 0

  // ── A tabela de formas de pagamento ─────────────────────────────────
  const [opcoes, setOpcoes] = useState<Opcao[]>(() => opcoesPadrao(0))
  const [selecionada, setSelecionada] = useState<string | null>(null)

  // Trocar o valor da compra re-semeia as linhas AUTOMÁTICAS e preserva as
  // que o usuário digitou: o que o vendedor disse é dado real e não pode ser
  // sobrescrito por um palpite de divisão igual. Vale para qualquer
  // quantidade, não só as quatro com que a tabela abre — o 10× também.
  useEffect(() => { setOpcoes(prev => resemear(prev, valorNum)) }, [valorNum])

  // O planejamento e o horizonte: nada aqui extrapola. Comprar mais tarde ou
  // no cartao que vence antes de fechar come meses desse teto.
  const inicioCompra = new Date(hoje.getFullYear(), hoje.getMonth() + inicio, 1)
  // A mesma medida que o Planejamento usa. Derivada, nunca guardada.
  const descoberta = useMemo(() => medirDescoberta({
    onboardingCompleto, planos, extratoData, contas,
  }), [onboardingCompleto, planos, extratoData, contas])

  const fimDoPlano = useMemo(
    () => fimDoPlanejamento(planos as Record<number, PlanoAnoData | undefined>),
    [planos],
  )
  const tetoParcelas = useMemo(
    () => parcelasQueOPlanoCobre(
      planos as Record<number, PlanoAnoData | undefined>,
      { ano: inicioCompra.getFullYear(), mes: inicioCompra.getMonth(), cartaoId: ondeId || undefined },
      contas,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planos, contas, ondeId, inicio],
  )

  const deps: Deps = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>,
    contas, categorias,
    planos: planos as Record<number, PlanoAnoData | undefined>,
    saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])


  // A parte CARA, calculada uma vez e compartilhada por todas as linhas.
  const serie = useMemo(
    () => serieBaseDoPlano(deps, hoje),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deps],
  )

  const linhas = useMemo(() => {
    if (!serie) return []
    return compararOpcoes(opcoes, {
      serie, contas,
      alvo: { ano: inicioCompra.getFullYear(), mes: inicioCompra.getMonth(),
        cartaoId: ondeId || undefined },
      teto: tetoParcelas,
      piso: guardarNum,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serie, opcoes, contas, ondeId, inicio, tetoParcelas, guardarNum])

  const mensalNum = parseValor(mensalStr) ?? 0
  /** Sem prazo, a mensalidade vai até onde o plano alcança. */
  const mesesMensal = Math.min(tetoParcelas, parseInt(mesesStr.replace(/\D/g, ''), 10) || tetoParcelas)

  /**
   * A opção que a resposta mostra. Sem clique nenhum, é a À VISTA — pedido do
   * Guilherme em 15/10/2026: o quadro da direita já abre respondendo, em vez
   * de um convite vazio. É derivada, não guardada: editar a linha escolhida
   * (ou o valor da compra) atualiza a resposta na hora.
   */
  const idEscolhida = selecionada && linhas.some(l => l.opcao.id === selecionada && l.veredito)
    ? selecionada
    : (linhas.find(l => l.opcao.parcelas === 1 && l.veredito) ?? linhas.find(l => l.veredito))?.opcao.id ?? null

  const pedido = useMemo(() => {
    const base = {
      cartaoId: ondeId || undefined,
      ano: inicioCompra.getFullYear(), mes: inicioCompra.getMonth(), piso: guardarNum,
    }
    if (modo === 'mensal') {
      if (mensalNum <= 0 || mesesMensal <= 0) return null
      return { ...base, valorTotal: mensalNum * mesesMensal, parcelas: mesesMensal }
    }
    const l = linhas.find(x => x.opcao.id === idEscolhida)
    if (!l || !l.veredito) return null
    return { ...base, valorTotal: l.total, parcelas: l.opcao.parcelas }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, mensalNum, mesesMensal, linhas, idEscolhida, ondeId, inicio, guardarNum])

  const resultado = useMemo(
    () => (pedido ? simularCompra(pedido, deps, { piso: pedido.piso, hoje }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pedido, deps],
  )

  // Aprovar a compra: ela entra no plano como item de uma categoria, somando
  // ao que já estava planejado (utils/simuladorNoPlano). As parcelas caem no
  // mês da COMPRA em diante — é quando o plano da categoria é consumido, pela
  // mesma regra do realizado; quando a fatura vence é a previsão que resolve.
  const [incluindo, setIncluindo] = useState(false)
  const [incluidoEm, setIncluidoEm] = useState('')
  const parcelasDaCompra = useMemo(
    () => (pedido ? parcelasDesde(pedido.ano, pedido.mes, dividirEmParcelas(pedido.valorTotal, pedido.parcelas)) : []),
    [pedido],
  )
  useEffect(() => { setIncluidoEm('') }, [pedido])

  // A meta de economia com a compra (utils/metaNaSimulacao). O que o plano
  // guarda em cada mês sai da passagem do Planejamento — um ano por vez.
  const meta = useMemo(() => {
    if (!pedido) return null
    const ctx: CtxPlano = {
      anoCorrente: hoje.getFullYear(), mesAtual: hoje.getMonth(), categorias, contas, faturaData,
      planos: planos as Record<number, unknown>,
      saldoInicialFixo: contas.filter(c => (c.tipo === 'corrente' || c.tipo === 'poupanca') && c.incluirNoSaldoInicial !== false)
        .reduce((t, c) => t + c.saldoInicial, 0),
      depsSaldo: deps,
    }
    const anos = new Map<number, ReturnType<typeof previstoDoAno> | null>()
    return metaNaSimulacao(parcelasDaCompra, (ano, mes) => {
      const plano = (planos as Record<number, PlanoAnoData | undefined>)[ano]
      const alvo = plano?.objetivos?.[mes] ?? 0
      if (!plano || alvo <= 0) return null
      if (!anos.has(ano)) anos.set(ano, previstoDoAno(ano, ctx))
      const p = anos.get(ano)!
      return p ? { guarda: p.totalEntradas[mes] - p.totalSaidas[mes], meta: alvo } : null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido, parcelasDaCompra, planos, categorias, contas, faturaData, deps])
  function confirmarInclusao(cat: Categoria, descricao: string) {
    const r = incluirNoPlano(planos, cat, parcelasDaCompra, descricao, novoIdSimulacao())
    setPlanos(r.planos as typeof planos)
    setIncluindo(false)
    const nomeCat = cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome
    setIncluidoEm(`Entrou em ${nomeCat}: ${resumoDasParcelas(r.gravadas)}`)
  }

  /** Clicar numa linha é o gesto de simular: o detalhe abaixo passa a ser dela. */
  function escolher(id: string) {
    const l = linhas.find(x => x.opcao.id === id)
    if (!l || !l.veredito) return
    setSelecionada(id)
    setErro('')
  }

  /**
   * Enter abre o detalhe da opção recomendada.
   *
   * O botão "simular" sumiu junto com o seletor de parcelas: agora a tabela
   * calcula ao vivo e o gesto de escolher É o clique na linha. Enter precisa
   * de um alvo, e a recomendada é a resposta que a tela já deu.
   */
  function simular() {
    if (modo === 'mensal') {
      if (parseValor(mensalStr) === null) return setErro(`"${mensalStr.trim()}" não é um valor`)
      if (mensalNum <= 0) return setErro('Quanto sai por mês? Preencha o valor.')
      if (guardarStr.trim() && parseValor(guardarStr) === null) {
        return setErro(`"${guardarStr.trim()}" não é um valor`)
      }
      return setErro('')
    }
    if (parseValor(valorStr) === null) return setErro(`"${valorStr.trim()}" não é um valor`)
    if (valorNum <= 0) return setErro('Quanto custa? Preencha o valor.')
    if (guardarStr.trim() && parseValor(guardarStr) === null) {
      return setErro(`"${guardarStr.trim()}" não é um valor`)
    }
    setErro('')
    const alvo = linhas.find(l => l.recomendada) ?? linhas.find(l => l.veredito)
    if (alvo) escolher(alvo.opcao.id)
  }

  // Sem nada planejado nao ha o que simular, e inventar seria pior do que nao
  // responder. O convite e a unica coisa util aqui.
  //
  // Mas o convite depende de ONDE ele esta. Quem acabou de comecar nao tem
  // plano porque ainda nao sabe os proprios numeros — mandar "monte o seu
  // planejamento" e pedir de novo a conclusao antes da observacao, e a tela
  // vira uma porta trancada sem dizer quando abre. Na fase de descoberta a
  // resposta e a DATA: o mes que esta sendo medido, e quantos dias faltam.
  if (!fimDoPlano) {
    const emDescoberta = descoberta.ativa
    const faltam = descoberta.diasAteFechar
    const mesObs = NOMES_MESES[descoberta.mesObservado.mes]
    return (
      <div style={{ ...card, textAlign: 'center', padding: '36px 24px' }}>
        <i aria-hidden className="ti ti-calendar-stats" style={{ fontSize: 36, color: COR.azul }} />
        <div style={{ fontSize: 16, fontWeight: 800, color: COR.texto, marginTop: 10 }}>
          {emDescoberta
            ? (faltam <= 0
                ? `${mesObs} fecha hoje — seu plano vem a seguir`
                : `Disponível quando ${mesObs.toLowerCase()} fechar`)
            : 'Antes, monte o seu planejamento'}
        </div>
        <div style={{ fontSize: 14, color: COR.textoSuave, marginTop: 8,
          lineHeight: 1.6, maxWidth: 420, margin: '8px auto 0' }}>
          {emDescoberta
            ? <>Para dizer se uma compra cabe, a conta precisa saber o que entra e o
                que sai nos seus próximos meses — e é o mês que você está registrando
                agora que vai dizer isso.{faltam > 0 && <> Faltam <b style={{ color: COR.texto }}>{faltam} {faltam === 1 ? 'dia' : 'dias'}</b>.</>}</>
            : <>Para dizer se uma compra cabe, a conta precisa saber o que entra e o
                que sai nos seus próximos meses. Sem isso, qualquer resposta seria
                chute.</>}
        </div>
        <button onClick={() => navigate(emDescoberta ? '/lancar' : '/planejamento')} style={{
          marginTop: 20, padding: '12px 22px', border: 'none', borderRadius: 10,
          background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
          color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.3)',
        }}>{emDescoberta ? 'Registrar meus lançamentos' : 'Montar meu planejamento'}</button>
      </div>
    )
  }

  // No desktop a resposta fica ao LADO da tabela, e não embaixo: o ponto da
  // comparação é mexer numa parcela e ver o mês reagir. As duas colunas
  // existem desde o começo — aparecer só depois do primeiro clique faria a
  // tabela encolher e refluir no meio do uso.
  const duasColunas = !isMobile
  return (
    <div style={{
      display: duasColunas ? 'grid' : 'flex',
      gridTemplateColumns: duasColunas ? 'minmax(0,1.35fr) minmax(0,1fr)' : undefined,
      flexDirection: duasColunas ? undefined : 'column',
      alignItems: duasColunas ? 'start' : 'stretch', gap: 16,
    }}>
      <div style={cardAzul}>
        {/* Pílulas: a ativa é branca com texto azul-escuro (14,8:1); a inativa,
            texto branco sobre o azul (8,7:1 no #1e40af). */}
        <div role="tablist" aria-label="Tipo de gasto" style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 12, marginBottom: 18,
          background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.18)',
        }}>
          {([['parcelada', 'Compra parcelada', 'ti-shopping-cart'], ['mensal', 'Gasto mensal', 'ti-repeat']] as const).map(([id, txt, ti]) => {
            const ativo = modo === id
            return (
              <button key={id} role="tab" aria-selected={ativo} onClick={() => { setModo(id); setErro('') }} style={{
                flex: 1, padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
                background: ativo ? COR.branco : 'transparent',
                color: ativo ? COR.azulEscuro : '#fff',
              }}><i aria-hidden className={`ti ${ti}`} style={{ fontSize: 15, verticalAlign: '-2px', marginRight: 6 }} />{txt}</button>
            )
          })}
        </div>

        {modo === 'mensal' ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelSt}>O que é?</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Academia" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Quanto por mês?</label>
              <input value={mensalStr} onChange={e => setMensal(e.target.value)}
                placeholder="R$ 150,00" style={inputSt} inputMode="decimal"
                onKeyDown={e => e.key === 'Enter' && simular()} />
            </div>
            <div>
              <label style={labelSt}>Por quantos meses?</label>
              <input value={mesesStr} onChange={e => setMeses(e.target.value.replace(/\D/g, ''))}
                placeholder="Sem prazo" style={inputSt} inputMode="numeric"
                onKeyDown={e => e.key === 'Enter' && simular()} />
            </div>
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: -6, lineHeight: 1.5 }}>
              {fimDoPlano && (!mesesStr.trim()
                ? <>Sem prazo, a conta vai até o fim do seu planejamento, <b>{MESES[fimDoPlano.mes].toLowerCase()} de {fimDoPlano.ano}</b> ({tetoParcelas} {tetoParcelas === 1 ? 'mês' : 'meses'}).</>
                : Number(mesesStr) > tetoParcelas
                  ? <>Seu planejamento vai até <b>{MESES[fimDoPlano.mes].toLowerCase()} de {fimDoPlano.ano}</b>: a conta olha os {tetoParcelas} meses que ele alcança.</>
                  : <>A conta olha {mesesMensal} {mesesMensal === 1 ? 'mês' : 'meses'} a partir de {MESES[inicioCompra.getMonth()].toLowerCase()}.</>)}
            </div>
          </div>
        ) : (<>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16 }}>
          <div>
            <label style={labelSt}>O que você quer comprar?</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Uma bicicleta" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Quanto custa?</label>
            <input value={valorStr} onChange={e => setValorStr(e.target.value)}
              placeholder="R$ 1.800,00" style={inputSt}
              onKeyDown={e => e.key === 'Enter' && simular()} />
          </div>
        </div>

        <SimComparativo
          linhas={linhas}
          selecionada={idEscolhida}
          onSelecionar={escolher}
          onEditar={(id, campo, valor) => setOpcoes(prev => editarOpcao(prev, id, campo, valor, valorNum))}
          onAdicionar={() => setOpcoes(prev => [...prev, {
            id: `p${Date.now()}`, parcelas: 2, valorParcela: valorNum > 0 ? valorNum / 2 : 0,
          }])}
          onRemover={id => {
            setOpcoes(prev => prev.filter(o => o.id !== id))
            if (selecionada === id) setSelecionada(null)
          }}
          semAVista={valorNum > 0 && precoAVista(opcoes) === null}
          fimDoPlano={fimDoPlano}
          onPlanejarMais={() => fimDoPlano && navigate(`/planejamento?ano=${fimDoPlano.ano + 1}`)}
          isMobile={isMobile}
        />
        </>)}

        <div style={{ marginTop: 18 }}>
          <label style={labelSt}>Como você vai pagar?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[{ id: '', rotulo: 'Débito ou Pix', ti: 'ti-building-bank' },
              ...cartoes.map(c => ({ id: c.id, rotulo: c.apelido || c.banco, ti: '' }))
            ].map(op => {
              const ativo = ondeId === op.id
              return (
                <button key={op.id || 'debito'} onClick={() => setOndeId(op.id)} style={{
                  padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${ativo ? COR.azul : COR.borda}`,
                  background: ativo ? '#eff6ff' : COR.branco,
                  color: ativo ? COR.azul : COR.textoSuave,
                  fontSize: 13, fontWeight: ativo ? 700 : 500, transition: 'all .15s',
                }}>{op.ti && <i aria-hidden className={`ti ${op.ti}`} style={{ fontSize: 15, verticalAlign: '-2px', marginRight: 6 }} />}{op.rotulo}</button>
              )
            })}
          </div>
        </div>

        <button onClick={() => setMaisOpcoes(v => !v)} style={{
          marginTop: 18, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, color: '#fff', fontWeight: 600,
        }}>
          {maisOpcoes ? '▾' : '▸'} Mais opções
        </button>

        {maisOpcoes && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16, marginTop: 14, paddingTop: 16, borderTop: `1px solid ${COR.bordaSuave}` }}>
            <div>
              <label style={labelSt}>{modo === 'mensal' ? 'Quando começa?' : 'Quando você vai comprar?'}</label>
              <select value={inicio} onChange={e => setInicio(Number(e.target.value))} style={inputSt}>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
                  return (
                    <option key={i} value={i}>
                      {i === 0 ? 'Agora' : `Em ${MESES[d.getMonth()]}`}
                      {d.getFullYear() !== hoje.getFullYear() ? ` de ${d.getFullYear()}` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label style={labelSt}>Quer deixar um dinheiro guardado?</label>
              <input value={guardarStr} onChange={e => setGuardar(e.target.value)}
                placeholder="R$ 0,00" style={inputSt}
                onKeyDown={e => e.key === 'Enter' && simular()} />
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 6, lineHeight: 1.5 }}>
                Um valor que você não quer encostar. Sem isso, a conta só evita
                ficar no vermelho.
              </div>
            </div>
          </div>
        )}

        {erro && (
          <div style={{ background: COR.erroFundo, color: COR.erroTexto, borderRadius: 8,
            padding: '9px 13px', fontSize: 13, marginTop: 16 }}>⚠ {erro}</div>
        )}

        {/* Botão azul sobre card azul sumiria. Invertido: fundo branco, texto
            no azul escuro — 14,8:1. */}
        <button onClick={simular} style={{
          marginTop: 18, width: '100%', padding: 14, border: 'none', borderRadius: 10,
          background: COR.branco, color: COR.azulEscuro,
          fontSize: 15, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(0,0,0,.22)',
        }}>Ver se cabe no meu bolso</button>
      </div>

      <div style={duasColunas
        ? { position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 16 }
        : { display: 'flex', flexDirection: 'column', gap: 16 }}>
        {resultado && pedido ? (
          <Resposta
            nome={nome} r={resultado} isMobile={isMobile}
            piso={pedido.piso} mensal={modo === 'mensal'} meta={meta}
            valorTotal={pedido.valorTotal} parcelas={pedido.parcelas}
          />
        ) : duasColunas && (
          <div style={{ ...cardAzul, textAlign: 'center', padding: '40px 24px' }}>
            <i aria-hidden className="ti ti-chart-bar" style={{ fontSize: 32, color: '#fff' }} />
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.85)', marginTop: 10, lineHeight: 1.6 }}>
              Escolha uma opção na tabela para ver o mês a mês.
            </div>
          </div>
        )}
        {resultado && pedido && (
          // Página clara: cartão branco com texto escuro; o verde do "incluído"
          // é sucessoTexto (#15803d), 5,02 no branco.
          <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 12, padding: '14px 16px' }}>
            {incluidoEm ? (
              <div role="status" style={{ fontSize: 13, color: COR.sucessoTexto, fontWeight: 600, lineHeight: 1.5 }}>
                ✓ {incluidoEm}. Para tirar, use “Desfazer” no topo do Simulador.
              </div>
            ) : (
              <button type="button" onClick={() => setIncluindo(true)} style={{
                width: '100%', padding: '11px 16px', borderRadius: 10, border: `1px solid ${COR.borda}`,
                background: COR.branco, color: COR.texto, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}><i aria-hidden className="ti ti-calendar-plus" style={{ fontSize: 15, verticalAlign: '-2px', marginRight: 6 }} />{modo === 'mensal' ? 'Vou pagar — incluir no planejamento' : 'Vou comprar — incluir no planejamento'}</button>
            )}
          </div>
        )}
        {incluindo && (
          <IncluirNoPlano descricaoInicial={nome.trim() || 'Compra'} parcelas={parcelasDaCompra}
            planos={planos as Record<number, PlanoAnoData | undefined>} categorias={categorias} contas={contas}
            onConfirmar={confirmarInclusao} onFechar={() => setIncluindo(false)} />
        )}
      </div>
    </div>
  )
}

// ── Resposta ────────────────────────────────────────────────────────────

type Situacao = 'ok' | 'apertado' | 'falta'

/**
 * O semáforo de um mês.
 *
 * "Apertado" é estar a menos de uma parcela do limite: mais um mês como esse e
 * fura. É um corte explicável, que é o que importa para quem vai ler o
 * amarelo e decidir alguma coisa.
 */
function situacao(saldo: number, piso: number, parcela: number): Situacao {
  if (saldo < piso) return 'falta'
  if (saldo < piso + parcela) return 'apertado'
  return 'ok'
}

/** O tom do cartao de resposta. Fundo e texto medidos em par, ver CLAUDE.md. */
/**
 * O veredito e AZUL como os outros cards, e o sinal semantico vive na cor do
 * TEXTO — verde, amarelo e vermelho da paleta de fundo escuro, medidos sobre
 * #1e40af: 6,21:1, 6,62:1 e 6,03:1. Os tons claros de antes (sucessoFundo e
 * companhia) so existem para fundo claro.
 */
const TOM = {
  ok:      { texto: '#86efac' },
  atencao: { texto: '#fde047' },
  nao:     { texto: '#fecaca' },
} as const

// O ponto e elemento grafico (limite 3:1); o texto vai na paleta escura.
// Placar e detalhe moram dentro do card AZUL: negativo no vermelho-claro de
// fundo escuro (#fecaca, 6,03:1 no #1e40af) e a área "comprando" num azul
// claro — COR.azul sumia no próprio fundo. Antes eram os tons de fundo claro:
// rótulos brancos no #f8faff e números marinho no azul, ilegíveis.
const NEG = '#fecaca'
const COM_COMPRA = '#93c5fd'

const CORES: Record<Situacao, { ponto: string; texto: string }> = {
  ok:       { ponto: '#4ade80', texto: '#86efac' },
  apertado: { ponto: '#fbbf24', texto: '#fde047' },
  falta:    { ponto: '#f87171', texto: '#fecaca' },
}

export function Resposta({ nome, r, isMobile, piso, valorTotal, parcelas, mensal = false, meta = null }: {
  nome: string
  /** A meta de economia com a compra. Sem meta no plano, `null`. */
  meta?: MetaNaSimulacao | null
  /** Gasto fixo todo mês (mensalidade), e não uma compra parcelada. */
  mensal?: boolean
  r: ResultadoCompra
  isMobile: boolean
  piso: number
  valorTotal: number
  parcelas: number
}) {
  const valorParcela = valorTotal / parcelas
  const navigate = useNavigate()
  const [detalhes, setDetalhes] = useState(false)
  const oQue = nome.trim()

  // Só até dois meses depois da última parcela: daí em diante é a projeção
  // normal subindo, e não diz nada sobre a compra.
  // O fluxo inteiro, sem aparar. Ele ja vai do mes corrente ate o fim do
  // planejamento — a janela que faz sentido. Havia um corte em "ultima parcela
  // mais dois meses", herdado de quando o fluxo ia 38 meses adiante; com o
  // fluxo limitado pelo plano, ele so escondia meses reais. Numa compra a
  // vista em setembro, com plano ate dezembro, a tira parava em novembro e o
  // placar dizia novembro no lugar de dezembro.
  const meses = r.fluxo

  const d = diagnosticar(r, piso, valorParcela)
  const aperto = r.primeiroAperto ?? r.pior
  const nMeses = (n: number) => `${n} ${n === 1 ? 'mês' : 'meses'}`

  const titulo = {
    'folgado':             mensal
      ? (oQue ? `Sim, ${oQue} cabe todo mês.` : 'Sim, cabe todo mês.')
      : (oQue ? `Sim, dá para comprar ${oQue}.` : 'Sim, dá para comprar.'),
    'no-limite':           'Dá, mas fica no limite.',
    'mexe-na-reserva':     'Dá, mas mexe no seu dinheiro guardado.',
    'vermelho-passageiro': 'Aperta, mas você se recupera.',
    'vermelho-ate-o-fim':  'Assim não dá.',
  }[d.caso]

  // O numero grande responde a pergunta de cada caso: onde se chega, quando
  // cabe; quanto falta, quando nao cabe.
  const destaque = d.gravidade === 'nao'
    ? { rotulo: <>Já em <b>{MESES[aperto.mes].toLowerCase()}</b> ia faltar</>,
        valor: piso - aperto.comCompra }
    : { rotulo: <>No fim de <b>{MESES[d.fim.mes].toLowerCase()}</b> você fica com</>,
        valor: d.fim.comCompra }

  const explicacao = {
    'folgado': d.pior !== d.fim
      ? <>O mês mais apertado é <b>{MESES[d.pior.mes].toLowerCase()}</b>, com <b>{fmt(d.pior.comCompra)}</b>.</>
      : <>Todos os meses ficam tranquilos.</>,
    'no-limite':
      <>Em <b>{MESES[d.pior.mes].toLowerCase()}</b> sobra pouco: <b>{fmt(d.pior.comCompra)}</b>.
        Qualquer imprevisto nesse mês aperta.</>,
    'mexe-na-reserva':
      <>Em {nMeses(d.abaixo.length)} você fica abaixo dos <b>{fmt(piso)}</b> que
        queria manter guardados — o menor é <b>{fmt(d.pior.comCompra)}</b>. Dinheiro
        na conta não falta.</>,
    'vermelho-passageiro':
      <>{nMeses(d.negativos.length)} no vermelho, o pior em <b>{MESES[d.pior.mes].toLowerCase()}</b> com{' '}
        <b>{fmt(d.pior.comCompra)}</b>. Depois você volta ao azul.</>,
    'vermelho-ate-o-fim':
      <>A partir de <b>{MESES[aperto.mes].toLowerCase()}</b> o saldo não se
        recupera: em <b>{MESES[d.fim.mes].toLowerCase()}</b> você ainda estaria
        com <b>{fmt(d.fim.comCompra)}</b>.</>,
  }[d.caso]

  return (
    <>
      <div style={{
        ...cardAzul,
        borderLeft: `4px solid ${TOM[d.gravidade].texto}`,
      }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TOM[d.gravidade].texto }}>
          {titulo}
        </div>

        <div style={{ fontSize: 14, color: '#fff', marginTop: 10, lineHeight: 1.6 }}>
          {destaque.rotulo}
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', marginTop: 2,
          color: TOM[d.gravidade].texto }}>
          {fmt(destaque.valor)}
        </div>

        <div style={{ fontSize: 13, color: '#fff', marginTop: 8, lineHeight: 1.6 }}>
          {explicacao}
        </div>

        {meta && <AvisoMeta m={meta} mensal={mensal} />}

        {/* O mes ja seria ruim sem a compra. Muda a conversa: o problema nao e
            o que se quer comprar, e o mes. */}
        {d.apertoPreexistente && (
          <div style={{ fontSize: 13, color: '#fff', marginTop: 8, lineHeight: 1.6 }}>
            Vale notar: <b>{MESES[d.abaixo[0].mes].toLowerCase()}</b> já ficaria
            apertado mesmo sem essa compra.
          </div>
        )}

        {d.gravidade !== 'ok' && (r.adiarPara || (!mensal && r.parcelasQueCabem)) && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              O que dá para fazer:
            </div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
              {r.adiarPara && (
                <Saida
                  icone="ti-calendar-time"
                  titulo={mensal ? `Começar em ${MESES[r.adiarPara.mes]}` : `Esperar até ${MESES[r.adiarPara.mes]}`}
                  detalhe={`${r.adiarPara.meses} ${r.adiarPara.meses === 1 ? 'mês a mais' : 'meses a mais'} — aí cabe do jeito que você quer`}
                />
              )}
              {!mensal && r.parcelasQueCabem && (
                <Saida
                  icone="ti-credit-card"
                  titulo={`Comprar agora em ${r.parcelasQueCabem}x`}
                  detalhe={`${fmt(valorTotal / r.parcelasQueCabem)} por mês em vez de ${fmt(valorParcela)}`}
                />
              )}
            </div>
          </div>
        )}

        {d.gravidade === 'nao' && !r.adiarPara && (mensal || !r.parcelasQueCabem) && (
          <div style={{ fontSize: 14, color: '#fff', marginTop: 16, lineHeight: 1.6 }}>
            {r.limitadoPeloPlano
              ? 'Dentro do que você já planejou não há saída — nem esperando, nem dividindo em mais vezes.'
              : mensal
                ? 'Nem começando mais tarde. Para este gasto caber, o caminho é sobrar mais dinheiro por mês.'
                : 'Nem esperando um ano, nem dividindo em mais vezes. Para esta compra caber, o caminho é sobrar mais dinheiro por mês.'}
          </div>
        )}
      </div>

      {r.limitadoPeloPlano && (
        <div style={{ ...card, background: COR.avisoFundo, border: `1px solid ${COR.avisoTexto}33` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COR.avisoTexto }}>
            Só dá para olhar até {MESES[r.fimDoPlano.mes].toLowerCase()} de {r.fimDoPlano.ano}
          </div>
          <div style={{ fontSize: 13, color: COR.avisoTexto, marginTop: 6, lineHeight: 1.6 }}>
            Seu planejamento termina aí. Pode haver uma saída depois disso — mais
            meses para pagar, ou comprar mais tarde —, mas a conta não tem como
            saber o que entra e o que sai nesses meses, e chutar seria pior do
            que não responder.
          </div>
          <button onClick={() => navigate(`/planejamento?ano=${r.fimDoPlano.ano + 1}`)} style={{
            marginTop: 12, padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
            border: `1.5px solid ${COR.avisoTexto}55`, background: COR.branco,
            color: COR.avisoTexto, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
          }}>
            Planejar mais meses →
          </button>
        </div>
      )}

      <div style={cardAzul}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
          Seu saldo, antes e depois
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginBottom: 12 }}>
          Com quanto cada mês termina sem a compra e {mensal ? 'pagando todo mês' : 'já pagando as parcelas'}.
        </div>

        <GraficoAntesDepois meses={meses} piso={piso} parcela={valorParcela} isMobile={isMobile} />

        <Fechamento meses={meses} isMobile={isMobile} />

        <button onClick={() => setDetalhes(v => !v)} style={{
          marginTop: 16, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, color: '#fff', fontWeight: 600,
        }}>
          {detalhes ? '▾ Esconder os números' : '▸ Ver os números em detalhe'}
        </button>

        {detalhes && <Detalhes meses={meses} mensal={mensal} />}
      </div>
    </>
  )
}

/**
 * O placar do fim do periodo: onde voce chega com e sem a compra.
 *
 * A diferenca e o quanto da compra ja foi pago ate ali — nao o preco dela,
 * quando o planejamento acaba antes da ultima parcela. Por isso o rotulo fala
 * do periodo, e nao da compra.
 */
function Fechamento({ meses, isMobile }: { meses: PontoFluxo[]; isMobile: boolean }) {
  const fim = meses[meses.length - 1]
  if (!fim) return null
  const diferenca = fim.semCompra - fim.comCompra

  // minWidth 0 e fonte menor no celular: com R$ 15.400,00 nas três células a
  // "Diferença" passava da borda do card numa tela de 375 px.
  const celula: React.CSSProperties = {
    flex: 1, minWidth: 0, textAlign: 'center', padding: isMobile ? '10px 4px' : '10px 8px',
  }
  const rotulo: React.CSSProperties = {
    fontSize: 11, color: 'rgba(255,255,255,.85)', marginBottom: 4,
  }
  const valor: React.CSSProperties = {
    fontSize: isMobile ? 13 : 17, fontWeight: 800,
    fontVariantNumeric: 'tabular-nums', letterSpacing: '-.3px', overflowWrap: 'anywhere',
  }

  return (
    <div style={{ marginTop: 16, border: '1px solid rgba(255,255,255,.18)', borderRadius: 10,
      background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={celula}>
          <div style={rotulo}>Sem a compra</div>
          <div style={{ ...valor, color: '#fff' }}>{fmt(fim.semCompra)}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,.18)' }} />
        <div style={celula}>
          <div style={rotulo}>Comprando</div>
          <div style={{ ...valor, color: fim.comCompra < 0 ? NEG : '#fff' }}>
            {fmt(fim.comCompra)}
          </div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,.18)' }} />
        <div style={celula}>
          <div style={rotulo}>Diferença</div>
          <div style={{ ...valor, color: NEG }}>− {fmt(diferenca)}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.85)', textAlign: 'center',
        padding: '0 8px 10px' }}>
        onde você chega em {MESES[fim.mes].toLowerCase()} de {fim.ano}
      </div>
    </div>
  )
}


/**
 * O saldo de cada mês, sem a compra e com ela, num gráfico só.
 *
 * Pedido do Guilherme em 15/10/2026, no lugar dos cartõezinhos mês a mês: a
 * pergunta é a TRAJETÓRIA — onde as duas linhas se afastam, e se a de baixo
 * encosta no zero. Sem a compra é a linha branca tracejada; comprando, a azul
 * clara, com o semáforo de cada mês no ponto (verde tranquilo, amarelo
 * apertado, vermelho falta). Medido sobre `#1e40af`: `#93c5fd` 5,7:1, branco
 * 8,7:1; o ponto é elemento gráfico (3:1).
 */
function GraficoAntesDepois({ meses, piso, parcela, isMobile }: {
  meses: PontoFluxo[]; piso: number; parcela: number; isMobile: boolean
}) {
  const dados = meses.map(p => ({
    rotulo: p.mes === 0 || p === meses[0] ? `${MESES_CURTOS[p.mes]}/${String(p.ano).slice(2)}` : MESES_CURTOS[p.mes],
    sem: Math.round(p.semCompra * 100) / 100,
    com: Math.round(p.comCompra * 100) / 100,
    s: situacao(p.comCompra, piso, parcela),
  }))
  const curto = (v: number) => Math.abs(v) >= 1000
    ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`
    : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  const ponto = (props: { cx?: number; cy?: number; payload?: { s: Situacao } }) => {
    const { cx, cy, payload } = props
    if (cx === undefined || cy === undefined || !payload) return <g />
    return <circle cx={cx} cy={cy} r={4} fill={CORES[payload.s].ponto} stroke="#0f2878" strokeWidth={1.5} />
  }
  return (
    <div>
      <div style={{ height: isMobile ? 200 : 230 }}
        role="img"
        aria-label={`Saldo no fim de cada mês. ${meses.map(p => `${MESES_CURTOS[p.mes]}: sem a compra ${fmt(p.semCompra)}, comprando ${fmt(p.comCompra)}`).join('; ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.14)" vertical={false} />
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.85)' }}
              tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,.3)' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,.85)' }} width={52}
              tickLine={false} axisLine={false} tickFormatter={curto} />
            <Tooltip
              formatter={(v, n) => [fmt(Number(v ?? 0)), n === 'com' ? 'Comprando' : 'Sem a compra']}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: `1px solid ${COR.borda}` }} />
            <ReferenceLine y={0} stroke={NEG} strokeDasharray="4 4" />
            {piso > 0 && <ReferenceLine y={piso} stroke="#fde047" strokeDasharray="2 4" />}
            <Line type="monotone" dataKey="sem" stroke="#fff" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="com" stroke={COM_COMPRA} strokeWidth={3} dot={ponto} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', gap: '6px 14px', flexWrap: 'wrap', marginTop: 8,
        fontSize: 12, color: 'rgba(255,255,255,.85)', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 16, borderTop: '2px dashed #fff' }} /> sem a compra
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 16, borderTop: `3px solid ${COM_COMPRA}` }} /> comprando
        </span>
        {([['ok','tranquilo'],['apertado','apertado'],['falta','falta dinheiro']] as const).map(([k, txt]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CORES[k].ponto }} />
            {txt}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * A meta de economia, numa frase. Mesmas palavras do Planejamento ("guardar",
 * "meta"), e nunca "resultado", "receitas" ou "despesas" — a regra do texto
 * da meta no CLAUDE.md.
 */
function AvisoMeta({ m, mensal }: { m: MetaNaSimulacao; mensal: boolean }) {
  const n = m.meses.length
  const nm = (k: number) => `${k} ${k === 1 ? 'mês' : 'meses'}`
  const mes = (x: { mes: number; ano: number }) => `${MESES[x.mes].toLowerCase()}${x.ano !== new Date().getFullYear() ? ` de ${x.ano}` : ''}`
  const p = m.pior
  const caixa: React.CSSProperties = {
    marginTop: 12, padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.55, color: '#fff',
    background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)',
  }
  if (!m.caem.length && !m.jaAbaixo.length) {
    return (
      <div style={caixa}>
        <b style={{ color: TOM.ok.texto }}>✓ Sua meta de economia continua de pé.</b>{' '}
        {n === 1 ? 'No mês com meta' : `Nos ${nm(n)} com meta`}, você ainda guarda o que planejou.
      </div>
    )
  }
  return (
    <div style={caixa}>
      {m.caem.length > 0 && (
        <><b style={{ color: TOM.atencao.texto }}>⚠ {mensal ? 'Com esse gasto' : 'Com essa compra'} você guarda menos que a meta</b>{' '}
          {m.caem.length === n ? (n === 1 ? 'no mês com meta' : `nos ${nm(n)} com meta`) : `em ${m.caem.length} dos ${nm(n)} com meta`}.</>
      )}
      {p && (
        <> {m.caem.length > 1 ? 'O pior é' : 'Em'} <b>{mes(p)}</b>:{' '}
          {p.guardaCom >= 0
            ? <>guarda <b>{fmt(p.guardaCom)}</b> de uma meta de <b>{fmt(p.meta)}</b>.</>
            : <>você gasta <b>{fmt(-p.guardaCom)}</b> a mais do que ganha, e a meta era guardar <b>{fmt(p.meta)}</b>.</>}</>
      )}
      {m.jaAbaixo.length > 0 && (
        <> {m.caem.length > 0 ? 'E em' : 'Em'} {nm(m.jaAbaixo.length)} o plano já não alcançava a meta, mesmo sem a compra.</>
      )}
    </div>
  )
}

function Saida({ icone, titulo, detalhe }: { icone: string; titulo: string; detalhe: string }) {
  return (
    <div style={{
      flex: 1, background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.18)',
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
        <i aria-hidden className={`ti ${icone}`} style={{ fontSize: 16, verticalAlign: '-2px', marginRight: 6 }} />{titulo}
      </div>
      {detalhe && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 4, lineHeight: 1.5 }}>
          {detalhe}
        </div>
      )}
    </div>
  )
}

function Detalhes({ meses, mensal }: { meses: PontoFluxo[]; mensal: boolean }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'grid',
        gridTemplateColumns: 'minmax(60px,1fr) repeat(3,minmax(78px,1fr))',
        gap: '6px 10px', alignItems: 'center' }}>
        {['Mês', 'Sem comprar', mensal ? 'Por mês' : 'Parcela', 'Sobra'].map((h, i) => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.85)',
            textTransform: 'uppercase', letterSpacing: '.3px',
            textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
        ))}
        {meses.map(p => (
          <div key={`${p.ano}-${p.mes}`} style={{ display: 'contents' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
              {MESES_CURTOS[p.mes]}/{String(p.ano).slice(2)}
            </div>
            <div style={{ fontSize: 12, textAlign: 'right', color: 'rgba(255,255,255,.85)',
              fontVariantNumeric: 'tabular-nums' }}>{fmt(p.semCompra)}</div>
            <div style={{ fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
              color: p.parcela > 0 ? NEG : 'rgba(255,255,255,.85)' }}>
              {p.parcela > 0 ? `− ${fmt(p.parcela)}` : '—'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              color: p.comCompra < 0 ? NEG : '#fff' }}>{fmt(p.comCompra)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
