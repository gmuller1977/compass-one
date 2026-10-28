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
import { isoDe, type Objetivo, type ParteDoObjetivo } from '../../utils/investimentos'

export type AcaoInvestimento = 'aplicar' | 'resgatar' | 'atualizar'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const chave = (conta: string, ano: number, mes: number) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`
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
 * realizado. Atualizar saldo grava o informado no mesmo campo da caixa de
 * saldo de Lançamentos, com a data de hoje: a diferença para o calculado é o
 * rendimento (utils/investimentos).
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
  const saldoDaParte = (id: string) => partes.find(p => p.objetivoId === id)?.saldo ?? 0

  const t = TEXTOS[acao]
  const nomeInv = conta.apelido || conta.nome
  const v = parseBRL(valor)
  const ehHoje = data.dia === hoje.getDate() && data.mes === hoje.getMonth() && data.ano === hoje.getFullYear()
  const dif = acao === 'atualizar' && valor.trim() ? v - saldoCalculado : null

  function confirmar() {
    setErro('')
    if (acao === 'atualizar') {
      if (!valor.trim()) { setErro('Digite o saldo que aparece no app do banco.'); return }
      const iso = isoDe(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      updateExtratoMes(chave(conta.id, hoje.getFullYear(), hoje.getMonth()), dm => ({
        ...dm, saldoBanco: fmt(v), saldoBancoData: iso, saldoBancoInformado: true,
      }))
      toast('Saldo atualizado')
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
              <label style={rotulo}>Saldo hoje, no app do banco
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={valor} onChange={e => setValor(mascaraCentavos(e.target.value, true))}
                    inputMode="numeric" autoFocus={central} placeholder="0,00" style={{ ...campo, flex: 1 }} />
                  <button type="button" onClick={() => setValor(trocarSinal(valor))} aria-label="Trocar o sinal" style={{
                    marginBottom: 12, marginTop: 4, minWidth: 48, minHeight: 48, borderRadius: 12, border: `1.5px solid ${COR.borda}`,
                    background: '#fff', fontWeight: 700, fontSize: 15, color: COR.texto, cursor: 'pointer', fontFamily: 'inherit',
                  }}>+/−</button>
                </div>
              </label>
              {dif !== null && Math.abs(dif) >= 0.005 && (
                <div role="status" style={{ background: '#eaf1fd', borderRadius: 12, padding: '10px 12px', fontSize: 14,
                  color: '#1e3a8a', marginBottom: 14, lineHeight: 1.45 }}>
                  {dif > 0
                    ? <>Rendeu <b>{fmt(dif)}</b> desde a última atualização.</>
                    : <>Ficou <b>{fmt(-dif)}</b> abaixo do que o Compass calculava.</>}
                </div>
              )}
              <p style={{ fontSize: 13, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.45 }}>
                A diferença para o saldo do Compass vira o rendimento do mês. Aplicações e resgates feitos depois somam por cima.
              </p>
            </>
          ) : (
            <>
              <label style={rotulo}>Valor
                <input value={valor} onChange={e => setValor(mascaraCentavos(e.target.value))}
                  inputMode="numeric" autoFocus={central} placeholder="0,00" style={campo} />
              </label>
              {objetivos.length > 0 && (
                <label style={rotulo}>{acao === 'aplicar' ? 'Para qual objetivo?' : 'De qual objetivo?'}
                  <select value={objetivo} onChange={e => setObjetivo(e.target.value)} style={SELECT}>
                    {objetivos.map(o => <option key={o.id} value={o.id}>{o.nome} · {fmt(saldoDaParte(o.id))}</option>)}
                    <option value="">Sem objetivo · {fmt(saldoDaParte(''))}</option>
                  </select>
                </label>
              )}
              <label style={rotulo}>{acao === 'aplicar' ? 'Sai de' : 'Vai para'}
                <select value={banco} onChange={e => setBanco(e.target.value)} style={SELECT}>
                  {bancos.map(b => <option key={b.id} value={b.id}>{nomeDaConta(b, contas)}</option>)}
                </select>
              </label>
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
              <p style={{ fontSize: 13, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.45 }}>
                Vira uma transferência em Lançamentos, no banco escolhido. Não é receita nem despesa.
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
