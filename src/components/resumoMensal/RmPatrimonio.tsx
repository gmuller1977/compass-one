import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SaldoConta, FaturaCartao } from '../../pages/ResumoMensal'
import { supabase } from '../../lib/supabase'

type SimRow = {
  id: string; tipo: 'divida' | 'meta'; nome: string
  valor_total: number; parcela: number; resultado_meses: number
  created_at: string; ativo: boolean
}

export type Props = {
  saldoAtualPorConta: SaldoConta[]
  faturaAtualPorCartao: FaturaCartao[]
  saldoDinheiro: number
  cartoesPlanejado: Record<string, number>
  userId: string
  fmt: (v: number) => string
}

function BlocoHeader({ titulo, gradient }: { titulo: string; gradient: string }) {
  return (
    <div style={{ background: gradient, borderRadius: '12px 12px 0 0', padding: '13px 20px', color: '#fff' }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</span>
    </div>
  )
}

function BlocoBody({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 20 }}>
      {children}
    </div>
  )
}

function Bloco({ titulo, gradient, children }: { titulo: string; gradient: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: 16 }}>
      <BlocoHeader titulo={titulo} gradient={gradient} />
      <BlocoBody>{children}</BlocoBody>
    </div>
  )
}

function BarraProgresso({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: cor, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function usoCor(pct: number) {
  if (pct < 50) return '#4ade80'
  if (pct < 80) return '#fbbf24'
  return '#f87171'
}

function saldoCor(v: number) {
  return v > 0 ? '#1a56db' : v < 0 ? '#dc2626' : '#b45309'
}

function IconeCircle({ emoji, bg }: { emoji: string; bg: string }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
      {emoji}
    </div>
  )
}

function ContaLinha({ icone, nome, sub, saldo, fmt }: { icone: string; nome: string; sub: string; saldo: number; fmt: (v: number) => string }) {
  return (
    <div style={{
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: '1px solid #f1f5f9', borderLeft: `3px solid ${saldoCor(saldo)}`,
      borderRadius: 4, marginBottom: 4,
    }}>
      <IconeCircle emoji={icone} bg="#f8faff" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{nome}</div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: saldoCor(saldo), textAlign: 'right', minWidth: 90 }}>
        {fmt(saldo)}
      </div>
    </div>
  )
}

function Subtotal({ label, valor, cor, fmt }: { label: string; valor: number; cor: string; fmt: (v: number) => string }) {
  return (
    <div style={{ padding: '10px 16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, marginTop: 6 }}>
      <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: cor }}>{fmt(valor)}</div>
    </div>
  )
}

function elapsedMonths(created_at: string): number {
  const start = new Date(created_at)
  const now   = new Date()
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))
}

