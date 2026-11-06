import { useApp } from '../../context/AppContext'
import type { DadosMes } from '../../context/AppContext'
import ModalTopo from '../ModalTopo'
import { useToast } from '../Toast'
import { COR } from '../../utils/cores'
import { nomeDaConta } from '../../utils/nomeDaConta'
import { exclusaoDoMovimento, type MovimentoInvestimento } from '../../utils/investimentos'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const ROTULO = { aplicacao: 'Aplicação', resgate: 'Resgate', rendimento: 'Rendimento' } as const

/**
 * Excluir um movimento da tela de Investimentos (06/11/2026, pedido do
 * Guilherme: "preciso ter a opção de excluir movimentos quando feito
 * errado"). A janela diz o que sai junto: a transferência no banco, para a
 * aplicação e o resgate. Regras em utils/investimentos (exclusaoDoMovimento).
 */
export default function ExcluirMovimentoDialog({ movimento: m, nomeConta, nomeObjetivo, central, onFechar }: {
  movimento: MovimentoInvestimento
  nomeConta: string
  nomeObjetivo?: string
  central: boolean
  onFechar: () => void
}) {
  const { contas, extratoData, updateExtratoMes } = useApp()
  const { toast } = useToast()
  const ex = exclusaoDoMovimento(m, extratoData as Record<string, DadosMes>)
  const banco = ex.contraparteId ? contas.find(c => c.id === ex.contraparteId) : undefined
  const nomeBanco = ex.contraparteId === 'dinheiro' ? 'Dinheiro' : banco ? nomeDaConta(banco, contas) : m.contraparte
  const perda = m.tipo === 'rendimento' && m.valor < 0
  const titulo = `${perda ? 'Rendimento negativo' : ROTULO[m.tipo]} de ${fmt(Math.abs(m.valor))}`
  const data = `${String(m.dia).padStart(2, '0')}/${String(m.mes + 1).padStart(2, '0')}`

  const efeito = m.tipo === 'rendimento'
    ? ex.limparInformado
      ? 'O saldo informado nessa atualização sai, e o saldo do investimento volta a ser o que o Compass calcula pelas aplicações e resgates.'
      : `O rendimento sai${nomeObjetivo ? ` de ${nomeObjetivo}` : ''}, e o saldo do investimento volta ao que era antes dele.`
    : ex.linhas.length > 1
      ? `Sai também a transferência ${m.tipo === 'aplicacao' ? 'do' : 'para o'} ${nomeBanco} em Lançamentos: o dinheiro ${m.tipo === 'aplicacao' ? 'volta para' : 'sai de novo do'} saldo do banco.`
      : 'Não achamos a transferência do banco que acompanha este movimento. Se ela existir, exclua também em Lançamentos.'

  function excluir() {
    const porChave = new Map<string, { dia: number; id: string }[]>()
    for (const l of ex.linhas) porChave.set(l.chave, [...(porChave.get(l.chave) ?? []), l])
    for (const [k, lista] of porChave) updateExtratoMes(k, dm => {
      const lancamentos = { ...dm.lancamentos }
      for (const { dia, id } of lista) lancamentos[dia] = (lancamentos[dia] ?? []).filter(l => l.id !== id)
      return { ...dm, lancamentos }
    })
    if (ex.limparInformado) updateExtratoMes(ex.limparInformado, dm => ({
      ...dm, saldoBanco: '', saldoBancoInformado: undefined, saldoBancoData: undefined, conferenciaAnterior: undefined,
    }))
    toast('Movimento excluído', 'info')
    onFechar()
  }

  const raio = 20
  return (
    <div role="dialog" aria-modal="true" aria-label={`Excluir ${titulo}`} onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 300, display: 'flex',
        alignItems: central ? 'center' : 'flex-end', justifyContent: 'center', padding: central ? 16 : 0 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', width: '100%', maxWidth: central ? 420 : undefined,
        borderRadius: central ? raio : `${raio}px ${raio}px 0 0`,
        fontFamily: "-apple-system,'Inter',sans-serif", animation: central ? undefined : 'slideUp .2s ease',
      }}>
        <ModalTopo icone="ti-trash" rotulo="Excluir movimento" titulo={titulo} raio={raio}
          subtitulo={`${nomeConta}${nomeObjetivo ? ` · ${nomeObjetivo}` : ''} · ${data}`} onFechar={onFechar} />
        <div style={{ padding: central ? '18px 20px 22px' : '16px 16px 28px' }}>
          <p style={{ fontSize: 15, color: COR.texto, margin: '0 0 16px', lineHeight: 1.5 }}>{efeito}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={onFechar} style={{
              padding: 14, borderRadius: 16, border: '1.5px solid #bfdbfe', background: '#fff', color: '#1e3a8a',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancelar</button>
            <button onClick={excluir} style={{
              padding: 14, borderRadius: 16, border: 'none', background: '#b91c1c', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Excluir</button>
          </div>
        </div>
      </div>
    </div>
  )
}
