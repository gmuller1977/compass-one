import React from 'react'
import type { Conta, Categoria } from '../../context/AppContext'
import type { CenarioPrevisao } from '../../utils/saldoConta'
import {
  fmt, NOMES_MESES,
  type CatFixa, type Lancamento, type DadosMes, type TipoLanc, type FormaPag, type Memoria,
} from './NleShared'
import NleExtratoMobile from './NleExtratoMobile'
import { M } from '../mobile/estilo'

export type Props = {
  isMobile: boolean
  mobileView: 'extrato' | 'form'
  isDinheiro: boolean
  mes: number
  ano: number
  totalDias: number
  eMesAtual: boolean
  diaHoje: number
  anoHoje: number
  mesHoje: number
  fixas: CatFixa[]
  categorias: Categoria[]
  mesDados: DadosMes
  saldosDia: Record<number, number>
  saldoBase: number
  saldoMes: number
  /** De onde veio o saldo final previsto, parcela por parcela. */
  memoria: Memoria
  cenarioPrevisao: CenarioPrevisao
  setCenarioPrevisao: (v: CenarioPrevisao) => void
  totalEntradas: number
  totalSaidas: number
  contas: Conta[]
  diaSel: number
  diasAbertos: Set<number>
  highlightDia: number | null
  editandoId: string | null
  editandoFixaId: string | null
  mobileDiaForm: number | null
  fTipo: TipoLanc
  fCat: string
  fSubDesc: string
  fDesc: string
  fValor: string
  fPag: FormaPag
  categoriasSelect: Categoria[]
  /** Abre a caixa de criar categoria sem sair do lançamento. */
  onNovaCategoria: () => void
  subDescsDisponiveis: string[]
  valorInputRef: React.RefObject<HTMLInputElement | null>
  categoriaSelectRef: React.RefObject<HTMLSelectElement | null>
  hojeRef: React.RefObject<HTMLDivElement | null>
  toggleDia: (dia: number) => void
  resetarParaNovo: (dia: number) => void
  setDiaSel: React.Dispatch<React.SetStateAction<number>>
  editarFixa: (dia: number, f: CatFixa) => void
  editarLancamento: (dia: number, l: Lancamento) => void
  excluir: (dia: number, id: string) => void
  lancar: () => void
  desconsolidarFixa: (fixaId: string) => void
  consolidarFixa: (fixaId: string) => void
  setMobileDiaForm: (dia: number | null) => void
  setFTipo: (t: TipoLanc) => void
  setFCat: (v: string) => void
  setFSubDesc: (v: string) => void
  setFDesc: (v: string) => void
  setFValor: (v: string) => void
  setFPag: (v: FormaPag) => void
  setEditandoId: (v: string | null) => void
  setEditandoFixaId: (v: string | null) => void
  ehAutomatico: (f: CatFixa) => boolean
}

/**
 * Memoria de calculo do saldo final previsto.
 *
 * Uma linha por parcela, na ordem em que o mes acontece: o que ja aconteceu,
 * o que ainda vai acontecer, e o total. Linha zerada nao aparece — quem tem so
 * lancamento nao precisa ler sobre fatura estimada.
 *
 * Nada aqui recalcula nada: os numeros vem da mesma passagem que formou o
 * saldo, entao as parcelas fecham no total por construcao.
 */
const NOME_CENARIO: Record<CenarioPrevisao, string> = {
  pessimista: 'Pessimista', moderado: 'Moderado', otimista: 'Otimista',
}

/**
 * O tom do chip do cenario: um violeta so, em tres intensidades.
 *
 * NAO e semaforo, de proposito. Verde, vermelho e ambar ja significam "como
 * voce esta" nesta mesma barra — o proprio numero do saldo e #86efac ou
 * #fca5a5 —, e um chip amarelo ao lado de um saldo verde faria o olho procurar
 * uma relacao que nao existe. Pior: ninguem concorda sobre qual cenario e o
 * verde. Pessimista e a escolha mais SEGURA e o numero mais FEIO ao mesmo
 * tempo, entao metade das pessoas leria a cor ao contrario.
 *
 * Uma cor so, variando de intensidade, comunica a ORDEM entre os tres sem
 * afirmar juizo nenhum. Mais intenso = mais folga o cenario assume.
 *
 * A pilula e clara com texto escuro porque e o unico arranjo que resolve os
 * dois lados: escurecer a pilula para ganhar contraste de texto a faz sumir no
 * azul da barra. Medido — texto #2e1065 da 12,8:1 / 11,0:1 / 8,3:1, e a pilula
 * separa 7,4:1 / 6,3:1 / 4,7:1 do azul e 8,4:1 / 7,2:1 / 5,4:1 do vermelho.
 */
const TOM_CENARIO: Record<CenarioPrevisao, string> = {
  pessimista: '#ede9fe', moderado: '#ddd6fe', otimista: '#c4b5fd',
}

