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
import {
  DIAS_PARA_LEMBRAR, caminhoDoObjetivo, diasSemAtualizar, isoDe, movimentosDoMes, resumoDosInvestimentos,
  type HistoricoInvestimento, type MovimentoInvestimento, type Objetivo, type PontoDaSerie,
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
 * no ano; embaixo, o gráfico do que já aconteceu, a lista com Aplicar,
 * Resgatar e Atualizar saldo à vista, e os movimentos do mês. Nenhum
 * rendimento é estimado. Regras em utils/investimentos.
 */
export default function Investimentos() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { contas, extratoData, user, compartilhamento } = useApp()
  const admin = compartilhamento.papel !== 'membro'
  const { objetivos, faltaMigracao, salvar, excluir } = useObjetivos(user?.id, admin)
  const agora = new Date()
  const hoje = isoDe(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const r = useMemo(() => resumoDosInvestimentos(contas, extratoData as Record<string, DadosMes>, hoje, objetivos),
    [contas, extratoData, hoje, objetivos])
  const [vista, setVista] = useState({ ano: agora.getFullYear(), mes: agora.getMonth() })
  const [acao, setAcao] = useState<{ item: HistoricoInvestimento; acao: AcaoInvestimento; objetivoId?: string } | null>(null)
  const [editando, setEditando] = useState<{ item: HistoricoInvestimento; objetivo?: Objetivo } | null>(null)
  const anoHoje = agora.getFullYear()
  const novo = () => navigate('/configuracoes?aba=bancos')

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
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.1fr) minmax(0,1fr)', gap: 14,
              alignItems: 'start' }}>
              <div style={cartao}>
                <div style={{ fontSize: 17, fontWeight: 800, color: COR.texto }}>Quanto você tem investido</div>
                <div style={{ fontSize: 13, color: '#475569', margin: '2px 0 8px' }}>
                  fim de cada mês · <span style={{ color: AZUL_NUM, fontWeight: 700 }}>■ o que você aplicou</span>
                  {' · '}<span style={{ color: CIANO, fontWeight: 700 }}>■ o que rendeu</span></div>
                <Grafico serie={r.serie} />
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
                    podeObjetivo={admin && !faltaMigracao} recuo={isMobile ? 0 : 54}
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
  ...BOTAO_CHEIO, padding: '7px 13px', minHeight: 36, fontSize: 13, color: '#1e3a8a', background: '#fff',
  boxShadow: 'none', border: '1.5px solid #bfdbfe',
} as const

function LinhaInvestimento({ it, hoje, primeira, objetivos, podeObjetivo, recuo, onAcao, onObjetivo }: {
  it: HistoricoInvestimento; hoje: string; primeira: boolean
  objetivos: Objetivo[]; podeObjetivo: boolean
  /** Recuo dos objetivos e botões: alinhados ao nome no computador, de ponta a ponta no celular. */
  recuo: number
  onAcao: (a: AcaoInvestimento) => void
  onObjetivo: (o?: Objetivo) => void
}) {
  const semObjetivo = it.partes.find(p => p.objetivoId === '')?.saldo ?? 0
  const dias = diasSemAtualizar(it.atualizadoEm, hoje)
  const nome = it.conta.apelido || it.conta.nome
  const banco = it.conta.banco && it.conta.banco !== nome ? it.conta.banco : ''
  const situacao = dias === null
    ? <span>atualize o saldo para ver quanto rendeu</span>
    : dias >= DIAS_PARA_LEMBRAR
      ? <span style={{ color: AMBAR, fontWeight: 700 }}>Faz {dias} dias que este saldo não é atualizado</span>
      : <span>atualizado {dias === 0 ? 'hoje' : `em ${ddmm(it.atualizadoEm!)}`}</span>
  return (
    <div style={{ padding: '13px 0', borderTop: primeira ? undefined : '1px solid #eef2f8', containerType: 'inline-size' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--cx-azul)', color: '#fff', flexShrink: 0,
          display: 'grid', placeItems: 'center', fontSize: 20, boxShadow: 'var(--cx-bolinha)' }}>
          <i aria-hidden className="ti ti-pig-money" /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: COR.texto }}>{nome}</div>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.35 }}>{banco && <>{banco} · </>}{situacao}</div>
        </div>
        <div style={{ fontWeight: 800, color: AZUL_NUM, whiteSpace: 'nowrap', fontSize: 'min(17px, calc(100cqi / 13))' }}>
          {fmt(it.saldo)}</div>
      </div>
      {objetivos.length > 0 && (
        <div style={{ marginTop: 10, marginLeft: recuo, background: '#f5f8fe', border: '1px solid #dbe6fb', borderRadius: 14,
          padding: '4px 12px' }}>
          {objetivos.map((o, k) => (
            <LinhaObjetivo key={o.id} o={o} it={it} hoje={hoje} primeira={k === 0}
              onEditar={podeObjetivo ? () => onObjetivo(o) : undefined} />
          ))}
          {Math.abs(semObjetivo) >= 0.005 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderTop: '1px solid #dbe6fb',
              containerType: 'inline-size' }}>
              <div style={{ flex: 1, fontSize: 14, color: '#475569' }}>Sem objetivo</div>
              <div style={{ fontWeight: 800, color: '#334155', whiteSpace: 'nowrap', fontSize: 'min(14px, calc(100cqi / 12))' }}>
                {fmt(semObjetivo)}</div>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, paddingLeft: recuo }}>
        <button onClick={() => onAcao('aplicar')} style={BOTAO_CHEIO_PEQ}><i aria-hidden className="ti ti-arrow-down-left" />Aplicar</button>
        <button onClick={() => onAcao('resgatar')} style={BOTAO}><i aria-hidden className="ti ti-arrow-up-right" />Resgatar</button>
        <button onClick={() => onAcao('atualizar')} style={BOTAO}><i aria-hidden className="ti ti-refresh" />Atualizar saldo</button>
        {podeObjetivo && (
          <button onClick={() => onObjetivo()} style={BOTAO}><i aria-hidden className="ti ti-target-arrow" />Objetivo</button>
        )}
      </div>
    </div>
  )
}

