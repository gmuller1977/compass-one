import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import SeletorMesAno from '../components/SeletorMesAno'
import { useApp } from '../context/AppContext'
import { COR } from '../utils/cores'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { comparativoMensal } from '../utils/comparativoMensal'
import { precisaoDoPlano } from '../utils/precisaoDoPlano'
import { estourosComMotivo } from '../utils/motivoDoEstouro'
import { useMotivosDoMes } from '../components/motivo/useMotivosDoMes'
import { iconeCategoria } from '../utils/categoriaIcone'
import ComparativoMensal from '../components/inicio/ComparativoMensal'
import PrecisaoCard from '../components/inicio/PrecisaoCard'
import { Cartao, TituloCartao, Linha } from '../components/mobile/ui'
import { M } from '../components/mobile/estilo'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const TIPO_EVENTO = { pontual: 'pontual', anual: 'acontece todo ano', sazonal: 'sazonal' } as const

/**
 * "Como foi o mês" (19/10/2026, pedido do Guilherme; no menu segue
 * "Revisão mensal"). A Revisão mensal tinha
 * três etapas — visão geral, justificar e confirmar, com um ajuste do plano
 * que parava em dezembro e ignorava parcelas. O motivo hoje se anota durante
 * o mês (Radar, Início), o plano se ajusta pelo Radar e pelo "fechou" da
 * Início (mesQueFechou), e o Radar não julga o que não tem plano. Ficou a
 * leitura do mês que fechou: o resultado (o mesmo do Radar, escolha dele no
 * card), o que passou do plano com o motivo anotado, e o histórico (Mês a
 * mês, Precisão do plano). Só leitura, nenhuma
 * conta nova: as linhas são as do Radar (useMesDaInicio → totaisDoMes) e o
 * corte do "passou" é o mesmo do pedido de motivo (desvioMinPerc).
 */
