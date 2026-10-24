import React from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria, ehFixaDeCartao } from '../../utils/categoriaIcone'
import { grupoDaCategoria } from '../../utils/rotuloCategoria'
import { ehTransferencia } from '../acompanhamento/evolucaoCalcs'
import { Cartao, IconeRedondo } from '../mobile/ui'
import { M } from '../mobile/estilo'
import ModalTopo from '../ModalTopo'
import {
  COR, fmt, NOMES_MESES, formasDoLancamento,
  diaEfetivoFixa, formaPagCategoria, formaRecebCategoria,
  type CatFixa, type FormaPag, parseValor, REALCE_ERRO,
} from './NleShared'
import { ChipCenario, MemoriaSaldo, type Props } from './NleExtrato'

/**
 * O extrato do Banco e do Dinheiro no celular, no padrão dos apps de banco
 * (Nubank, Inter, Itaú) — o mesmo trabalho da Bússola e do Lançar, pedido do
 * Guilherme em 12/10/2026. Só desenho: os números do dia são a MESMA conta do
 * NleExtrato (copiada linha a linha), e toda ação chama as funções da página
 * — lancar, editarLancamento, editarFixa, consolidarFixa, excluir.
 *
 *   - Só aparecem os dias com movimento, e HOJE. Os outros 25 dias vazios eram
 *     três caixas de número cada, e escondiam o que aconteceu.
 *   - O dia é um título ("12 · segunda") com o saldo ao lado; os lançamentos
 *     ficam num cartão branco, ícone em círculo, nome, legenda e valor.
 *   - O formulário sobe de baixo (folha), com o campo Dia sempre à vista: é
 *     por ele que se lança num dia que não aparece na lista.
 *   - Excluir saiu da linha (o ✕ de 14 px) e foi para dentro da edição.
 *
 * Cores no branco: receita #15803d (5,02), despesa #b91c1c (6,47), previsto
 * COR.textoSuave (4,76). Letra: nada abaixo de 12; campos em 16 (o iPhone dá
 * zoom em campo menor).
 */

const DIAS_SEMANA_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const VERDE = '#15803d'
const VERMELHO = '#b91c1c'

const ROTULO_FORMA: Record<string, string> = {
  debito: 'Débito', automatico: 'Débito automático', credito: 'Crédito', pix: 'Pix',
  transferencia: 'Transferência', dinheiro: 'Dinheiro', boleto: 'Boleto', manual: 'Manual',
}

const rotuloFixa = (f: CatFixa) => f.id.startsWith('cartao-') ? 'Cartão de Crédito' : f.nome

const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minHeight: 48, border: `1.5px solid ${COR.borda}`, borderRadius: 12,
  padding: '10px 12px', fontSize: 16, outline: 'none', background: '#fff', fontFamily: 'inherit', color: COR.texto,
}
const rotuloCampo: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: COR.textoSuave, marginBottom: 6 }

