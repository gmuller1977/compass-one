import type { Categoria } from '../../context/AppContext'
import { type CatReal } from './AcShared'
import { RADAR_TEXTO_CLARO, RADAR_TEXTO_AZUL, faixaRadar, destaqueDoGrupo } from './radarCores'
import { buildAllCats, pickReal, cadastroDaLinha, fixasEVariaveis, type PlanCat } from './evolucaoCalcs'
import EvolucaoLinha from './EvolucaoLinha'

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
const TRILHO = '#e2e8f0' // trilho do anel fechado
const AZUL_NUMERO = '#1d4ed8'
// Aberto, o cartão fica AZUL-ESCURO (pedido do Guilherme, 21/10/2026), o
// gradiente dos cartões do topo, que termina no #1e40af. Ali vale a paleta do
// azul (RADAR_COR_AZUL): verde 5,0, verde-claro 9,1; o vermelho #f87171 dá
// 3,15, aceito por ele nos cartões, e o número tem 20px em negrito (texto
// grande). Rótulo a 75%: 5,1. Barra no trilho escuro com borda branca.
const AZUL_ABERTO = 'var(--cx-azul)'

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
  const percLabel  = semDados ? 'sem plano' : `${Math.round(perc * 100)}%`
  // A cor segue o percentual ARREDONDADO, o que está escrito na tela. Com o
  // exato, 89,53% aparecia como "90%" em verde enquanto 90% de verdade é
  // laranja — o rótulo e a cor discordavam no mesmo cabeçalho.
  const faixa      = faixaRadar(Math.round(perc * 100) / 100, isEntrada)
  const COR        = aberto ? RADAR_TEXTO_AZUL : RADAR_TEXTO_CLARO
  const texto      = aberto ? '#ffffff' : TEXTO
  const rotulo     = aberto ? 'rgba(255,255,255,0.75)' : ROTULO
  const corFaixa   = COR[faixa]
  // Fechado, número e anel são AZUL NEON e só o que passou de 100% leva o
  // marcador de atenção (24/10/2026, Guilherme). #1d4ed8 no branco: 6,7. Passou: número e
  // borda em vermelho #b91c1c (6,47), mesmo dia, pedido dele.
  const atencao    = !semDados && !isEntrada && perc > 1.005
  const corNumero  = semDados ? texto : aberto ? corFaixa : atencao ? '#b91c1c' : AZUL_NUMERO
  const tipoLabel  = isEntrada ? 'Recebimento' : 'Pagamento'
  const alternar   = onAlternar

  return (
    <div style={{
      background: aberto ? AZUL_ABERTO : '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: aberto ? 'var(--cx-brilho)' : '0 2px 14px rgba(15,40,120,.07)',
      // Borda pelo julgamento (24/10/2026, pedido do Guilherme): dentro do
      // plano verde, passou laranja; sem plano, sem borda.
      border: `2px solid ${aberto ? '#1e40af' : semDados ? 'transparent' : atencao ? '#b91c1c' : '#93c5fd'}`,
    }}>
      <div
        role="button" tabIndex={0} aria-expanded={aberto}
        title={`${tipoLabel} — ${grupoLabel} · ${percLabel}`}
        onClick={alternar}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar() } }}
        style={{ cursor: 'pointer', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, color: texto }}>
        {/* Opção A (24/10/2026, escolha do Guilherme): o % num ANEL à esquerda,
            no lugar da barra, e ao lado o nome, o "resta/passou" e o "gastou X
            de Y". O anel ocupa o lugar do ícone. Fechado, o anel tem
            a cor do número no trilho claro; aberto (azul), trilho branco e azul
            neon, como os gráficos em card azul. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <AnelGrupo pct={semDados ? null : perc} pago={destaque.principal.startsWith('✓')}
            cor={aberto ? '#0891b2' : atencao ? '#b91c1c' : '#2563eb'} alerta={atencao} trilho={aberto ? '#fff' : TRILHO}
            corTexto={aberto ? '#fff' : corNumero} />
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {grupoLabel}
              </span>
              <svg role="img" aria-label={isEntrada ? 'Receita' : 'Despesa'} width={12} height={12} viewBox="0 0 16 16"
                style={{ transform: isEntrada ? 'none' : 'rotate(180deg)', flexShrink: 0 }}>
                <path d="M8 14V3M3 7.5 8 2.5l5 5" fill="none" stroke={aberto ? '#fff' : COR[isEntrada ? 'bom' : 'ruim']}
                  strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span aria-hidden="true" style={{ fontSize: 14, color: rotulo,
                transition: 'transform .15s', transform: aberto ? 'rotate(180deg)' : 'none' }}>▾</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.3px', color: corNumero,
              fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {destaque.principal}
            </div>
            <div style={{ fontSize: 13, color: rotulo, fontVariantNumeric: 'tabular-nums' }}>{destaque.contexto}</div>
          </div>
        </div>
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
          {/* Fixas e variáveis separadas, cada parte na sua caixa (31/10/2026,
              pedido do Guilherme), como no celular. */}
          {fixasEVariaveis(allCats, categorias).map(parte => (
          <div key={parte.rotulo} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '0 4px 6px' }}>
            {parte.rotulo} · {parte.cats.length}
          </div>
          <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #dbe6f8' }}>
          {parte.cats.map((cat, idx) => {
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
          ))}
        </div>
    </div>
  )
}

/** Anel do grupo (opção A): arco até 100%, o texto diz o % real; fixa paga é ✓. */
export function AnelGrupo({ pct, pago, cor, trilho, corTexto, alerta = false, tamanho = 72, rotuloAlerta = 'Atenção: passou do plano' }: {
  pct: number | null; pago: boolean; cor: string; trilho: string; corTexto: string
  /** Passou de 100%: o marcador de atenção no canto do anel. */
  alerta?: boolean
  /** Lado em px (o desenho escala; o Planejamento usa um anel menor). */
  tamanho?: number
  rotuloAlerta?: string
}) {
  const r = 28, c = 2 * Math.PI * r
  const cheio = pago ? 1 : pct === null ? 0 : Math.max(0, Math.min(1, pct))
  const texto = pago ? '✓' : pct === null ? '' : `${Math.round(pct * 100)}%`
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 72 72" aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <circle cx="36" cy="36" r={r} stroke={trilho} strokeWidth="8" fill="none" />
      {cheio > 0 && (
        <circle cx="36" cy="36" r={r} stroke={cor} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={`${cheio * c} ${c}`} transform="rotate(-90 36 36)"
          style={{ filter: cor === '#b91c1c' ? 'drop-shadow(0 0 4px rgba(239,68,68,.55))' : 'drop-shadow(0 0 4px rgba(34,211,238,.9))' }} />
      )}
      <text x="36" y={pago ? 43 : 41} textAnchor="middle" fill={corTexto}
        fontSize={pago ? 20 : texto.length > 4 ? 13 : 15} fontWeight="800">{texto}</text>
      {alerta && (
        <g role="img" aria-label={rotuloAlerta}>
          <circle cx="62" cy="10" r="11" fill="#fde047" stroke="#fff" strokeWidth="2.5" />
          <text x="62" y="15" textAnchor="middle" fill="#713f12" fontSize="15" fontWeight="900">!</text>
        </g>
      )}
    </svg>
  )
}