export default function RevisaoMensal() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const { desvioMinPerc, planos, categorias } = useApp()

  const hoje = new Date()
  const ymHoje = hoje.getFullYear() * 12 + hoje.getMonth()
  const [ym, setYm] = useState(ymHoje - 1)
  const ano = Math.floor(ym / 12), mes = ym % 12

  const m = useMesDaInicio(ano, mes)
  const { motivos } = useMotivosDoMes(ano, mes)
  const estouros = useMemo(() => estourosComMotivo(m.linhasSaida, motivos, desvioMinPerc),
    [m.linhasSaida, motivos, desvioMinPerc])
  // Motivo anotado numa categoria que, no fim, não passou do corte: aparece
  // também, para nada do que a pessoa escreveu sumir.
  const outrosMotivos = motivos.filter(mo => mo.justificativa.trim() && !estouros.some(e => e.rotulo === mo.categoria))

  // O histórico que morava em Análises (removida em 11/10/2026): como os
  // meses se comportaram contra o plano. Mesmas funções, mesmos números.
  const { deps } = useMesDaInicio(hoje.getFullYear(), hoje.getMonth())
  const comparativo = useMemo(() => comparativoMensal(deps, planos), [deps, planos])
  const precisao = useMemo(() => precisaoDoPlano(comparativo), [comparativo])

  const nomeMes = MESES[mes]
  const resultado = m.totalEntradas - m.totalSaidas
  const de = (prev: number) => (prev > 0.005 ? `de ${fmt(prev)} planejados` : 'sem plano')

  const resumo: { rot: string; valor: string; legenda: string; cor: string }[] = [
    { rot: 'Recebeu', valor: fmt(m.totalEntradas), legenda: de(m.totalPrevE), cor: COR.sucessoTexto },
    { rot: 'Gastou', valor: fmt(m.totalSaidas), legenda: de(m.totalPrevS), cor: COR.erroTexto },
    { rot: resultado >= 0 ? 'Guardou' : 'Gastou a mais do que ganhou', valor: fmt(Math.abs(resultado)),
      legenda: 'o que entrou menos o que saiu', cor: resultado >= 0 ? COR.sucessoTexto : COR.erroTexto },
  ]

  const seletor = (
    <SeletorMesAno mes={mes} ano={ano} onSelect={(mm, aa) => setYm(aa * 12 + mm)}
      habilitado={(mm, aa) => aa * 12 + mm < ymHoje} />
  )

  const legendaMotivo = (texto: string, tipo: keyof typeof TIPO_EVENTO | null) => (
    <span style={{ color: COR.texto }}>“{texto}”{tipo ? <span style={{ color: COR.textoSuave }}> · {TIPO_EVENTO[tipo]}</span> : null}</span>
  )

  return (
    <div style={{ minHeight: '100vh', background: M.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      {isMobile && <AppHeader currentPath={location.pathname} />}
      <div style={{ padding: isMobile ? '0 0 4px' : '0' }}>
        {/* No celular o mês desce para baixo do título: ao lado, o título
            "Como foi o mês" era cortado. */}
        <PageHeader icon="ti-calendar-stats" breadcrumb="TODO MÊS" title="Como foi o mês" ajuda="revisao"
          rightContent={isMobile ? undefined : seletor}>
          {isMobile && <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>{seletor}</div>}
        </PageHeader>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '0 14px 90px' : '0 28px 40px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
        <Cartao>
          <TituloCartao>Resultado de {nomeMes}</TituloCartao>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(3, minmax(0,1fr))', gap: isMobile ? 10 : 16 }}>
            {resumo.map(r => (
              <div key={r.rot} style={{ minWidth: 0 }}>
                <div style={{ fontSize: M.legenda, fontWeight: 600, color: COR.textoSuave }}>{r.rot}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: r.cor, fontVariantNumeric: 'tabular-nums' }}>{r.valor}</div>
                <div style={{ fontSize: M.legenda, color: COR.textoSuave }}>{r.legenda}</div>
              </div>
            ))}
          </div>
        </Cartao>

        <Cartao>
          <TituloCartao>O que passou do plano</TituloCartao>
          {estouros.length === 0 && (
            <div style={{ fontSize: M.corpo, color: COR.textoSuave, lineHeight: 1.45 }}>
              {m.totalPrevS > 0.005
                ? `Nenhuma categoria passou do plano em ${nomeMes}.`
                : `${nomeMes.replace(/^./, c => c.toUpperCase())} não tinha plano de gastos, então não há o que comparar.`}
            </div>
          )}
          {estouros.map((e, i) => {
            const ic = iconeCategoria(categorias, e.nome)
            return (
              <Linha key={e.rotulo} primeira={i === 0} icone={ic.icone} cor={ic.cor} titulo={e.rotulo}
                legenda={<>
                  <div>gastou {fmt(e.real)} de {fmt(e.prev)}</div>
                  <div style={{ marginTop: 2 }}>
                    {e.motivo ? legendaMotivo(e.motivo.justificativa, e.motivo.tipoEvento) : 'Sem motivo anotado'}
                  </div>
                </>}
                direita={<span style={{ fontSize: M.corpo, fontWeight: 800, color: COR.erroTexto, whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums' }}>+{fmt(e.excesso)}</span>} />
            )
          })}
          {outrosMotivos.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: COR.textoSuave,
                padding: '14px 0 0', borderTop: estouros.length ? '1px solid #eef2f8' : 'none', marginTop: estouros.length ? 6 : 0 }}>
                Outros motivos anotados
              </div>
              {outrosMotivos.map((mo, i) => {
                const nome = mo.categoria.split(' · ')[0]
                const ic = iconeCategoria(categorias, nome)
                return (
                  <Linha key={mo.id} primeira={i === 0} icone={ic.icone} cor={ic.cor} titulo={mo.categoria}
                    legenda={legendaMotivo(mo.justificativa, mo.tipoEvento)} />
                )
              })}
            </>
          )}
          {estouros.length > 0 && (
            <div style={{ fontSize: M.legenda, color: COR.textoSuave, lineHeight: 1.45, paddingTop: 10, borderTop: '1px solid #eef2f8', marginTop: 4 }}>
              O plano dos próximos meses se ajusta pelo Radar (“ajustar plano” na categoria).
            </div>
          )}
        </Cartao>

        {comparativo.length >= 2 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: COR.texto, margin: '8px 0 0' }}>Mês a mês</h2>
            <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: -8 }}>
              Receitas e despesas contra o plano, e cada categoria ao longo dos meses
            </div>
            <ComparativoMensal meses={comparativo} categorias={categorias} isMobile={isMobile} visaoInicial="total" />
          </>
        )}
        {precisao && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: COR.texto, margin: '8px 0 0' }}>Precisão do plano</h2>
            <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: -8 }}>Onde o plano costuma errar</div>
            <PrecisaoCard p={precisao} categorias={categorias} isMobile={isMobile} />
          </>
        )}
      </div>
    </div>
  )
}

