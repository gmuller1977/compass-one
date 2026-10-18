import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { parseBRL } from '../utils/moeda'
import { COR } from '../utils/cores'
import { marcarVisto } from '../utils/vistoNaConta'
import { planoDoPrimeiroAcesso, primeiroMesCompleto, ultimoMesDoPlanoInicial } from '../utils/primeiroPlano'
import { AJUDA, type TelaAjuda } from '../utils/ajudaDasTelas'
import { TOPO_AZUL, BOLINHA_AZUL } from '../components/mobile/estilo'
import { LogoCompass } from '../components/LogoCompass'
import {
  CONTAS_DO_MES, DIA_A_DIA, financiamentosComFim, aplicarRespostas, resumoDasRespostas, fechamentoDoVencimento,
  CHAVE_PRIMEIRO_ACESSO, fixasDoPrimeiroAcesso, type FormaDaConta, type Respostas,
} from '../utils/primeiroAcesso'

/**
 * O primeiro acesso de uma conta nova (17/10/2026, protótipo aprovado pelo
 * Guilherme). Seis perguntas, uma por tela, sobre o que a pessoa sabe de
 * cabeça, e um resultado que já mostra o mês dela. Tudo aproximado e tudo
 * pulável. O que cada resposta vira está em utils/primeiroAcesso.
 *
 * "Prefiro configurar tudo sozinho" leva para Configurações, como antes.
 */

const BANCOS = ['Nubank', 'Itaú', 'Bradesco', 'Caixa', 'Banco do Brasil', 'Santander', 'Inter', 'C6 Bank', 'Sicredi', 'Outro']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const TOTAL = 6

const FORMAS: { id: FormaDaConta; rotulo: string }[] = [
  { id: 'manual', rotulo: 'Eu pago (PIX, boleto)' },
  { id: 'automatico', rotulo: 'Débito automático' },
  { id: 'cartao', rotulo: 'No cartão' },
  { id: 'dinheiro', rotulo: 'Em dinheiro' },
]

const R = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// Gráfico sobre branco: 3:1 no mínimo (CLAUDE.md).
const BARRA = { contas: '#1e40af', dia: '#b45309', parcelas: '#3b82f6', sobra: '#16a34a' }

/**
 * O guia do fim do primeiro acesso (18/10/2026, pedido do Guilherme: ao
 * terminar, "o cliente fica sem rumo"). As telas na ordem do menu, com o
 * resumo do "?" de cada uma (ajudaDasTelas, uma fonte só) e quando usar.
 */
const GUIA: { quando: string; telas: { tela: TelaAjuda; icone: string; uso: string }[] }[] = [
  { quando: 'Todo dia', telas: [
    { tela: 'inicio', icone: 'ti-home', uso: 'Abra para saber, num olhar, se o mês vai fechar no azul e quanto ainda dá para gastar.' },
    { tela: 'lancamentos', icone: 'ti-plus', uso: 'Anote cada gasto na hora, em poucos segundos. É o que deixa todos os números do app de verdade.' },
    { tela: 'radar', icone: 'ti-radar-2', uso: 'Veja, grupo por grupo, onde você está dentro do plano e onde passou.' },
  ] },
  { quando: 'Todo mês', telas: [
    { tela: 'revisao', icone: 'ti-refresh', uso: 'No começo do mês, olhe o que aconteceu no anterior e ajuste o que precisar.' },
    { tela: 'simulador', icone: 'ti-calculator', uso: 'Antes de uma compra maior, veja se cabe no bolso e qual forma de pagar é melhor.' },
  ] },
  { quando: 'Todo ano', telas: [
    { tela: 'planejamento', icone: 'ti-calendar-stats', uso: 'O seu plano inicial já vem preenchido. Revise com o tempo, conforme os lançamentos, e defina quanto quer guardar por mês.' },
  ] },
]

type Estado = {
  banco: string; bancoOutro: string; saldo: string
  renda: string; diaRenda: number; decimo: '' | 'sim' | 'nao'
  usaCartao: '' | 'sim' | 'nao'; cartao: string; venc: number
  outrosBancos: { banco: string; saldo: string }[]
  outrosCartoes: { cartao: string; venc: number }[]
  contas: Record<string, { valor: string; dia: string; forma: FormaDaConta; faltam?: string; banco?: string }>
  outrasContas: { nome: string; valor: string; dia: string; forma: FormaDaConta; banco?: string }[]
  diaADia: Record<string, string>
  outrosGastos: { nome: string; valor: string }[]
  parcelas: { nome: string; valor: string; faltam: string; total: string; dia: string; forma: FormaDaConta; banco?: string; cartao?: string }[]
  meta: string
}

const INICIAL: Estado = {
  banco: '', bancoOutro: '', saldo: '', renda: '', diaRenda: 0, decimo: '', usaCartao: '', cartao: '', venc: 0,
  outrosBancos: [], outrosCartoes: [], contas: {}, outrasContas: [], diaADia: {}, outrosGastos: [], parcelas: [], meta: '',
}

