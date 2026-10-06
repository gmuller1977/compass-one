import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { parseConta } from '../../utils/moeda'
import { novoIdItem, somaItens, type ItemPlano } from '../../utils/itensPlano'
import { MESES_FULL } from './types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const paraCampo = (v: number) => (v === 0 ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

type Linha = { id: string; descricao: string; valor: string; simulacaoId?: string }

/**
 * O editor de itens de uma célula do plano: Mercado · outubro = Supermercado
 * 800 + Feira 300. Modelo validado pelo Guilherme em 06/10/2026.
 *
 * Grava pela função única do plano (usePlanejamento.editarItens → comItens):
 * o valor do mês vira a soma dos itens. "Tirar o detalhe" mantém o total.
 * O campo de valor aceita conta, como a célula ("120+80").
 *
 * Começa com o que houver, nessa ordem: os itens salvos; as parcelas da conta
 * digitada na célula; o valor atual como primeiro item, com o nome da
 * categoria — para quem detalha um valor que já existia não perder o número.
 */
export default function PlanItensEditor({
  nome, grupo, mes, valorAtual, itens, partes, onSalvar, onTirar, onFechar,
}: {
  nome: string
  grupo?: string
  mes: number
  valorAtual: number
  itens: ItemPlano[] | null
  partes?: number[]
  onSalvar: (itens: ItemPlano[], meses: number[]) => void
  /** Só quando já há itens: volta a ser só o total. */
  onTirar?: () => void
  onFechar: () => void
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => {
    if (itens?.length) return itens.map(i => ({ id: i.id, descricao: i.descricao, valor: paraCampo(i.valor), simulacaoId: i.simulacaoId }))
    if (partes?.length) return partes.map(p => ({ id: novoIdItem(), descricao: '', valor: paraCampo(p) }))
    if (valorAtual > 0) return [{ id: novoIdItem(), descricao: nome, valor: paraCampo(valorAtual) }, { id: novoIdItem(), descricao: '', valor: '' }]
    return [{ id: novoIdItem(), descricao: '', valor: '' }]
  })
  const [ateDezembro, setAteDezembro] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const caixa = useRef<HTMLDivElement>(null)

  // Foco no primeiro campo vazio, UMA vez; Esc fecha. O onFechar vai por ref:
  // como dependência, cada render do pai refaria o foco no meio da digitação.
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    const campos = caixa.current?.querySelectorAll<HTMLInputElement>('input[data-item]')
    const vazio = campos && [...campos].find(c => !c.value)
    ;(vazio ?? campos?.[0])?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const valores = linhas.map(l => parseConta(l.valor))
  const total = Math.round(valores.reduce<number>((s, v) => s + (v ?? 0), 0) * 100) / 100
  const nomeMes = MESES_FULL[mes]

  const mudar = (id: string, campo: 'descricao' | 'valor', texto: string) =>
    setLinhas(ls => ls.map(l => (l.id === id ? { ...l, [campo]: texto } : l)))

  function salvar() {
    const ruim = linhas.findIndex((l, i) => valores[i] === null && l.valor.trim() !== '')
    if (ruim >= 0) { setErro(`"${linhas[ruim].valor.trim()}" não é um valor.`); return }
    // Linha sem nome e sem valor é sobra de digitação; sem nome e com valor, ganha um.
    const itensOk: ItemPlano[] = linhas
      .map((l, i) => ({ l, v: valores[i] ?? 0 }))
      .filter(({ l, v }) => l.descricao.trim() !== '' || v !== 0)
      .map(({ l, v }, i) => ({
        id: l.id, descricao: l.descricao.trim() || `Item ${i + 1}`, valor: v,
        ...(l.simulacaoId ? { simulacaoId: l.simulacaoId } : {}),
      }))
    if (itensOk.length === 0) { setErro('Adicione pelo menos um item com valor.'); return }
    if (somaItens(itensOk) < 0) { setErro('O total não pode ficar negativo.'); return }
    const meses = ateDezembro ? Array.from({ length: 12 - mes }, (_, i) => mes + i) : [mes]
    onSalvar(itensOk, meses)
  }

  const campo: React.CSSProperties = {
    font: 'inherit', fontSize: 13, border: `1px solid ${COR.borda}`, borderRadius: 8,
    padding: '7px 9px', width: '100%', boxSizing: 'border-box', color: COR.texto,
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div ref={caixa} role="dialog" aria-modal="true" aria-labelledby="itens-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 440, padding: '18px 20px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <h3 id="itens-titulo" style={{ margin: 0, fontSize: 16, color: COR.texto }}>{nome} · {nomeMes.toLowerCase()}</h3>
          {grupo && <span style={{ fontSize: 12, color: COR.textoSuave }}>{grupo}</span>}
        </div>
        <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 3 }}>
          O plano guarda o total; os itens são o detalhe dele.
        </div>

        <form onSubmit={e => { e.preventDefault(); salvar() }}
          style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '14px 0 10px' }}>
          {linhas.map((l, i) => l.simulacaoId ? (
            // Item do Simulador: só muda ou sai por lá (próxima etapa).
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 28px', gap: 6, alignItems: 'center' }}>
              <span style={{ ...campo, background: '#f5f3ff', color: '#6d28d9', border: 'none' }}>🔮 {l.descricao}</span>
              <span style={{ ...campo, background: '#f5f3ff', color: '#6d28d9', border: 'none', textAlign: 'right', fontWeight: 600 }}>{l.valor}</span>
              <span />
            </div>
          ) : (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 28px', gap: 6, alignItems: 'center' }}>
              <input data-item aria-label={`Descrição do item ${i + 1}`} placeholder="Descrição" value={l.descricao}
                onChange={e => mudar(l.id, 'descricao', e.target.value)} style={campo} />
              <input data-item aria-label={`Valor do item ${i + 1}`} placeholder="0,00" inputMode="decimal" value={l.valor}
                onChange={e => { setErro(null); mudar(l.id, 'valor', e.target.value) }}
                style={{ ...campo, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  borderColor: valores[i] === null && l.valor.trim() ? COR.erroTexto : COR.borda }} />
              <button type="button" aria-label={`Remover o item ${i + 1}`}
                onClick={() => setLinhas(ls => ls.filter(x => x.id !== l.id))}
                style={{ border: 'none', background: 'none', color: COR.textoSuave, cursor: 'pointer', fontSize: 17, height: 28, borderRadius: 6 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => setLinhas(ls => [...ls, { id: novoIdItem(), descricao: '', valor: '' }])}
            style={{ border: '1px dashed #93c5fd', background: 'none', color: COR.azul, font: 'inherit', fontSize: 13,
              fontWeight: 600, borderRadius: 8, padding: 7, cursor: 'pointer', marginTop: 2 }}>
            + adicionar item
          </button>
          {/* Enter em qualquer campo salva. */}
          <button type="submit" hidden />
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${COR.borda}`, paddingTop: 10,
          fontSize: 14, color: COR.texto }}>
          <span>Total que vai para o plano</span>
          <b style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</b>
        </div>
        {erro && <div role="alert" style={{ fontSize: 12, color: COR.erroTexto, marginTop: 6 }}>{erro}</div>}

        <fieldset style={{ border: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <legend style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 4, padding: 0 }}>Aplicar a</legend>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" name="itens-meses" checked={!ateDezembro} onChange={() => setAteDezembro(false)} /> Só {nomeMes.toLowerCase()}
          </label>
          {mes < 11 && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="radio" name="itens-meses" checked={ateDezembro} onChange={() => setAteDezembro(true)} />
              De {nomeMes.toLowerCase()} até dezembro
            </label>
          )}
        </fieldset>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {onTirar ? (
            <button type="button" onClick={onTirar} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit',
              fontSize: 12, color: COR.textoSuave, textDecoration: 'underline', cursor: 'pointer' }}>
              Tirar o detalhe (fica só o total)
            </button>
          ) : <span />}
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onFechar} style={{ border: 'none', borderRadius: 999, padding: '8px 16px', font: 'inherit',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', background: '#f1f5f9', color: '#1e3a8a' }}>Cancelar</button>
            <button type="button" onClick={salvar} style={{ border: 'none', borderRadius: 999, padding: '8px 16px', font: 'inherit',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', background: COR.azul, color: '#fff' }}>Salvar</button>
          </span>
        </div>
      </div>
    </div>
  )
}