export default function RmPatrimonio({ saldoAtualPorConta, faturaAtualPorCartao, saldoDinheiro, cartoesPlanejado, userId, fmt }: Props) {
  const navigate = useNavigate()
  const [sims, setSims] = useState<SimRow[]>([])

  useEffect(() => {
    supabase.from('simulacoes').select('*').eq('ativo', true).eq('user_id', userId)
      .then(({ data }) => { if (data) setSims(data as SimRow[]) })
  }, [userId])

  const contasCorrente = saldoAtualPorConta.filter(s => s.conta.tipo === 'corrente')
  const contasPoupanca = saldoAtualPorConta.filter(s => s.conta.tipo === 'poupanca')

  const totalCorrente = contasCorrente.reduce((s, c) => s + c.saldo, 0) + saldoDinheiro
  const totalPoupanca = contasPoupanca.reduce((s, c) => s + c.saldo, 0)
  const totalFaturas  = faturaAtualPorCartao.reduce((s, f) => s + f.fatura, 0)
  const totalPositivo = totalCorrente + totalPoupanca
  const patrimonioLiquido = totalPositivo - totalFaturas

  const totalPlanejadoCartoes = faturaAtualPorCartao.reduce((s, f) => s + (cartoesPlanejado[f.conta.id] ?? 0), 0)
  const totalDiffCartoes = totalPlanejadoCartoes - totalFaturas

  const metas   = sims.filter(s => s.tipo === 'meta')
  const dividas = sims.filter(s => s.tipo === 'divida')
  const temObjetivos = metas.length > 0 || dividas.length > 0

  return (
    <div style={{ marginBottom: 16 }}>

      {/* ── Bloco 1: Contas bancárias ─────────────────────────────────── */}
      <Bloco titulo="🏦 Contas bancárias" gradient="linear-gradient(135deg,#0f2878,#1a56db)">
        <ContaLinha icone="💵" nome="Dinheiro" sub="Carteira" saldo={saldoDinheiro} fmt={fmt} />
        {contasCorrente.map(({ conta, saldo }) => (
          <ContaLinha
            key={conta.id}
            icone={conta.icone || '🏦'}
            nome={conta.apelido ?? conta.nome}
            sub={conta.banco ?? ''}
            saldo={saldo}
            fmt={fmt}
          />
        ))}
        <Subtotal label="Total em contas correntes" valor={totalCorrente} cor="#1a56db" fmt={fmt} />
      </Bloco>

      {/* ── Bloco 2: Poupança e investimentos ────────────────────────── */}
      <Bloco titulo="💰 Poupança e investimentos" gradient="linear-gradient(135deg,#1e3a8a,#1d4ed8)">
        {contasPoupanca.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
            Nenhuma poupança cadastrada.<br />
            <span style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
              Adicione em Configurações → Bancos.
            </span>
          </div>
        ) : (
          <>
            {contasPoupanca.map(({ conta, saldo }) => (
              <ContaLinha
                key={conta.id}
                icone={conta.icone || '🐷'}
                nome={conta.apelido ?? conta.nome}
                sub={conta.banco ?? ''}
                saldo={saldo}
                fmt={fmt}
              />
            ))}
            <Subtotal label="Total guardado" valor={totalPoupanca} cor="#1a56db" fmt={fmt} />
          </>
        )}
      </Bloco>

      {/* ── Bloco 3: Cartões de crédito ───────────────────────────────── */}
      {faturaAtualPorCartao.length > 0 && (
        <Bloco titulo="💳 Cartões de crédito" gradient="linear-gradient(135deg,#4c1d95,#7c3aed)">
          <div style={{ overflowX: 'auto' }}>
            {/* Header da tabela */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 95px 95px 100px',
              gap: 8, padding: '0 4px 8px',
              borderBottom: '2px solid #e2e8f0',
            }}>
              {['Cartão', 'Limite', 'Planejado', 'Fatura real', 'Diferença'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '.3px', textTransform: 'uppercase', textAlign: h === 'Cartão' ? 'left' : 'right' }}>{h}</div>
              ))}
            </div>

            {/* Linhas */}
            {faturaAtualPorCartao.map(({ conta, fatura }) => {
              const limite     = conta.limiteCartao ?? 0
              const planejado  = cartoesPlanejado[conta.id] ?? 0
              const diff       = planejado - fatura
              const pct        = limite > 0 ? Math.min(100, Math.round((fatura / limite) * 100)) : 0
              const diffEmoji  = diff > 0 ? '✅' : diff < -300 ? '🔴' : diff < 0 ? '⚠️' : '✅'
              return (
                <div key={conta.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 6 }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 95px 95px 100px',
                    gap: 8, padding: '10px 4px 6px',
                    alignItems: 'center',
                  }}>
                    {/* Nome */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconeCircle emoji={conta.icone || '💳'} bg="#fef2f2" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{conta.apelido ?? conta.nome}</div>
                        {limite > 0 && <div style={{ fontSize: 10, color: '#94a3b8' }}>{pct}% do limite</div>}
                      </div>
                    </div>
                    {/* Limite */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textAlign: 'right' }}>
                      {limite > 0 ? fmt(limite) : '—'}
                    </div>
                    {/* Planejado */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                      {planejado > 0 ? fmt(planejado) : '—'}
                    </div>
                    {/* Fatura real */}
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>
                      {fmt(fatura)}
                    </div>
                    {/* Diferença */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: diff >= 0 ? '#16a34a' : '#dc2626', textAlign: 'right' }}>
                      {diff >= 0 ? '+' : ''}{fmt(diff)} {diffEmoji}
                    </div>
                  </div>
                  {/* Barra uso do limite */}
                  {limite > 0 && (
                    <div style={{ padding: '0 4px' }}>
                      <BarraProgresso pct={pct} cor={usoCor(pct)} />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Subtotal */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 95px 95px 100px',
              gap: 8, padding: '10px 4px 0',
              borderTop: '2px solid #e2e8f0',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Total</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textAlign: 'right' }}>—</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{totalPlanejadoCartoes > 0 ? fmt(totalPlanejadoCartoes) : '—'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>{fmt(totalFaturas)}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: totalDiffCartoes >= 0 ? '#16a34a' : '#dc2626', textAlign: 'right' }}>
                {totalDiffCartoes >= 0 ? '+' : ''}{totalPlanejadoCartoes > 0 ? fmt(totalDiffCartoes) : '—'}
              </div>
            </div>
          </div>
        </Bloco>
      )}

      {/* ── Bloco 4: Objetivos financeiros ───────────────────────────── */}
      <Bloco titulo="🎯 Objetivos financeiros" gradient="linear-gradient(135deg,#134e4a,#0d9488)">
        {!temObjetivos ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
            Defina seus objetivos no Simulador para acompanhar aqui.
            <br />
            <button
              onClick={() => navigate('/simulacao')}
              style={{ marginTop: 10, background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              → Ir para Simulador
            </button>
          </div>
        ) : (
          <>
            {/* Metas */}
            {metas.length > 0 && (
              <>
                {/* Cabeçalho */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 80px', gap: 8, padding: '0 4px 8px', borderBottom: '2px solid #e2e8f0', overflowX: 'auto' }}>
                  {['Objetivo', 'Meta total', 'Guardado', 'Falta', 'Progresso'].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', textAlign: h === 'Objetivo' ? 'left' : 'right' }}>{h}</div>
                  ))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  {metas.map(sim => {
                    const elapsed  = elapsedMonths(sim.created_at)
                    const poupado  = Math.min(elapsed * sim.parcela, sim.valor_total)
                    const falta    = Math.max(0, sim.valor_total - poupado)
                    const pct      = sim.valor_total > 0 ? Math.round((poupado / sim.valor_total) * 100) : 0
                    return (
                      <div key={sim.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 4 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 80px', gap: 8, padding: '10px 4px 4px', alignItems: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{sim.nome}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textAlign: 'right' }}>{fmt(sim.valor_total)}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', textAlign: 'right' }}>{fmt(poupado)}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#b45309', textAlign: 'right' }}>{fmt(falta)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', textAlign: 'right' }}>{pct}%</div>
                        </div>
                        <div style={{ padding: '0 4px' }}>
                          <BarraProgresso pct={pct} cor="#0d9488" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Dívidas */}
            {dividas.length > 0 && (
              <div style={{ marginTop: metas.length > 0 ? 16 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 8 }}>
                  DÍVIDAS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 80px', gap: 8, padding: '0 4px 8px', borderBottom: '2px solid #e2e8f0', overflowX: 'auto' }}>
                  {['Dívida', 'Total', 'Pago', 'Restante', 'Progresso'].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', textAlign: h === 'Dívida' ? 'left' : 'right' }}>{h}</div>
                  ))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  {dividas.map(sim => {
                    const elapsed    = elapsedMonths(sim.created_at)
                    const progMeses  = sim.resultado_meses > 0 ? Math.min(elapsed / sim.resultado_meses, 1) : 1
                    const pagoAprox  = Math.round(progMeses * sim.resultado_meses) * sim.parcela
                    const restante   = Math.max(0, sim.valor_total - (Math.min(pagoAprox, sim.valor_total)))
                    const pct        = Math.round(progMeses * 100)
                    return (
                      <div key={sim.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 4 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 80px', gap: 8, padding: '10px 4px 4px', alignItems: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{sim.nome}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textAlign: 'right' }}>{fmt(sim.valor_total)}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', textAlign: 'right' }}>{fmt(Math.min(pagoAprox, sim.valor_total))}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#b45309', textAlign: 'right' }}>{fmt(restante)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>{pct}%</div>
                        </div>
                        <div style={{ padding: '0 4px' }}>
                          <BarraProgresso pct={pct} cor={pct < 50 ? '#f87171' : pct < 80 ? '#fbbf24' : '#4ade80'} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </Bloco>

      {/* ── Bloco 5: Resumo do patrimônio ────────────────────────────── */}
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        background: '#eff6ff', border: '2px solid #1a56db',
        padding: '18px 24px',
        boxShadow: '0 2px 12px rgba(26,86,219,.12)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.4px' }}>
          Resumo do patrimônio
        </div>

        {/* Linhas */}
        {[
          { label: 'Saldo em contas correntes', valor: totalCorrente, cor: '#1a56db' },
          { label: 'Poupança / Investimentos',  valor: totalPoupanca, cor: '#1d4ed8' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: 13, color: '#0f172a' }}>{row.label}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: row.cor, fontVariantNumeric: 'tabular-nums' }}>{fmt(row.valor)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '2px solid #1a56db', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Total positivo</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalPositivo)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: 13, color: '#0f172a' }}>Faturas dos cartões</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalFaturas)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 8px' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Patrimônio líquido</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: patrimonioLiquido >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(patrimonioLiquido)}
          </span>
        </div>

        <div style={{
          marginTop: 8, padding: '10px 14px', borderRadius: 8,
          background: patrimonioLiquido >= 0 ? '#f0fdf4' : '#fef9c3',
          border: `1px solid ${patrimonioLiquido >= 0 ? '#bbf7d0' : '#fde047'}`,
          fontSize: 13, color: patrimonioLiquido >= 0 ? '#15803d' : '#92400e',
        }}>
          {patrimonioLiquido >= 0
            ? '✅ Seu patrimônio está positivo.'
            : '⚠️ Suas dívidas superam seu saldo. As receitas a receber podem cobrir a diferença.'}
        </div>
      </div>
    </div>
  )
}
