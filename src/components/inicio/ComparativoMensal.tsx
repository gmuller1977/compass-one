import { useState } from 'react'
import { COR } from '../../utils/cores'
import type { MesComparado } from '../../utils/comparativoMensal'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const CURTOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const inteiro = (v: number) => `R$ ${Math.abs(Math.round(v)).toLocaleString('pt-BR')}`
const eixo = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(v)))

// Sobre o branco: receita #15803d (5,02) e despesa #b91c1c (6,47). NÃO os
// COR.barraVerde / barraVermelha: são os tons do azul-escuro, e no branco dão
// 1,74 e 2,77 — reprovam até como gráfico. Ver o aviso em cores.ts.
const RECEITA = '#15803d'
const DESPESA = '#b91c1c'
const PLOT = 196

/**
 * Receitas e despesas contra o plano, mês a mês — onda 3 do briefing da
 * Início. Os números vêm prontos de utils/comparativoMensal; aqui é desenho.
 *
 * Barras agrupadas e ancoradas no zero, e não linhas: a pergunta principal é
 * DENTRO do mês — ganhei mais do que gastei? —, e a barra responde de relance.
 * Tendência é o que o gráfico de saldo, logo abaixo, já faz.
 *
 * O previsto é um TRAÇO na altura do plano, por `bottom: %` dentro de um slot
 * de altura total. O anel branco é obrigatório: nenhum tom escuro passa 3:1
 * sobre o vermelho (#0f172a dá 2,76); com o anel ele lê sobre a barra, e as
 * pontas que sobram caem no branco do cartão (17,85).
 */