const MES_ANO = (ano: number, mes: number) => `${MES_CURTO[mes]}/${ano}`

function LinhaObjetivo({ o, it, hoje, primeira, onEditar }: {
  o: Objetivo; it: HistoricoInvestimento; hoje: string; primeira: boolean; onEditar?: () => void
}) {
  const parte = it.partes.find(p => p.objetivoId === o.id)
  const saldo = parte?.saldo ?? 0
  const c = caminhoDoObjetivo(o, parte, hoje)
  const pct = o.valorAlvo ? Math.max(0, Math.min(1, saldo / o.valorAlvo)) : 0
  const ate = o.ate ? MES_ANO(Number(o.ate.slice(0, 4)), Number(o.ate.slice(5, 7)) - 1) : ''
  const frase = !c ? null
    : c.tipo === 'chegou' ? '✓ Chegou no objetivo.'
    : c.tipo === 'porMes' ? `Para chegar em ${ate}: ${fmt(c.porMes)} por mês.${c.ritmo > 0 ? ` Hoje você aplica ${fmt(c.ritmo)}.` : ''}`
    : c.tipo === 'chegaEm' ? `No ritmo de ${fmt(c.ritmo)} por mês, chega em ${MES_ANO(c.ano, c.mes)}.`
    : `Faltam ${fmt(o.valorAlvo! - saldo)}.`
  return (
    <div style={{ padding: '9px 0', borderTop: primeira ? undefined : '1px solid #dbe6fb', containerType: 'inline-size' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onEditar} disabled={!onEditar} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none',
          border: 'none', padding: 0, cursor: onEditar ? 'pointer' : 'default', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 700, color: COR.texto }}>
          <i aria-hidden className="ti ti-target-arrow" style={{ color: AZUL_NUM, marginRight: 6 }} />{o.nome}
          {onEditar && <i aria-hidden className="ti ti-pencil" style={{ color: '#64748b', fontSize: 13, marginLeft: 6 }} />}
        </button>
        <div style={{ fontWeight: 800, color: AZUL_NUM, whiteSpace: 'nowrap', fontSize: 'min(15px, calc(100cqi / 12))' }}>
          {fmt(saldo)}</div>
      </div>
      {o.valorAlvo ? (
        <>
          <div style={{ height: 10, borderRadius: 99, background: '#e2e8f0', border: '1px solid #64748b', overflow: 'hidden',
            marginTop: 6 }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--cx-barra)', borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>
            {Math.floor(pct * 100)}% de {fmt(o.valorAlvo)}{ate ? ` até ${ate}` : ''}</div>
          {frase && <div style={{ fontSize: 13, color: '#1e3a8a', marginTop: 2 }}>{frase}</div>}
        </>
      ) : ate ? <div style={{ fontSize: 13, color: '#475569' }}>até {ate}</div> : null}
    </div>
  )
}

const BOTAO_CHEIO_PEQ = { ...BOTAO_CHEIO, padding: '7px 13px', minHeight: 36, fontSize: 13 } as const

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

function Grafico({ serie }: { serie: PontoDaSerie[] }) {
  const w = 560, h = 220, base = h - 22
  const max = Math.max(...serie.map(p => p.saldo), 1)
  const bw = w / Math.max(serie.length, 6)
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
