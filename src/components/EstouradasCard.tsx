import type { Categoria } from '../context/AppContext'
import { COR } from '../utils/cores'
import { iconeCategoria } from '../utils/categoriaIcone'
import type { Estouro } from '../utils/categoriasEstouradas'
import type { LinhaDoMes } from './acompanhamento/evolucaoCalcs'
import { RADAR_COR_CLARO, RADAR_TRILHO_BRANCO, faixaRadar } from './acompanhamento/radarCores'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const nomeDe = (l: LinhaDoMes) => (l.descricao ? `${l.nome} · ${l.descricao}` : l.nome)

/**
 * "Categorias estouradas" da tela Início. As listas vêm prontas de
 * utils/categoriasEstouradas — aqui é só desenho.
 *
 * A barra da estourada mostra o TAMANHO do estouro: a parte cinza é o plano,
 * a vermelha é o que passou dele, as duas na escala do realizado. Uma barra
 * de percentual ficaria cheia em todas e não diria nada.
 *
 * Sobre o branco: excesso em COR.erroTexto (#b91c1c, 6,5:1); plano na barra
 * em COR.textoSuave (#64748b, 4,76:1 — elemento gráfico pede 3:1). Perto do
 * limite usa a paleta clara do Radar (RADAR_COR_CLARO), a mesma das linhas de
 * categoria de lá.
 */
export default function EstouradasCard({ estouradas, perto, categorias, onVerRadar }: {
  estouradas: Estouro[]
  perto: LinhaDoMes[]
  categorias: Categoria[]
  onVerRadar: () => void
}) {
  const icone = (l: LinhaDoMes) => iconeCategoria(categorias, l.nome).icone
  const cabecalho = (titulo: string, sub: string, cor = COR.texto) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: cor }}>{titulo}</div>
      <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ background: COR.branco, borderRadius: 12, padding: '18px 20px', border: `.5px solid ${COR.borda}` }}>
      {estouradas.length > 0
        ? cabecalho('Categorias estouradas', 'Onde o gasto passou do plano neste mês')
        : cabecalho('Nenhuma categoria passou do plano', perto.length
          ? 'As que estão mais perto do limite:' : 'Ainda não há gasto nas categorias planejadas.', COR.sucessoTexto)}

      {estouradas.map(l => {
        const perc = l.semPlano ? null : Math.round((l.real / l.prev) * 100)
        const plano = l.semPlano ? 0 : (l.prev / l.real) * 100
        return (
          <div key={`${l.nome}||${l.descricao}`} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span aria-hidden style={{ fontSize: 16 }}>{icone(l)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: COR.texto, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDe(l)}</div>
                <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {l.semPlano ? `fora do plano · gastou ${fmt(l.real)}` : `${fmt(l.real)} de ${fmt(l.prev)} · ${perc}%`}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: COR.erroTexto, fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap' }}>+{fmt(l.excesso)}</span>
            </div>
            <div role="img" aria-label={l.semPlano ? 'Todo o gasto está fora do plano'
              : `Plano ${fmt(l.prev)}, passou ${fmt(l.excesso)}`}
              style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden' }}>
              {plano > 0 && <div style={{ width: `${plano}%`, background: COR.textoSuave }} />}
              <div style={{ flex: 1, background: COR.erroTexto }} />
            </div>
          </div>
        )
      })}

      {estouradas.length === 0 && perto.map(l => {
        const p = l.real / l.prev
        const cor = RADAR_COR_CLARO[faixaRadar(Math.round(p * 100) / 100, false)]
        return (
          <div key={`${l.nome}||${l.descricao}`} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span aria-hidden style={{ fontSize: 16 }}>{icone(l)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: COR.texto, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDe(l)}</div>
                <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(l.real)} de {fmt(l.prev)} · disponível {fmt(l.prev - l.real)}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: cor, fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(p * 100)}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: RADAR_TRILHO_BRANCO }}>
              <div style={{ width: `${Math.min(p, 1) * 100}%`, height: '100%', background: cor }} />
            </div>
          </div>
        )
      })}

      <button onClick={onVerRadar} style={{
        border: 'none', background: 'transparent', color: COR.azul, padding: 0,
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>Ver todas no Radar →</button>
    </div>
  )
}
