import { useState } from 'react'
import { COR } from '../../utils/cores'
import { RADAR_COR_CLARO, faixaRadar } from '../acompanhamento/radarCores'
import type { MesComparado } from '../../utils/comparativoMensal'
import type { Celula, LadoMesAMes, MediaDaLinha } from '../../utils/categoriasMesAMes'

const CURTOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const num = (v: number) => Math.round(v).toLocaleString('pt-BR')
const MEIO_CENTAVO = 0.005
// Estouro ganha um fundo rosado: a tabela se lê procurando o vermelho, e só
// a cor do número (#7f1d1d, perto do verde-escuro em brilho) não salta.
// #7f1d1d sobre #fef2f2 dá 9,9.
const FUNDO_RUIM = '#fef2f2'
const NEUTRO = '#334155'

/**
 * A cor de uma célula segue a regra do Radar, com o percentual ARREDONDADO
 * (o que a faixa do Radar usa) e fixa paga sempre verde. Mês em curso não é
 * julgado pela metade: fica neutro, a não ser que a despesa já tenha passado.
 */
function corDaCelula(c: Celula, isEntrada: boolean, parcial: boolean): { cor: string; fundo?: string } {
  if (c.fixaPaga) return { cor: RADAR_COR_CLARO.bom }
  if (parcial) {
    return !isEntrada && c.real - c.prev > MEIO_CENTAVO
      ? { cor: RADAR_COR_CLARO.ruim, fundo: FUNDO_RUIM } : { cor: NEUTRO }
  }
  if (c.prev > 0 && Math.abs(c.real - c.prev) < MEIO_CENTAVO) return { cor: RADAR_COR_CLARO.bom }
  const perc = c.prev > 0 ? c.real / c.prev : (c.real > 0 ? 1 : 0)
  const faixa = faixaRadar(Math.round(perc * 100) / 100, isEntrada)
  return { cor: RADAR_COR_CLARO[faixa], fundo: faixa === 'ruim' ? FUNDO_RUIM : undefined }
}

function TdValor({ c, isEntrada, parcial, forte }: { c: Celula | null; isEntrada: boolean; parcial: boolean; forte?: boolean }) {
  const vazio = !c || (c.prev <= MEIO_CENTAVO && Math.abs(c.real) <= MEIO_CENTAVO)
  if (vazio) return <td style={{ ...tdBase, color: '#94a3b8' }}>—</td>
  const { cor, fundo } = corDaCelula(c, isEntrada, parcial)
  return (
    <td style={{ ...tdBase, background: fundo }}>
      <div style={{ fontSize: forte ? 13 : 12.5, fontWeight: forte ? 800 : 700, color: cor }}>
        {c.fixaPaga && '✓ '}{num(c.real)}
      </div>
      <div style={{ fontSize: 10.5, color: COR.textoSuave, marginTop: 1 }}>
        {c.prev > MEIO_CENTAVO ? `de ${num(c.prev)}` : 'sem plano'}
      </div>
    </td>
  )
}

function TdMedia({ m, isEntrada }: { m: MediaDaLinha | null; isEntrada: boolean }) {
  if (!m) return <td style={{ ...tdBase, color: '#94a3b8' }} title="A média aparece com 3 meses fechados com plano">—</td>
  const pct = Math.round(m.desvioPerc * 100)
  // "Ruim" é gastar mais (despesa) ou receber menos (receita).
  const ruim = isEntrada ? pct < 0 : pct > 0
  const sinal = pct > 0 ? `+${pct}%` : pct < 0 ? `−${Math.abs(pct)}%` : '0%'
  return (
    <td style={{ ...tdBase, borderLeft: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: NEUTRO }}>
        {num(m.mediaReal)} <span style={{ fontSize: 10.5, fontWeight: 400, color: COR.textoSuave }}>de {num(m.mediaPrev)}</span>
      </div>
      <div style={{ fontSize: 10.5, marginTop: 1, color: ruim ? COR.erroTexto : COR.textoSuave, fontWeight: ruim ? 700 : 400 }}>
        {sinal} · {isEntrada ? 'abaixo' : 'passou'} {m.mesesRuins} de {m.meses}
      </div>
    </td>
  )
}

const tdBase: React.CSSProperties = {
  padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle',
  fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f1f5f9',
}

/**
 * Planejado × realizado por categoria, mês a mês — a visão "Por categoria" do
 * quadro "Receitas e despesas contra o plano". Os números vêm prontos de
 * utils/categoriasMesAMes; aqui é desenho.
 *
 * Grupos fechados por padrão, como no Radar: recolhida, a tabela é um
 * resumo por grupo. A primeira coluna fica presa ao rolar para o lado, que é
 * o que o celular faz com seis meses.
 */
