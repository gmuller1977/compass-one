import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { COR } from '../utils/cores'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { comparativoMensal } from '../utils/comparativoMensal'
import { precisaoDoPlano } from '../utils/precisaoDoPlano'
import { categoriasEstouradas, maisPertoDoLimite } from '../utils/categoriasEstouradas'
import { ritmoDoMes } from '../utils/ritmoDoMes'
import ComparativoMensal from '../components/inicio/ComparativoMensal'
import PrecisaoCard from '../components/inicio/PrecisaoCard'
import RitmoCard from '../components/RitmoCard'
import EstouradasCard from '../components/EstouradasCard'
import MaioresDespesasCard from '../components/analises/MaioresDespesasCard'
import MetasDividasCard from '../components/analises/MetasDividasCard'
import UltimasMovimentacoesCard from '../components/analises/UltimasMovimentacoesCard'
import AurixFaixa from '../components/analises/AurixFaixa'

const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

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
 * Análises: o detalhe que saiu da Início quando ela foi enxugada, em
 * 06/10/2026 — "o início está uma tela cheia de número, e falando de forma
 * comercial isso não vende". Nenhum quadro foi reescrito: são os mesmos, com
 * os mesmos números, num lugar onde quem quer detalhe vai procurar.
 *
 * Sempre o mês de HOJE: o comparativo e a precisão já são ancorados em hoje,
 * e "este mês" é o corrente. Os botões da Início chegam por âncora (#id).
 */
export default function Analises() {
  const navigate = useNavigate()
  const { hash, pathname } = useLocation()
  const isMobile = useIsMobile()
  const { categorias, planos } = useApp()
  const hoje = new Date()
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const { deps, linhasSaida, topCategorias, usaPlanoNoMes } = useMesDaInicio(ano, mes)

  const comparativo = useMemo(() => comparativoMensal(deps, planos), [deps, planos])
  const precisao = useMemo(() => precisaoDoPlano(comparativo), [comparativo])
  const estouradas = useMemo(() => categoriasEstouradas(linhasSaida), [linhasSaida])
  const pertoDoLimite = useMemo(() => maisPertoDoLimite(linhasSaida, categorias), [linhasSaida, categorias])
  const ritmo = useMemo(
    () => (usaPlanoNoMes ? ritmoDoMes(linhasSaida, categorias) : null),
    [usaPlanoNoMes, linhasSaida, categorias],
  )

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
        <PageHeader icon="ti-chart-dots" breadcrumb="TODO MÊS" title="Análises"
          subtitle="O detalhe por trás da Início" />
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '16px 14px 80px' : '24px 28px 40px',
        display: 'flex', flexDirection: 'column', gap: 12 }}>

        {titulo('este-mes', `${MESES_FULL[mes]} até agora`)}
        {ritmo && <RitmoCard r={ritmo} />}
        {usaPlanoNoMes
          ? <EstouradasCard estouradas={estouradas} perto={pertoDoLimite} categorias={categorias}
              onVerRadar={() => navigate('/radar')} />
          : <MaioresDespesasCard topCategorias={topCategorias} />}

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

        {titulo('movimentacoes', 'Movimentações, metas e dívidas')}
        {/* auto-fit: sem metas, as movimentações ocupam a largura toda. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, alignItems: 'start' }}>
          <UltimasMovimentacoesCard ano={ano} mes={mes} />
          <MetasDividasCard />
        </div>

        {titulo('aurix', 'Aurix')}
        <AurixFaixa />
      </div>
    </div>
  )
}
