import { useNavigate } from 'react-router-dom'
import { COR } from '../../utils/cores'

export type TopCategoria = { chave: string; nome: string; gasto: number; cor: string; icone: string }

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * "Maiores despesas" — o quadro de quem ainda não tem plano no mês. Saiu da
 * Início para Análises em 06/10/2026, sem mudar o conteúdo.
 */
export default function MaioresDespesasCard({ topCategorias }: { topCategorias: TopCategoria[] }) {
  const navigate = useNavigate()
  const maxGasto = topCategorias[0]?.gasto || 1
  return (
    <div style={{
      background: COR.branco, borderRadius: 12,
      padding: '18px 20px', border: `.5px solid ${COR.borda}`,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto, marginBottom: 18 }}>
        Maiores despesas
      </div>
      {topCategorias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div style={{ color: COR.textoMuted, fontSize: 13, marginBottom: 12 }}>
            Nenhum gasto registrado
          </div>
          <button onClick={() => navigate('/novo-lancamento')} style={{
            padding: '7px 14px', border: 'none', borderRadius: 8,
            background: COR.azul, color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Registrar gasto</button>
        </div>
      ) : topCategorias.map(cat => (
        <div key={cat.chave} style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{cat.icone}</span>
              <span style={{ fontSize: 13, color: COR.texto, fontWeight: 500 }}>{cat.nome}</span>
            </div>
            <span style={{
              fontSize: 13, color: COR.vermelho, fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}>{fmt(cat.gasto)}</span>
          </div>
          <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: 4, borderRadius: 2, background: cat.cor,
              width: `${Math.min((cat.gasto / maxGasto) * 100, 100)}%`,
              transition: 'width .4s ease',
            }}/>
          </div>
        </div>
      ))}
    </div>
  )
}
