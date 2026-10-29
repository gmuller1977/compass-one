import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { useIsMobile } from '../components/configuracoes/CfgShared'
import InvestimentoDialog, { type AcaoInvestimento } from '../components/investimentos/InvestimentoDialog'
import ObjetivoDialog from '../components/investimentos/ObjetivoDialog'
import { useObjetivos } from '../utils/objetivosBanco'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import { COR } from '../utils/cores'
import { AnelGrupo } from '../components/acompanhamento/EvolucaoGrupo'
import {
  DIAS_PARA_LEMBRAR, aplicadoNoMes, caminhoDoObjetivo, diasSemAtualizar, isoDe, movimentosDoMes, rendeuPercentual, resumoDosInvestimentos,
  type HistoricoInvestimento, type MovimentoInvestimento, type Objetivo, type ParteDoObjetivo, type PontoDaSerie,
} from '../utils/investimentos'

const fmt = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const AZUL_NUM = '#1d4ed8'   // 6,7 no branco
const CIANO = '#0e7490'      // 5,4 no branco
const LARANJA = '#c2410c'    // 5,2 no branco
const AMBAR = '#a16207'      // 5,0 no branco

/**
 * Investimentos (28/10/2026, pedido do Guilherme: opção B das prévias).
 * O topo diz quanto a pessoa tem investido e o que aplicou, resgatou e rendeu
 * no ano; embaixo, o gráfico do que já aconteceu e, abaixo dele (mesmo dia,
 * pedido dele: "a lista ficou extensa"), a lista em largura inteira, com
 * Aplicar, Resgatar e Atualizar saldo à vista NA LATERAL, e cada objetivo
 * com anel, aplicado, resgatado e rendido. Por fim, os movimentos do mês.
 * Nenhum rendimento é estimado. Regras em utils/investimentos.
 */
