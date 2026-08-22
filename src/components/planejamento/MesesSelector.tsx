import { MESES } from './types'

interface Props {
  mesAtual: number
  selecionados: boolean[]
  onChange: (s: boolean[]) => void
}

export default function MesesSelector({ mesAtual, selecionados, onChange }: Props) {
  function toggle(mi: number) {
    if (mi <= mesAtual) return
    const next = [...selecionados]
    next[mi] = !next[mi]
    onChange(next)
  }
  function todos() { onChange(Array.from({ length: 12 }, (_, i) => i > mesAtual)) }
  function limpar() { onChange(new Array(12).fill(false)) }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {MESES.map((m, mi) => {
          const passado = mi <= mesAtual
          const sel = selecionados[mi]
          return (
            <button
              key={mi}
              onClick={() => toggle(mi)}
              disabled={passado}
              style={{
                padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: passado ? 'not-allowed' : 'pointer',
                border: sel ? 'none' : '1px solid #e2e8f0',
                background: passado ? '#f8fafc' : sel ? '#1a56db' : '#fff',
                color: passado ? '#94a3b8' : sel ? '#fff' : '#374151',
                opacity: passado ? 0.5 : 1,
                transition: 'all .1s',
              }}
            >{m}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={todos} style={{ fontSize: 11, color: '#1a56db', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Todos</button>
        <button onClick={limpar} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Limpar</button>
      </div>
    </div>
  )
}
