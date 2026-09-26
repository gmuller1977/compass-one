import { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, type CatReal } from './AcShared'
import { RADAR_COR_CLARO as COR, faixaRadar } from './radarCores'
import { buildAllCats, calcGrupoReal, calcGrupoPrev, pickReal, type PlanCat } from './evolucaoCalcs'
import EvolucaoLinha from './EvolucaoLinha'

/**
 * O cabeçalho do grupo tem fundo FIXO — cinza-claro —, e a cor fica só na
 * barra e nos números.
 * Decidido pelo Guilherme em 26/09/2026. Antes o fundo inteiro mudava com o
 * percentual — azul-claro, azul-escuro, vermelho acima de 100% —, e a barra
 * era um traço de 60×5px que ninguém lia.
 *
 * Barra e número usam EXATAMENTE a mesma cor, a pedido dele — as mesmas das
 * categorias abertas embaixo. A barra tem trilho branco e borda marinho, que
 * desenha os 100% para a parte vazia se ler como vazia.
 *
 * As cores e os contrastes medidos moram em radarCores (RADAR_COR_CLARO).
 *
 * Verde = dentro do plano, vermelho = problema; o tom do verde diz se há
 * folga. A regra inteira está em radarCores.
 */
// CINZA-CLARO, e não azul: neutro, ele não puxa o tom do vermelho e do verde,
// e deixa espaço para o tom claro de cada um ler diferente do escuro. Cinza
// se separa pouco do branco das categorias (1,23), e por isso há borda.
const FUNDO   = 'linear-gradient(135deg, #e6ebf1, #d8dfe8)'
const BORDA   = '1px solid #c3ccd8'
// Fundo claro pede texto escuro: o nome no azul-marinho de Lançamentos, e os
// rótulos num cinza-azulado. Barra com trilho BRANCO e borda marinho.
const TEXTO   = '#1e3a8a'
const ROTULO  = 'rgba(15,23,42,.75)'
const TRILHO  = '#ffffff'

interface EvolucaoGrupoProps {
  tipo: 'saida' | 'entrada'
  grupo: string
  planCats: PlanCat[]
  realMap: Record<string, CatReal>
  categorias: Categoria[]
  cartaoNomes: Set<string>
  mes: number
}