export function ChipCenario({ cenario }: { cenario: CenarioPrevisao }) {
  return (
    <span title={`Cenário ${NOME_CENARIO[cenario].toLowerCase()} — altere em Preferências`}
      style={{
        display:'inline-block', padding:'1px 8px', borderRadius:999,
        background: TOM_CENARIO[cenario], color:'#2e1065',
        fontSize:9.5, fontWeight:700, letterSpacing:.3, whiteSpace:'nowrap',
        textTransform:'uppercase', verticalAlign:'middle',
      }}>
      {NOME_CENARIO[cenario]}
    </span>
  )
}

/**
 * A escolha do cenario, no TOPO da memoria.
 *
 * Ela mora aqui porque e aqui que o efeito dela aparece: trocar de cenario move
 * a linha "Gastos variaveis a realizar" e o total, na mesma tela. Em
 * Preferencias fica a explicacao com exemplo; aqui fica o botao.
 *
 * Estava no rodape e ninguem achava: a barra do saldo vive no PE da tela e o
 * painel abre para baixo, entao a ultima linha caia fora da vista. No topo ela
 * tambem se le melhor — e a premissa do calculo que vem logo abaixo.
 */
function EscolhaCenario({ atual, onEscolher, fundo }: {
  atual: CenarioPrevisao
  onEscolher: (v: CenarioPrevisao) => void
  fundo: string
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
      paddingBottom:9, marginBottom:6, borderBottom:'1px solid rgba(255,255,255,.18)' }}>
      <span style={{ fontSize:10, color:'rgba(255,255,255,.75)', letterSpacing:.3 }}>Cenário</span>
      <div style={{ display:'flex', gap:4 }}>
        {(['pessimista','moderado','otimista'] as CenarioPrevisao[]).map(c => {
          const on = c === atual
          return (
            <button key={c} onClick={() => onEscolher(c)} aria-pressed={on}
              style={{ padding:'3px 9px', borderRadius:999, border:'none', cursor:'pointer',
                fontFamily:'inherit', fontSize:10.5, fontWeight:on?700:500,
                background: on ? '#fff' : 'rgba(255,255,255,.14)',
                color: on ? fundo : '#fff' }}>
              {NOME_CENARIO[c]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MemoriaSaldo({ m, positivo, cenario, onCenario, rotuloAbertura }: {
  m: Memoria; positivo: boolean
  cenario: CenarioPrevisao
  onCenario: (v: CenarioPrevisao) => void
  /** Rótulo e ajuda da primeira linha. A tela Início, num mês futuro, diz
   *  que o saldo inicial também é previsto. Ausente, fica como sempre foi. */
  rotuloAbertura?: [string, string]
}) {
  // Fundo PROPRIO, e nao o do cartao. A caixa do mobile usa COR.azulMedio
  // (#2563eb), mais claro que o limite de #1e40af do CLAUDE.md — sobre ele o
  // verde e o vermelho claro reprovariam. Sobre #0f2878 e #7f1d1d a paleta
  // passa com folga: branco 10,4:1 e 9,9:1; #86efac 4,8:1 e 7,1:1;
  // #fecaca 4,6:1 e 6,8:1; label a 75% 5,1:1 e 6,1:1.
  const fundo = positivo ? '#0f2878' : '#7f1d1d'
  const previstas: [string, number, string][] = [
    ['Receitas fixas a receber',      m.entradasPrevistas,   'Fixas de entrada que ainda nao foram confirmadas'],
    ['Receitas a receber',            m.receitasAReceber,    'O que o plano espera receber e ainda nao chegou'],
    ['Despesas fixas a pagar',        -m.fixasPrevistas,     'Fixas ainda nao confirmadas'],
    ['Fatura do cartao',              -m.faturaEmAberto,     'Ja lancada, ainda nao paga'],
    ['Compras que faltam no cartao',  -m.faturaEstimada,     'O que o plano espera que ainda entre na fatura'],
    ['Gastos variaveis a realizar',   -m.variaveisARealizar, 'O que falta gastar do plano, fora do cartao'],
  ]
  const linhas: [string, number, string][] = [
    [rotuloAbertura?.[0] ?? 'Saldo inicial do mes', m.abertura, rotuloAbertura?.[1] ?? 'Com quanto a conta abriu'],
    ['Receitas recebidas',   m.entradasReais, 'Lancamentos e fixas ja confirmadas'],
    ['Despesas pagas',       -m.saidasReais,  'Lancamentos e fixas ja confirmadas'],
    // So o Radar preenche; ver Memoria.ajusteConciliacao.
    ...(m.ajusteConciliacao !== undefined && Math.abs(m.ajusteConciliacao) > 0.005
      ? [['Ajuste da conciliacao', m.ajusteConciliacao, 'Saldo informado menos o que os lancamentos explicam'] as [string, number, string]]
      : []),
    ...previstas.filter(([, v]) => Math.abs(v) > 0.005),
  ]
  const linha = (rotulo: string, valor: number, ajuda: string, forte = false) => (
    <div key={rotulo} style={{display:'flex',alignItems:'baseline',gap:10,padding:'7px 0',
      borderTop: forte ? '1px solid rgba(255,255,255,.25)' : 'none', marginTop: forte ? 4 : 0}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:forte?700:500,color:'#fff'}}>{rotulo}</div>
        {!forte && <div style={{fontSize:9,color:'rgba(255,255,255,.75)',marginTop:1}}>{ajuda}</div>}
      </div>
      <span style={{fontSize:forte?15:13,fontWeight:forte?800:600,fontVariantNumeric:'tabular-nums',
        whiteSpace:'nowrap',
        color: forte ? (valor>=0?'#86efac':'#fca5a5') : valor<0 ? '#fecaca' : '#fff'}}>
        {valor<0?'−':''}{fmt(Math.abs(valor))}
      </span>
    </div>
  )
  return (
    <div style={{padding:'10px 20px 12px',background:fundo,
      borderRadius:'0 0 12px 12px',borderTop:'1px solid rgba(255,255,255,.18)'}}>
      <EscolhaCenario atual={cenario} onEscolher={onCenario} fundo={fundo} />
      {linhas.map(([r,v,a]) => linha(r,v,a))}
      {linha('Saldo final previsto', m.fechamento, '', true)}
    </div>
  )
}

export default function NleExtrato(props: Props) {
  const {
  isMobile, mes, ano, totalDias, saldosDia, saldoMes, memoria,
  cenarioPrevisao, setCenarioPrevisao,
  } = props

  // Fechada por padrao: a memoria e consulta, nao leitura obrigatoria.
  const [memoriaAberta, setMemoriaAberta] = React.useState(false)
  // O celular tem desenho próprio, no padrão dos apps de banco; os números
  // e as ações são os mesmos — ver NleExtratoMobile.
  if (isMobile) return <NleExtratoMobile {...props} />
  // O computador usa o MESMO desenho do celular para os dias (pedido do
  // Guilherme em 12/10/2026: "PC ou mobile precisam lembrar que é o mesmo
  // sistema"): bolinha de pago, dia "01/10 quinta · saldo", cartão branco.
  // O formulário continua no painel à direita, e a barra do saldo final
  // previsto fica no pé, como antes.
  return (
    <>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:'20px 16px 24px'}}>
          <div style={{maxWidth:820,margin:'0 auto'}}>
            <NleExtratoMobile {...props} desktop />
          </div>
        </div>

        {/* Saldo final previsto — barra fixa desktop. Clicar abre a memoria de
            calculo: era o unico numero da tela sem nenhuma forma de descobrir
            de onde ele veio. */}
        {!isMobile&&(()=>{
          const sf=saldosDia[totalDias]??saldoMes
          const positivo=sf>=0
          return(
            <div style={{padding:'10px 16px 14px',flexShrink:0,background:M.fundo}}>
              <div style={{borderRadius:18,boxShadow:'0 2px 14px rgba(15,40,120,.12)',
                background:positivo?'linear-gradient(135deg,#0f2878,#1e40af)':'linear-gradient(135deg,#7f1d1d,#991b1b)'}}>
                <div role="button" tabIndex={0} aria-expanded={memoriaAberta}
                  onClick={()=>setMemoriaAberta(v=>!v)}
                  onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setMemoriaAberta(v=>!v)}}}
                  style={{padding:'12px 20px',display:'flex',justifyContent:'space-between',
                    alignItems:'center',cursor:'pointer'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#fff',display:'flex',alignItems:'center',gap:6}}>
                      Saldo final previsto
                      <span style={{fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:4,
                        background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.9)'}}>
                        {memoriaAberta?'ocultar cálculo':'ver cálculo'}
                      </span>
                    </div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,.75)',marginTop:3,
                      display:'flex',alignItems:'center',gap:7}}>
                      <span>{NOMES_MESES[mes]} {ano}</span>
                      <ChipCenario cenario={cenarioPrevisao}/>
                    </div>
                  </div>
                  <span style={{fontSize:22,fontWeight:800,letterSpacing:'-.6px',fontVariantNumeric:'tabular-nums',
                    color:positivo?'#86efac':'#fca5a5'}}>
                    {fmt(sf)}
                  </span>
                </div>
                {/* Barra fixa: a memória aberta fica limitada a 35% da tela e rola
                    por dentro — senão espremia os dias e o fim dela sumia. 05/10/2026. */}
                {memoriaAberta&&(
                  <div style={{maxHeight:'35vh',overflowY:'auto',borderRadius:'0 0 18px 18px'}}>
                    <MemoriaSaldo m={memoria} positivo={positivo}
                      cenario={cenarioPrevisao} onCenario={setCenarioPrevisao}/>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </>
  )
}
