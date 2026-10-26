import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { COR } from '../utils/cores'

// Rede de proteção para erro de tela (25/10/2026, revisão técnica, pacote 1).
// Sem ela, qualquer erro inesperado ao desenhar uma tela — um dado antigo num
// formato diferente, por exemplo — deixava a página inteira em branco, sem
// explicação. Os dados não dependem da tela: o que já foi gravado continua no
// banco, e o que estava pendente segue na fila do AppContext (que fica FORA
// desta proteção, em App.tsx, e não é desmontado pelo erro).
export default class ErroDeTela extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null }

  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[erro de tela]', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div style={{ minHeight: '100vh', background: COR.fundo, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div role="alert" style={{ maxWidth: 420, width: '100%', background: COR.branco, borderRadius: 20, boxShadow: '0 8px 30px rgba(15,40,120,.12)', overflow: 'hidden' }}>
          <div style={{ background: 'var(--cx-azul)', padding: '20px 22px', color: '#fff' }}>
            <div style={{ fontSize: 12, letterSpacing: 1, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>COMPASS ONE</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Algo deu errado nesta tela</div>
          </div>
          <div style={{ padding: '20px 22px', color: COR.texto, fontSize: 15, lineHeight: 1.5 }}>
            <p>Seus dados estão salvos. Recarregar a página costuma resolver.</p>
            <p style={{ marginTop: 8, color: '#475569', fontSize: 14 }}>
              Se acontecer de novo, conte para a gente o que você estava fazendo.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <button onClick={() => window.location.reload()}
                style={{ flex: 1, minHeight: 44, border: 'none', borderRadius: 12, background: COR.azul, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Recarregar
              </button>
              <button onClick={() => window.location.assign('/')}
                style={{ flex: 1, minHeight: 44, border: `1px solid ${COR.borda}`, borderRadius: 12, background: COR.branco, color: COR.azulEscuro, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Ir para o início
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