export default function EvolucaoGrupo({
  tipo, grupo, planCats, realMap, categorias, cartaoNomes, mes,
}: EvolucaoGrupoProps) {
  // Fechado por padrão: com os grupos recolhidos a tela vira um painel de
  // barras que se lê de cima a baixo. Quem quer as categorias abre o grupo.
  const [aberto, setAberto] = useState(false)
  const isEntrada = tipo === 'entrada'
  const grupoLabel = grupo === '__sem_grupo__' ? 'Outras' : grupo

  const allCats = buildAllCats(tipo, grupo, planCats, realMap, categorias, cartaoNomes)
  if (allCats.length === 0) return null

  const totalPrev = calcGrupoPrev(allCats, mes)
  const totalReal = calcGrupoReal(allCats, realMap)

  const grupoIcone = (() => {
    const primNome = allCats[0]?.nome
    if (!primNome) return isEntrada ? '💰' : '📂'
    return iconeCategoria(categorias, primNome).icone
  })()

  const semDados   = totalPrev <= 0 && totalReal <= 0
  const perc       = totalPrev > 0 ? totalReal / totalPrev : (totalReal > 0 ? 1 : 0)
  const percClamp  = Math.min(perc, 1)
  const percLabel  = semDados ? '—' : `${Math.round(perc * 100)}%`
  // A cor segue o percentual ARREDONDADO, o que está escrito na tela. Com o
  // exato, 89,53% aparecia como "90%" em verde enquanto 90% de verdade é
  // laranja — o rótulo e a cor discordavam no mesmo cabeçalho.
  const faixa      = faixaRadar(Math.round(perc * 100) / 100, isEntrada)
  const corFaixa   = COR[faixa]
  const corNumero  = semDados ? TEXTO : corFaixa
  const tipoLabel  = isEntrada ? 'Recebimento' : 'Pagamento'
  const alternar   = () => setAberto(v => !v)

  return (
    <div style={{ flexShrink: 0 }}>
      <div
        role="button" tabIndex={0} aria-expanded={aberto}
        onClick={alternar}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar() } }}
        style={{
          background: FUNDO, color: TEXTO, cursor: 'pointer', border: BORDA,
          borderRadius: aberto ? '12px 12px 0 0' : 12,
          padding: '12px 16px',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            {grupoIcone}
          </div>
          {/* Nome à esquerda, e à direita duas colunas FIXAS: números e barra.
              A barra vem DEPOIS dos números (pedido do Guilherme, depois de ver
              ela antes deles) e, com largura fixa, continua alinhada em todos os
              grupos — os grupos empilhados ainda formam um gráfico de barras. */}
          {/* Nome em branco e 16px, do tamanho dos números — pedido do
              Guilherme. O TIPO fica numa seta antes do nome, a mesma dos cartões
              do topo ("↑ Receitas", "↓ Despesas"): ↑ verde para receita, ↓
              vermelha para despesa. A barra e os números continuam dizendo o
              STATUS. Tons e contrastes: radarCores. */}
          <div title={`${tipoLabel} — ${grupoLabel}`} style={{ flex: 1, minWidth: 140, fontSize: 14, fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {/* Seta DESENHADA, e não o caractere: "↑" é um traço fino em quase
                toda fonte, e o negrito quase não o engrossa. Traço de 3px em
                16×16. Tons e contrastes: radarCores. */}
            <svg role="img" aria-label={isEntrada ? 'Receita' : 'Despesa'} width={16} height={16} viewBox="0 0 16 16"
              style={{ marginRight: 8, verticalAlign: '-2px', flexShrink: 0,
                transform: isEntrada ? 'none' : 'rotate(180deg)' }}>
              <path d="M8 14V3M3 7.5 8 2.5l5 5" fill="none" stroke={isEntrada ? COR.bom : COR.ruim}
                strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tipoLabel} — {grupoLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6,
            whiteSpace: 'nowrap', minWidth: 290, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: corNumero }}>
              {totalReal > 0 ? fmt(totalReal) : '—'}
            </span>
            <span style={{ fontSize: 11, color: ROTULO }}>
              de {totalPrev > 0 ? fmt(totalPrev) : '—'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: corNumero, minWidth: 44, textAlign: 'right' }}>
              {percLabel}
            </span>
          </div>
          {/* Borda branca contornando a barra INTEIRA: desenha os 100% e deixa
              a parte vazia legível como vazia sobre o trilho escuro. */}
          <div style={{ width: 200, flexShrink: 0, height: 20, borderRadius: 10, background: TRILHO, overflow: 'hidden',
            boxSizing: 'border-box', border: `2px solid ${semDados ? 'rgba(30,58,138,.35)' : TEXTO}` }}>
            {!semDados && (
              <div style={{ height: '100%', borderRadius: 10, width: `${percClamp * 100}%`,
                background: corFaixa, transition: 'width .3s ease' }} />
            )}
          </div>
          <span aria-hidden="true" style={{
            fontSize: 12, color: ROTULO, width: 12, textAlign: 'center',
            transition: 'transform .15s', transform: aberto ? 'rotate(180deg)' : 'none',
          }}>▾</span>
        </div>

      </div>

      {/* O conteúdo aberto é BRANCO, pedido do Guilherme. As categorias usam
          os tons escuros da mesma paleta — ver radarCores. */}
      {aberto && (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0',
          borderTop: 0, borderRadius: '0 0 12px 12px', overflow: 'hidden',
        }}>
          {allCats.map((cat, idx) => {
            const cd = pickReal(realMap, cat.nome, cat.descricao)
            return (
              <EvolucaoLinha
                key={`${tipo}-${grupo}-${cat.nome}-${cat.descricao}-${idx}`}
                nome={cat.nome}
                descricao={cat.descricao || undefined}
                prev={cat.v[mes] ?? 0}
                real={cd?.total ?? 0}
                isEntrada={isEntrada}
                categorias={categorias}
                lancamentos={cd?.lancamentos ?? []}
                totalBanc={cd?.totalBanc ?? 0}
                totalCart={cd?.totalCart ?? 0}
                totalDinheiro={cd?.totalDinheiro ?? 0}
                mes={mes}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