export default function PrimeiroAcesso() {
  const navigate = useNavigate()
  const { user, perfil, contas, categorias, planos, faturaData, setContas, setCategorias, setPlanos, setFaturaData, setOnboardingCompleto } = useApp()
  const [passo, setPasso] = useState(0)
  const [e, setE] = useState<Estado>(INICIAL)
  const [aberta, setAberta] = useState<TelaAjuda | ''>('')
  const topoRef = useRef<HTMLDivElement>(null)
  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setE(p => ({ ...p, [k]: v }))

  const nomeCompleto = (perfil.nome || (user?.user_metadata?.nome as string | undefined) || '').trim()
  const nome = (perfil.apelido || nomeCompleto).split(' ')[0]

  useEffect(() => {
    // No computador o celular desenhado rola por dentro; no celular, a página.
    if (topoRef.current) topoRef.current.scrollTop = 0
    window.scrollTo(0, 0)
  }, [passo])

  // "Outro" é marcador na lista: o nome digitado mora em `bancoOutro`.
  const nomeDoBanco = (b: string) => (b === 'Outro' ? e.bancoOutro.trim() : b)
  const banco = nomeDoBanco(e.banco)
  // Com mais de um banco ou cartão, cada conta e parcela diz de qual sai.
  const nomesBancos = [banco, ...e.outrosBancos.map(b => nomeDoBanco(b.banco))].filter((b, i, a) => b && a.indexOf(b) === i)
  const nomesCartoes = e.usaCartao === 'sim'
    ? [e.venc ? e.cartao : '', ...e.outrosCartoes.filter(c => c.venc).map(c => c.cartao)].filter((c, i, a) => c && a.indexOf(c) === i)
    : []
  const respostas: Respostas = {
    banco,
    saldo: parseBRL(e.saldo),
    renda: parseBRL(e.renda),
    diaRenda: e.diaRenda,
    decimo: e.decimo === 'sim',
    usaCartao: e.usaCartao === 'sim',
    cartao: e.cartao,
    vencimento: e.venc,
    outrosBancos: e.outrosBancos.map(b => ({ banco: nomeDoBanco(b.banco), saldo: parseBRL(b.saldo) })).filter(b => b.banco),
    outrosCartoes: e.outrosCartoes.map(c => ({ cartao: c.cartao, vencimento: c.venc })),
    outrasContas: e.outrasContas.map(c => ({ nome: c.nome, valor: parseBRL(c.valor), dia: Math.min(31, parseInt(c.dia) || 0), forma: c.forma, banco: c.banco })),
    outrosGastos: e.outrosGastos.map(g => ({ nome: g.nome, valor: parseBRL(g.valor) })),
    contas: Object.fromEntries(Object.entries(e.contas).map(([id, c]) => [id, {
      valor: parseBRL(c.valor), dia: Math.min(31, Math.max(0, parseInt(c.dia) || 0)), forma: c.forma, faltam: parseInt(c.faltam ?? '') || 0, banco: c.banco,
    }])),
    diaADia: Object.fromEntries(Object.entries(e.diaADia).map(([id, v]) => [id, parseBRL(v)])),
    parcelas: e.parcelas.map(p => ({
      nome: p.nome.trim() || 'Compra parcelada', valor: parseBRL(p.valor), faltam: parseInt(p.faltam) || 1, forma: p.forma,
      total: parseInt(p.total) || undefined, dia: Math.min(31, parseInt(p.dia) || 0) || undefined, banco: p.banco, cartao: p.cartao,
    })),
    meta: parseBRL(e.meta),
  }

  function concluir(destino: string) {
    const ano = new Date().getFullYear()
    const r = aplicarRespostas({ r: respostas, nomeTitular: nomeCompleto, contas, categorias, planoDoAno: planos[ano], faturaData })
    // O plano inicial nasce aqui, com o que a pessoa contou (18/10/2026): 12
    // meses a partir do primeiro mês INTEIRO, em um ou dois anos. Nunca por
    // cima de um ano já planejado.
    const temValor = (a: number) => [...(planos[a]?.entradas ?? []), ...(planos[a]?.saidas ?? [])].some(l => l.v.some(v => v > 0))
    const novos = planoDoPrimeiroAcesso(r.categorias, r.plano.estimativas).filter(x => !temValor(x.ano))
    setContas(r.contas)
    if (r.faturas !== faturaData) setFaturaData(r.faturas)
    // Com plano, as contas do mês viram FIXAS com o dia: aparecem para pagar.
    setCategorias(novos.length ? fixasDoPrimeiroAcesso(r.categorias, r.plano.estimativas) : r.categorias)
    setPlanos(prev => {
      if (!novos.length) return { ...prev, [ano]: r.plano }
      // A meta acompanha o plano: os mesmos meses dele.
      const metas = (x: { mesInicio: number; mesFim: number }, base?: number[]) => Array.from({ length: 12 }, (_, i) =>
        (respostas.meta > 0 && i >= x.mesInicio && i <= x.mesFim ? respostas.meta : base?.[i] ?? 0))
      const prox = { ...prev }
      // O ano de hoje guarda as estimativas, mesmo quando o plano só começa no seguinte.
      if (!novos.some(x => x.ano === ano)) prox[ano] = { ...r.plano, objetivos: prev[ano]?.objetivos ?? r.plano.objetivos?.map(() => 0) }
      for (const x of novos) {
        prox[x.ano] = { ...(x.ano === ano ? r.plano : prev[x.ano]), ...x.plano, objetivos: metas(x, prev[x.ano]?.objetivos) }
      }
      return prox
    })
    setOnboardingCompleto(true)
    void marcarVisto(user, CHAVE_PRIMEIRO_ACESSO)
    navigate(destino, { replace: true })
  }

  function configurarSozinho() {
    void marcarVisto(user, CHAVE_PRIMEIRO_ACESSO)
    navigate('/configuracoes', { replace: true })
  }

  // O plano inicial parte do primeiro mês INTEIRO: quem chega no meio do mês
  // começa no seguinte (utils/primeiroPlano).
  const inicio = primeiroMesCompleto()
  const comecaNoMeio = inicio.mes !== new Date().getMonth()
  const mesDoPlano = `${MESES[inicio.mes]}${inicio.ano !== new Date().getFullYear() ? ` de ${inicio.ano}` : ''}`
  // Doze meses: o fim sempre leva o ano, porque quase sempre é o seguinte.
  const fim = ultimoMesDoPlanoInicial()
  const mesFimDoPlano = `${MESES[fim.mes]} de ${fim.ano}`

  const seguir = () => setPasso(p => Math.min(TOTAL + 2, p + 1))
  const voltar = passo > 0 ? () => setPasso(p => p - 1) : undefined

  let titulo = '', sub = '', corpo: ReactNode = null, pe: ReactNode = null

  if (passo === 0) return <BoasVindas nome={nome} onSeguir={seguir} onSozinho={configurarSozinho} />

  if (passo === 1) {
    // Uma lista só: tocar no banco marca e abre a caixa do saldo (pedido do
    // Guilherme, 17–18/10/2026). O primeiro marcado é o do salário; dá para trocar.
    const marcado = (b: string) => b === e.banco || e.outrosBancos.some(o => o.banco === b)
    const saldoDe = (b: string) => (b === e.banco ? e.saldo : e.outrosBancos.find(o => o.banco === b)?.saldo ?? '')
    const alternar = (b: string) => setE(p => {
      if (b === p.banco) {
        const [prox, ...resto] = p.outrosBancos
        return { ...p, banco: prox?.banco ?? '', saldo: prox?.saldo ?? '', outrosBancos: resto }
      }
      if (p.outrosBancos.some(o => o.banco === b)) return { ...p, outrosBancos: p.outrosBancos.filter(o => o.banco !== b) }
      if (!p.banco) return { ...p, banco: b, saldo: '' }
      return { ...p, outrosBancos: [...p.outrosBancos, { banco: b, saldo: '' }] }
    })
    const mudarSaldo = (b: string, v: string) => setE(p => (b === p.banco ? { ...p, saldo: v }
      : { ...p, outrosBancos: p.outrosBancos.map(o => (o.banco === b ? { ...o, saldo: v } : o)) }))
    const doSalario = (b: string) => setE(p => ({
      ...p, banco: b, saldo: saldoDe(b),
      outrosBancos: [{ banco: p.banco, saldo: p.saldo }, ...p.outrosBancos.filter(o => o.banco !== b)],
    }))
    const varios = [e.banco, ...e.outrosBancos.map(o => o.banco)].filter(Boolean).length > 1
    titulo = 'Quais bancos você usa?'
    sub = 'Toque em cada um para dizer quanto tem lá. O primeiro é o do salário.'
    corpo = (<>
      <Cartao>
        <div style={{ display: 'grid', gap: 8 }}>
          {BANCOS.map(b => (
            <Escolha key={b} rotulo={b} on={marcado(b)} selo={varios && b === e.banco ? 'salário' : undefined} onTocar={() => alternar(b)}>
              {b === 'Outro' && (<>
                <Pergunta>Qual banco?</Pergunta>
                <Campo valor={e.bancoOutro} onMudar={v => set('bancoOutro', v)} placeholder="Nome do banco" texto autoFoco />
              </>)}
              <Pergunta>Quanto tem lá hoje?</Pergunta>
              <CampoGrande valor={saldoDe(b)} onMudar={v => mudarSaldo(b, v)} rotulo={`Saldo hoje: ${b}`} autoFoco={b !== 'Outro'} />
              <Mini>Mais ou menos. Se não lembrar, deixe em branco.</Mini>
              {varios && b !== e.banco && <BotaoNaCaixa onClick={() => doSalario(b)}>O salário cai aqui</BotaoNaCaixa>}
            </Escolha>
          ))}
        </div>
      </Cartao>
    </>)
    pe = <Pe rotulo="Continuar" onSeguir={seguir} desabilitado={!banco} />
  }

  if (passo === 2) {
    titulo = 'Quanto você recebe por mês?'
    sub = 'O que cai na conta, já com os descontos.'
    corpo = (
      <Cartao>
        <Campo valor={e.renda} onMudar={v => set('renda', v)} placeholder="0" />
        <Rotulo>Em que dia costuma cair?</Rotulo>
        <Chips lista={[1, 5, 10, 15, 20, 25, 30].map(d => `Dia ${d}`)} valor={e.diaRenda ? `Dia ${e.diaRenda}` : ''}
          onEscolher={v => set('diaRenda', parseInt(v.slice(4)))} />
        <Rotulo>Você recebe 13º salário?</Rotulo>
        <Chips lista={['Sim', 'Não']} valor={e.decimo === 'sim' ? 'Sim' : e.decimo === 'nao' ? 'Não' : ''}
          onEscolher={v => set('decimo', v === 'Sim' ? 'sim' : 'nao')} />
        {e.decimo === 'sim' && respostas.renda > 0 && (
          <Dica>Ótimo. Ele entra no seu plano: cerca de {R(respostas.renda / 2)} em novembro e {R(respostas.renda / 2)} em dezembro, calculado pelo seu salário.</Dica>
        )}
      </Cartao>
    )
    pe = <Pe rotulo="Continuar" onSeguir={seguir} desabilitado={!(respostas.renda > 0)} pular="Prefiro não dizer agora" onPular={() => { set('renda', ''); seguir() }} />
  }

  if (passo === 3) {
    // Mesma lista dos bancos: tocar marca o cartão e abre o vencimento.
    const cartaoMarcado = (b: string) => b === e.cartao || e.outrosCartoes.some(c => c.cartao === b)
    const vencDe = (b: string) => (b === e.cartao ? e.venc : e.outrosCartoes.find(c => c.cartao === b)?.venc ?? 0)
    const alternarCartao = (b: string) => setE(p => {
      if (b === p.cartao) {
        const [prox, ...resto] = p.outrosCartoes
        return { ...p, cartao: prox?.cartao ?? '', venc: prox?.venc ?? 0, outrosCartoes: resto }
      }
      if (p.outrosCartoes.some(c => c.cartao === b)) return { ...p, outrosCartoes: p.outrosCartoes.filter(c => c.cartao !== b) }
      if (!p.cartao) return { ...p, cartao: b, venc: 0 }
      return { ...p, outrosCartoes: [...p.outrosCartoes, { cartao: b, venc: 0 }] }
    })
    const mudarVenc = (b: string, d: number) => setE(p => (b === p.cartao ? { ...p, venc: d }
      : { ...p, outrosCartoes: p.outrosCartoes.map(c => (c.cartao === b ? { ...c, venc: d } : c)) }))
    titulo = 'Você usa cartão de crédito?'
    sub = 'Assim a gente sabe em que mês cada compra pesa no bolso.'
    corpo = (<>
      <Cartao><Chips lista={['Uso', 'Não uso']} valor={e.usaCartao === 'sim' ? 'Uso' : e.usaCartao === 'nao' ? 'Não uso' : ''}
        onEscolher={v => set('usaCartao', v === 'Uso' ? 'sim' : 'nao')} /></Cartao>
      {e.usaCartao === 'sim' && (
        <Cartao>
          <Rotulo>De quais bancos?</Rotulo>
          <div style={{ display: 'grid', gap: 8 }}>
            {BANCOS.filter(b => b !== 'Outro').map(b => {
              const venc = vencDe(b)
              return (
                <Escolha key={b} icone="ti-credit-card" rotulo={b} on={cartaoMarcado(b)} onTocar={() => alternarCartao(b)}>
                  <Pergunta>Em que dia vence a fatura?</Pergunta>
                  <Chips pequeno lista={[1, 5, 10, 15, 20, 25].map(d => `Dia ${d}`)} valor={venc ? `Dia ${venc}` : ''}
                    onEscolher={v => mudarVenc(b, parseInt(v.slice(4)))} />
                  {venc > 0 && <Mini>A fatura deve fechar no dia {fechamentoDoVencimento(venc)}, uma semana antes. Se for outro dia, você ajusta em Configurações.</Mini>}
                </Escolha>
              )
            })}
          </div>
        </Cartao>
      )}
    </>)
    pe = <Pe rotulo="Continuar" onSeguir={seguir} desabilitado={!(e.usaCartao === 'nao' || (e.cartao && e.venc))} />
  }

  if (passo === 4) {
    const formas = FORMAS.filter(f => f.id !== 'cartao' || e.usaCartao === 'sim')
    titulo = 'Quais contas você paga todo mês?'
    sub = 'Toque nas suas. Um valor aproximado já serve.'
    corpo = (<>
      <Cartao>
        {CONTAS_DO_MES.map(item => {
          const v = e.contas[item.id]
          const on = !!v
          return (
            <Escolha key={item.id} icone={item.icone} rotulo={item.rotulo} on={on}
              onTocar={() => setE(p => {
                const contas = { ...p.contas }
                if (contas[item.id]) delete contas[item.id]
                else contas[item.id] = { valor: '', dia: '', forma: 'manual' }
                return { ...p, contas }
              })}>
              {on && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8 }}>
                  <div><Mini>Quanto, mais ou menos</Mini>
                    <Campo valor={v.valor} onMudar={x => setE(p => ({ ...p, contas: { ...p.contas, [item.id]: { ...p.contas[item.id], valor: x } } }))} placeholder="0" pequeno autoFoco /></div>
                  <div><Mini>Dia</Mini>
                    <Campo valor={v.dia} onMudar={x => setE(p => ({ ...p, contas: { ...p.contas, [item.id]: { ...p.contas[item.id], dia: x.replace(/\D/g, '').slice(0, 2) } } }))} placeholder="10" pequeno numerico /></div>
                </div>
                <Mini>Como você paga?</Mini>
                <Chips pequeno lista={formas.map(f => f.rotulo)} valor={FORMAS.find(f => f.id === v.forma)?.rotulo ?? ''}
                  onEscolher={x => setE(p => ({ ...p, contas: { ...p.contas, [item.id]: { ...p.contas[item.id], forma: FORMAS.find(f => f.rotulo === x)!.id } } }))} />
                <DeOnde forma={v.forma} bancos={nomesBancos} cartoes={[]} banco={v.banco}
                  onBanco={x => setE(p => ({ ...p, contas: { ...p.contas, [item.id]: { ...p.contas[item.id], banco: x } } }))} />
              </>)}
            </Escolha>
          )
        })}
        {e.outrasContas.map((c, i) => {
          const mudar = (k: 'nome' | 'valor' | 'dia' | 'forma' | 'banco', x: string) =>
            set('outrasContas', e.outrasContas.map((q, j) => (j === i ? { ...q, [k]: k === 'dia' ? x.replace(/\D/g, '').slice(0, 2) : x } : q)))
          return (
            <Bloco key={i} onRemover={() => set('outrasContas', e.outrasContas.filter((_, j) => j !== i))}>
              <NomeLivre valor={c.nome} onMudar={x => mudar('nome', x)} placeholder="Qual conta? Ex.: Condomínio" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8 }}>
                <div><Mini>Quanto, mais ou menos</Mini><Campo valor={c.valor} onMudar={x => mudar('valor', x)} placeholder="0" pequeno /></div>
                <div><Mini>Dia</Mini><Campo valor={c.dia} onMudar={x => mudar('dia', x)} placeholder="10" pequeno numerico /></div>
              </div>
              <Mini>Como você paga?</Mini>
              <Chips pequeno lista={formas.map(f => f.rotulo)} valor={FORMAS.find(f => f.id === c.forma)?.rotulo ?? ''}
                onEscolher={x => mudar('forma', FORMAS.find(f => f.rotulo === x)!.id)} />
              <DeOnde forma={c.forma} bancos={nomesBancos} cartoes={[]} banco={c.banco} onBanco={x => mudar('banco', x)} />
            </Bloco>
          )
        })}
        <Adicionar onClick={() => set('outrasContas', [...e.outrasContas, { nome: '', valor: '', dia: '', forma: 'manual' }])}>Outra conta</Adicionar>
        <Dica>Só as que você lembra. As outras aparecem quando você anotar os gastos.</Dica>
      </Cartao>
    </>)
    pe = <Pe rotulo="Continuar" onSeguir={seguir} />
  }

  if (passo === 5) {
    titulo = 'E no dia a dia, quanto vai por mês?'
    sub = 'Agora os gastos que mudam todo mês. Não precisa saber certinho: um chute já ajuda.'
    corpo = (<>
      <Cartao>
        {DIA_A_DIA.map(item => {
          const v = e.diaADia[item.id]
          const on = v !== undefined
          return (
            <Escolha key={item.id} icone={item.icone} rotulo={item.rotulo} on={on}
              onTocar={() => setE(p => {
                const diaADia = { ...p.diaADia }
                if (diaADia[item.id] !== undefined) delete diaADia[item.id]
                else diaADia[item.id] = ''
                return { ...p, diaADia }
              })}>
              {on && (<div><Mini>Por mês, mais ou menos</Mini>
                <Campo valor={v} onMudar={x => setE(p => ({ ...p, diaADia: { ...p.diaADia, [item.id]: x } }))} placeholder="0" pequeno autoFoco /></div>)}
            </Escolha>
          )
        })}
        {e.outrosGastos.map((g, i) => (
          <Bloco key={i} onRemover={() => set('outrosGastos', e.outrosGastos.filter((_, j) => j !== i))}>
            <NomeLivre valor={g.nome} onMudar={x => set('outrosGastos', e.outrosGastos.map((q, j) => (j === i ? { ...q, nome: x } : q)))} placeholder="Qual gasto? Ex.: Pet" />
            <div><Mini>Por mês, mais ou menos</Mini>
              <Campo valor={g.valor} onMudar={x => set('outrosGastos', e.outrosGastos.map((q, j) => (j === i ? { ...q, valor: x } : q)))} placeholder="0" pequeno /></div>
          </Bloco>
        ))}
        <Adicionar onClick={() => set('outrosGastos', [...e.outrosGastos, { nome: '', valor: '' }])}>Outro gasto</Adicionar>
        <Dica>Não faz ideia? Tudo bem, pule. Anotando os gastos, o Radar mostra quanto vai em cada um.</Dica>
      </Cartao>
    </>)
    pe = <Pe rotulo="Continuar" onSeguir={seguir} />
  }

  if (passo === 6) {
    const mudar = (i: number, k: 'nome' | 'valor' | 'faltam' | 'total' | 'dia' | 'banco' | 'cartao', x: string) =>
      setE(p => ({ ...p, parcelas: p.parcelas.map((q, j) => (j === i ? { ...q, [k]: k === 'faltam' || k === 'total' ? x.replace(/\D/g, '').slice(0, 3) : k === 'dia' ? x.replace(/\D/g, '').slice(0, 2) : x } : q)) }))
    const financiamentos = CONTAS_DO_MES.filter(i => i.financiamento && e.contas[i.id])
    titulo = financiamentos.length ? 'Quanto falta para terminar de pagar?' : 'Tem compras parceladas ainda sendo pagas?'
    sub = financiamentos.length
      ? 'Do financiamento e das compras parceladas. Assim a gente mostra quando o dinheiro volta a sobrar.'
      : 'Muita gente tem, é super comum. Anotar aqui mostra quando cada uma termina.'
    corpo = (
      <Cartao>
        {financiamentos.map(item => {
          const c = e.contas[item.id]
          return (
            <CaixaAzul key={item.id} abre={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,.16)', color: '#fff' }}><i className={`ti ${item.icone}`} aria-hidden style={{ fontSize: 20 }} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{item.rotulo}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}>
                    {parseBRL(c.valor) > 0 ? `${R(parseBRL(c.valor))} por mês` : 'Já está nas suas contas do mês'}{` · ${(FORMAS.find(f => f.id === c.forma)?.rotulo ?? '').replace(' (PIX, boleto)', ' (PIX ou boleto)').toLowerCase()}`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8, alignItems: 'end' }}>
                <Mini>Quantas parcelas ainda faltam?</Mini>
                <Campo valor={c.faltam ?? ''} placeholder="24" pequeno numerico
                  onMudar={x => setE(p => ({ ...p, contas: { ...p.contas, [item.id]: { ...p.contas[item.id], faltam: x.replace(/\D/g, '').slice(0, 3) } } }))} />
              </div>
            </CaixaAzul>
          )
        })}
        {e.parcelas.map((p, i) => (
          <Bloco key={i} onRemover={() => set('parcelas', e.parcelas.filter((_, j) => j !== i))}>
            <NomeLivre valor={p.nome} onMudar={x => mudar(i, 'nome', x)} placeholder="O que foi? Ex.: Geladeira" autoFoco={!p.nome && !p.valor} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8 }}>
              <div><Mini>Valor da parcela</Mini><Campo valor={p.valor} onMudar={x => mudar(i, 'valor', x)} placeholder="0" pequeno /></div>
              <div><Mini>Faltam</Mini><Campo valor={p.faltam} onMudar={x => mudar(i, 'faltam', x)} placeholder="6" pequeno numerico /></div>
            </div>
            <Mini>Como você paga?</Mini>
            <Chips pequeno lista={FORMAS.filter(f => f.id !== 'cartao' || e.usaCartao === 'sim').map(f => f.rotulo)}
              valor={FORMAS.find(f => f.id === p.forma)?.rotulo ?? ''}
              onEscolher={x => setE(q => ({ ...q, parcelas: q.parcelas.map((y, j) => (j === i ? { ...y, forma: FORMAS.find(f => f.rotulo === x)!.id } : y)) }))} />
            <DeOnde forma={p.forma} bancos={nomesBancos} cartoes={nomesCartoes} banco={p.banco} cartao={p.cartao}
              onBanco={x => mudar(i, 'banco', x)} onCartao={x => mudar(i, 'cartao', x)} />
            {p.forma === 'cartao' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8, alignItems: 'end' }}>
                <Mini>De quantas no total? (se souber)</Mini>
                <Campo valor={p.total} onMudar={x => mudar(i, 'total', x)} placeholder="12" pequeno numerico />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8, alignItems: 'end' }}>
                <Mini>Em que dia vence?</Mini>
                <Campo valor={p.dia} onMudar={x => mudar(i, 'dia', x)} placeholder="10" pequeno numerico />
              </div>
            )}
            <Mini>{p.forma === 'cartao'
              ? 'As parcelas que faltam já entram na fatura do cartão.'
              : 'Vira uma conta do mês até a última parcela, que você marca como paga.'}</Mini>
          </Bloco>
        ))}
        <button type="button" onClick={() => set('parcelas', [...e.parcelas, { nome: '', valor: '', faltam: '', total: '', dia: '', forma: e.usaCartao === 'sim' ? 'cartao' : 'manual' }])} style={chip(false)}>
          <i className="ti ti-shopping-bag" aria-hidden style={{ fontSize: 18 }} /> Adicionar uma compra parcelada
        </button>
        <Dica>Não precisa ser exato. "Faltam" é quantas parcelas ainda vão vir, contando a deste mês.</Dica>
      </Cartao>
    )
    pe = <Pe rotulo={e.parcelas.length || financiamentos.length ? 'Ver o resultado' : 'Não tenho, ver o resultado'} onSeguir={seguir} />
  }

  if (passo === 7) {
    const s = resumoDasRespostas(respostas)
    const hoje = new Date()
    const semRenda = s.renda <= 0
    const pct = (v: number) => (s.renda > 0 ? Math.max(0, Math.min(100, (v / s.renda) * 100)) : 0)
    const mesFim = (() => { const t = hoje.getMonth() + s.mesesDeParcela - 1; return `${MESES[t % 12]} de ${hoje.getFullYear() + Math.floor(t / 12)}` })()
    const meta = respostas.meta
    // O que entrou no plano montado em `concluir` (planoDoPrimeiroAcesso).
    const partes = [s.renda > 0 && 'o salário', s.contas > 0 && 'as contas do mês', s.diaADia > 0 && 'o dia a dia', s.parcelas > 0 && 'as parcelas']
      .filter((x): x is string => !!x)
    const temPlano = partes.length > 0
    const partesDoPlano = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0]
    titulo = nome ? `Pronto, ${nome}! Olha o que já descobrimos` : 'Pronto! Olha o que já descobrimos'
    sub = 'Com o que você contou, já dá para ver o seu mês de um jeito novo.'
    const destaque = semRenda
      ? <p style={ola}>Quando você anotar o que entra e o que sai, a gente mostra aqui quanto sobra por mês.</p>
      : s.sobra >= 0 && s.diaADia > 0 ? (<>
          <Rotulo>Sobra no fim do mês</Rotulo>
          <div style={numeroGrande}>{R(s.sobra)}</div>
          <p style={ola}>É o que fica do seu salário depois das contas{s.parcelas ? ', do dia a dia e das parcelas' : ' e do dia a dia'}. Como o dia a dia foi um chute, o Radar vai mostrando, ao longo do mês, quanto você gasta de verdade.</p>
        </>)
      : s.sobra >= 0 ? (<>
          <Rotulo>Sobra para o dia a dia</Rotulo>
          <div style={numeroGrande}>{R(s.sobra)}</div>
          <p style={ola}>É o que fica depois das contas{s.parcelas ? ' e das parcelas' : ''}. <b style={{ color: COR.texto }}>Daqui ainda saem</b> mercado, combustível, farmácia e o resto. Anotando os gastos, o Radar mostra quanto vai nisso e quanto sobra de verdade.</p>
        </>)
      : (<>
          <Rotulo>Seu mês hoje</Rotulo>
          <p style={ola}>Somando tudo o que você contou, os gastos passam um pouco do salário. <b style={{ color: COR.texto }}>Calma:</b> isso é mais comum do que parece, e é exatamente aqui que o Compass One vai te ajudar, um passo de cada vez.</p>
        </>)
    let respostaMeta: string | null = null
    if (meta > 0 && !semRenda) {
      if (s.sobra >= meta) respostaMeta = `Dá para guardar ${R(meta)}${s.diaADia ? '' : ', se o dia a dia couber no resto'}. A gente te mostra ao longo do mês se você está no caminho.`
      else if (s.sobra > 0) respostaMeta = `Hoje sobram ${R(s.sobra)}, faltam ${R(meta - s.sobra)} para a sua meta. Anotando os gastos, a gente te mostra onde dá para ajustar.`
      else respostaMeta = `Primeiro a gente equilibra o mês, depois começa a guardar. Sua meta de ${R(meta)} fica anotada.`
    }
    corpo = (<>
      <Cartao>
        {destaque}
        {!semRenda && (<>
          <div role="img" aria-label={`Contas ${R(s.contas)}, dia a dia ${R(s.diaADia)}, parcelas ${R(s.parcelas)}, sobra ${R(Math.max(0, s.sobra))}`}
            style={{ display: 'flex', height: 18, borderRadius: 9, overflow: 'hidden', background: '#e2e8f0' }}>
            <i style={{ width: `${pct(s.contas)}%`, background: BARRA.contas }} />
            <i style={{ width: `${pct(s.diaADia)}%`, background: BARRA.dia }} />
            <i style={{ width: `${pct(s.parcelas)}%`, background: BARRA.parcelas }} />
            <i style={{ width: `${pct(Math.max(0, s.sobra))}%`, background: BARRA.sobra }} />
          </div>
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            <Legenda cor={BARRA.contas} rotulo="Contas do mês" valor={s.contas} />
            {s.diaADia > 0 && <Legenda cor={BARRA.dia} rotulo="Dia a dia (estimado)" valor={s.diaADia} />}
            {s.parcelas > 0 && <Legenda cor={BARRA.parcelas} rotulo="Parcelas" valor={s.parcelas} />}
            <Legenda cor={BARRA.sobra} rotulo={s.diaADia ? 'Sobra' : 'Sobra para o dia a dia'} valor={Math.max(0, s.sobra)} />
          </div>
        </>)}
        {s.mesesDeParcela > 0 && (
          <div style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 700, color: COR.sucessoTexto, background: '#f0fdf4',
            padding: '6px 11px', borderRadius: 12, lineHeight: 1.4 }}>
            {(n => (n === 0 ? 'Suas parcelas terminam' : `${n === 1 ? 'Seu financiamento' : 'Seus financiamentos'}${s.parcelas > 0 ? ' e as parcelas terminam' : n === 1 ? ' termina' : ' terminam'}`))(financiamentosComFim(respostas).length)} em {mesFim}. Depois disso, sobram mais {R(s.liberado)} por mês.
          </div>
        )}
      </Cartao>
      {!semRenda && (
        <Cartao>
          <Rotulo>Quanto você quer guardar por mês?</Rotulo>
          <p style={ola}>Pode ser pouco. Começar já faz diferença.</p>
          <Chips lista={['R$ 100', 'R$ 200', 'R$ 300', 'R$ 500']} valor={e.meta ? `R$ ${e.meta}` : ''}
            onEscolher={v => set('meta', v.slice(3))} />
          <Campo valor={e.meta} onMudar={v => set('meta', v)} placeholder="Outro valor" />
          {respostaMeta && <Dica>{respostaMeta}</Dica>}
          {meta > 0 && <Dica>Fica como a sua meta de economia de cada mês no Planejamento, de {mesDoPlano} a {mesFimDoPlano}.</Dica>}
        </Cartao>
      )}
      <Cartao>
        {temPlano ? (<>
          <Rotulo>Seu plano inicial</Rotulo>
          <p style={ola}>Vamos construir um plano inicial com o que você contou: {partesDoPlano}, o mesmo valor todo mês, por 12 meses: de <b style={{ color: COR.texto }}>{mesDoPlano}</b> a <b style={{ color: COR.texto }}>{mesFimDoPlano}</b>.</p>
          <p style={ola}>Ele é um ponto de partida. Conforme você anota os seus gastos, o Radar mostra onde o plano acertou e onde errou, e você revisa no Planejamento.</p>
          {comecaNoMeio && <Dica>Como {MESES[new Date().getMonth()]} já começou, o plano parte de {mesDoPlano}, o primeiro mês inteiro. O que você anotar até lá já aparece no app.</Dica>}
        </>) : (<>
          <Rotulo>Seu plano</Rotulo>
          <p style={ola}>Sem valores, o plano começa em branco. Quando quiser, monte o seu no Planejamento.</p>
        </>)}
      </Cartao>
    </>)
    pe = <Pe rotulo="Continuar" onSeguir={seguir} />
  }

  if (passo === 8) {
    titulo = 'Conheça o seu Compass One'
    sub = 'Toque em cada parte para ver para que serve. Fica tudo no menu, quando precisar.'
    corpo = (<>
      {GUIA.map((g, i) => (
        // O primeiro grupo desce para o rótulo não cair no azul do topo.
        <div key={g.quando} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: i === 0 ? 22 : 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COR.textoSuave, margin: '4px 4px 0' }}>{g.quando}</div>
          {g.telas.map(t => (
            <Escolha key={t.tela} icone={t.icone} rotulo={AJUDA[t.tela].titulo} on={aberta === t.tela} seta
              onTocar={() => setAberta(a => (a === t.tela ? '' : t.tela))}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#fff', fontWeight: 600 }}>{AJUDA[t.tela].resumo}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.85)' }}>{t.uso}</p>
            </Escolha>
          ))}
        </div>
      ))}
      <Dica>Em qualquer tela, o <b>?</b> no cabeçalho explica o que está nela.</Dica>
    </>)
    pe = <Pe rotulo="Anotar meu primeiro gasto" onSeguir={() => concluir('/lancar')} pular="Ir para o início" onPular={() => concluir('/')} />
  }

  // No computador as perguntas aparecem dentro de um celular desenhado
  // (pedido do Guilherme em 17/10/2026, sobre o protótipo): a tela é de
  // celular, e esticada na largura toda ficava perdida. No celular de
  // verdade, a moldura some e a página rola como antes.
  return (
    <div className="pa-palco" style={{ minHeight: '100dvh', background: '#f2f5fc', display: 'flex', justifyContent: 'center' }}>
      <style>{`
        @media (min-width: 900px) {
          .pa-palco { height: 100dvh; align-items: center; padding: 24px; box-sizing: border-box }
          .pa-tel { max-width: 390px !important; height: min(844px, calc(100dvh - 48px)); overflow-y: auto;
            border: 10px solid #0b1533; border-radius: 44px; box-shadow: 0 24px 60px rgba(15,40,120,.22); background: #f2f5fc;
            scrollbar-width: none }
          .pa-tel::-webkit-scrollbar { display: none }
          .pa-pe { position: sticky; bottom: 0; background: linear-gradient(rgba(242,245,252,0), #f2f5fc 18px); padding-top: 22px !important }
        }
        @keyframes pa-abre { from { max-height: 0 } to { max-height: 640px } }
        @keyframes pa-slide { from { opacity: 0; transform: translateX(28px) scale(.96) } to { opacity: 1; transform: none } }
        @keyframes pa-pop { 0% { transform: scale(.4) } 60% { transform: scale(1.18) } 100% { transform: scale(1) } }
        .pa-abre { animation: pa-abre .38s cubic-bezier(.2,.8,.2,1) backwards; overflow: hidden }
        .pa-slide { animation: pa-slide .42s cubic-bezier(.2,.8,.2,1) .06s both }
        .pa-pop { animation: pa-pop .3s ease-out }
        .pa-caixa .pa-nome::placeholder { color: rgba(255,255,255,.7) }
        @media (prefers-reduced-motion: reduce) { .pa-abre, .pa-slide, .pa-pop { animation: none } }
      `}</style>
      <div ref={topoRef} className="pa-tel" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ background: TOPO_AZUL, color: '#fff', padding: '22px 22px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>
            {voltar && (
              <button type="button" onClick={voltar} aria-label="Voltar" style={{ background: 'rgba(255,255,255,.14)', border: 'none', color: '#fff',
                width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-chevron-left" aria-hidden style={{ fontSize: 18 }} />
              </button>
            )}
            <i className="ti ti-compass" aria-hidden style={{ fontSize: 20 }} /> Compass One
          </div>
          {passo >= 1 && passo <= TOTAL && (
            <div style={{ display: 'flex', gap: 5, marginTop: 16 }} aria-label={`Pergunta ${passo} de ${TOTAL}`} role="img">
              {Array.from({ length: TOTAL }, (_, i) => (
                <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < passo ? '#fff' : 'rgba(255,255,255,.25)' }} />
              ))}
            </div>
          )}
          <h1 style={{ fontSize: 23, lineHeight: 1.25, margin: '14px 0 0', textWrap: 'balance' } as CSSProperties}>{titulo}</h1>
          {sub && <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(255,255,255,.85)', lineHeight: 1.5 }}>{sub}</p>}
        </div>
        <div style={{ flex: 1, padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: -14 }}>{corpo}</div>
        <div className="pa-pe" style={{ padding: '12px 16px 26px' }}>{pe}</div>
      </div>
    </div>
  )
}

