import { useEffect, useMemo, useRef, useState } from 'react'
import type { Categoria, Conta, PlanoAnoData } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { nomesDeCartao, ehTransferencia } from '../acompanhamento/evolucaoCalcs'
import { resumoDasParcelas, type IntegracaoNoPlano, type ParcelaNoPlano } from '../../utils/simuladorNoPlano'

/**
 * Escolher a categoria em que a simulação entra no plano. Vale para as três
 * abas — compra, dívida e meta. Ver utils/simuladorNoPlano para as regras.
 *
 * Só categorias de despesa ATIVAS, sem as do cartão (a fatura entra pelo
 * cartão) e sem a transferência. Categoria nova ficou fora, por decisão do
 * Guilherme: quem precisa cria em Configurações e volta.
 */
export default function IncluirNoPlano({
  descricaoInicial, parcelas, planos, categorias, contas, onConfirmar, onFechar,
}: {
  descricaoInicial: string
  parcelas: ParcelaNoPlano[]
  planos: Record<number, PlanoAnoData | undefined>
  categorias: Categoria[]
  contas: Conta[]
  onConfirmar: (cat: Categoria, descricao: string) => void
  onFechar: () => void
}) {
  const [catId, setCatId] = useState('')
  const [descricao, setDescricao] = useState(descricaoInicial)
  const [erro, setErro] = useState('')
  const primeiro = useRef<HTMLSelectElement>(null)
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar

  useEffect(() => {
    primeiro.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const grupos = useMemo(() => {
    const cartoes = nomesDeCartao(contas)
    const cats = categorias.filter(c => c.tipo === 'saida' && c.ativa
      && !cartoes.has(c.nome.toLowerCase()) && !ehTransferencia(c.nome))
    const por = new Map<string, Categoria[]>()
    for (const c of cats) {
      const g = c.grupo?.trim() || 'Outras'
      por.set(g, [...(por.get(g) ?? []), c])
    }
    return [...por.entries()].sort(([a], [b]) => (a === 'Outras' ? 1 : b === 'Outras' ? -1 : a.localeCompare(b, 'pt-BR')))
      .map(([g, cs]) => [g, cs.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))] as const)
  }, [categorias, contas])

  const fora = parcelas.filter(p => !planos[p.ano])
  const anosFora = [...new Set(fora.map(p => p.ano))]

  function confirmar() {
    const cat = categorias.find(c => c.id === catId)
    if (!cat) { setErro('Escolha a categoria.'); return }
    if (!descricao.trim()) { setErro('Diga o que é — aparece no plano como item da categoria.'); return }
    onConfirmar(cat, descricao.trim())
  }

  const campo: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: `1px solid ${COR.borda}`, borderRadius: 8, fontSize: 13,
    fontFamily: 'inherit', boxSizing: 'border-box', background: COR.branco, color: COR.texto,
  }
  const rotulo: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="incluir-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 440, padding: '20px 22px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h3 id="incluir-titulo" style={{ margin: 0, fontSize: 16, color: COR.texto }}>Incluir no planejamento</h3>
        <div style={{ fontSize: 14, color: COR.texto, marginTop: 6, fontWeight: 600 }}>{resumoDasParcelas(parcelas)}</div>

        <form onSubmit={e => { e.preventDefault(); confirmar() }} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          <div>
            <label htmlFor="incluir-cat" style={rotulo}>Em qual categoria?</label>
            <select id="incluir-cat" ref={primeiro} value={catId} onChange={e => { setCatId(e.target.value); setErro('') }} style={campo}>
              <option value="">Escolha…</option>
              {grupos.map(([g, cs]) => (
                <optgroup key={g} label={g}>
                  {cs.map(c => <option key={c.id} value={c.id}>{c.descricao ? `${c.nome} · ${c.descricao}` : c.nome}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="incluir-desc" style={rotulo}>O que é?</label>
            <input id="incluir-desc" value={descricao} onChange={e => { setDescricao(e.target.value); setErro('') }}
              placeholder="Bicicleta" style={campo} />
          </div>
          <button type="submit" hidden />
        </form>

        <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 12, lineHeight: 1.5 }}>
          Entra como um item da categoria, <b style={{ color: COR.texto }}>somando</b> ao que já está planejado.
          Para tirar, use “Desfazer” aqui no Simulador.
        </div>
        {anosFora.length > 0 && (
          <div style={{ fontSize: 12, color: COR.avisoTexto, background: COR.avisoFundo, border: `1px solid ${COR.avisoBorda}`,
            borderRadius: 8, padding: '8px 10px', marginTop: 10, lineHeight: 1.5 }}>
            {fora.length === 1 ? '1 mês fica' : `${fora.length} meses ficam`} de fora: ainda não há plano para {anosFora.join(' e ')}.
          </div>
        )}
        {erro && <div role="alert" style={{ fontSize: 12, color: COR.erroTexto, marginTop: 10 }}>{erro}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onFechar} style={{ border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', background: '#f1f5f9', color: '#1e3a8a' }}>Cancelar</button>
          <button type="button" onClick={confirmar} style={{ border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', background: COR.azul, color: '#fff' }}>Incluir</button>
        </div>
      </div>
    </div>
  )
}

/**
 * "No seu planejamento": o que o Simulador tem no plano hoje, lido dos itens
 * (integracoesNoPlano), com Desfazer. Desfazer pede confirmação no próprio
 * botão — tira o valor do plano, e o plano é o que todas as telas leem.
 */
export function NoSeuPlano({ itens, onDesfazer }: {
  itens: IntegracaoNoPlano[]
  onDesfazer: (simulacaoId: string) => void
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null)
  if (itens.length === 0) return null
  return (
    <section aria-label="No seu planejamento" style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 12,
      padding: '14px 16px', marginBottom: 22 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: COR.textoSuave, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        No seu planejamento
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {itens.map(i => (
          <div key={i.simulacaoId} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span aria-hidden style={{ fontSize: 16 }}>🔮</span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>{i.descricao}</div>
              <div style={{ fontSize: 12, color: COR.textoSuave }}>{i.categoria} · {resumoDasParcelas(i.meses)}</div>
            </div>
            {confirmando === i.simulacaoId ? (
              <span style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => { onDesfazer(i.simulacaoId); setConfirmando(null) }} style={{
                  border: 'none', borderRadius: 999, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', background: COR.erroTexto, color: '#fff' }}>Tirar do plano</button>
                <button type="button" onClick={() => setConfirmando(null)} style={{
                  border: 'none', borderRadius: 999, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', background: '#f1f5f9', color: '#1e3a8a' }}>Manter</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmando(i.simulacaoId)} style={{
                border: `1px solid ${COR.borda}`, borderRadius: 999, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12,
                fontWeight: 700, cursor: 'pointer', background: '#f8fafc', color: '#1e3a8a' }}>Desfazer</button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
