import { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, type CatReal } from './AcShared'
import { buildAllCats, calcGrupoReal, calcGrupoPrev, pickReal, type PlanCat } from './evolucaoCalcs'
import EvolucaoLinha from './EvolucaoLinha'

/**
 * O cabeçalho do grupo é SEMPRE azul, e a cor fica só na barra e nos números.
 * Decidido pelo Guilherme em 26/09/2026. Antes o fundo inteiro mudava com o
 * percentual — azul-claro, azul-escuro, vermelho acima de 100% —, e a barra
 * era um traço de 60×5px que ninguém lia.
 *
 * O fundo carrega número colorido, então vale a regra do CLAUDE.md: nenhum
 * azul com valor colorido mais claro que #1e40af. Medido nesse extremo:
 *
 *   número  #4ade80 5,01 · #fde047 6,62 · #fca5a5 4,60 · branco 85% 6,75
 *   barra   contra o trilho escuro: #4ade80 6,92 · #facc15 7,87 · #f87171 4,36
 *
 * O verde do número é o MESMO da barra. O vermelho saturado reprova como texto
 * (3,15), então o número usa o tom claro da mesma cor. O trilho é escuro de
 * propósito: sobre trilho claro o vermelho caía para 2,02 e a barra sumia.
 *
 * "Atenção" é AMARELO, não laranja — foi laranja por algumas horas. Laranja e
 * vermelho têm quase o mesmo brilho (1,22:1 entre as barras): para quem tem
 * daltonismo vermelho-verde, "chegando no limite" e "estourou" viravam a mesma
 * barra. O amarelo se separa do vermelho pelo brilho (1,81). Fica mais perto do
 * verde (1,14), e esse é o erro barato: os dois dizem "ainda não estourou", e o
 * percentual escrito desempata. Também casa com o aviso do otimista na barra
 * do rodapé, que já é #fde047.
 */
const FUNDO   = 'linear-gradient(135deg, #0f2878, #1e40af)'
const TRILHO  = 'rgba(15,23,42,.4)'
const BARRA   = { bom: '#4ade80', atencao: '#facc15', ruim: '#f87171' } as const
const NUMERO  = { bom: '#4ade80', atencao: '#fde047', ruim: '#fca5a5' } as const
type Faixa = keyof typeof BARRA

/**
 * Receita: chegar ao planejado é bom. Despesa: passar dele é ruim. Os cortes
 * são os mesmos que o app já usava nas barras sobre azul (barCorSobreAzul) —
 * só o tom do amarelo mudou.
 */
function faixaDoGrupo(perc: number, isEntrada: boolean): Faixa {
  if (isEntrada) return perc >= 1 ? 'bom' : perc >= 0.8 ? 'atencao' : 'ruim'
  if (perc > 1) return 'ruim'
  if (perc >= 0.9) return 'atencao'
  return 'bom'
}

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
  const faixa      = faixaDoGrupo(Math.round(perc * 100) / 100, isEntrada)
  const corNumero  = semDados ? '#fff' : NUMERO[faixa]
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
          {/* Nome e números em largura FIXA, a barra com o que sobra no meio:
              assim todas as barras começam e terminam no mesmo ponto, e os grupos
              empilhados formam um gráfico de barras que se compara de olho. Com a
              barra depois dos números, "R$ 628,10" e "R$ 18.240,59" faziam cada
              uma começar num lugar. */}
          <div title={`${tipoLabel} — ${grupoLabel}`} style={{ width: 210, flexShrink: 0, fontSize: 13, fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tipoLabel} — {grupoLabel}
          </div>
          <div style={{ flex: 1, minWidth: 80, height: 10, borderRadius: 5, background: TRILHO, overflow: 'hidden' }}>
            {!semDados && (
              <div style={{ height: '100%', borderRadius: 5, width: `${percClamp * 100}%`,
                background: BARRA[faixa], transition: 'width .3s ease' }} />
            )}
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
          <span aria-hidden="true" style={{
            fontSize: 12, color: 'rgba(255,255,255,.85)', width: 12, textAlign: 'center',
            transition: 'transform .15s', transform: aberto ? 'rotate(180deg)' : 'none',
          }}>▾</span>
        </div>

      </div>

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