// ── Boas-vindas ───────────────────────────────────────────────────────

/**
 * A primeira tela (17/10/2026, pedido do Guilherme: a versão em cartão
 * "ficou fria, sem graça, sem emoção"). O azul ocupa a largura toda, a
 * bússola balança devagar. O cartão mostra as PERGUNTAS que o app vai responder, não um resultado de
 * exemplo: um "vai sobrar R$ 1.240" criava uma expectativa que a realidade
 * da pessoa pode não cumprir (Guilherme, mesmo dia).
 */
function BoasVindas({ nome, onSeguir, onSozinho }: { nome: string; onSeguir: () => void; onSozinho: () => void }) {
  return (
    <div className="pa-bv" style={{ background: '#f2f5fc' }}>
      <style>{`
        /* Celular: azul em cima e o cartão subindo nele. Computador (largo):
           duas colunas numa tela só, sem rolar (pedido do Guilherme). */
        .pa-bv { min-height: 100dvh; display: flex; flex-direction: column }
        .pa-bv-topo { padding-bottom: 96px }
        .pa-bv-corpo { margin: -72px auto 0; flex: 1 }
        @media (min-width: 900px) {
          .pa-bv { display: grid; grid-template-columns: 1fr 1fr; height: 100dvh; min-height: 560px }
          .pa-bv-topo { padding-bottom: 0; display: flex; align-items: center; justify-content: center }
          .pa-bv-corpo { margin: auto; flex: none; max-height: 100dvh; justify-content: center }
          .pa-bv-pe { margin-top: 0 !important; padding-bottom: 0 !important }
        }
        @keyframes pa-agulha { 0%,100% { transform: rotate(-14deg) } 50% { transform: rotate(14deg) } }
        @keyframes pa-sobe { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .pa-agulha { animation: pa-agulha 4s ease-in-out infinite; transform-origin: center }
        .pa-sobe { animation: pa-sobe .6s ease-out both }
        @media (prefers-reduced-motion: reduce) { .pa-agulha, .pa-sobe { animation: none } }
      `}</style>
      <div className="pa-bv-topo" style={{ background: TOPO_AZUL, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* luzes de fundo: só enfeite, atrás do texto */}
        <span aria-hidden style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', top: -180, right: -120,
          background: 'radial-gradient(circle, rgba(147,197,253,.22), transparent 65%)' }} />
        <span aria-hidden style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', bottom: -200, left: -140,
          background: 'radial-gradient(circle, rgba(147,197,253,.16), transparent 65%)' }} />
        <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', padding: '28px 22px 0', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
          <div className="pa-sobe" style={{ width: 84, height: 84, borderRadius: 26, margin: '6px auto 0', background: 'rgba(255,255,255,.12)',
            border: '1px solid rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(8,20,70,.35)' }}>
            <span className="pa-agulha" style={{ display: 'flex' }}><LogoCompass size={48} /></span>
          </div>
          <h1 className="pa-sobe" style={{ fontSize: 30, lineHeight: 1.2, margin: '22px 0 0', letterSpacing: '-.4px', animationDelay: '.08s' }}>
            {nome ? `Oi, ${nome}! 👋` : 'Oi! 👋'}<br />Que bom ter você aqui.
          </h1>
          <p className="pa-sobe" style={{ margin: '14px auto 0', maxWidth: 400, fontSize: 16, lineHeight: 1.55, color: 'rgba(255,255,255,.88)', animationDelay: '.16s' }}>
            Imagina chegar no fim do mês sabendo <b style={{ color: '#fff' }}>para onde foi cada real</b>.
            É isso que a gente vai construir, juntos.
          </p>
        </div>
      </div>

      <div className="pa-bv-corpo" style={{ width: '100%', boxSizing: 'border-box', maxWidth: 480, padding: '0 16px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="pa-sobe" style={{ background: '#fff', borderRadius: 24, padding: 18, boxShadow: '0 18px 40px rgba(15,40,120,.18)', animationDelay: '.26s',
          display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: COR.textoSuave }}>Com o tempo, o app responde para você</span>
          {[
            { icone: 'ti-wallet', t: 'Quanto ainda posso gastar este mês?' },
            { icone: 'ti-compass', t: 'Vou terminar o mês no azul?' },
            { icone: 'ti-chart-pie', t: 'Para onde está indo o meu dinheiro?' },
          ].map(x => (
            <div key={x.t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: '#eff6ff', color: '#1e40af',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={`ti ${x.icone}`} aria-hidden style={{ fontSize: 20 }} /></span>
              <span style={{ fontSize: 16, fontWeight: 700, color: COR.texto, lineHeight: 1.35 }}>{x.t}</span>
            </div>
          ))}
          <div style={{ fontSize: 14, lineHeight: 1.5, color: COR.textoSuave, padding: 12, borderRadius: 14, background: '#f8fafc' }}>
            Estas são algumas das informações que você terá, <b style={{ color: COR.texto }}>e muito mais</b>.
          </div>
        </div>

        <p className="pa-sobe" style={{ ...ola, textAlign: 'center', fontSize: 16, animationDelay: '.36s' }}>
          <b style={{ color: COR.texto }}>Para te ajudar, preciso te conhecer um pouco melhor.</b><br />Vamos lá?
        </p>
        <div className="pa-sobe" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, animationDelay: '.44s' }}>
          {[
            { icone: 'ti-pencil', t: 'Tudo aproximado' },
            { icone: 'ti-player-skip-forward', t: 'Não sabe? Pule' },
            { icone: 'ti-lock', t: 'Sem senha do banco' },
          ].map(x => (
            <div key={x.t} style={{ background: '#fff', borderRadius: 16, padding: '12px 8px', textAlign: 'center',
              boxShadow: '0 4px 14px rgba(30,64,175,.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: BOLINHA_AZUL, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={`ti ${x.icone}`} aria-hidden style={{ fontSize: 18 }} /></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COR.texto, lineHeight: 1.3 }}>{x.t}</span>
            </div>
          ))}
        </div>

        <div className="pa-bv-pe" style={{ marginTop: 'auto', padding: '4px 0 26px' }}>
          <Pe rotulo="Vamos lá" onSeguir={onSeguir} pular="Prefiro configurar tudo sozinho" onPular={onSozinho} />
        </div>
      </div>
    </div>
  )
}