export default function ComparativoMensal({ meses, isMobile }: { meses: MesComparado[]; isMobile: boolean }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  if (meses.length === 0) return null

  // Escala: um passo "redondo" (1, 2, 2,5 ou 5 × 10ⁿ) que cubra o maior valor em 4 linhas.
  const maior = Math.max(1, ...meses.flatMap(m => [m.receitas, m.despesas, m.prevReceitas, m.prevDespesas]))
  const bruto = maior / 4
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map(k => k * pot).find(p => p >= bruto) ?? 10 * pot
  const topo = passo * 4
  const pct = (v: number) => `${(Math.max(0, v) / topo) * 100}%`
  const larg = isMobile ? 11 : 17
  const corrente = meses.find(m => m.parcial)
  const diasFaltam = corrente
    ? new Date(corrente.ano, corrente.mes + 1, 0).getDate() - new Date().getDate()
    : 0

  const diff = (real: number, prev: number) => (prev > 0 ? Math.round((real / prev - 1) * 100) : null)
  const sinal = (n: number) => (n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : '0%')

  return (
    <div style={{ background: COR.branco, borderRadius: 12, padding: isMobile ? '16px 14px' : '18px 20px',
      border: `.5px solid ${COR.borda}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        flexWrap: 'wrap', marginBottom: 15 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Receitas e despesas contra o plano</div>
          <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>
            {meses.length === 1 ? 'Este mês' : `Últimos ${meses.length} meses`} · a barra é o realizado, o traço é o previsto
          </div>
        </div>
        <div style={{ display: 'flex', gap: 13, fontSize: 12, color: '#475569', alignItems: 'center', flexWrap: 'wrap' }}>
          <span><i style={{ width: 9, height: 9, borderRadius: 2, display: 'inline-block', marginRight: 6, verticalAlign: -1, background: RECEITA }} />Receitas</span>
          <span><i style={{ width: 9, height: 9, borderRadius: 2, display: 'inline-block', marginRight: 6, verticalAlign: -1, background: DESPESA }} />Despesas</span>
          <span><svg width="16" height="8" aria-hidden style={{ verticalAlign: -2, marginRight: 5 }}><rect x="0" y="3" width="16" height="2" fill="#0f172a" /></svg>Previsto</span>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        <div aria-hidden style={{ width: 46, flexShrink: 0, position: 'relative', height: PLOT }}>
          {[4, 3, 2, 1, 0].map(k => (
            <span key={k} style={{ position: 'absolute', right: 9, top: `${100 - k * 25}%`, transform: 'translateY(-50%)',
              fontSize: 11, color: COR.textoSuave, fontVariantNumeric: 'tabular-nums' }}>{eixo(k * passo)}</span>
          ))}
        </div>
        <div style={{ flex: 1, position: 'relative', height: PLOT }}>
          {[4, 3, 2, 1, 0].map(k => (
            <div key={k} aria-hidden style={{ position: 'absolute', left: 0, right: 0, height: 1,
              top: `${100 - k * 25}%`, background: k === 0 ? '#dbe3f0' : '#eef2f7' }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {meses.map((m, i) => {
              const resultado = m.receitas - m.despesas
              const dr = diff(m.receitas, m.prevReceitas), dd = diff(m.despesas, m.prevDespesas)
              const aberto = ativo === i
              const nome = `${MESES[m.mes].replace(/^./, c => c.toUpperCase())} de ${m.ano}`
              const rotuloAria = `${nome}${m.parcial ? ', até hoje' : ''}: receitas ${inteiro(m.receitas)}, previsto ${inteiro(m.prevReceitas)}; `
                + `despesas ${inteiro(m.despesas)}, previsto ${inteiro(m.prevDespesas)}; ${resultado >= 0 ? 'sobrou' : 'faltou'} ${inteiro(resultado)}.`
              // Tooltip das pontas encosta na borda de dentro, para não sair do cartão.
              const lado = i === 0 ? { left: 0 } : i === meses.length - 1 ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }
              const slot = (real: number, prev: number, cor: string) => (
                <div style={{ position: 'relative', height: '100%', width: larg, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', height: pct(real), background: cor, borderRadius: '4px 4px 0 0',
                    opacity: m.parcial ? 0.42 : 1 }} />
                  {prev > 0 && (
                    <div style={{ position: 'absolute', left: -4, right: -4, height: 2, bottom: pct(prev),
                      background: '#0f172a', borderTop: '1px solid #fff', borderBottom: '1px solid #fff',
                      borderRadius: 1, boxSizing: 'content-box' }} />
                  )}
                </div>
              )
              return (
                <div key={`${m.ano}-${m.mes}`} tabIndex={0} role="img" aria-label={rotuloAria}
                  onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)}
                  onFocus={() => setAtivo(i)} onBlur={() => setAtivo(null)}
                  style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3,
                    height: '100%', position: 'relative', padding: '0 4px', borderRadius: 6, outline: 'none',
                    background: aberto ? '#f6f9fd' : 'transparent', transition: 'background .12s' }}>
                  {aberto && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', ...lado, zIndex: 5,
                      background: '#0f172a', color: '#fff', borderRadius: 8, padding: '9px 11px', fontSize: 11.5,
                      lineHeight: 1.55, whiteSpace: 'nowrap', boxShadow: '0 6px 18px rgba(15,23,42,.28)',
                      pointerEvents: 'none' }}>
                      <b>{nome}</b>{m.parcial && ' · até hoje'}
                      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.18)', margin: '6px 0' }} />
                      <i style={{ width: 8, height: 8, borderRadius: 2, display: 'inline-block', marginRight: 6, verticalAlign: -1, background: '#4ade80' }} />
                      Receitas <b>{inteiro(m.receitas)}</b> · previsto {inteiro(m.prevReceitas)}
                      {dr !== null && <span style={{ color: dr >= 0 ? '#86efac' : '#fecaca' }}> {sinal(dr)}</span>}<br />
                      <i style={{ width: 8, height: 8, borderRadius: 2, display: 'inline-block', marginRight: 6, verticalAlign: -1, background: '#f87171' }} />
                      Despesas <b>{inteiro(m.despesas)}</b> · previsto {inteiro(m.prevDespesas)}
                      {dd !== null && <span style={{ color: dd <= 0 ? '#86efac' : '#fecaca' }}> {sinal(dd)}</span>}
                      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.18)', margin: '6px 0' }} />
                      {resultado >= 0 ? 'Sobrou' : 'Faltou'} <b>{inteiro(resultado)}</b>{m.parcial && ' · mês em curso'}
                    </div>
                  )}
                  {slot(m.receitas, m.prevReceitas, RECEITA)}
                  {slot(m.despesas, m.prevDespesas, DESPESA)}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div aria-hidden style={{ display: 'flex', marginLeft: 46, marginTop: 9 }}>
        {meses.map(m => (
          <div key={`x${m.ano}-${m.mes}`} style={{ flex: 1, textAlign: 'center', padding: '0 4px' }}>
            <div style={{ fontSize: 11.5, color: m.parcial ? COR.texto : COR.textoSuave, fontWeight: m.parcial ? 650 : 400 }}>
              {CURTOS[m.mes]}
            </div>
            {m.parcial && <div style={{ fontSize: 10, color: COR.textoSuave, marginTop: 1 }}>até hoje</div>}
          </div>
        ))}
      </div>
      <div aria-hidden style={{ display: 'flex', marginLeft: 46, marginTop: 11, paddingTop: 11, borderTop: '1px solid #f1f5f9' }}>
        {meses.map(m => {
          const r = m.receitas - m.despesas
          return (
            <div key={`r${m.ano}-${m.mes}`} style={{ flex: 1, textAlign: 'center', padding: '0 4px' }}>
              <div style={{ fontSize: 9.5, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {r >= 0 ? 'Sobrou' : 'Faltou'}
              </div>
              <div style={{ fontSize: isMobile ? 11 : 12.5, fontWeight: 700, marginTop: 3, fontVariantNumeric: 'tabular-nums',
                color: r >= 0 ? RECEITA : DESPESA, whiteSpace: 'nowrap' }}>
                {/* No celular a coluna tem ~45px: sem o "R$", o valor cabe. O
                    tooltip e o aria-label da coluna trazem o valor completo. */}
                {r >= 0 ? '+' : '−'}{isMobile ? Math.abs(Math.round(r)).toLocaleString('pt-BR') : inteiro(r)}
              </div>
            </div>
          )
        })}
      </div>
      {corrente && (
        <div style={{ fontSize: 11.5, color: COR.textoSuave, marginTop: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span aria-hidden style={{ width: 14, height: 10, borderRadius: 2, background: DESPESA, opacity: 0.42, flexShrink: 0 }} />
          {MESES[corrente.mes].replace(/^./, c => c.toUpperCase())} ainda está em curso
          {diasFaltam > 0 ? ` — ${diasFaltam === 1 ? 'falta 1 dia' : `faltam ${diasFaltam} dias`}` : ' — hoje é o último dia'}.
        </div>
      )}
    </div>
  )
}
