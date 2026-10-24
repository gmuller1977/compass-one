import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { type CatReal } from './AcShared'
import { RADAR_TEXTO_CLARO, RADAR_TEXTO_AZUL, RADAR_BARRA, RADAR_BARRA_CLARO, RADAR_BORDA_CLARO, RADAR_TRILHO_AZUL, faixaRadar, destaqueDoGrupo } from './radarCores'
import { buildAllCats, pickReal, cadastroDaLinha, type PlanCat } from './evolucaoCalcs'
import EvolucaoLinha from './EvolucaoLinha'
import { IconeRedondo } from '../mobile/ui'

/**
 * O grupo é um CARTÃO do cardápio (pedido do Guilherme em 12/10/2026: o Radar
 * estava "frio", e ele escolheu o cardápio entre três modelos). Ícone em
 * círculo, nome, o número que importa agora em letra grande (destaqueDoGrupo:
 * "resta R$ X", "passou R$ Y", "✓ pago"), a barra e o "gastou X de Y".
 *
 * Um grupo aberto por vez, e o cartão NÃO sai do lugar (21/10/2026, pedido
 * do Guilherme: aberto, o cartão descia para a linha de baixo e embaralhava a
 * ordem). Quem abre é o Radar: o cartão só ganha destaque, e as categorias
 * (CategoriasDoGrupo) entram numa faixa de largura inteira logo depois da
 * linha dele.
 *
 * Fundo BRANCO, então número e barra usam os tons escuros do Radar
 * (RADAR_COR_CLARO), a mesma regra das categorias: verde-escuro com folga,
 * verde no limite, vermelho só quando passou. Barra e número com EXATAMENTE a
 * mesma cor; trilho #e2e8f0 e borda #64748b desenham os 100%.
 *
 * Histórico: antes era um cabeçalho cinza em linha, com barra de 200px
 * alinhada entre os grupos. A troca abre mão do "gráfico de barras"
 * empilhado — preço aceito na escolha.
 */
const TEXTO  = '#0f172a'
const ROTULO = '#475569'
const TRILHO = '#e2e8f0'
// Aberto, o cartão fica AZUL-ESCURO (pedido do Guilherme, 21/10/2026), o
// gradiente dos cartões do topo, que termina no #1e40af. Ali vale a paleta do
// azul (RADAR_COR_AZUL): verde 5,0, verde-claro 9,1; o vermelho #f87171 dá
// 3,15, aceito por ele nos cartões, e o número tem 20px em negrito (texto
// grande). Rótulo a 75%: 5,1. Barra no trilho escuro com borda branca.
const AZUL_ABERTO = 'linear-gradient(135deg, #0f2878 0%, #1e40af 100%)'

interface EvolucaoGrupoProps {
  tipo: 'saida' | 'entrada'
  grupo: string
  planCats: PlanCat[]
  realMap: Record<string, CatReal>
  categorias: Categoria[]
  cartaoNomes: Set<string>
  mes: number
}

interface EvolucaoGrupoCartaoProps extends EvolucaoGrupoProps {
  aberto: boolean
  onAlternar: () => void
}