// ── Peças ─────────────────────────────────────────────────────────────

const ola: CSSProperties = { fontSize: 15, lineHeight: 1.6, color: COR.textoSuave, margin: 0 }
const numeroGrande: CSSProperties = { fontSize: 34, fontWeight: 800, color: COR.sucessoTexto, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }

function chip(on: boolean, pequeno?: boolean, escuro?: boolean): CSSProperties {
  if (escuro) return { ...chip(on, pequeno), border: `1.5px solid ${on ? '#fff' : 'rgba(255,255,255,.4)'}`,
    background: on ? '#fff' : 'rgba(255,255,255,.12)', color: on ? '#1e3a8a' : '#fff' }
  return {
    font: 'inherit', fontSize: pequeno ? 13 : 14, fontWeight: 600, padding: pequeno ? '8px 12px' : '10px 14px', minHeight: pequeno ? 40 : 44,
    borderRadius: 999, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
    border: `1.5px solid ${on ? '#1a56db' : '#dbe3f0'}`, background: on ? '#eff6ff' : '#fff', color: on ? '#1e40af' : COR.texto,
  }
}

function Cartao({ children }: { children: ReactNode }) {
  return <div style={{ background: '#fff', borderRadius: 20, padding: 16, boxShadow: '0 4px 16px rgba(30,64,175,.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
}

function Rotulo({ children }: { children: ReactNode }) {
  const escuro = useContext(NaCaixa)
  return <div style={{ fontSize: 13, fontWeight: 700, color: escuro ? '#fff' : COR.textoSuave }}>{children}</div>
}

function Mini({ children }: { children: ReactNode }) {
  const escuro = useContext(NaCaixa)
  return <div style={{ fontSize: 12, fontWeight: 600, color: escuro ? 'rgba(255,255,255,.85)' : COR.textoSuave, marginBottom: 4 }}>{children}</div>
}

function Dica({ children }: { children: ReactNode }) {
  const escuro = useContext(NaCaixa)
  return (
    <div style={{ fontSize: 13, color: escuro ? 'rgba(255,255,255,.85)' : COR.textoSuave, lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <i className="ti ti-info-circle" aria-hidden style={{ fontSize: 16, color: escuro ? '#fff' : '#1a56db', marginTop: 1 }} /><span>{children}</span>
    </div>
  )
}

/** `colunas`: bancos e cartões em duas colunas, alinhados à esquerda (pedido do Guilherme, 17/10/2026). */
function Chips({ lista, valor, onEscolher, pequeno, colunas }: { lista: string[]; valor: string; onEscolher: (v: string) => void; pequeno?: boolean; colunas?: boolean }) {
  const escuro = useContext(NaCaixa)
  return (
    <div style={colunas ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } : { display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {lista.map(v => (
        <button key={v} type="button" aria-pressed={valor === v} onClick={() => onEscolher(v)}
          style={colunas ? { ...chip(valor === v, pequeno, escuro), justifyContent: 'flex-start', textAlign: 'left', paddingLeft: 16 } : chip(valor === v, pequeno, escuro)}>{v}</button>
      ))}
    </div>
  )
}

/** "De qual banco sai?" / "Em qual cartão?": só aparece com mais de um. Sem escolha, vale o primeiro. */
function DeOnde({ forma, bancos, cartoes, banco, cartao, onBanco, onCartao }: {
  forma: FormaDaConta; bancos: string[]; cartoes: string[]; banco?: string; cartao?: string
  onBanco: (v: string) => void; onCartao?: (v: string) => void
}) {
  if (forma === 'cartao') {
    if (cartoes.length < 2 || !onCartao) return null
    return (<><Mini>Em qual cartão?</Mini><Chips pequeno colunas lista={cartoes} valor={cartao && cartoes.includes(cartao) ? cartao : cartoes[0]} onEscolher={onCartao} /></>)
  }
  if (forma === 'dinheiro' || bancos.length < 2) return null
  return (<><Mini>De qual banco sai?</Mini><Chips pequeno colunas lista={bancos} valor={banco && bancos.includes(banco) ? banco : bancos[0]} onEscolher={onBanco} /></>)
}

function Campo({ valor, onMudar, placeholder, pequeno, numerico, texto, autoFoco }: {
  valor: string; onMudar: (v: string) => void; placeholder: string; pequeno?: boolean; numerico?: boolean; texto?: boolean; autoFoco?: boolean
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #dbe3f0', borderRadius: 14, padding: '0 14px',
      minHeight: pequeno ? 46 : 52, background: '#fff' }}>
      {!numerico && !texto && <span style={{ fontWeight: 700, color: COR.textoSuave }}>R$</span>}
      <input value={valor} onChange={ev => onMudar(ev.target.value)} placeholder={placeholder} autoFocus={autoFoco}
        inputMode={texto ? 'text' : numerico ? 'numeric' : 'decimal'}
        style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: pequeno ? 16 : 20, fontWeight: 700, width: '100%', minWidth: 0,
          color: COR.texto, background: 'transparent', fontVariantNumeric: 'tabular-nums' }} />
    </label>
  )
}

/** Dentro da caixa azul os rótulos e as pílulas trocam para a paleta do
 *  fundo escuro (`#1e40af` no extremo claro: branco 8,7; 75% 5,1). */
const NaCaixa = createContext(false)

/** A caixa azul que entra como transição de slide (pedido do Guilherme,
 *  18/10/2026: "chama mais atenção"). Ao abrir, rola até ficar à vista. */
function CaixaAzul({ children, abre = true, rolar = abre }: { children: ReactNode; abre?: boolean; rolar?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (!rolar) return; const t = setTimeout(() => ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 380); return () => clearTimeout(t) }, [rolar])
  return (
    <div ref={ref} className={abre ? 'pa-abre' : undefined}>
      <div className="pa-slide pa-caixa" style={{ borderRadius: 14, background: TOPO_AZUL, padding: 14, display: 'grid', gap: 10, position: 'relative' }}>
        <NaCaixa.Provider value={true}>{children}</NaCaixa.Provider>
      </div>
    </div>
  )
}

