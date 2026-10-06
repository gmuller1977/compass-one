import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const mesKey = (conta: string, ano: number, mes: number) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`

/**
 * "Últimas movimentações" — saiu da Início para Análises em 06/10/2026, sem
 * mudar o conteúdo. Não é número: segue lendo o extrato do mês.
 */
export default function UltimasMovimentacoesCard({ ano, mes }: { ano: number; mes: number }) {
  const navigate = useNavigate()
  const { contas, extratoData, categorias } = useApp()

  const ultimosLanc = useMemo(() => {
    const todos: Array<{ descricao: string; categoria: string; valor: number; tipo: string; data: number }> = []
    contas.forEach(conta => {
      const dados = extratoData[mesKey(conta.id, ano, mes)]
      if (!dados) return
      Object.entries(dados.lancamentos).forEach(([dia, ls]) =>
        ls.forEach(l => todos.push({ ...l, data: parseInt(dia) }))
      )
    })
    return todos.sort((a, b) => b.data - a.data).slice(0, 5)
  }, [contas, extratoData, mes, ano])

  return (
    <div style={{
      background: COR.branco, borderRadius: 12,
      padding: '18px 20px', border: `.5px solid ${COR.borda}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Últimas movimentações</div>
        <button onClick={() => navigate('/novo-lancamento')} style={{
          border: 'none', background: 'transparent', color: COR.azul,
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
        }}>Ver tudo</button>
      </div>
      {ultimosLanc.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, marginBottom: 5 }}>
            Nenhum lançamento este mês
          </div>
          <div style={{ fontSize: 12, color: COR.textoMuted, lineHeight: 1.55, marginBottom: 14 }}>
            Registre seus gastos e receitas para ver<br/>o histórico aqui.
          </div>
          <button onClick={() => navigate('/novo-lancamento')} style={{
            padding: '7px 18px', border: 'none', borderRadius: 8,
            background: COR.azul, color: '#fff',
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Registrar →</button>
        </div>
      ) : ultimosLanc.map((l, i) => {
        const cat = categorias.find(c => c.nome === l.categoria)
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            paddingBottom: i < ultimosLanc.length - 1 ? 13 : 0,
            marginBottom: i < ultimosLanc.length - 1 ? 13 : 0,
            borderBottom: i < ultimosLanc.length - 1 ? `1px solid #f1f5f9` : 'none',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: l.tipo === 'entrada' ? COR.verde : COR.vermelho,
            }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 500, color: COR.texto,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {(l.descricao && l.descricao.trim()) ? l.descricao : l.categoria}
              </div>
              <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 1 }}>
                {cat?.icone ?? ''} {l.categoria} · dia {l.data}
              </div>
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600, flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
              color: l.tipo === 'entrada' ? COR.verde : COR.vermelho,
            }}>
              {l.tipo === 'entrada' ? '+' : '−'}{fmt(l.valor)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
