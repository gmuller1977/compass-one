import { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, type CatReal } from './AcShared'
import { RADAR_COR_AZUL as COR, RADAR_TRILHO_AZUL as TRILHO, faixaRadar } from './radarCores'
import { buildAllCats, calcGrupoReal, calcGrupoPrev, pickReal, type PlanCat } from './evolucaoCalcs'
import EvolucaoLinha from './EvolucaoLinha'

/**
 * O cabeçalho do grupo é SEMPRE azul, e a cor fica só na barra e nos números.
 * Decidido pelo Guilherme em 26/09/2026. Antes o fundo inteiro mudava com o
 * percentual — azul-claro, azul-escuro, vermelho acima de 100% —, e a barra
 * era um traço de 60×5px que ninguém lia.
 *
 * Barra e número usam EXATAMENTE a mesma cor, a pedido dele. O trilho é escuro
 * e a barra inteira tem borda branca: o trilho escuro sozinho sumia no azul, e
 * a borda desenha os 100% para a parte vazia se ler como vazia.
 *
 * O fundo carrega número colorido, então vale a regra do CLAUDE.md: nenhum
 * azul com valor colorido mais claro que #1e40af. Medido nesse extremo:
 *
 *   número  #4ade80 5,01 · #fde047 6,62 · #fca5a5 4,60 · branco 85% 6,75
 *   barra   contra o trilho escuro: #4ade80 6,92 · #fde047 9,14 · #fca5a5 6,35
 *   borda   branca contra o azul: 8,72
 *
 * Preço aceito: nestes tons claros, verde e vermelho têm quase o mesmo brilho
 * (1,09). Para daltonismo vermelho-verde as duas barras se parecem; o
 * percentual escrito ao lado desempata.
 *
 * "Atenção" é amarelo, não laranja: laranja e vermelho tinham quase o mesmo
 * brilho, e o amarelo casa com o aviso do otimista na barra do rodapé.
 */
const FUNDO   = 'linear-gradient(135deg, #0f2878, #1e40af)'

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
  const corNumero  = semDados ? '#fff' : COR[faixa]
  const tipoLabel  = isEntrada ? 'Recebimento' : 'Pagamento'
  const alternar   = () => setAberto(v => !v)

  return (
    <div style={{ flexShrink: 0 }}>
      <div
        role="button" tabIndex={0} aria-expanded={aberto}
        onClick={alternar}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar() } }}
        style={{
          background: FUNDO, color: '#fff', cursor: 'pointer',
          borderRadius: aberto ? '12px 12px 0 0' : 12,
          padding: '12px 16px',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
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
              STATUS. Mesmos tons do azul: #4ade80 5,01 e #fca5a5 4,60. */}
          <div title={`${tipoLabel} — ${grupoLabel}`} style={{ flex: 1, minWidth: 140, fontSize: 16, fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {/* Seta DESENHADA, e não o caractere: "↑" é um traço fino em quase
                toda fonte, e o negrito quase não o engrossa. Traço de 3px em
                16×16. Gráfico no azul: #4ade80 5,01 e #fca5a5 4,60. */}
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
            <span style={{ fontSize: 16, fontWeight: 800, color: corNumero }}>
              {totalReal > 0 ? fmt(totalReal) : '—'}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.85)' }}>
              de {totalPrev > 0 ? fmt(totalPrev) : '—'}
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: corNumero, minWidth: 44, textAlign: 'right' }}>
              {percLabel}
            </span>
          </div>
          {/* Borda branca contornando a barra INTEIRA: desenha os 100% e deixa
              a parte vazia legível como vazia sobre o trilho escuro. */}
          <div style={{ width: 200, flexShrink: 0, height: 20, borderRadius: 10, background: TRILHO, overflow: 'hidden',
            boxSizing: 'border-box', border: `2px solid ${semDados ? 'rgba(255,255,255,.5)' : '#fff'}` }}>
            {!semDados && (
              <div style={{ height: '100%', borderRadius: 10, width: `${percClamp * 100}%`,
                background: COR[faixa], transition: 'width .3s ease' }} />
            )}
          </div>
          <span aria-hidden="true" style={{
            fontSize: 12, color: 'rgba(255,255,255,.85)', width: 12, textAlign: 'center',
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