/** Uma linha que se marca com um toque; marcada, abre a caixa azul embaixo. */
function Escolha({ icone, rotulo, on, selo, seta, onTocar, children }: {
  icone?: string; rotulo: string; on: boolean; selo?: string; seta?: boolean; onTocar: () => void; children?: ReactNode
}) {
  const check = (
    <span aria-hidden className={on ? 'pa-pop' : undefined} style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', border: `2px solid ${on ? '#1a56db' : '#c3ccd8'}`, background: on ? '#1a56db' : 'transparent', color: '#fff' }}>
      {on && <i className="ti ti-check" style={{ fontSize: 14 }} />}
    </span>
  )
  return (
    <div style={{ border: `1.5px solid ${on ? '#1a56db' : '#dbe3f0'}`, background: on ? '#eff6ff' : '#fff', borderRadius: 16,
      transition: 'background .2s, border-color .2s, box-shadow .2s', boxShadow: on ? '0 8px 22px rgba(30,64,175,.16)' : 'none', overflow: 'hidden' }}>
      <button type="button" aria-pressed={on} onClick={onTocar} style={{ font: 'inherit', background: 'none', border: 'none', padding: icone ? '8px 12px' : '0 12px',
        display: 'flex', alignItems: 'center', gap: icone ? 12 : 10, width: '100%', minHeight: 48, cursor: 'pointer', textAlign: 'left', color: COR.texto }}>
        {icone ? (
          <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: on ? BOLINHA_AZUL : '#eff6ff', color: on ? '#fff' : '#1e40af', transition: 'background .2s' }}>
            <i className={`ti ${icone}`} aria-hidden style={{ fontSize: 20 }} /></span>
        ) : check}
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: on ? '#1e3a8a' : COR.texto }}>{rotulo}</span>
        {selo && <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#1e40af', borderRadius: 999, padding: '3px 9px' }}>{selo}</span>}
        {icone && (seta
          ? <i className="ti ti-chevron-down" aria-hidden style={{ fontSize: 20, color: '#1e40af', transition: 'transform .25s', transform: on ? 'rotate(180deg)' : 'none' }} />
          : check)}
      </button>
      {on && children && <div style={{ padding: '0 8px 8px' }}><CaixaAzul>{children}</CaixaAzul></div>}
    </div>
  )
}

