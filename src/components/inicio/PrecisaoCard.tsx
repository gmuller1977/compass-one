import type { Categoria } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { iconeCategoria } from '../../utils/categoriaIcone'
import type { PrecisaoDoPlano } from '../../utils/precisaoDoPlano'

// Par divergente sobre o branco: quente contra frio, cinza neutro no meio.
// Gastou MAIS #b91c1c (6,47); gastou MENOS #1a56db (6,2). Sem verde para
// "gastou menos": abaixo do plano não é vitória aqui, é erro de planejamento
// na outra direção — o verde diria o contrário.
const MAIS = '#b91c1c'
const MENOS = '#1a56db'
const TEXTO = '#334155'
const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`
const reais = (v: number) => `R$ ${Math.abs(Math.round(v)).toLocaleString('pt-BR')}`
const QUANTAS = ['', 'esta', 'estas duas', 'estas três']

/**
 * "Precisão do plano" da tela Início — onda 4. Os números vêm prontos de
 * utils/precisaoDoPlano; aqui é desenho e texto.
 *
 * O tom não acusa: o plano é uma hipótese sendo refinada. Erro abaixo de 3%
 * vira elogio e a lista some; a frase da tendência diz quando está melhorando.
 */
export default function PrecisaoCard({ p, categorias, isMobile }: {
  p: PrecisaoDoPlano
  categorias: Categoria[]
  isMobile: boolean
}) {
  const acertou = Math.abs(p.despesasPerc) < 0.03
  const lista = acertou ? [] : p.categorias
  const maiorAbs = Math.max(...lista.map(c => Math.abs(c.desvioPerc)), 0.0001)
  const liquido = lista.reduce((s, c) => s + c.desvioReais, 0)
  const metade = Math.floor(p.meses / 2)

  const direcao = (v: number) => (
    <b style={{ color: v >= 0 ? MAIS : MENOS }}>{pct(v)} {v >= 0 ? 'acima' : 'abaixo'}</b>
  )
  const tendencia = p.tendencia && p.percAntigo !== null && p.percRecente !== null
    ? p.tendencia === 'melhorando'
      ? `O erro caiu de ${pct(p.percAntigo)} para ${pct(p.percRecente)} nos últimos ${metade} meses — o plano está ficando mais preciso.`
      : p.tendencia === 'piorando'
        ? `O erro subiu de ${pct(p.percAntigo)} para ${pct(p.percRecente)} nos últimos ${metade} meses — vale rever as categorias abaixo no plano.`
        : `O erro tem ficado estável, perto de ${pct(p.percRecente)}.`
    : null

  return (
    <div style={{ background: COR.branco, borderRadius: 12, padding: isMobile ? '16px 14px' : '18px 20px',
      border: `.5px solid ${COR.borda}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Precisão do plano</div>
          <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>O quanto o previsto tem acertado o realizado</div>
        </div>
        <div style={{ fontSize: 12, color: COR.textoSuave, whiteSpace: 'nowrap' }}>{p.meses} meses fechados</div>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.6, color: TEXTO, marginBottom: 6 }}>
        {acertou ? (
          <>Seu plano tem acertado: as despesas fecharam <b>dentro de 3%</b> do previsto.</>
        ) : (
          <>
            Suas despesas fecharam em média {direcao(p.despesasPerc)} do planejado.
            {p.receitasPerc !== null && (Math.abs(p.receitasPerc) < 0.005
              ? <> As receitas, no previsto.</>
              : <> As receitas, {direcao(p.receitasPerc)}.</>)}
          </>
        )}
      </div>
      {tendencia && <div style={{ fontSize: 12, color: COR.textoSuave, marginBottom: lista.length ? 18 : 0 }}>{tendencia}</div>}

      {lista.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase',
            letterSpacing: '.06em', marginBottom: 11 }}>Onde o plano mais erra</div>
          {lista.map(c => {
            const mais = c.desvioReais > 0
            const cor = mais ? MAIS : MENOS
            // A maior vai até 36% de cada lado: o resto é o espaço do percentual escrito
            // na ponta, que não pode quebrar para baixo da barra.
            const larg = (Math.abs(c.desvioPerc) / maiorAbs) * 36
            const nome = c.descricao ? `${c.nome} · ${c.descricao}` : c.nome
            return (
              <div key={`${c.nome}||${c.descricao}`} style={{ marginBottom: 15 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <span aria-hidden style={{ fontSize: 14, flexShrink: 0 }}>{iconeCategoria(categorias, c.nome).icone}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: COR.texto,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</span>
                  <span style={{ fontSize: 11, color: COR.textoSuave, whiteSpace: 'nowrap' }}>
                    {mais ? `estourou em ${c.mesesAcima} de ${c.meses}` : `sobrou em ${c.mesesAbaixo} de ${c.meses}`}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    minWidth: 78, textAlign: 'right', color: cor }}>
                    {mais ? '+' : '−'}{reais(c.desvioReais)}/mês
                  </span>
                </div>
                {/* Barra divergente: o centro é o plano certo; direita gastou
                    mais, esquerda gastou menos. Escala simétrica pelo maior
                    desvio da lista. */}
                <div role="img" aria-label={`${nome}: ${mais ? 'gastou' : 'sobrou'} ${pct(c.desvioPerc)} ${mais ? 'acima' : 'abaixo'} do planejado, em média`}
                  style={{ position: 'relative', height: 7, background: '#f1f5f9', borderRadius: 4 }}>
                  <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#cbd5e1' }} />
                  <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 4, background: cor, width: `${larg}%`,
                    ...(mais ? { left: '50%' } : { right: '50%' }) }} />
                  <span aria-hidden style={{ position: 'absolute', top: -1, fontSize: 10, fontWeight: 700, lineHeight: '9px', whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums', color: cor,
                    ...(mais ? { left: `calc(50% + ${larg}% + 6px)` } : { right: `calc(50% + ${larg}% + 6px)` }) }}>
                    {mais ? '+' : '−'}{pct(c.desvioPerc)}
                  </span>
                </div>
              </div>
            )
          })}

          {Math.round(Math.abs(liquido)) >= 1 && (
            <div style={{ marginTop: 17, paddingTop: 13, borderTop: '1px solid #f1f5f9', fontSize: 12.5,
              color: TEXTO, lineHeight: 1.55 }}>
              Corrigir {QUANTAS[lista.length] ?? 'estas'} no plano mexeria <b>{reais(liquido)} por mês</b> —
              e o seu saldo previsto passaria a errar menos.
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: COR.textoSuave, marginTop: 10, flexWrap: 'wrap' }}>
            <span><i style={{ width: 9, height: 9, borderRadius: 2, display: 'inline-block', marginRight: 5, verticalAlign: -1, background: MAIS }} />gastou mais do que planejou</span>
            <span><i style={{ width: 9, height: 9, borderRadius: 2, display: 'inline-block', marginRight: 5, verticalAlign: -1, background: '#cbd5e1' }} />plano certo</span>
            <span><i style={{ width: 9, height: 9, borderRadius: 2, display: 'inline-block', marginRight: 5, verticalAlign: -1, background: MENOS }} />gastou menos</span>
          </div>
        </>
      )}
    </div>
  )
}
