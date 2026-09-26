import { useState } from 'react'
import type { PrevistoDetalhe, ItemPrevistoNoMes } from '../../utils/saldoConta'
import { fmt, MESES_CURTOS, MESES_FULL } from './AcShared'

/**
 * Paleta sobre o fundo próprio do bloco, `#0f2878` — o mesmo da memória de
 * cálculo de Lançamentos. Medido no pior caso, a faixa do detalhe aberto
 * (branco a 6% por cima, rgb 29,53,128):
 *
 *   branco 11,21 · #86efac 7,98 · #fecaca 7,75 · branco 75% 7,06 · 65% 5,68
 *
 * Branco a 55% daria 4,53 — no limite —, e por isso nada aqui fica abaixo de 65%.
 */
const FUNDO  = '#0f2878'
const FAIXA  = 'rgba(255,255,255,.06)'
const TEXTO  = '#fff'
const LABEL  = 'rgba(255,255,255,.75)'
const APOIO  = 'rgba(255,255,255,.65)'
const RECEITA = '#86efac'
const DESPESA = '#fecaca'
const LINHA  = 'rgba(255,255,255,.12)'

type Linha = { chave: string; nome: string; descricao?: string; valor: number; meses: number }
type Grupo = { grupo: string; valor: number; linhas: Linha[] }

/**
 * Junta as linhas da janela por categoria.
 *
 * Dezembro visto de setembro traz o aluguel quatro vezes, uma por mês. Na tela
 * ele é uma linha só, com o total e "4 meses" ao lado — quatro linhas iguais
 * empilhadas leriam como quatro aluguéis.
 */
function agrupar(itens: ItemPrevistoNoMes[]): Grupo[] {
  const grupos = new Map<string, Map<string, Linha & { _m: Set<string> }>>()
  for (const it of itens) {
    const chave = it.nome + '\u0000' + (it.descricao ?? '')
    const g = grupos.get(it.grupo) ?? new Map()
    grupos.set(it.grupo, g)
    const l = g.get(chave) ?? { chave, nome: it.nome, descricao: it.descricao, valor: 0, meses: 0, _m: new Set() }
    l.valor += it.valor
    l._m.add(`${it.ano}-${it.mes}`)
    l.meses = l._m.size
    g.set(chave, l)
  }
  return [...grupos.entries()]
    .map(([grupo, g]) => {
      const linhas = [...g.values()].map(({ _m: _, ...l }) => l).sort((a, b) => b.valor - a.valor)
      return { grupo, valor: linhas.reduce((s, l) => s + l.valor, 0), linhas }
    })
    .sort((a, b) => b.valor - a.valor)
}

const nomeDoGrupo = (g: string) => (g === '__sem_grupo__' ? 'Outras' : g)
const soma = (xs: { valor: number }[]) => xs.reduce((s, x) => s + x.valor, 0)

/**
 * O saldo final previsto, aberto nas partes que o formam.
 *
 * Tudo aqui sai de UMA chamada de `detalharPrevisto` — a mesma que dá o
 * número do cartão "Saldo atual" logo acima. Não há conta própria: a última
 * linha é `detalhe.valor`, e as de cima são as listas que a mesma passagem
 * coletou. É o que fez a memória de cálculo de Lançamentos convencer, e a
 * `prova28` tranca que as partes fecham com o total.
 */