/** O campo grande da caixa azul ("Quanto tem lá hoje?"). */
function CampoGrande({ valor, onMudar, rotulo, autoFoco = true }: { valor: string; onMudar: (v: string) => void; rotulo: string; autoFoco?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 12, padding: '0 14px', minHeight: 52 }}>
      <span style={{ fontWeight: 700, color: COR.textoSuave }}>R$</span>
      <input value={valor} onChange={ev => onMudar(ev.target.value)} placeholder="0" inputMode="decimal" autoFocus={autoFoco} aria-label={rotulo}
        style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: 22, fontWeight: 800, width: '100%', minWidth: 0,
          color: COR.texto, background: 'transparent', fontVariantNumeric: 'tabular-nums' }} />
    </label>
  )
}

function Pergunta({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{children}</div>
}

function BotaoNaCaixa({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ font: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.14)',
      border: '1px solid rgba(255,255,255,.35)', borderRadius: 999, padding: '7px 12px', cursor: 'pointer', justifySelf: 'start' }}>{children}</button>
  )
}

/** Item que a pessoa acrescentou ("Outra conta", compra parcelada): a mesma caixa azul, com ✕. */
function Bloco({ children, onRemover }: { children: ReactNode; onRemover: () => void }) {
  return (
    <CaixaAzul>
      <button type="button" onClick={onRemover} aria-label="Remover" style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32,
        borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.14)', color: '#fff', cursor: 'pointer' }}>
        <i className="ti ti-x" aria-hidden style={{ fontSize: 16 }} />
      </button>
      {children}
    </CaixaAzul>
  )
}