export default function Investimentos() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { contas, extratoData, user, compartilhamento, planos } = useApp()
  const admin = compartilhamento.papel !== 'membro'
  const { objetivos, faltaMigracao, salvar, excluir } = useObjetivos(user?.id, admin, compartilhamento.donoId ?? user?.id)
  const agora = new Date()
  const hoje = isoDe(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const r = useMemo(() => resumoDosInvestimentos(contas, extratoData as Record<string, DadosMes>, hoje, objetivos),
    [contas, extratoData, hoje, objetivos])
  const [vista, setVista] = useState({ ano: agora.getFullYear(), mes: agora.getMonth() })
  const [acao, setAcao] = useState<{ item: HistoricoInvestimento; acao: AcaoInvestimento; objetivoId?: string } | null>(null)
  const [editando, setEditando] = useState<{ item: HistoricoInvestimento; objetivo?: Objetivo } | null>(null)
  const anoHoje = agora.getFullYear()
  const novo = () => navigate('/configuracoes?aba=bancos')
  // O aplicado do mês conta como guardado na meta de economia (28/10/2026,
  // pedido do Guilherme: "onde entra a meta mensal do planejamento?").
  const aplicadoMes = aplicadoNoMes(contas, extratoData as Record<string, DadosMes>, agora.getFullYear(), agora.getMonth(), hoje)
  const metaMes = planos[agora.getFullYear()]?.objetivos?.[agora.getMonth()] ?? 0
  const fraseMeta = metaMes > 0
    ? `Em ${MESES[agora.getMonth()]} você aplicou ${fmt(Math.max(0, aplicadoMes))} da meta de economia de ${fmt(metaMes)}.`
    : 'O que você aplica conta como guardado na meta de economia do Planejamento.'

  const cartao = { background: '#fff', borderRadius: 20, boxShadow: '0 6px 24px rgba(30,64,175,.08)',
    padding: isMobile ? '14px 16px' : '16px 20px', minWidth: 0 } as const

  const minis: [string, number, string?][] = [
    [`Aplicou em ${anoHoje}`, r.aplicouNoAno],
    [`Resgatou em ${anoHoje}`, r.resgatouNoAno],
    [`Rendeu em ${anoHoje}`, r.rendeuNoAno, 'pelos saldos que você atualizou'],
  ]

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath={pathname} />
      <div style={{ padding: isMobile ? '12px 14px 90px' : '16px 28px 40px', maxWidth: 1280, margin: '0 auto' }}>
        <PageHeader icon="ti-pig-money" breadcrumb="TODO ANO" title="Investimentos" ajuda="investimentos" mb={16}>
          <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)',
            gap: 22, alignItems: 'end', marginTop: 14 }}>
            <div style={{ containerType: 'inline-size', minWidth: 0 }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.85)' }}>Você tem investido</div>
              <div style={{ fontSize: 'min(40px, calc(100cqi / 8.4))', fontWeight: 800, color: '#fff', lineHeight: 1.1,
                whiteSpace: 'nowrap' }}>{fmt(r.total)}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
                Fica fora do saldo disponível: não é dinheiro para gastar.</div>
              {r.itens.length > 0 && (
                <div style={{ fontSize: 13.5, color: '#fff', fontWeight: 600, marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <i aria-hidden className="ti ti-target-arrow" style={{ marginTop: 2 }} />{fraseMeta}</div>
              )}
            </div>
            {isMobile ? (
              <div style={{ ...CAIXA, marginTop: 14, padding: '4px 14px' }}>
                {minis.map(([l, v, s], k) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                    borderTop: k ? '1px solid rgba(255,255,255,.16)' : undefined }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}>{l}</div>
                      {s && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.75)' }}>{s}</div>}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#fff', whiteSpace: 'nowrap' }}>{fmt(v)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
                {minis.map(([l, v, s]) => (
                  <div key={l} style={{ ...CAIXA, containerType: 'inline-size', minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)' }}>{l}</div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: 'min(20px, calc(100cqi / 8.6))',
                      whiteSpace: 'nowrap' }}>{fmt(v)}</div>
                    {s && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>{s}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PageHeader>

        {r.itens.length === 0 ? (
          <div style={{ ...cartao, textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: COR.texto, marginBottom: 6 }}>Nenhum investimento cadastrado</div>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 auto 16px', maxWidth: 460, lineHeight: 1.5 }}>
              Cadastre em Configurações › Minhas contas, com o tipo Investimento. Ele fica fora do saldo disponível,
              e aqui você aplica, resgata e acompanha quanto rendeu.</p>
            <button onClick={novo} style={BOTAO_CHEIO}><i aria-hidden className="ti ti-plus" /> Cadastrar investimento</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              <div style={cartao}>
                <div style={{ fontSize: 17, fontWeight: 800, color: COR.texto }}>Quanto você tem investido</div>
                <div style={{ fontSize: 13, color: '#475569', margin: '2px 0 8px' }}>
                  fim de cada mês · <span style={{ color: AZUL_NUM, fontWeight: 700 }}>■ o que você aplicou</span>
                  {' · '}<span style={{ color: CIANO, fontWeight: 700 }}>■ o que rendeu</span></div>
                <Grafico serie={r.serie} largo={!isMobile} />
                <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
                  Só o que já aconteceu. O Compass não estima rendimento futuro.</div>
              </div>

              <div style={cartao}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: COR.texto }}>Seus investimentos</div>
                  <button onClick={novo} style={{ ...BOTAO_CHEIO, marginLeft: 'auto', padding: '6px 12px', minHeight: 36 }}>
                    <i aria-hidden className="ti ti-plus" /> Novo</button>
                </div>
                {r.itens.map((it, k) => (
                  <LinhaInvestimento key={it.conta.id} it={it} hoje={hoje} primeira={k === 0}
                    objetivos={objetivos.filter(o => o.contaId === it.conta.id)}
                    podeObjetivo={admin && !faltaMigracao} celular={isMobile} soVer={compartilhamento.soVisualizar}
                    onAcao={a => setAcao({ item: it, acao: a })}
                    onObjetivo={o => setEditando({ item: it, objetivo: o })} />
                ))}
                {objetivos.some(o => o.valorAlvo) && (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                    O caminho de cada objetivo conta só o que você aplica, sem rendimento.</div>
                )}
              </div>
            </div>

            <div style={{ ...cartao, marginTop: 14 }}>
              <Movimentos r={r} objetivos={objetivos} ano={vista.ano} mes={vista.mes}
                podeAvancar={vista.ano * 12 + vista.mes < agora.getFullYear() * 12 + agora.getMonth()}
                andar={p => setVista(v => { const k = v.ano * 12 + v.mes + p; return { ano: Math.floor(k / 12), mes: k % 12 } })} />
            </div>
          </>
        )}
      </div>

      {acao && (
        <InvestimentoDialog conta={acao.item.conta} acao={acao.acao} saldoCalculado={acao.item.saldo}
          objetivos={objetivos.filter(o => o.contaId === acao.item.conta.id)} partes={acao.item.partes}
          central={!isMobile} onFechar={() => setAcao(null)} />
      )}
      {editando && (
        <ObjetivoDialog contaId={editando.item.conta.id} contaNome={editando.item.conta.apelido || editando.item.conta.nome}
          objetivo={editando.objetivo} semObjetivo={editando.item.partes.find(p => p.objetivoId === '')?.saldo ?? 0}
          onSalvar={salvar} onExcluir={admin ? excluir : undefined}
          central={!isMobile} onFechar={() => setEditando(null)} />
      )}
    </div>
  )
}

const CAIXA = { background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 16,
  padding: '12px 14px' } as const

const BOTAO_CHEIO = {
  display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 16px', minHeight: 40,
  fontSize: 14, fontWeight: 700, border: 'none', color: '#fff', background: 'var(--cx-azul)',
  boxShadow: 'var(--cx-bolinha)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
} as const

const BOTAO = {
  ...BOTAO_CHEIO, padding: '7px 13px', minHeight: 38, fontSize: 13, color: '#1e3a8a', background: '#fff', justifyContent: 'center',
  boxShadow: 'none', border: '1.5px solid #bfdbfe',
} as const

function LinhaInvestimento({ it, hoje, primeira, objetivos, podeObjetivo, celular, onAcao, onObjetivo, soVer }: {
  it: HistoricoInvestimento; hoje: string; primeira: boolean
  objetivos: Objetivo[]; podeObjetivo: boolean
  /** Educador Financeiro: só visualiza, sem Aplicar, Resgatar e Atualizar saldo. */
  soVer?: boolean
  /** No celular os botões ficam embaixo, dois por linha; no computador, na lateral. */
  celular: boolean
  onAcao: (a: AcaoInvestimento) => void
  onObjetivo: (o?: Objetivo) => void
}) {
  const semObjetivo = it.partes.find(p => p.objetivoId === '')
  const dias = diasSemAtualizar(it.atualizadoEm, hoje)
  const nome = it.conta.apelido || it.conta.nome
  const banco = it.conta.banco && it.conta.banco !== nome ? it.conta.banco : ''
  const situacao = dias === null
    ? <span>atualize o saldo para ver quanto rendeu</span>
    : dias >= DIAS_PARA_LEMBRAR
      ? <span style={{ color: AMBAR, fontWeight: 700 }}>Faz {dias} dias que este saldo não é atualizado</span>
      : <span>atualizado {dias === 0 ? 'hoje' : `em ${ddmm(it.atualizadoEm!)}`}</span>
  // A conta inteira, para os números quando não há objetivo.
  const daConta = it.partes.reduce((a, p) => ({ saldo: a.saldo + p.saldo, rendido: a.rendido + p.rendido,
    aplicado: a.aplicado + p.aplicado, resgatado: a.resgatado + p.resgatado }), { saldo: 0, rendido: 0, aplicado: 0, resgatado: 0 })
  const botoes = soVer ? null : (
    <div style={celular
      ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }
      : { display: 'flex', flexDirection: 'column', gap: 8, width: 170, flexShrink: 0 }}>
      <button onClick={() => onAcao('aplicar')} style={BOTAO_CHEIO_PEQ}><i aria-hidden className="ti ti-arrow-down-left" />Aplicar</button>
      <button onClick={() => onAcao('resgatar')} style={BOTAO}><i aria-hidden className="ti ti-arrow-up-right" />Resgatar</button>
      <button onClick={() => onAcao('atualizar')} style={BOTAO}><i aria-hidden className="ti ti-refresh" />Atualizar saldo</button>
      {podeObjetivo && (
        <button onClick={() => onObjetivo()} style={BOTAO}><i aria-hidden className="ti ti-target-arrow" />Novo objetivo</button>
      )}
    </div>
  )
  return (
    <div style={{ padding: '16px 0', borderTop: primeira ? undefined : '1px solid #eef2f8',
      display: 'flex', gap: 18, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, containerType: 'inline-size' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--cx-azul)', color: '#fff', flexShrink: 0,
            display: 'grid', placeItems: 'center', fontSize: 20, boxShadow: 'var(--cx-bolinha)' }}>
            <i aria-hidden className="ti ti-pig-money" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: COR.texto }}>{nome}</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.35 }}>{banco && <>{banco} · </>}{situacao}</div>
          </div>
          <div style={{ fontWeight: 800, color: AZUL_NUM, whiteSpace: 'nowrap', fontSize: 'min(19px, calc(100cqi / 12))' }}>
            {fmt(it.saldo)}</div>
        </div>
        {objetivos.length === 0 ? (
          <Numeros p={daConta} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: celular ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 10, marginTop: 12 }}>
            {objetivos.map(o => (
              <CartaoObjetivo key={o.id} o={o} parte={it.partes.find(p => p.objetivoId === o.id)} hoje={hoje}
                onEditar={podeObjetivo ? () => onObjetivo(o) : undefined} />
            ))}
            {semObjetivo && (Math.abs(semObjetivo.saldo) >= 0.005 || semObjetivo.aplicado > 0) && (
              <CartaoObjetivo parte={semObjetivo} hoje={hoje} />
            )}
          </div>
        )}
        {celular && botoes}
      </div>
      {!celular && botoes}
    </div>
  )
}