export default function RadarPrevistoBloco({ detalhe, cenario }: {
  detalhe: PrevistoDetalhe
  cenario: string
}) {
  const [aberto, setAberto] = useState<string | null>(null)

  // Mês fechado: não há o que prever. Some em silêncio seria pior — quem
  // abriu o Radar de agosto procurando o bloco merece saber por que ele não está.
  if (!detalhe.previsto) {
    return (
      <div style={{ background: FUNDO, borderRadius: 14, padding: '14px 18px',
        color: LABEL, fontSize: 13 }}>
        Mês fechado — não há o que prever. O saldo final é o realizado,{' '}
        <b style={{ color: TEXTO }}>{fmt(detalhe.valor)}</b>.
      </div>
    )
  }

  const { meses } = detalhe
  const janela = meses.length === 1
    ? MESES_FULL[meses[0].mes]
    : `${MESES_CURTOS[meses[0].mes]}–${MESES_CURTOS[meses[meses.length - 1].mes]}`

  const partes: { id: string; rotulo: string; sinal: '+' | '−'; itens: ItemPrevistoNoMes[] }[] = [
    { id: 'receitas', rotulo: 'Receitas previstas',          sinal: '+', itens: [...detalhe.fixasEntrada, ...detalhe.variaveisEntrada] },
    { id: 'fixas',    rotulo: 'Despesas fixas a pagar',      sinal: '−', itens: detalhe.fixasSaida },
    { id: 'variavel', rotulo: 'Despesas variáveis a realizar', sinal: '−', itens: detalhe.variaveisSaida },
    { id: 'fatura',   rotulo: 'Fatura do cartão a pagar',    sinal: '−', itens: detalhe.faturas },
  ]
  // Linha zerada não aparece — quem não tem cartão não lê sobre fatura.
  const visiveis = partes.filter(p => soma(p.itens) > 0)

  const valorSt: React.CSSProperties = {
    fontVariantNumeric: 'tabular-nums', fontWeight: 700, whiteSpace: 'nowrap',
  }

  return (
    <div style={{ background: FUNDO, borderRadius: 14, padding: '16px 18px', color: TEXTO }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Como o mês termina</div>
        <div style={{ fontSize: 11.5, color: LABEL }}>
          {meses.length > 1 ? `janela ${janela}` : janela} · cenário {cenario}
        </div>
      </div>

      <LinhaTopo rotulo="Saldo atual" valor={fmt(detalhe.base)} cor={TEXTO} estilo={valorSt} />

      {visiveis.map(p => {
        const estaAberto = aberto === p.id
        const total = soma(p.itens)
        return (
          <div key={p.id}>
            <button
              onClick={() => setAberto(estaAberto ? null : p.id)}
              aria-expanded={estaAberto}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '9px 0', border: 'none', borderTop: `1px solid ${LINHA}`,
                background: 'transparent', color: TEXTO, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
              }}>
              <span aria-hidden="true" style={{
                display: 'inline-block', width: 10, color: LABEL, fontSize: 10,
                transition: 'transform .15s', transform: estaAberto ? 'rotate(90deg)' : 'none',
              }}>▸</span>
              <span style={{ flex: 1 }}>{p.sinal} {p.rotulo}</span>
              <span style={{ ...valorSt, color: p.sinal === '+' ? RECEITA : DESPESA }}>
                {p.sinal}{fmt(total)}
              </span>
            </button>
            {estaAberto && <Detalhe itens={p.itens} sinal={p.sinal} janelaLonga={meses.length > 1} />}
          </div>
        )
      })}

      <div style={{ borderTop: `2px solid rgba(255,255,255,.35)`, marginTop: 2 }}>
        <LinhaTopo rotulo="= Saldo final previsto" valor={fmt(detalhe.valor)}
          cor={detalhe.valor >= 0 ? TEXTO : DESPESA} estilo={{ ...valorSt, fontSize: 16 }} forte />
      </div>
    </div>
  )
}

function LinhaTopo({ rotulo, valor, cor, estilo, forte }: {
  rotulo: string; valor: string; cor: string; estilo: React.CSSProperties; forte?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '9px 0 9px 18px' }}>
      <span style={{ flex: 1, fontSize: forte ? 14 : 13, fontWeight: forte ? 800 : 400,
        color: forte ? TEXTO : LABEL }}>{rotulo}</span>
      <span style={{ ...estilo, color: cor }}>{valor}</span>
    </div>
  )
}

function Detalhe({ itens, sinal, janelaLonga }: {
  itens: ItemPrevistoNoMes[]; sinal: '+' | '−'; janelaLonga: boolean
}) {
  const grupos = agrupar(itens)
  // Fatura não tem grupo: cada cartão já é a linha. Um cabeçalho "__fatura__"
  // em cima de uma lista de cartões seria nível à toa.
  const semNivelDeGrupo = grupos.length === 1 && grupos[0].grupo === '__fatura__'

  return (
    <div style={{ background: FAIXA, borderRadius: 8, padding: '4px 12px 8px', margin: '0 0 8px 18px' }}>
      {grupos.map(g => {
        // Grupo com UMA categoria de mesmo nome ("Lazer" dentro de "Lazer") é
        // o mesmo nível repetido duas vezes, com o mesmo valor. Pula o cabeçalho.
        const repetido = g.linhas.length === 1 && g.linhas[0].nome === nomeDoGrupo(g.grupo)
        const semCabecalho = semNivelDeGrupo || repetido
        return (
        <div key={g.grupo} style={{ paddingTop: 6 }}>
          {!semCabecalho && (
            <div style={{ display: 'flex', fontSize: 11, fontWeight: 800, color: LABEL,
              textTransform: 'uppercase', letterSpacing: '.4px', padding: '4px 0' }}>
              <span style={{ flex: 1 }}>{nomeDoGrupo(g.grupo)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{sinal}{fmt(g.valor)}</span>
            </div>
          )}
          {g.linhas.map(l => (
            <div key={l.chave} style={{ display: 'flex', alignItems: 'baseline', gap: 8,
              fontSize: 12.5, padding: '4px 0 4px ' + (semCabecalho ? '0' : '10px') }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                {l.nome}{l.descricao ? <span style={{ color: APOIO }}> · {l.descricao}</span> : null}
                {janelaLonga && l.meses > 1 && (
                  <span style={{ color: APOIO, fontSize: 11 }}> · {l.meses} meses</span>
                )}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {sinal}{fmt(l.valor)}
              </span>
            </div>
          ))}
        </div>
        )
      })}
    </div>
  )
}
