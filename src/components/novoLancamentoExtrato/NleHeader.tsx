import type { User } from '@supabase/supabase-js'
import type { Conta } from '../../context/AppContext'
import { NOMES_MESES } from './NleShared'
import PageHeader from '../PageHeader'
import SeletorMesAno from '../SeletorMesAno'

type TabPrincipal = 'extrato' | 'cartao' | 'dinheiro' | 'consolidado'

type Props = {
  isMobile: boolean
  user: User | null
  sairDaConta: () => void
  tabPrincipal: TabPrincipal
  setTabPrincipal: (v: TabPrincipal) => void
  contasExtrato: Conta[]
  contaId: string
  setContaId: (id: string) => void
  setMobileDiaForm: (v: null) => void
  // Calendário (banco/dinheiro)
  mes: number
  ano: number
  onMesSelect: (mes: number, ano: number) => void
  // Calendário cartão
  cartaoMes: number
  cartaoAno: number
  onCartaoMesSelect: (mes: number, ano: number) => void
}

export default function NleHeader({
  isMobile, user, sairDaConta,
  tabPrincipal, setTabPrincipal,
  contasExtrato, contaId, setContaId, setMobileDiaForm,
  mes, ano, onMesSelect,
  cartaoMes, cartaoAno, onCartaoMesSelect,
}: Props) {
  if (!isMobile) {
    const isDinheiro    = tabPrincipal === 'dinheiro'
    const isCartao      = tabPrincipal === 'cartao'
    const isConsolidado = tabPrincipal === 'consolidado'

    const contaSel = contasExtrato.find(c => c.id === contaId) ?? contasExtrato.find(c => c.preferida) ?? contasExtrato[0]
    const subtitle = isConsolidado
      ? `${NOMES_MESES[mes]} ${ano}`
      : (isDinheiro || isCartao)
        ? undefined
        : contaSel
          ? `${contaSel.banco}${contaSel.apelido ? ' · ' + contaSel.apelido : ''}`
          : undefined

    const icon  = isConsolidado ? 'ti-list-details' : isCartao ? 'ti-credit-card' : isDinheiro ? 'ti-cash' : 'ti-building-bank'
    const title = isConsolidado ? 'Resumo mensal' : isCartao ? 'Fatura do Cartão' : isDinheiro ? 'Movimentação de dinheiro' : 'Movimentação do banco'


    // Cartão month nav (own calendar popover)
    const cartaoNav = (
      <SeletorMesAno mes={cartaoMes} ano={cartaoAno} onSelect={onCartaoMesSelect} />
    )

    // Banco/dinheiro month nav
    const bancoNav = (
      <SeletorMesAno mes={mes} ano={ano} onSelect={onMesSelect} />
    )

    return (
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <PageHeader
          icon={icon}
          breadcrumb="LANÇAMENTOS"
          ajuda="lancamentos"
          title={title}
          subtitle={subtitle}
          mb={0}
          rightContent={isCartao ? cartaoNav : bancoNav}
        />
      </div>
    )
  }

  // Celular: o topo azul dos apps de banco, como a Bússola e o Radar
  // (#0f2878 → #1e40af — a regra do #1e40af). Ele continua no subcabeçalho
  // (ou no topo da fatura, no Cartão), que fecha o bloco com os cantos
  // arredondados.
  return (
    <div style={{background:'linear-gradient(180deg,#0f2878,#132f8f)',
      padding:'calc(14px + env(safe-area-inset-top)) 16px 4px',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-.01em'}}>Lançamentos</h1>
        <button onClick={sairDaConta} title="Sair" aria-label="Sair"
          style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,.18)',
            border:'none',cursor:'pointer',display:'flex',alignItems:'center',
            justifyContent:'center',color:'#fff',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
          {user?.email?.charAt(0).toUpperCase() ?? 'U'}
        </button>
      </div>
      {/* Tipo: controle segmentado. Ativo é pílula branca com texto marinho;
          inativo, branco a 85% sobre o azul (6,7:1 no #1e40af). */}
      <div role="tablist" style={{display:'flex',gap:4,padding:4,borderRadius:999,background:'rgba(255,255,255,.12)'}}>
        {([
          {v:'extrato'     as const, icon:'🏦', label:'Banco'},
          {v:'cartao'      as const, icon:'💳', label:'Cartão'},
          {v:'dinheiro'    as const, icon:'💵', label:'Dinheiro'},
          {v:'consolidado' as const, icon:'📊', label:'Total'},
        ]).map(({v,icon,label}) => {
          const ativo = tabPrincipal === v
          return (
            <button key={v} role="tab" aria-selected={ativo} onClick={() => {
              setTabPrincipal(v)
              setMobileDiaForm(null)
              if (v==='extrato') {
                const p = contasExtrato.find(c => c.preferida)
                setContaId((p ?? contasExtrato[0])?.id ?? '')
              }
            }} style={{
              flex:1,minWidth:0,display:'flex',alignItems:'center',justifyContent:'center',gap:5,
              padding:'0 6px',minHeight:40,borderRadius:999,cursor:'pointer',whiteSpace:'nowrap',
              border:'none',fontFamily:'inherit',fontSize:14,fontWeight:700,
              background:ativo?'#fff':'transparent',color:ativo?'#1e3a8a':'rgba(255,255,255,.85)',
              boxShadow:ativo?'0 2px 8px rgba(15,23,42,.18)':'none',
            }}>
              <span aria-hidden style={{fontSize:15}}>{icon}</span>{label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