const MES_ANO = (ano: number, mes: number) => `${MES_CURTO[mes]}/${ano}`

/** Aplicou, resgatou e rendeu (valor e %), em três caixas lado a lado. */
function Numeros({ p }: { p: Pick<ParteDoObjetivo, 'saldo' | 'rendido' | 'aplicado' | 'resgatado'> }) {
  const pct = rendeuPercentual(p)
  const itens: [string, string, string, string?][] = [
    ['Aplicou', fmt(p.aplicado), AZUL_NUM],
    ['Resgatou', fmt(p.resgatado), LARANJA],
    ['Rendeu', fmt(p.rendido), p.rendido < 0 ? LARANJA : CIANO,
      pct === null || Math.abs(p.rendido) < 0.005 ? undefined : `${pct >= 0 ? '+' : '−'}${Math.abs(pct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, marginTop: 10 }}>
      {itens.map(([l, v, cor, extra]) => (
        <div key={l} style={{ background: '#fff', border: '1px solid #dbe6fb', borderRadius: 12, padding: '7px 9px',
          containerType: 'inline-size', minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#475569' }}>{l}</div>
          <div style={{ fontWeight: 800, color: cor, whiteSpace: 'nowrap',
            fontSize: `min(14px, ${(100 / (Math.max(v.length, 8) * 0.6)).toFixed(2)}cqi)` }}>{v}</div>
          {extra && <div style={{ fontSize: 12, fontWeight: 700, color: cor }}>{extra}</div>}
        </div>
      ))}
    </div>
  )
}

/**
 * Um objetivo: o anel com quanto do alvo já está lá (como o grupo do Radar),
 * o saldo, aplicou/resgatou/rendeu e o caminho. Sem `o`, é o "Sem objetivo".
 */
function CartaoObjetivo({ o, parte, hoje, onEditar }: {
  o?: Objetivo; parte: ParteDoObjetivo | undefined; hoje: string; onEditar?: () => void
}) {
  const saldo = parte?.saldo ?? 0
  const c = o ? caminhoDoObjetivo(o, parte, hoje) : null
  const pct = o?.valorAlvo ? Math.max(0, saldo / o.valorAlvo) : null
  const ate = o?.ate ? MES_ANO(Number(o.ate.slice(0, 4)), Number(o.ate.slice(5, 7)) - 1) : ''
  const frase = !c || !o ? null
    : c.tipo === 'chegou' ? '✓ Chegou no objetivo.'
    : c.tipo === 'porMes' ? `Para chegar em ${ate}: ${fmt(c.porMes)} por mês.${c.ritmo > 0 ? ` Hoje você aplica ${fmt(c.ritmo)}.` : ''}`
    : c.tipo === 'chegaEm' ? `No ritmo de ${fmt(c.ritmo)} por mês, chega em ${MES_ANO(c.ano, c.mes)}.`
    : `Faltam ${fmt(o.valorAlvo! - saldo)}.`
  return (
    <div style={{ background: '#f5f8fe', border: '1px solid #bfdbfe', borderRadius: 16, padding: '12px 12px 10px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, containerType: 'inline-size' }}>
        {pct !== null ? (
          <AnelGrupo pct={pct} pago={c?.tipo === 'chegou'} cor="#2563eb" trilho="#e2e8f0" corTexto={AZUL_NUM} tamanho={56} />
        ) : (
          <span style={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
            fontSize: 24, background: '#eaf1fd', color: o ? AZUL_NUM : '#475569' }}>
            <i aria-hidden className={`ti ${o ? 'ti-target-arrow' : 'ti-wallet'}`} /></span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={onEditar} disabled={!onEditar} style={{ display: 'block', maxWidth: '100%', textAlign: 'left',
            background: 'none', border: 'none', padding: 0, cursor: onEditar ? 'pointer' : 'default', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 800, color: COR.texto }}>
            {o ? o.nome : 'Sem objetivo'}
            {onEditar && <i aria-hidden className="ti ti-pencil" style={{ color: '#64748b', fontSize: 13, marginLeft: 6 }} />}
          </button>
          <div style={{ fontWeight: 800, color: AZUL_NUM, whiteSpace: 'nowrap', fontSize: 'min(17px, calc(100cqi / 13))' }}>
            {fmt(saldo)}</div>
          {o?.valorAlvo ? (
            <div style={{ fontSize: 13, color: '#475569' }}>de {fmt(o.valorAlvo)}{ate ? ` até ${ate}` : ''}</div>
          ) : ate ? <div style={{ fontSize: 13, color: '#475569' }}>até {ate}</div> : null}
        </div>
      </div>
      {parte && <Numeros p={parte} />}
      {frase && <div style={{ fontSize: 13, color: '#1e3a8a', marginTop: 8 }}>{frase}</div>}
    </div>
  )
}

const BOTAO_CHEIO_PEQ = { ...BOTAO_CHEIO, padding: '7px 13px', minHeight: 38, fontSize: 13, justifyContent: 'center' } as const

const ROTULO_MOV: Record<MovimentoInvestimento['tipo'], { t: string; ic: string; fundo: string; cor: string }> = {
  aplicacao:  { t: 'Aplicação', ic: 'ti-arrow-down-left', fundo: '#eaf1fd', cor: AZUL_NUM },
  resgate:    { t: 'Resgate', ic: 'ti-arrow-up-right', fundo: '#fff7ed', cor: LARANJA },
  rendimento: { t: 'Rendimento', ic: 'ti-trending-up', fundo: '#ecfeff', cor: CIANO },
}

function Movimentos({ r, objetivos, ano, mes, andar, podeAvancar }: {
  r: ReturnType<typeof resumoDosInvestimentos>; objetivos: Objetivo[]; ano: number; mes: number
  andar: (p: number) => void; podeAvancar: boolean
}) {
  const lista = movimentosDoMes(r, ano, mes)
  const nomeDe = (id: string) => { const c = r.itens.find(i => i.conta.id === id)?.conta; return c ? (c.apelido || c.nome) : '' }
  const objDe = (id?: string) => (id ? objetivos.find(o => o.id === id)?.nome : undefined)
  const seta = (p: number, on: boolean) => (
    <button onClick={() => on && andar(p)} disabled={!on} aria-label={p < 0 ? 'Mês anterior' : 'Próximo mês'} style={{
      width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #bfdbfe', background: '#fff', color: '#1e3a8a',
      cursor: on ? 'pointer' : 'default', opacity: on ? 1 : .35, display: 'grid', placeItems: 'center', fontSize: 16,
    }}><i aria-hidden className={`ti ti-chevron-${p < 0 ? 'left' : 'right'}`} /></button>
  )
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: COR.texto, minWidth: 0 }}>
          Movimentos de {MESES[mes]}{ano !== new Date().getFullYear() ? ` de ${ano}` : ''}</div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>{seta(-1, true)}{seta(1, podeAvancar)}</div>
      </div>
      {lista.length === 0 && (
        <div style={{ fontSize: 14, color: '#475569', padding: '10px 0' }}>Nenhum movimento neste mês.</div>
      )}
      {lista.map((m, k) => {
        const d = ROTULO_MOV[m.tipo]
        const perda = m.tipo === 'rendimento' && m.valor < 0
        const sub = m.tipo === 'rendimento'
          ? `${nomeDe(m.contaId)} · saldo atualizado`
          : `${nomeDe(m.contaId)}${objDe(m.objetivoId) ? ` · ${objDe(m.objetivoId)}` : ''}${m.contraparte ? ` · ${m.tipo === 'aplicacao' ? 'do' : 'para o'} ${m.contraparte}` : ''}`
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
            borderTop: k ? '1px solid #eef2f8' : undefined, containerType: 'inline-size' }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 17,
              flexShrink: 0, background: d.fundo, color: d.cor }}><i aria-hidden className={`ti ${perda ? 'ti-trending-down' : d.ic}`} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: COR.texto }}>{perda ? 'Rendimento negativo' : d.t}
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}> · {String(m.dia).padStart(2, '0')}/{String(m.mes + 1).padStart(2, '0')}</span></div>
              <div style={{ fontSize: 13, color: '#475569' }}>{sub}</div>
            </div>
            <div style={{ fontWeight: 800, whiteSpace: 'nowrap', color: m.valor < 0 ? LARANJA : d.cor,
              fontSize: 'min(15px, calc(100cqi / 14))' }}>{m.valor > 0 ? '+' : ''}{fmt(m.valor)}</div>
          </div>
        )
      })}
      <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
        Aplicar e resgatar viram transferência no banco escolhido, em Lançamentos.</div>
    </>
  )
}

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function Grafico({ serie, largo }: { serie: PontoDaSerie[]; largo: boolean }) {
  // Em largura inteira no computador, o desenho é mais baixo e as colunas não passam de 70px.
  const w = largo ? Math.max(serie.length, 12) * 82 : 560, h = largo ? 200 : 220, base = h - 22
  const max = Math.max(...serie.map(p => p.saldo), 1)
  const bw = w / Math.max(serie.length, largo ? 12 : 6)
  const alt = (v: number) => Math.max(0, v) / max * (base - 10)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img"
      aria-label={serie.map(p => `${MES_CURTO[p.mes]}/${p.ano}: ${fmt(p.saldo)}`).join('; ')}>
      {serie.map((p, k) => {
        const x = k * bw + 6, largura = bw - 12
        // Rendimento acumulado negativo: a barra é só o saldo, sem a faixa de cima.
        const hTot = alt(p.saldo)
        const hRend = p.rendido > 0 ? Math.min(alt(p.rendido), hTot) : 0
        return (
          <g key={k}>
            <title>{`${MES_CURTO[p.mes]}/${p.ano}: ${fmt(p.saldo)} (aplicado ${fmt(p.aplicado)} · rendeu ${fmt(p.rendido)})`}</title>
            {hRend > 0 && <rect x={x} y={base - hTot} width={largura} height={hRend} rx={4} fill="#0891b2" />}
            <rect x={x} y={base - hTot + hRend} width={largura} height={hTot - hRend} rx={4} fill={AZUL_NUM} />
            <text x={x + largura / 2} y={h - 6} fontSize={11} textAnchor="middle" fill="#475569">{MES_CURTO[p.mes]}</text>
          </g>
        )
      })}
    </svg>
  )
}