export default function NleExtratoMobile({
  isDinheiro, mes, ano, totalDias, eMesAtual, diaHoje, anoHoje, mesHoje,
  fixas, categorias, mesDados, saldosDia, saldoBase, saldoMes, memoria,
  cenarioPrevisao, setCenarioPrevisao, totalEntradas, totalSaidas, contas,
  diaSel, highlightDia, editandoId, editandoFixaId, mobileDiaForm,
  fTipo, fCat, fSubDesc, fDesc, fValor, fPag, fContaDestino, setFContaDestino, destinosTransf,
  categoriasSelect, onNovaCategoria, subDescsDisponiveis,
  valorInputRef, categoriaSelectRef, hojeRef,
  setDiaSel, editarFixa, editarLancamento, excluir, lancar,
  desconsolidarFixa, consolidarFixa, setMobileDiaForm,
  setFTipo, setFCat, setFSubDesc, setFDesc, setFValor, setFPag,
  setEditandoId, setEditandoFixaId, ehAutomatico, resetarParaNovo, desktop,
}: Props & { desktop?: boolean }) {
  const [memoriaAberta, setMemoriaAberta] = React.useState(false)
  const [futurosAbertos, setFuturosAbertos] = React.useState(false)
  const valorRuim = parseValor(fValor) === null
  const cartaoNomesExtrato = new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))

  // O mesmo gesto do antigo "+ Adicionar neste dia".
  function novoNoDia(dia: number) {
    // No computador o formulário é o painel da direita.
    if (desktop) { resetarParaNovo(dia); return }
    setMobileDiaForm(dia); setDiaSel(dia)
    setFTipo('saida'); setFCat(''); setFSubDesc(''); setFDesc(''); setFValor(''); setFPag(isDinheiro ? 'dinheiro' : 'debito'); setFContaDestino('')
    setEditandoId(null); setEditandoFixaId(null)
    setTimeout(() => categoriaSelectRef.current?.focus(), 80)
  }
  function fecharForm() { setMobileDiaForm(null); setEditandoId(null); setEditandoFixaId(null) }

  const semNada = totalEntradas === 0 && totalSaidas === 0 &&
    fixas.filter(f => !ehFixaDeCartao(categorias, f)).length === 0

  const sf = saldosDia[totalDias] ?? saldoMes
  const editando = !!(editandoId || editandoFixaId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: desktop ? 0 : '0 16px' }}>
      {!desktop && <button onClick={() => novoNoDia(eMesAtual ? diaHoje : diaSel)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52,
        border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
        background: `linear-gradient(135deg,${COR.azul},#2563eb)`, color: '#fff',
        fontSize: 16, fontWeight: 700, boxShadow: '0 6px 18px rgba(26,86,219,.28)',
      }}>
        <span aria-hidden style={{ fontSize: 20, lineHeight: 1 }}>＋</span> Novo lançamento
      </button>}

      {semNada && (
        <Cartao style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <IconeRedondo icone={<i className="ti ti-bulb" style={{ color: COR.azul }} />} />
          <div>
            <div style={{ fontSize: M.corpo, fontWeight: 700, color: COR.texto }}>Nenhum lançamento este mês</div>
            <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: 2 }}>Toque em “Novo lançamento” para registrar.</div>
          </div>
        </Cartao>
      )}

      {(() => {
      const renderDia = (dia: number) => {
        // ── Mesma conta do NleExtrato ──────────────────────────────────
        const ehHoje = eMesAtual && dia === diaHoje
        const passado = eMesAtual ? dia < diaHoje : ano < anoHoje || (ano === anoHoje && mes < mesHoje)
        const fs = fixas.filter(f => diaEfetivoFixa(f, mesDados.fixasMovidas, ehAutomatico(f), mes, ano, totalDias) === dia)
          .slice().sort((a, b) => rotuloFixa(a).localeCompare(rotuloFixa(b), 'pt-BR'))
        // No dia, o último lançado no topo, como no extrato do banco.
        const ls = (mesDados.lancamentos[dia] ?? []).slice().reverse()
        const temItens = fs.length > 0 || ls.length > 0
        if (!temItens && !ehHoje) return null
        const saldoIni = dia === 1 ? saldoBase : (saldosDia[dia - 1] ?? saldoBase)
        const diaFuturo = !passado && !ehHoje
        const entradasConf =
          fs.filter(f => f.tipo === 'entrada' && (mesDados.fixasConsolidadas?.[f.id] === true))
            .reduce((s, f) => s + (mesDados.fixasValorOverride?.[f.id] ?? f.valor), 0)
          + ls.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
        const saidasConf =
          fs.filter(f => f.tipo === 'saida' && (mesDados.fixasConsolidadas?.[f.id] === true))
            .reduce((s, f) => s + (mesDados.fixasValorOverride?.[f.id] ?? f.valor), 0)
          + ls.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
        const saldoDia = diaFuturo ? (saldosDia[dia] ?? saldoIni) : saldoIni + entradasConf - saidasConf
        const semana = DIAS_SEMANA_LONGO[new Date(ano, mes, dia).getDay()]

        return (
          <section key={dia} ref={ehHoje ? hojeRef : undefined} style={{ scrollMarginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 8px' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* dd/mm: com a página rolando, o mês do topo sai da vista. */}
                <span style={{ fontSize: M.corpo, fontWeight: 800, color: COR.texto, fontVariantNumeric: 'tabular-nums' }}>
                  {String(dia).padStart(2, '0')}/{String(mes + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: M.corpo, fontWeight: 500, color: COR.textoSuave }}>{semana}</span>
                {ehHoje && (
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: COR.azul, color: '#fff' }}>Hoje</span>
                )}
              </div>
              <span style={{ fontSize: M.legenda, color: COR.textoSuave, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {diaFuturo ? 'previsto ' : 'saldo '}
                <b style={{ color: saldoDia < 0 ? VERMELHO : COR.texto, fontWeight: 700 }}>{fmt(saldoDia)}</b>
              </span>
              <button aria-label={`Lançar no dia ${dia}`} onClick={() => novoNoDia(dia)} style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#e8eefc', color: COR.azul,
                fontSize: 20, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', lineHeight: 1,
              }}>+</button>
            </div>

            <Cartao style={{
              padding: '4px 16px',
              boxShadow: ehHoje ? `0 0 0 2px ${COR.azul}, ${M.sombra}` : M.sombra,
              animation: highlightDia === dia ? 'rowSaved 1.2s ease-out' : undefined,
            }}>
              {!temItens && (
                <div style={{ padding: '14px 0', fontSize: M.corpo, color: COR.textoSuave }}>Nada lançado hoje ainda.</div>
              )}

              {fs.map((f, idx) => {
                const ehFaturaFixa = f.id.startsWith('cartao-')
                const vis = iconeCategoria(categorias, f.categoria)
                const automatico = ehAutomatico(f)
                const consolidada = mesDados.fixasConsolidadas?.[f.id] === true
                const valor = mesDados.fixasValorOverride?.[f.id] ?? f.valor
                const emEdicao = editandoFixaId === f.id
                const nome = ehFaturaFixa ? 'Cartão de Crédito' : `${f.nome}${f.descricao ? ` · ${f.descricao}` : ''}`
                const legenda = [
                  consolidada ? (automatico ? 'Automática ✓' : (f.tipo === 'entrada' ? 'Recebida ✓' : 'Paga ✓')) : (f.tipo === 'entrada' ? 'A receber' : 'A pagar'),
                  ehFaturaFixa ? f.categoria : f.subtitulo,
                  ROTULO_FORMA[f.formaPagamento],
                  f.inativa ? 'categoria inativa' : undefined,
                ].filter(Boolean).join(' · ')
                return (
                  <div key={f.id} onClick={() => editarFixa(dia, f)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', minHeight: 56, cursor: 'pointer',
                    borderTop: idx === 0 ? 'none' : '1px solid #eef2f8', background: emEdicao ? '#f1f5ff' : undefined,
                  }}>
                    <button
                      aria-label={consolidada ? 'Desmarcar como paga' : 'Marcar como paga'} aria-pressed={consolidada}
                      onClick={e => { e.stopPropagation(); if (consolidada) desconsolidarFixa(f.id); else consolidarFixa(f.id) }}
                      style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', padding: 0,
                        border: consolidada ? 'none' : `2px solid #94a3b8`, background: consolidada ? VERDE : '#fff',
                        color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: 'inherit', lineHeight: 1,
                      }}>{consolidada ? '✓' : ''}</button>
                    <span style={{ opacity: consolidada ? 1 : 0.6, display: 'flex' }}>
                      <IconeRedondo icone={vis.icone} cor={vis.cor} tamanho={40} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: M.corpo, fontWeight: 600, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</div>
                      <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{legenda}</div>
                    </div>
                    <div style={{
                      fontSize: M.corpo, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                      color: !consolidada ? COR.textoSuave : f.tipo === 'entrada' ? VERDE : VERMELHO,
                    }}>{f.tipo === 'entrada' ? '+' : '−'}{fmt(valor)}</div>
                  </div>
                )
              })}

              {ls.map((l, idx) => {
                const vis = iconeCategoria(categorias, l.categoria)
                const catLower = l.categoria.toLowerCase()
                const ehFaturaLanc = cartaoNomesExtrato.has(catLower) ||
                  (catLower.includes('cart') && (/cr[eé]d/.test(catLower) || catLower.includes('fatura')))
                const daFatura = l.id.startsWith('fatura-')
                const emEdicao = editandoId === l.id
                const grupo = ehFaturaLanc ? undefined : grupoDaCategoria(l.categoria, l.subCategoria, categorias)
                // Transferência mostra o que aconteceu ("Saque", "→ Nubank"),
                // e o valor sem verde nem vermelho: não é receita nem despesa.
                const ehTransf = ehTransferencia(l.categoria)
                const nome = ehFaturaLanc ? 'Cartão de Crédito' : ehTransf ? (l.descricao || 'Transferência') : `${l.categoria}${l.subCategoria ? ` · ${l.subCategoria}` : ''}`
                const desc = ehFaturaLanc ? l.categoria : ehTransf ? '' : (l.descricao && l.descricao !== l.categoria ? l.descricao : '')
                const legenda = ehTransf ? 'Transferência entre suas contas' : [desc, desc ? undefined : grupo, ROTULO_FORMA[l.formaPagamento]].filter(Boolean).join(' · ')
                return (
                  <div key={l.id} onClick={() => { if (!daFatura) editarLancamento(dia, l) }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', minHeight: 56,
                    cursor: daFatura ? 'default' : 'pointer',
                    borderTop: idx === 0 && fs.length === 0 ? 'none' : '1px solid #eef2f8',
                    background: emEdicao ? '#f1f5ff' : undefined,
                  }}>
                    <IconeRedondo icone={vis.icone} cor={vis.cor} tamanho={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: M.corpo, fontWeight: 600, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</div>
                      {legenda && <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{legenda}</div>}
                    </div>
                    <div style={{
                      fontSize: M.corpo, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                      color: ehTransf ? COR.texto : l.tipo === 'entrada' ? VERDE : VERMELHO,
                    }}>{l.tipo === 'entrada' ? '+' : '−'}{fmt(l.valor)}</div>
                  </div>
                )
              })}
            </Cartao>
          </section>
        )
      }

      // Do último dia para o primeiro, como o extrato do banco (pedido do
      // Guilherme, 22/10/2026). No mês corrente, os dias depois de hoje ficam
      // num acordeão "Lançamentos futuros", fechado, acima de hoje: quando o
      // dia chega, a conta sai dele sozinha e fica no dia.
      const ordem = Array.from({ length: totalDias }, (_, i) => totalDias - i)
      const diasFuturos = eMesAtual ? ordem.filter(d => d > diaHoje) : []
      const qtdFuturos = diasFuturos.reduce((n, d) =>
        n + fixas.filter(f => diaEfetivoFixa(f, mesDados.fixasMovidas, ehAutomatico(f), mes, ano, totalDias) === d).length
          + (mesDados.lancamentos[d]?.length ?? 0), 0)
      const resto = eMesAtual ? ordem.filter(d => d <= diaHoje) : ordem
      return (
        <>
          {qtdFuturos > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* O desenho do "Conferidos" da Início (DebitosAutomaticosCard):
                  caixa com cara de botão e "Ver" / "Esconder" em azul, com
                  borda azul de destaque e fundo azul-claro (pedido do Guilherme,
                  22/10/2026). No #dbeafe: #1a56db 5,2; #334155 8,8. */}
              <button type="button" onClick={() => setFuturosAbertos(v => !v)} aria-expanded={futurosAbertos} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 48, padding: '0 14px',
                border: `2px solid ${COR.azul}`, borderRadius: 14, background: '#dbeafe',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
                <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', background: COR.azul, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  <i className="ti ti-clock" />
                </span>
                <span style={{ flex: 1, minWidth: 0, padding: '8px 0' }}>
                  <span style={{ display: 'block', fontSize: M.corpo, fontWeight: 700, color: COR.texto }}>Lançamentos futuros</span>
                  <span style={{ display: 'block', fontSize: M.legenda, color: '#334155', marginTop: 2 }}>
                    {qtdFuturos} {qtdFuturos === 1 ? 'lançamento previsto' : 'lançamentos previstos'}
                  </span>
                </span>
                <span style={{ fontSize: M.legenda, fontWeight: 700, color: '#1a56db', whiteSpace: 'nowrap' }}>
                  {futurosAbertos ? 'Esconder' : 'Ver'} <span aria-hidden style={{ display: 'inline-block', transform: futurosAbertos ? 'rotate(180deg)' : 'none' }}>▾</span>
                </span>
              </button>
              {futurosAbertos && diasFuturos.map(renderDia)}
            </section>
          )}
          {resto.map(renderDia)}
        </>
      )
      })()}

      {/* O mês termina com — a mesma barra e a mesma memória de antes. No
          computador ela fica presa no pé da tela (NleExtrato). */}
      {!desktop && <div style={{ borderRadius: M.raio, overflow: 'hidden', boxShadow: M.sombra,
        background: sf < 0 ? 'linear-gradient(135deg,#7f1d1d,#991b1b)' : 'var(--cx-azul)' }}>
        <button onClick={() => setMemoriaAberta(v => !v)} aria-expanded={memoriaAberta} style={{
          width: '100%', padding: '18px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
          <div>
            <div style={{ fontSize: M.corpo, color: '#fff', fontWeight: 700, marginBottom: 4 }}>
              {NOMES_MESES[mes]} termina com
            </div>
            <div style={{ fontSize: M.legenda, color: 'rgba(255,255,255,.8)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{memoriaAberta ? 'fechar' : 'como cheguei'}</span>
              <ChipCenario cenario={cenarioPrevisao} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            color: '#fff' }}>{fmt(sf)}</div>
        </button>
        {memoriaAberta && (
          <MemoriaSaldo m={memoria} positivo={sf >= 0} cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
        )}
      </div>}

      {/* ── Folha do lançamento ─────────────────────────────────────── */}
      {mobileDiaForm !== null && (
        <div onClick={fecharForm} style={{
          position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(15,23,42,.45)',
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-label={editando ? 'Editar lançamento' : 'Novo lançamento'} style={{
            width: '100%', maxHeight: '92vh', background: '#fff', borderRadius: '24px 24px 0 0',
            display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          }}>
            <ModalTopo icone={editando ? 'ti-pencil' : 'ti-plus'} rotulo="Lançamentos" raio={24} onFechar={fecharForm}
              titulo={editando ? 'Editar lançamento' : 'Novo lançamento'} />
            <div style={{ overflowY: 'auto', padding: '16px 16px calc(20px + env(safe-area-inset-bottom))' }}>

            <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: '#f1f5f9', marginBottom: 16 }}>
              {(['saida', 'entrada'] as const).map(t => {
                const on = fTipo === t
                return (
                  <button key={t} role="tab" aria-selected={on} onClick={() => { setFTipo(t); if (!isDinheiro && fPag !== 'transferencia') setFPag(t === 'entrada' ? 'pix' : 'debito') }} style={{
                    flex: 1, minHeight: 42, border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 15, fontWeight: 700, background: on ? '#fff' : 'transparent',
                    color: on ? (t === 'entrada' ? VERDE : VERMELHO) : '#475569',
                    boxShadow: on ? '0 1px 4px rgba(15,23,42,.12)' : 'none',
                  }}>{t === 'saida' ? '↓ Pagamento' : '↑ Recebimento'}</button>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Mesma ordem do computador: tipo, forma de pagamento, categoria. */}
              <div>
                <span style={rotuloCampo}>{fTipo === 'entrada' ? 'Como recebeu' : 'Como pagou'}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {formasDoLancamento(fTipo, isDinheiro).map(p => {
                    const on = fPag === p.id
                    return (
                      <button key={p.id} onClick={() => { setFPag(p.id as FormaPag); if (p.id !== 'transferencia') setFContaDestino('') }} aria-pressed={on} style={{
                        minHeight: 40, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 14, fontWeight: 700, border: on ? 'none' : `1.5px solid ${COR.borda}`,
                        background: on ? COR.azul : '#fff', color: on ? '#fff' : '#475569',
                      }}>{p.label}</button>
                    )
                  })}
                </div>
              </div>

              {/* Transferência não pede categoria: só a outra conta. */}
              {fPag === 'transferencia' ? (
                <label>
                  <span style={rotuloCampo}>{fTipo === 'saida' ? 'Transferir para' : 'Receber de'}</span>
                  <select ref={categoriaSelectRef} value={fContaDestino} aria-label="Conta da transferência"
                    onChange={e => { setFContaDestino(e.target.value); if (e.target.value) setTimeout(() => valorInputRef.current?.focus(), 50) }}
                    style={campo}>
                    <option value="">Selecione a conta...</option>
                    {destinosTransf.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
              ) : <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ ...rotuloCampo, marginBottom: 0 }}>Categoria</span>
                  <button type="button" onClick={onNovaCategoria} style={{
                    border: 'none', background: '#eff6ff', borderRadius: 999, padding: '6px 12px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: COR.azul,
                  }}>+ Nova</button>
                </div>
                <select ref={categoriaSelectRef} value={fCat} aria-label="Categoria"
                  onChange={e => {
                    const nome = e.target.value
                    if (nome === '__nova__') { onNovaCategoria(); return }
                    setFCat(nome); setFSubDesc('')
                    const c = categorias.find((x: Categoria) => x.nome === nome)
                    if (c) setFPag(fTipo === 'entrada' ? formaRecebCategoria(c.formaPagamento, c.tipoMovimento) : formaPagCategoria(c.formaPagamento, c.tipoMovimento))
                    if (nome) setTimeout(() => valorInputRef.current?.focus(), 50)
                  }}
                  style={campo}>
                  <option value="">Selecione...</option>
                  <option value="__nova__">+ Nova categoria…</option>
                  <option disabled>──────────────</option>
                  {(() => {
                    const grps = new Map<string, Categoria[]>()
                    for (const c of categoriasSelect) { const g = c.grupo ?? ''; if (!grps.has(g)) grps.set(g, []); grps.get(g)!.push(c) }
                    return Array.from(grps.entries())
                      .sort(([a], [b]) => a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'pt-BR'))
                      .map(([grupo, cats]) => grupo
                        ? <optgroup key={grupo} label={grupo}>{cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</optgroup>
                        : cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>))
                  })()}
                </select>
              </div>}

              {fPag !== 'transferencia' && subDescsDisponiveis.length > 0 && (
                <label>
                  <span style={rotuloCampo}>Variante</span>
                  <select value={fSubDesc} onChange={e => setFSubDesc(e.target.value)} style={campo}>
                    <option value="">Selecione...</option>
                    {subDescsDisponiveis.map(desc => <option key={desc} value={desc}>{desc}</option>)}
                  </select>
                </label>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ flex: 1, minWidth: 0 }}>
                  <span style={rotuloCampo}>Valor</span>
                  <input ref={valorInputRef} value={fValor} onChange={e => setFValor(e.target.value)}
                    placeholder="R$ 0,00" inputMode="decimal"
                    style={{ ...campo, fontSize: 20, fontWeight: 700, ...(valorRuim ? REALCE_ERRO : {}) }}
                    onKeyDown={e => e.key === 'Enter' && lancar()} />
                </label>
                {/* O lancar() grava no diaSel; editando, move do dia de origem. */}
                <label style={{ width: 112, flexShrink: 0 }}>
                  <span style={rotuloCampo}>Dia</span>
                  <select value={diaSel} onChange={e => setDiaSel(Number(e.target.value))} aria-label="Dia do lançamento" style={campo}>
                    {Array.from({ length: totalDias }, (_, i) => i + 1).map(d =>
                      <option key={d} value={d}>{String(d).padStart(2, '0')}/{String(mes + 1).padStart(2, '0')}</option>)}
                  </select>
                </label>
              </div>

              <label>
                <span style={rotuloCampo}>Descrição <span style={{ fontWeight: 400 }}>(opcional)</span></span>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Ex.: Mercado Extra"
                  style={campo} onKeyDown={e => e.key === 'Enter' && lancar()} />
              </label>
            </div>

            <button onClick={lancar} style={{
              marginTop: 20, width: '100%', minHeight: 52, border: 'none', borderRadius: 999, cursor: 'pointer',
              background: `linear-gradient(135deg,${COR.azul},#2563eb)`, color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: 'inherit',
            }}>{editando ? 'Salvar' : 'Lançar'}</button>
            {editandoId && (
              <button onClick={() => { excluir(mobileDiaForm, editandoId); setMobileDiaForm(null) }} style={{
                marginTop: 8, width: '100%', minHeight: 48, border: 'none', borderRadius: 999, cursor: 'pointer',
                background: '#fff', color: VERMELHO, fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              }}>Excluir lançamento</button>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
