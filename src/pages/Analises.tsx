import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { COR } from '../utils/cores'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { comparativoMensal } from '../utils/comparativoMensal'
import { precisaoDoPlano } from '../utils/precisaoDoPlano'
import ComparativoMensal from '../components/inicio/ComparativoMensal'
import PrecisaoCard from '../components/inicio/PrecisaoCard'
import MetasDividasCard from '../components/analises/MetasDividasCard'
import PatrimonioCard from '../components/analises/PatrimonioCard'


function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

/**
 * Análises: o HISTÓRICO. Nasceu em 06/10/2026 com o detalhe que saiu da
 * Início; em 11/10/2026 perdeu o que repetia outras telas e ganhou o
 * patrimônio do Resumo mensal, que foi removido. Ficou o que só ela tem:
 *
 *   Mês a mês e Por categoria → comparativoMensal (as linhas do Radar)
 *   Precisão do plano         → precisaoDoPlano
 *   Patrimônio                → detalharMes + memoriaDoRadar (PatrimonioCard)
 *   Metas e dívidas           → as simulações ativas
 *
 * Saíram, por já estarem em outro lugar: o ritmo e as categorias estouradas
 * do mês (Radar e Bússola), as últimas movimentações (Lançamentos) e a faixa
 * do Aurix (tela própria).
 *
 * Sempre o mês de HOJE. Os botões da Início chegam por âncora (#id).
 */
export default function Analises() {
  const { hash, pathname } = useLocation()
  const isMobile = useIsMobile()
  const { categorias, planos } = useApp()
  const hoje = new Date()
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const { deps } = useMesDaInicio(ano, mes)

  const comparativo = useMemo(() => comparativoMensal(deps, planos), [deps, planos])
  const precisao = useMemo(() => precisaoDoPlano(comparativo), [comparativo])

  // A Início chega com #mes-a-mes, #por-categoria, #precisao...: rola até lá
  // depois do primeiro desenho.
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    return () => clearTimeout(t)
  }, [hash])

  const titulo = (id: string, texto: string, sub?: string) => (
    <div id={id} style={{ scrollMarginTop: 16, margin: '8px 0 10px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: COR.texto, margin: 0 }}>{texto}</h2>
      {sub && <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath={pathname} />
      <div style={{ padding: isMobile ? '12px 14px 0' : '16px 28px 0' }}>
        <PageHeader icon="ti-chart-dots" breadcrumb="TODO MÊS" title="Análises" ajuda="analises"
          subtitle="Como os meses se comportaram contra o plano" />
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '16px 14px 80px' : '24px 28px 40px',
        display: 'flex', flexDirection: 'column', gap: 12 }}>

        {comparativo.length >= 2 && (
          <>
            {titulo('mes-a-mes', 'Mês a mês', 'Receitas e despesas contra o plano, e cada categoria ao longo dos meses')}
            <div id="por-categoria" style={{ scrollMarginTop: 16 }}>
              <ComparativoMensal meses={comparativo} categorias={categorias} isMobile={isMobile}
                visaoInicial={hash === '#por-categoria' ? 'categoria' : 'total'} />
            </div>
          </>
        )}

        {precisao && (
          <>
            {titulo('precisao', 'Precisão do plano', 'Onde o plano costuma errar')}
            <PrecisaoCard p={precisao} categorias={categorias} isMobile={isMobile} />
          </>
        )}

        {titulo('patrimonio', 'Patrimônio', 'O que você tem hoje, menos as faturas a pagar no mês')}
        <PatrimonioCard ano={ano} mes={mes} deps={deps} />
        <MetasDividasCard />
      </div>
    </div>
  )
}
