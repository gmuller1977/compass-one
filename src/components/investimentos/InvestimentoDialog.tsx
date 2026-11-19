import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { Conta, DadosMes, Lancamento } from '../../context/AppContext'
import ModalTopo from '../ModalTopo'
import { CalendarioMes } from '../CalendarioMes'
import { useToast } from '../Toast'
import { COR } from '../../utils/cores'
import { mascaraCentavos, parseBRL, trocarSinal } from '../../utils/moeda'
import { nomeDaConta } from '../../utils/nomeDaConta'
import { ehContaDisponivel } from '../../utils/saldoConta'
import { descricoesDaTransferencia } from '../../utils/transferencia'
import { lancamentoAntesDoSaldo } from '../../utils/saldoDesde'
import { saldoInformado } from '../../utils/saldoInformado'
import { CATEGORIA_RENDIMENTO, isoDe, type Objetivo, type ParteDoObjetivo } from '../../utils/investimentos'

export type AcaoInvestimento = 'aplicar' | 'resgatar' | 'atualizar'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const chave = (conta: string, ano: number, mes: number) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`
/** Sem saldo informado do jeito antigo: a data pode marcar a atualização sem mexer em conta nenhuma. */
const saldoInformadoVazio = (dm: DadosMes) => saldoInformado(dm) === null
const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const SELECT = {
  display: 'block', width: '100%', marginTop: 4, marginBottom: 12, border: `1.5px solid ${COR.borda}`,
  borderRadius: 12, padding: '10px 12px', fontSize: 15, color: COR.texto, background: '#fff', fontFamily: 'inherit',
} as const

const TEXTOS: Record<AcaoInvestimento, { icone: string; rotulo: string; botao: string }> = {
  aplicar:   { icone: 'ti-arrow-down-left', rotulo: 'Aplicar', botao: 'Aplicar' },
  resgatar:  { icone: 'ti-arrow-up-right', rotulo: 'Resgatar', botao: 'Resgatar' },
  atualizar: { icone: 'ti-refresh', rotulo: 'Atualizar saldo', botao: 'Atualizar saldo' },
}

/**
 * As três ações da tela de Investimentos, numa janela só (central no
 * computador, folha no celular).
 *
 * Aplicar e resgatar gravam a MESMA transferência de Lançamentos: a linha no
 * banco e o espelho no investimento, categoria 'Transferência', fora do
 * realizado.
 *
 * Desde 06/11/2026 (Guilherme: "o dinheiro pode vir de um banco ou de
 * rendimentos"; "preciso atualizar o saldo de uma ou mais aplicações"):
 * - Aplicar pergunta de onde vem: de um banco (a transferência) ou do
 *   rendimento (uma linha 'Rendimento' no investimento, sem banco).
 * - Atualizar saldo pede o saldo de CADA aplicação (objetivo); vazio não
 *   muda. A diferença de cada uma vira o rendimento dela, a mesma linha
 *   'Rendimento' com o objetivo. Antes era um saldo só para a conta, e o
 *   rendimento se dividia pelo saldo de cada objetivo.
 */
export default function InvestimentoDialog({ conta, acao, saldoCalculado, objetivos = [], partes = [], objetivoInicial, onFechar, central }: {
  conta: Conta
  acao: AcaoInvestimento
  saldoCalculado: number
  /** Os objetivos DESTA conta: com algum, aplicar e resgatar perguntam para qual. */
  objetivos?: Objetivo[]
  partes?: ParteDoObjetivo[]
  objetivoInicial?: string
  onFechar: () => void
  central: boolean
}) {
  const { contas, updateExtratoMes } = useApp()
  const { toast } = useToast()
  const hoje = new Date()
  const bancos = useMemo(() => contas.filter(ehContaDisponivel)
    .sort((a, b) => (b.preferida ? 1 : 0) - (a.preferida ? 1 : 0)), [contas])
  const [valor, setValor] = useState('')
  const [banco, setBanco] = useState(bancos[0]?.id ?? '')
  const [data, setData] = useState({ dia: hoje.getDate(), mes: hoje.getMonth(), ano: hoje.getFullYear() })
  const [calAberto, setCalAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [objetivo, setObjetivo] = useState(objetivoInicial ?? objetivos[0]?.id ?? '')
  const [origem, setOrigem] = useState<'banco' | 'rendimento'>('banco')
  // No rendimento, às vezes é preciso fazer conta (06/11/2026, Guilherme): a
  // pessoa digita o saldo atual da aplicação e o Compass mostra quanto rendeu.
  const [modoRend, setModoRend] = useState<'saldo' | 'valor'>('saldo')
  const saldoDaParte = (id: string) => partes.find(p => p.objetivoId === id)?.saldo ?? 0
  // As aplicações do "Atualizar saldo": cada objetivo e o que está sem objetivo.
  // Sem objetivo nenhum, a conta inteira numa linha só.
  const aplicacoes = objetivos.length === 0
    ? [{ id: '', nome: conta.apelido || conta.nome, saldo: saldoCalculado }]
    : [...objetivos.map(o => ({ id: o.id, nome: o.nome, saldo: saldoDaParte(o.id) })),
      ...(Math.abs(saldoDaParte('')) >= 0.005 ? [{ id: '', nome: 'Sem objetivo', saldo: saldoDaParte('') }] : [])]
  const [saldos, setSaldos] = useState<Record<string, string>>({})

  const t = TEXTOS[acao]
  const nomeInv = conta.apelido || conta.nome
  const v = parseBRL(valor)
  const saldoDaAplicacao = objetivos.length ? saldoDaParte(objetivo) : saldoCalculado
  const rendPorSaldo = acao === 'aplicar' && origem === 'rendimento' && modoRend === 'saldo' && valor.trim()
    ? v - saldoDaAplicacao : null
  const ehHoje = data.dia === hoje.getDate() && data.mes === hoje.getMonth() && data.ano === hoje.getFullYear()
  const difDe = (id: string, saldo: number) => (saldos[id] ?? '').trim() ? parseBRL(saldos[id]) - saldo : null
  const difTotal = aplicacoes.reduce((s, a) => s + (difDe(a.id, a.saldo) ?? 0), 0)
  const algumDigitado = aplicacoes.some(a => (saldos[a.id] ?? '').trim())

  const linhaRendimento = (id: string, dif: number, nome: string, objetivoId?: string) => ({
    id, tipo: dif > 0 ? 'entrada' : 'saida', valor: Math.round(Math.abs(dif) * 100) / 100,
    descricao: objetivos.length ? `Rendimento · ${nome}` : 'Rendimento', categoria: CATEGORIA_RENDIMENTO,
    formaPagamento: 'debito', tipoLanc: 'variavel', consolidado: true, rendimento: true,
    ...(objetivoId ? { objetivoId } : {}),
  }) as Lancamento

  function confirmar() {
    setErro('')
    if (acao === 'atualizar') {
      if (!algumDigitado) { setErro('Digite o saldo de pelo menos uma aplicação, como está no app do banco.'); return }
      const dia = hoje.getDate()
      const iso = isoDe(hoje.getFullYear(), hoje.getMonth(), dia)
      const base = Date.now()
      const novas = aplicacoes.flatMap((a, i) => {
        const dif = difDe(a.id, a.saldo)
        return dif !== null && Math.abs(dif) >= 0.005 ? [linhaRendimento(`r-${base + i}`, dif, a.nome, a.id || undefined)] : []
      })
      updateExtratoMes(chave(conta.id, hoje.getFullYear(), hoje.getMonth()), dm => ({
        ...dm,
        // A data marca "atualizado hoje", mesmo quando todas conferem.
        ...(saldoInformadoVazio(dm) ? { saldoBancoData: iso } : {}),
        lancamentos: { ...dm.lancamentos, [dia]: [...(dm.lancamentos?.[dia] ?? []), ...novas] },
      }))
      toast(novas.length ? 'Saldo atualizado' : 'Saldo conferido')
      onFechar()
      return
    }
    if (acao === 'aplicar' && origem === 'rendimento') {
      // Pelo saldo atual: a diferença para o Compass, hoje. Pelo valor: o que rendeu, no dia escolhido.
      const porSaldo = modoRend === 'saldo'
      if (!valor.trim()) { setErro(porSaldo ? 'Digite o saldo atual da aplicação.' : 'Digite quanto rendeu.'); return }
      const rend = porSaldo ? v - saldoDaAplicacao : v
      if (Math.abs(rend) < 0.005) { setErro('O saldo é igual ao do Compass: não há rendimento para registrar.'); return }
      if (!porSaldo && !(v > 0)) { setErro('Digite quanto rendeu.'); return }
      const d = porSaldo ? { dia: hoje.getDate(), mes: hoje.getMonth(), ano: hoje.getFullYear() } : data
      updateExtratoMes(chave(conta.id, d.ano, d.mes), (dm: DadosMes) => ({
        ...dm, lancamentos: { ...dm.lancamentos, [d.dia]: [...(dm.lancamentos?.[d.dia] ?? []),
          linhaRendimento(`r-${Date.now()}`, rend, objetivos.find(o => o.id === objetivo)?.nome ?? 'Sem objetivo', objetivo || undefined)] },
      }))
      toast('Rendimento registrado')
      onFechar()
      return
    }
    if (!(v > 0)) { setErro('Digite o valor.'); return }
    if (!banco) { setErro('Cadastre um banco para aplicar ou resgatar.'); return }
    if (acao === 'resgatar' && v > saldoCalculado + 0.005) {
      setErro(`O saldo deste investimento no Compass é ${fmt(saldoCalculado)}. Se ele rendeu, atualize o saldo antes de resgatar.`)
      return
    }
    if (acao === 'resgatar' && objetivos.length > 0 && v > saldoDaParte(objetivo) + 0.005) {
      const nomeObj = objetivos.find(o => o.id === objetivo)?.nome ?? 'Sem objetivo'
      setErro(`${nomeObj} tem ${fmt(Math.max(0, saldoDaParte(objetivo)))} neste investimento.`)
      return
    }
    const trava = [banco, conta.id]
      .map(id => lancamentoAntesDoSaldo(contas.find(c => c.id === id), data.ano, data.mes, data.dia)).find(Boolean)
    if (trava) { setErro(trava); return }

    const bancoConta = contas.find(c => c.id === banco)!
    const tipoNoBanco = acao === 'aplicar' ? 'saida' : 'entrada'
    const { primaria, espelho } = descricoesDaTransferencia({
      origemId: banco, destinoId: conta.id, tipo: tipoNoBanco,
      nomeOrigem: nomeDaConta(bancoConta, contas), nomeDestino: nomeInv,
    })
    const base = Date.now()
    const linha = (id: string, tipo: 'entrada' | 'saida', descricao: string, objetivoId?: string) => ({
      id, tipo, descricao, categoria: 'Transferência', valor: v,
      formaPagamento: 'transferencia', tipoLanc: 'variavel', consolidado: true,
      ...(objetivoId ? { objetivoId } : {}),
    }) as Lancamento
    const somar = (k: string, l: Lancamento) => updateExtratoMes(k, (dm: DadosMes) => ({
      ...dm, lancamentos: { ...dm.lancamentos, [data.dia]: [...(dm.lancamentos?.[data.dia] ?? []), l] },
    }))
    somar(chave(banco, data.ano, data.mes), linha(`v-${base}`, tipoNoBanco, primaria))
    somar(chave(conta.id, data.ano, data.mes), linha(`v-${base + 1}`, tipoNoBanco === 'saida' ? 'entrada' : 'saida', espelho, objetivo || undefined))
    toast(acao === 'aplicar' ? 'Aplicação registrada' : 'Resgate registrado')
    onFechar()
  }

  const raio = 20
  const campo = {
    display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, marginBottom: 12,
    border: `2px solid ${COR.azul}`, borderRadius: 12, padding: '10px 12px', fontSize: 18, fontWeight: 700,
    color: COR.azul, background: '#eff6ff', fontFamily: 'inherit', outline: 'none',
  } as const
  const rotulo = { fontSize: 14, fontWeight: 600, color: COR.textoSuave } as const

  return (
    <div role="dialog" aria-modal="true" aria-label={`${t.rotulo} · ${nomeInv}`} onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 300, display: 'flex',
        alignItems: central ? 'center' : 'flex-end', justifyContent: 'center', padding: central ? 16 : 0 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', width: '100%', maxWidth: central ? 440 : undefined, maxHeight: '92vh', overflowY: 'auto',
        borderRadius: central ? raio : `${raio}px ${raio}px 0 0`,
        fontFamily: "-apple-system,'Inter',sans-serif", animation: central ? undefined : 'slideUp .2s ease',
      }}>
        <ModalTopo icone={t.icone} rotulo={t.rotulo} titulo={nomeInv} raio={raio}
          subtitulo={`No Compass: ${fmt(saldoCalculado)}`} onFechar={onFechar} />
        <div style={{ padding: central ? '18px 20px 22px' : '16px 16px 28px' }}>
          {acao === 'atualizar' ? (
            <>
              <p style={{ fontSize: 14, color: COR.texto, margin: '0 0 12px', lineHeight: 1.45 }}>
                {aplicacoes.length > 1
                  ? <>Digite o saldo de cada aplicação como está hoje no app do banco. A que você deixar em branco não muda.</>
                  : <>Digite o saldo como está hoje no app do banco.</>}
              </p>
              {aplicacoes.map(a => {
                const dif = difDe(a.id, a.saldo)
                return (
                  <div key={a.id || 'sem'} style={{ border: `1.5px solid ${COR.borda}`, borderRadius: 14, padding: '10px 12px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: COR.texto, flex: 1, minWidth: 0 }}>{a.nome}</span>
                      <span style={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>No Compass {fmt(a.saldo)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={saldos[a.id] ?? ''} aria-label={`Saldo de ${a.nome} no banco`}
                        onChange={e => setSaldos(x => ({ ...x, [a.id]: mascaraCentavos(e.target.value, true) }))}
                        inputMode="numeric" placeholder="Saldo no banco" style={{ ...campo, flex: 1, margin: 0 }} />
                      <button type="button" onClick={() => setSaldos(x => ({ ...x, [a.id]: trocarSinal(x[a.id] ?? '') }))}
                        aria-label="Trocar o sinal" style={{
                          minWidth: 48, minHeight: 48, borderRadius: 12, border: `1.5px solid ${COR.borda}`, background: '#fff',
                          fontWeight: 700, fontSize: 15, color: COR.texto, cursor: 'pointer', fontFamily: 'inherit',
                        }}>+/−</button>
                    </div>
                    {dif !== null && (
                      <div role="status" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.4,
                        color: Math.abs(dif) < 0.005 ? '#15803d' : dif > 0 ? '#1e3a8a' : '#c2410c' }}>
                        {Math.abs(dif) < 0.005 ? '✓ Igual ao Compass'
                          : dif > 0 ? <>Rendeu <b>{fmt(dif)}</b></> : <>Ficou <b>{fmt(-dif)}</b> abaixo (rendimento negativo)</>}
                      </div>
                    )}
                  </div>
                )
              })}
              {aplicacoes.length > 1 && algumDigitado && Math.abs(difTotal) >= 0.005 && (
                <div role="status" style={{ background: '#eaf1fd', borderRadius: 12, padding: '10px 12px', fontSize: 14,
                  color: '#1e3a8a', marginBottom: 12, lineHeight: 1.45 }}>
                  No total, {difTotal > 0 ? <>rendeu <b>{fmt(difTotal)}</b></> : <>ficou <b>{fmt(-difTotal)}</b> abaixo</>}.
                </div>
              )}
              <p style={{ fontSize: 13, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.45 }}>
                A diferença vira o rendimento da aplicação. Não mexe em banco nenhum. Se o saldo mudou porque você
                aplicou ou resgatou, use Aplicar ou Resgatar.
              </p>
            </>
          ) : (
            <>
              {acao === 'aplicar' && (
                <>
                  <div style={rotulo}>De onde vem o dinheiro?</div>
                  <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '4px 0 12px' }}>
                    {([['banco', 'ti-building-bank', 'De um banco'], ['rendimento', 'ti-trending-up', 'Rendimento']] as const).map(([k, ic, txt]) => {
                      const on = origem === k
                      return (
                        <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setOrigem(k)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46, borderRadius: 12,
                          border: on ? '2px solid #1d4ed8' : `1.5px solid ${COR.borda}`, background: on ? '#eff6ff' : '#fff',
                          color: on ? '#1e3a8a' : COR.texto, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit',
                        }}><i aria-hidden className={`ti ${ic}`} style={{ fontSize: 18 }} />{txt}</button>
                      )
                    })}
                  </div>
                </>
              )}
              {acao === 'aplicar' && origem === 'rendimento' && (
                <div role="radiogroup" aria-label="Como informar" style={{ display: 'flex', gap: 6, margin: '0 0 10px' }}>
                  {([['saldo', 'Pelo saldo atual'], ['valor', 'Quanto rendeu']] as const).map(([k, txt]) => {
                    const on = modoRend === k
                    return (
                      <button key={k} type="button" role="radio" aria-checked={on}
                        onClick={() => { setModoRend(k); setValor('') }} style={{
                          flex: 1, minHeight: 38, borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit', border: on ? 'none' : `1.5px solid ${COR.borda}`,
                          background: on ? '#1e3a8a' : '#fff', color: on ? '#fff' : '#334155',
                        }}>{txt}</button>
                    )
                  })}
                </div>
              )}
              {objetivos.length > 0 && acao === 'aplicar' && origem === 'rendimento' && (
                <label style={rotulo}>Qual aplicação?
                  <select value={objetivo} onChange={e => setObjetivo(e.target.value)} style={SELECT}>
                    {objetivos.map(o => <option key={o.id} value={o.id}>{o.nome} · {fmt(saldoDaParte(o.id))}</option>)}
                    <option value="">Sem objetivo · {fmt(saldoDaParte(''))}</option>
                  </select>
                </label>
              )}
              <label style={rotulo}>{origem === 'rendimento' && acao === 'aplicar'
                ? (modoRend === 'saldo' ? 'Saldo atual, no app do banco' : 'Quanto rendeu') : 'Valor'}
                {origem === 'rendimento' && acao === 'aplicar' && modoRend === 'saldo' && (
                  <span style={{ fontWeight: 400 }}> · no Compass {fmt(saldoDaAplicacao)}</span>
                )}
                <input value={valor} onChange={e => setValor(mascaraCentavos(e.target.value))}
                  inputMode="numeric" autoFocus={central} placeholder="0,00" style={campo} />
              </label>
              {rendPorSaldo !== null && (
                <div role="status" style={{ background: '#eaf1fd', borderRadius: 12, padding: '10px 12px', fontSize: 14,
                  color: Math.abs(rendPorSaldo) < 0.005 ? '#15803d' : rendPorSaldo > 0 ? '#1e3a8a' : '#c2410c',
                  marginBottom: 12, lineHeight: 1.45 }}>
                  {Math.abs(rendPorSaldo) < 0.005 ? '✓ Igual ao Compass: nada a registrar.'
                    : rendPorSaldo > 0 ? <>Rendeu <b>{fmt(rendPorSaldo)}</b></>
                    : <>Ficou <b>{fmt(-rendPorSaldo)}</b> abaixo (rendimento negativo)</>}
                </div>
              )}
              {objetivos.length > 0 && !(acao === 'aplicar' && origem === 'rendimento') && (
                <label style={rotulo}>{acao === 'aplicar' ? 'Para qual objetivo?' : 'De qual objetivo?'}
                  <select value={objetivo} onChange={e => setObjetivo(e.target.value)} style={SELECT}>
                    {objetivos.map(o => <option key={o.id} value={o.id}>{o.nome} · {fmt(saldoDaParte(o.id))}</option>)}
                    <option value="">Sem objetivo · {fmt(saldoDaParte(''))}</option>
                  </select>
                </label>
              )}
              {!(acao === 'aplicar' && origem === 'rendimento') && (
                <label style={rotulo}>{acao === 'aplicar' ? 'Sai de' : 'Vai para'}
                  <select value={banco} onChange={e => setBanco(e.target.value)} style={SELECT}>
                    {bancos.map(b => <option key={b.id} value={b.id}>{nomeDaConta(b, contas)}</option>)}
                  </select>
                </label>
              )}
              {!(acao === 'aplicar' && origem === 'rendimento' && modoRend === 'saldo') && (<>
              <div style={rotulo}>Dia</div>
              <button type="button" onClick={() => setCalAberto(a => !a)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 4, marginBottom: 12, minHeight: 44,
                border: `1.5px solid ${COR.borda}`, borderRadius: 12, padding: '10px 12px', fontSize: 15, color: COR.texto,
                background: '#fff', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
              }}>
                <i aria-hidden className="ti ti-calendar" style={{ fontSize: 18, color: COR.azul }} />
                {ehHoje ? 'Hoje' : `${String(data.dia).padStart(2, '0')}/${String(data.mes + 1).padStart(2, '0')}`}
                {' '}<span style={{ color: COR.textoSuave }}>{DIAS_SEM[new Date(data.ano, data.mes, data.dia).getDay()]}</span>
              </button>
              {calAberto && (
                <div style={{ marginBottom: 12 }}>
                  <CalendarioMes grande={!central} selecionada={data} onFechar={() => setCalAberto(false)}
                    ate={{ dia: hoje.getDate(), mes: hoje.getMonth(), ano: hoje.getFullYear() }}
                    onEscolher={d => { setData(d); setCalAberto(false) }} />
                </div>
              )}
              </>)}
              <p style={{ fontSize: 13, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.45 }}>
                {acao === 'aplicar' && origem === 'rendimento'
                  ? `${modoRend === 'saldo' ? 'A diferença para o Compass, hoje, vira o rendimento. ' : ''}Não mexe em banco nenhum e não conta como dinheiro guardado da meta.`
                  : 'Vira uma transferência em Lançamentos, no banco escolhido. Não é receita nem despesa.'}
              </p>
            </>
          )}
          {erro && (
            <div role="alert" style={{ fontSize: 14, color: COR.erroTexto, background: COR.erroFundo, borderRadius: 10,
              padding: '9px 12px', marginBottom: 12, lineHeight: 1.45 }}>{erro}</div>
          )}
          <button onClick={confirmar} style={{
            width: '100%', padding: 16, border: 'none', borderRadius: 16, cursor: 'pointer',
            background: 'var(--cx-azul)', boxShadow: 'var(--cx-bolinha)', color: '#fff',
            fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
          }}>{t.botao}</button>
        </div>
      </div>
    </div>
  )
}