export default function EvolucaoGrupo({
  tipo, grupo, planCats, realMap, categorias, cartaoNomes, mes,
  aberto, onAlternar,
}: EvolucaoGrupoCartaoProps) {
  const isEntrada = tipo === 'entrada'
  const grupoLabel = grupo === '__sem_grupo__' ? 'Outras' : grupo

  const allCats = buildAllCats(tipo, grupo, planCats, realMap, categorias, cartaoNomes)
  if (allCats.length === 0) return null

  const primNome = allCats[0]?.nome
  const grupoIcone = primNome ? iconeCategoria(categorias, primNome).icone : (isEntrada ? '💰' : '📂')
  const grupoCor = primNome ? iconeCategoria(categorias, primNome).cor : '#94a3b8'

  // Fixa paga entra pelo valor pago, e grupo só de fixas pagas é "✓ pago" —
  // senão o grupo dizia "resta R$ 0,28" em cima de categorias "✓ pago".
  // Barra e cor julgam só as linhas COM plano; grupo sem plano nenhum fica
  // neutro e mostra só o realizado (C2, 19/10/2026).
  const destaque   = destaqueDoGrupo(allCats.map(cat => ({
    prev: cat.v[mes] ?? 0,
    real: pickReal(realMap, cat.nome, cat.descricao, categorias)?.total ?? 0,
    fixa: !!cadastroDaLinha({ nome: cat.nome, descricao: cat.descricao }, categorias)?.fixa,
  })), isEntrada)
  const semDados   = !destaque.julgado
  const perc       = destaque.prev > 0 ? destaque.real / destaque.prev : 0
  const percClamp  = Math.min(perc, 1)
  const percLabel  = semDados ? 'sem plano' : `${Math.round(perc * 100)}%`
  // A cor segue o percentual ARREDONDADO, o que está escrito na tela. Com o
  // exato, 89,53% aparecia como "90%" em verde enquanto 90% de verdade é
  // laranja — o rótulo e a cor discordavam no mesmo cabeçalho.
  const faixa      = faixaRadar(Math.round(perc * 100) / 100, isEntrada)
  const COR        = aberto ? RADAR_TEXTO_AZUL : RADAR_TEXTO_CLARO
  const texto      = aberto ? '#ffffff' : TEXTO
  const rotulo     = aberto ? 'rgba(255,255,255,0.75)' : ROTULO
  const corFaixa   = COR[faixa]
  const corNumero  = semDados ? texto : corFaixa
  const tipoLabel  = isEntrada ? 'Recebimento' : 'Pagamento'
  const alternar   = onAlternar

  return (
    <div style={{
      background: aberto ? AZUL_ABERTO : '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: aberto ? '0 6px 22px rgba(30,64,175,.22)' : '0 2px 14px rgba(15,40,120,.07)',
      border: `2px solid ${aberto ? '#1e40af' : 'transparent'}`,
    }}>
      <div
        role="button" tabIndex={0} aria-expanded={aberto}
        title={`${tipoLabel} — ${grupoLabel} · ${percLabel}`}
        onClick={alternar}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar() } }}
        style={{ cursor: 'pointer', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, color: texto }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* No azul, o ícone ganha um círculo branco: a cor dele foi medida no branco. */}
          <span style={{ borderRadius: '50%', background: aberto ? '#fff' : 'transparent', display: 'inline-flex', flexShrink: 0 }}>
            <IconeRedondo icone={grupoIcone} cor={grupoCor} tamanho={42} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {grupoLabel}
            </div>
            {/* O TIPO é a seta, a mesma dos cartões do topo: ↑ verde receita,
                ↓ vermelha despesa. Desenhada, porque o caractere é fino. */}
            <div style={{ fontSize: 12, color: rotulo, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg role="img" aria-label={isEntrada ? 'Receita' : 'Despesa'} width={12} height={12} viewBox="0 0 16 16"
                style={{ transform: isEntrada ? 'none' : 'rotate(180deg)' }}>
                <path d="M8 14V3M3 7.5 8 2.5l5 5" fill="none" stroke={isEntrada ? COR.bom : COR.ruim}
                  strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isEntrada ? 'receita' : 'despesa'}
            </div>
          </div>
          <span aria-hidden="true" style={{ fontSize: 14, color: rotulo,
            transition: 'transform .15s', transform: aberto ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px', color: corNumero,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
          {destaque.principal}
        </div>
        <div style={{ height: 12, borderRadius: 6, background: aberto ? RADAR_TRILHO_AZUL : TRILHO, overflow: 'hidden', boxSizing: 'border-box',
          border: `1.5px solid ${aberto ? '#ffffff' : semDados ? '#cbd5e1' : RADAR_BORDA_CLARO}` }}>
          {!semDados && (
            <div style={{ height: '100%', borderRadius: 6, width: `${percClamp * 100}%`,
              background: (aberto ? RADAR_BARRA : RADAR_BARRA_CLARO)[faixa], transition: 'width .3s ease' }} />
          )}
        </div>
        <div style={{ fontSize: 13, color: rotulo, fontVariantNumeric: 'tabular-nums' }}>{destaque.contexto}</div>
      </div>

    </div>
  )
}

/**
 * As categorias do grupo aberto, numa faixa da largura da grade, logo depois
 * da linha do cartão. Faixa #eaf1fd e caixa branca recuada (13/10/2026): o
 * aberto não pode parecer mais um grupo. Rótulo #1e3a8a no #eaf1fd: 9,6.
 */
export function CategoriasDoGrupo({
  tipo, grupo, planCats, realMap, categorias, cartaoNomes, mes,
}: EvolucaoGrupoProps) {
  const isEntrada = tipo === 'entrada'
  const grupoLabel = grupo === '__sem_grupo__' ? 'Outras' : grupo
  const allCats = buildAllCats(tipo, grupo, planCats, realMap, categorias, cartaoNomes)
  if (allCats.length === 0) return null
  return (
    <div style={{ gridColumn: '1 / -1', borderRadius: 20, overflow: 'hidden', border: '2px solid #1e40af',
      boxShadow: '0 2px 14px rgba(15,40,120,.07)' }}>
        <div style={{ background: '#eaf1fd', padding: '10px 14px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a', letterSpacing: '.04em',
            textTransform: 'uppercase', margin: '0 4px 8px' }}>
            {grupoLabel} · {allCats.length} {allCats.length === 1 ? 'categoria' : 'categorias'}
          </div>
          <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #dbe6f8' }}>
          {allCats.map((cat, idx) => {
            const cd = pickReal(realMap, cat.nome, cat.descricao, categorias)
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
        </div>
    </div>
  )
}
