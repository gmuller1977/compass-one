import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { parseConta } from '../../utils/moeda'
import { novoIdItem, somaItens, type ItemPlano } from '../../utils/itensPlano'
import { MESES_FULL } from './types'
import { lerRotuloParcela, rotuloParcela, type CompraRef } from '../../utils/renomearCompra'
import type { JaLancado } from '../../utils/historicoDaCategoria'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const paraCampo = (v: number) => (v === 0 ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

/** `parcela`: o item é uma parcela ("nome · k de N") — o campo mostra só o nome, e o "k de N" fica ao lado do valor, sem edição. Com `ref` (a compra lançada), trocar o nome renomeia a compra. */
type Linha = { id: string; descricao: string; valor: string; simulacaoId?: string
  parcela?: { nome: string; atual: number; total: number; ref?: CompraRef } }

type PropsItens = {
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
  /** Item (por id) que é parcela de uma compra lançada → a compra. Ver utils/renomearCompra. */
  compras?: Record<string, CompraRef>
  /** Renomeia a compra em todas as parcelas: na fatura e nos itens do plano. */
  onRenomear?: (ref: CompraRef, antigo: string, novo: string) => void
}

/**
 * Com algo já lançado na categoria no mês, o editor vira CONSULTA: a lista do
 * lançado (à vista e parcelas, só leitura; o nome da parcela se troca para a
 * compra inteira) e UM campo, o valor planejado da categoria. Pedido do
 * Guilherme em 11/10/2026: "um campo com valor planejado da categoria que
 * precisa ser igual ou superior da soma do que já tem lançado". Sem lançado,
 * o editor de itens de sempre.
 */
export default function PlanItensEditor({ jaLancado = [], futuro = false, onSalvarValor, ...p }: PropsItens & {
  /** O que já está lançado nesta categoria no mês (fatura, extrato, dinheiro). */
  jaLancado?: JaLancado[]
  /** Mês que ainda não começou: o valor não pode ficar abaixo do lançado. */
  futuro?: boolean
  /** Grava só o valor, sem detalhe (mês corrente ou passado abaixo do lançado). */
  onSalvarValor?: (valor: number) => void
}) {
  if (jaLancado.length > 0 && onSalvarValor) return <EditorLancado {...p} jaLancado={jaLancado} futuro={futuro} onSalvarValor={onSalvarValor} />
  return <EditorItens {...p} />
}

const r2 = (v: number) => Math.round(v * 100) / 100

function EditorLancado({ nome, grupo, mes, valorAtual, onSalvar, onFechar, onRenomear, jaLancado, futuro, onSalvarValor }: PropsItens & {
  jaLancado: JaLancado[]; futuro: boolean; onSalvarValor: (valor: number) => void
}) {
  const lancado = r2(jaLancado.reduce((s, j) => s + j.valor, 0))
  // Mês futuro abre já no piso: um plano abaixo do lançado não é opção ali.
  const [texto, setTexto] = useState(() => paraCampo(futuro ? Math.max(valorAtual, lancado) : valorAtual))
  const [nomes, setNomes] = useState<Record<number, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const estreito = window.innerWidth < 640
  const campoRef = useRef<HTMLInputElement>(null)
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    campoRef.current?.focus()
    campoRef.current?.select()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const valor = parseConta(texto)
  const abaixo = valor !== null && valor < lancado - 0.005
  const sobra = valor !== null ? r2(valor - lancado) : 0
  const nomeMes = MESES_FULL[mes].toLowerCase()

  function salvar() {
    if (valor === null) { setErro(`"${texto.trim()}" não é um valor.`); return }
    if (abaixo && futuro) { setErro(`O plano de ${nomeMes} não pode ficar abaixo do já lançado (${fmt(lancado)}).`); return }
    if (abaixo) onSalvarValor(valor)
    else {
      // O plano guarda o detalhe: cada lançamento e o que sobra para outros gastos.
      const itens: ItemPlano[] = jaLancado.map((j, k) => {
        const n = (nomes[k]?.trim() || j.descricao.trim() || nome)
        return { id: novoIdItem(), valor: j.valor, descricao: j.parcela ? rotuloParcela(n, j.parcela.atual, j.parcela.total) : n }
      })
      if (sobra > 0.005) itens.push({ id: novoIdItem(), descricao: 'Outros gastos', valor: sobra })
      onSalvar(itens, [mes])
    }
    jaLancado.forEach((j, k) => {
      const novo = nomes[k]?.trim(), c = j.parcela?.compra
      if (c && onRenomear && novo && novo !== j.descricao.trim()) onRenomear({ ...c, total: j.parcela!.total }, j.descricao.trim(), novo)
    })
  }

  const campo: React.CSSProperties = {
    font: 'inherit', fontSize: estreito ? 16 : 13, border: `1px solid ${COR.borda}`, borderRadius: 8,
    padding: '7px 9px', width: '100%', boxSizing: 'border-box', color: COR.texto, background: COR.branco,
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="lancado-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 440, padding: '18px 20px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <h3 id="lancado-titulo" style={{ margin: 0, fontSize: 16, color: COR.texto }}>{nome} · {nomeMes}</h3>
          {grupo && <span style={{ fontSize: 12, color: COR.textoSuave }}>{grupo}</span>}
        </div>

        <form onSubmit={e => { e.preventDefault(); salvar() }} style={{ marginTop: 14 }}>
          <label htmlFor="valor-planejado" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 6 }}>
            Valor planejado de {nomeMes}
          </label>
          <input id="valor-planejado" ref={campoRef} inputMode="decimal" value={texto}
            onChange={e => { setErro(null); setTexto(e.target.value) }}
            style={{ ...campo, fontSize: estreito ? 20 : 18, fontWeight: 700, textAlign: 'right', padding: '10px 12px',
              fontVariantNumeric: 'tabular-nums', borderColor: abaixo || valor === null ? COR.erroTexto : COR.borda }} />
          <div style={{ fontSize: 13, marginTop: 6, color: abaixo ? (futuro ? COR.erroTexto : COR.avisoTexto) : COR.textoSuave }}>
            {valor === null ? 'Valor inválido.'
              : abaixo ? (futuro
                ? `Mínimo ${fmt(lancado)}: é o que já está lançado.`
                : `Abaixo do já lançado (${fmt(lancado)}): o Radar vai mostrar que ${nomeMes} passou do plano.`)
              : sobra > 0.005 ? `${fmt(lancado)} já lançado + ${fmt(sobra)} para outros gastos`
              : 'Igual ao já lançado: nada sobra para outros gastos.'}
          </div>
          {futuro && valorAtual < lancado - 0.005 && (
            <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>O plano estava em {fmt(valorAtual)}, abaixo do lançado.</div>
          )}
          <button type="submit" hidden />
        </form>
        {erro && <div role="alert" style={{ fontSize: 12, color: COR.erroTexto, marginTop: 6 }}>{erro}</div>}

        <section aria-label={`Já lançado em ${nomeMes}`} style={{ marginTop: 14, background: '#f8fafc',
          border: `1px solid ${COR.borda}`, borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>Já lançado em {nomeMes}</span>
            <b style={{ fontSize: 14, color: COR.texto, fontVariantNumeric: 'tabular-nums' }}>{fmt(lancado)}</b>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', marginTop: 4 }}>
            {jaLancado.map((j, k) => {
              const renomeavel = !!j.parcela?.compra && !!onRenomear
              const nomeNovo = nomes[k] ?? j.descricao
              return (
                <div key={k} style={{ padding: '7px 0', borderTop: k > 0 ? `1px solid ${COR.borda}` : 'none' }}>
                  {renomeavel ? (
                    <input aria-label={`Nome da compra (parcela ${j.parcela!.atual} de ${j.parcela!.total})`} placeholder="Nome da compra"
                      value={nomeNovo} onChange={e => setNomes(n => ({ ...n, [k]: e.target.value }))} style={campo} />
                  ) : (
                    <div style={{ fontSize: estreito ? 15 : 13, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {j.descricao || nome}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 3, gap: 8 }}>
                    <span style={{ fontSize: 12, color: COR.textoSuave }}>
                      {j.parcela ? `parcela ${j.parcela.atual} de ${j.parcela.total}` : 'à vista'}
                    </span>
                    <span style={{ fontSize: estreito ? 15 : 13, fontWeight: 600, color: COR.texto, fontVariantNumeric: 'tabular-nums' }}>{fmt(j.valor)}</span>
                  </div>
                  {renomeavel && nomeNovo.trim() && nomeNovo.trim() !== j.descricao.trim() && (
                    <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 3 }}>
                      Ao salvar, as {j.parcela!.total} parcelas da compra passam a se chamar "{nomeNovo.trim()}".
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onFechar} style={{ border: 'none', borderRadius: 999, padding: '8px 16px', font: 'inherit',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', background: '#f1f5f9', color: '#1e3a8a' }}>Cancelar</button>
          <button type="button" onClick={salvar} style={{ border: 'none', borderRadius: 999, padding: '8px 16px', font: 'inherit',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', background: COR.azul, color: '#fff' }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

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
function EditorItens({
  nome, grupo, mes, valorAtual, itens, partes, onSalvar, onTirar, onFechar, compras, onRenomear,
}: PropsItens) {
  const [linhas, setLinhas] = useState<Linha[]>(() => {
    if (itens?.length) return itens.map(i => {
      const ref = onRenomear ? compras?.[i.id] : undefined
      const r = i.simulacaoId ? null : lerRotuloParcela(i.descricao)
      return r
        ? { id: i.id, descricao: r.nome, valor: paraCampo(i.valor), parcela: { ...r, ref } }
        : { id: i.id, descricao: i.descricao, valor: paraCampo(i.valor), simulacaoId: i.simulacaoId }
    })
    if (partes?.length) return partes.map(p => ({ id: novoIdItem(), descricao: '', valor: paraCampo(p) }))
    if (valorAtual > 0) return [{ id: novoIdItem(), descricao: nome, valor: paraCampo(valorAtual) }, { id: novoIdItem(), descricao: '', valor: '' }]
    return [{ id: novoIdItem(), descricao: '', valor: '' }]
  })
  const [ateDezembro, setAteDezembro] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Celular: a descrição ganha a linha inteira — "Bicicleta · 4 de 6" não cabia ao lado do valor.
  const estreito = window.innerWidth < 640
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
        id: l.id, valor: v,
        descricao: l.parcela
          ? rotuloParcela(l.descricao.trim() || l.parcela.nome, l.parcela.atual, l.parcela.total)
          : l.descricao.trim() || `Item ${i + 1}`,
        ...(l.simulacaoId ? { simulacaoId: l.simulacaoId } : {}),
      }))
    if (itensOk.length === 0) { setErro('Adicione pelo menos um item com valor.'); return }
    if (somaItens(itensOk) < 0) { setErro('O total não pode ficar negativo.'); return }
    const meses = ateDezembro ? Array.from({ length: 12 - mes }, (_, i) => mes + i) : [mes]
    onSalvar(itensOk, meses)
    // Parcela com nome novo: a compra inteira muda de nome (fatura e plano).
    for (const l of linhas) {
      const novo = l.descricao.trim()
      if (l.parcela?.ref && onRenomear && novo && novo !== l.parcela.nome) onRenomear(l.parcela.ref, l.parcela.nome, novo)
    }
  }

  const campo: React.CSSProperties = {
    font: 'inherit', fontSize: estreito ? 16 : 13, border: `1px solid ${COR.borda}`, borderRadius: 8,
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
          ) : l.parcela ? (
            // Parcela: o nome em cima, na linha inteira; embaixo o valor, com
            // "4 de 12" ao lado, sem edição (pedido do Guilherme, 11/10/2026).
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 28px', gap: 6, alignItems: 'center',
              ...(i > 0 ? { borderTop: `1px solid ${COR.borda}`, paddingTop: 8 } : {}) }}>
              <input data-item aria-label={`Nome da compra (parcela ${l.parcela.atual} de ${l.parcela.total})`} placeholder="Nome da compra"
                value={l.descricao} onChange={e => mudar(l.id, 'descricao', e.target.value)} style={{ ...campo, gridColumn: '1 / -1' }} />
              {/* O valor da parcela é o da compra lançada: não se edita aqui. */}
              <span aria-label={`Valor da parcela ${l.parcela.atual} de ${l.parcela.total}`}
                style={{ ...campo, textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: '#f1f5f9',
                  border: `1px solid ${COR.borda}`, fontWeight: 600 }}>{l.valor}</span>
              <span style={{ fontSize: estreito ? 15 : 13, fontWeight: 600, color: COR.textoSuave, whiteSpace: 'nowrap', padding: '0 4px' }}>
                {l.parcela.atual} de {l.parcela.total}
              </span>
              <button type="button" aria-label={`Remover o item ${i + 1}`}
                onClick={() => setLinhas(ls => ls.filter(x => x.id !== l.id))}
                style={{ border: 'none', background: 'none', color: COR.textoSuave, cursor: 'pointer', fontSize: 17, height: 28, borderRadius: 6 }}>×</button>
              {l.parcela.ref && (
                <span style={{ gridColumn: '1 / -1', fontSize: 12, color: COR.textoSuave }}>
                  {l.descricao.trim() && l.descricao.trim() !== l.parcela.nome
                    ? `Ao salvar, as ${l.parcela.total} parcelas da compra passam a se chamar "${l.descricao.trim()}".`
                    : 'Compra no cartão: o nome vale para todas as parcelas.'}
                </span>
              )}
            </div>
          ) : (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: estreito ? '1fr 28px' : '1fr 110px 28px', gap: 6, alignItems: 'center',
              ...(estreito && i > 0 ? { borderTop: `1px solid ${COR.borda}`, paddingTop: 8 } : {}) }}>
              <input data-item aria-label={`Descrição do item ${i + 1}`} placeholder="Descrição" value={l.descricao}
                onChange={e => mudar(l.id, 'descricao', e.target.value)} style={{ ...campo, ...(estreito ? { gridColumn: '1 / -1' } : {}) }} />
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