export default function CategoriasMesAMes({ meses, dados, isMobile }: {
  meses: MesComparado[]; dados: { saida: LadoMesAMes; entrada: LadoMesAMes }; isMobile: boolean
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const alternar = (k: string) => setAbertos(p => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const larguraNome = isMobile ? 120 : 190
  const thNome: React.CSSProperties = {
    position: 'sticky', left: 0, zIndex: 1, background: COR.branco, textAlign: 'left',
    minWidth: larguraNome, maxWidth: larguraNome, padding: '6px 8px', borderBottom: '1px solid #f1f5f9',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  }

  const secao = (lado: LadoMesAMes) => {
    const isEntrada = lado.tipo === 'entrada'
    if (lado.grupos.length === 0) return null
    return (
      <tbody key={lado.tipo}>
        <tr>
          {/* O sticky vai no texto, não na célula: célula com colSpan rola
              inteira, e o título sumia ao rolar a tabela no celular. */}
          <th colSpan={meses.length + 2} style={{ textAlign: 'left', padding: '14px 0 6px', fontSize: 11,
            letterSpacing: '.06em', textTransform: 'uppercase', color: isEntrada ? '#15803d' : '#b91c1c' }}>
            <span style={{ position: 'sticky', left: 8, paddingLeft: 8 }}>{isEntrada ? '↑ Receitas' : '↓ Despesas'}</span>
          </th>
        </tr>
        {lado.grupos.map(g => {
          const k = `${lado.tipo}:${g.grupo}`
          const aberto = abertos.has(k)
          const nome = g.grupo === '__sem_grupo__' ? 'Outras' : g.grupo
          return [
            <tr key={k} onClick={() => alternar(k)} style={{ cursor: 'pointer', background: '#f1f5f9' }}>
              <th scope="row" style={{ ...thNome, background: '#f1f5f9', fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>
                <button type="button" aria-expanded={aberto} onClick={e => { e.stopPropagation(); alternar(k) }}
                  style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
                  <span aria-hidden style={{ fontSize: 10, color: COR.textoSuave, display: 'inline-block',
                    transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</span>
                </button>
              </th>
              {g.celulas.map((c, i) => <TdValor key={i} c={c} isEntrada={isEntrada} parcial={meses[i].parcial} forte />)}
              <td style={{ ...tdBase, borderLeft: '1px solid #e2e8f0' }} />
            </tr>,
            ...(aberto ? g.linhas.map(l => (
              <tr key={`${k}:${l.nome}:${l.descricao}`}>
                <th scope="row" title={l.descricao ? `${l.nome} · ${l.descricao}` : l.nome}
                  style={{ ...thNome, fontSize: 12.5, fontWeight: 500, color: COR.texto, paddingLeft: 24 }}>
                  {l.nome}{l.descricao && <span style={{ color: COR.textoSuave }}> · {l.descricao}</span>}
                </th>
                {l.celulas.map((c, i) => <TdValor key={i} c={c} isEntrada={isEntrada} parcial={meses[i].parcial} />)}
                <TdMedia m={l.media} isEntrada={isEntrada} />
              </tr>
            )) : []),
          ]
        })}
      </tbody>
    )
  }

  return (
    <div style={{ overflowX: 'auto', margin: isMobile ? '0 -14px' : 0 }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5 }}>
        <thead>
          <tr>
            <th style={{ ...thNome, fontSize: 11, fontWeight: 400, color: COR.textoSuave }}>em R$</th>
            {meses.map(m => (
              <th key={`${m.ano}-${m.mes}`} style={{ ...tdBase, minWidth: 72, fontSize: 11.5,
                color: m.parcial ? COR.texto : COR.textoSuave, fontWeight: m.parcial ? 650 : 400 }}>
                {CURTOS[m.mes]}{m.mes === 0 || m === meses[0] ? ` ${String(m.ano).slice(2)}` : ''}
                {m.parcial && <div style={{ fontSize: 10, fontWeight: 400, color: COR.textoSuave }}>até hoje</div>}
              </th>
            ))}
            <th style={{ ...tdBase, minWidth: 110, fontSize: 11.5, color: COR.textoSuave, fontWeight: 400,
              borderLeft: '1px solid #e2e8f0' }}>Média</th>
          </tr>
        </thead>
        {secao(dados.saida)}
        {secao(dados.entrada)}
      </table>
    </div>
  )
}