function NomeLivre({ valor, onMudar, placeholder, autoFoco }: { valor: string; onMudar: (v: string) => void; placeholder: string; autoFoco?: boolean }) {
  const escuro = useContext(NaCaixa)
  return (
    <input className="pa-nome" value={valor} onChange={ev => onMudar(ev.target.value)} placeholder={placeholder} aria-label={placeholder} autoFocus={autoFoco ?? !valor}
      maxLength={40} style={{ border: 'none', borderBottom: `1.5px solid ${escuro ? 'rgba(255,255,255,.5)' : COR.borda}`, font: 'inherit', fontSize: 16, fontWeight: 700,
        padding: '6px 36px 6px 0', outline: 'none', color: escuro ? '#fff' : COR.texto, background: 'transparent' }} />
  )
}

function Adicionar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...chip(false), alignSelf: 'flex-start', color: '#1e40af' }}>
      <i className="ti ti-plus" aria-hidden style={{ fontSize: 18 }} /> {children}
    </button>
  )
}

function Legenda({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COR.texto }}>
      <span style={{ width: 12, height: 12, borderRadius: 4, background: cor, flexShrink: 0 }} />{rotulo}
      <span style={{ marginLeft: 'auto', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{R(valor)}</span>
    </div>
  )
}

function Pe({ rotulo, onSeguir, desabilitado, pular, onPular }: { rotulo: string; onSeguir: () => void; desabilitado?: boolean; pular?: string; onPular?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button type="button" onClick={onSeguir} disabled={desabilitado} style={{ font: 'inherit', fontSize: 16, fontWeight: 700, minHeight: 52,
        borderRadius: 16, border: 'none', background: BOLINHA_AZUL, color: '#fff', cursor: desabilitado ? 'default' : 'pointer', opacity: desabilitado ? 0.45 : 1 }}>
        {rotulo}
      </button>
      {pular && onPular && (
        <button type="button" onClick={onPular} style={{ font: 'inherit', fontSize: 14, fontWeight: 600, background: 'none', border: 'none',
          color: '#1a56db', cursor: 'pointer', padding: 6 }}>{pular}</button>
      )}
    </div>
  )
}
