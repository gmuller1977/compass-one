import type { User } from '@supabase/supabase-js'
import type { Conta } from '../../context/AppContext'
import { COR, NOMES_MESES } from './NleShared'
import PageHeader from '../PageHeader'

type TabPrincipal = 'extrato' | 'cartao' | 'dinheiro' | 'consolidado'

type Props = {
  isMobile: boolean
  user: User | null
  sairDaConta: () => void
  tabPrincipal: TabPrincipal
  setTabPrincipal: (v: TabPrincipal) => void
  contasExtrato: Conta[]
  setContaId: (id: string) => void
  setMobileDiaForm: (v: null) => void
  // Calendário
  mes: number
  ano: number
  mostrarCalendario: boolean
  anoCalendario: number
  setMostrarCalendario: (v: boolean | ((p: boolean) => boolean)) => void
  setAnoCalendario: (fn: (a: number) => number) => void
  onMesSelect: (mes: number, ano: number) => void
  onMesPrev: () => void
  onMesNext: () => void
}

export default function NleHeader({
  isMobile, user, sairDaConta,
  tabPrincipal, setTabPrincipal,
  contasExtrato, setContaId, setMobileDiaForm,
  mes, ano, mostrarCalendario, anoCalendario,
  setMostrarCalendario, setAnoCalendario, onMesSelect, onMesPrev, onMesNext,
}: Props) {
  if (!isMobile) {
    const contaDefault = contasExtrato.find(c => c.preferida) ?? contasExtrato[0]
    const subtitle = contaDefault
      ? `${contaDefault.banco}${contaDefault.apelido ? ' · ' + contaDefault.apelido : ''}`
      : undefined

    const arrowBtn = {
      width: 28, height: 28, borderRadius: 8, border: 'none',
      background: 'rgba(255,255,255,0.15)', color: '#fff',
      cursor: 'pointer', fontSize: 16, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit',
    } as const

    return (
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <PageHeader
          icon="ti-building-bank"
          breadcrumb="LANÇAMENTOS"
          title="Movimentação do banco"
          subtitle={subtitle}
          mb={0}
          rightContent={
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={onMesPrev} style={arrowBtn}>‹</button>
                <button
                  onClick={e => { e.stopPropagation(); setAnoCalendario(() => ano); setMostrarCalendario(v => !v) }}
                  style={{
                    fontSize: 20, fontWeight: 800, color: '#fff',
                    border: 'none', background: 'rgba(255,255,255,0.12)',
                    borderRadius: 8, padding: '4px 14px',
                    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}>
                  {NOMES_MESES[mes]} {ano}
                </button>
                <button onClick={onMesNext} style={arrowBtn}>›</button>
              </div>

              {mostrarCalendario && (
                <div
                  style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
                    background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.22)',
                    padding: 16, minWidth: 272 }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <button onClick={() => setAnoCalendario(a => a - 1)}
                      style={{ border: 'none', background: '#eff6ff', color: COR.azul, borderRadius: 6, padding: '4px 12px', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>‹</button>
                    <span style={{ fontWeight: 700, fontSize: 15, color: COR.texto }}>{anoCalendario}</span>
                    <button onClick={() => setAnoCalendario(a => a + 1)}
                      style={{ border: 'none', background: '#eff6ff', color: COR.azul, borderRadius: 6, padding: '4px 12px', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>›</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                    {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((abrev, i) => {
                      const ativo = i === mes && anoCalendario === ano
                      return (
                        <button key={i}
                          onClick={() => { onMesSelect(i, anoCalendario); setMostrarCalendario(false) }}
                          style={{ padding: '8px 4px', border: 'none', borderRadius: 8, cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: 12, fontWeight: ativo ? 700 : 500,
                            background: ativo ? COR.azul : '#f1f5f9', color: ativo ? '#fff' : COR.texto }}>
                          {abrev}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div style={{background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
      padding:'16px 20px 0',flexShrink:0}}>
      {/* Logo + avatar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.15)',
            border:'1px solid rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
              <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
              <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
            </svg>
          </div>
          <span style={{color:'#fff',fontWeight:700,fontSize:15}}>
            Compass <span style={{fontWeight:300,opacity:.75}}>One</span>
          </span>
        </div>
        <button onClick={sairDaConta} title="Sair"
          style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.2)',
            border:'none',cursor:'pointer',display:'flex',alignItems:'center',
            justifyContent:'center',color:'#fff',fontSize:13,fontWeight:700}}>
          {user?.email?.charAt(0).toUpperCase() ?? 'U'}
        </button>
      </div>
      {/* Tipo tabs */}
      <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none' as never}}>
        {([
          {v:'extrato'     as const, icon:'🏦', label:'Extrato'},
          {v:'cartao'      as const, icon:'💳', label:'Cartão'},
          {v:'dinheiro'    as const, icon:'💵', label:'Dinheiro'},
          {v:'consolidado' as const, icon:'📊', label:'Total'},
        ]).map(({v,icon,label}) => {
          const ativo = tabPrincipal === v
          return (
            <button key={v} onClick={() => {
              setTabPrincipal(v)
              setMobileDiaForm(null)
              if (v==='extrato') {
                const p = contasExtrato.find(c => c.preferida)
                setContaId((p ?? contasExtrato[0])?.id ?? '')
              }
            }} style={{
              display:'flex',flexDirection:'column',alignItems:'center',gap:4,
              padding:'8px 16px',borderRadius:'12px 12px 0 0',
              cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
              border:'none',background:ativo?'rgba(255,255,255,.15)':'transparent',
            }}>
              <span style={{fontSize:18}}>{icon}</span>
              <span style={{fontSize:10,fontWeight:600,color:ativo?'#fff':'rgba(255,255,255,.6)'}}>{label}</span>
              <span style={{width:4,height:4,borderRadius:'50%',background:'#fff',
                opacity:ativo?1:0,marginTop:2}}/>
            </button>
          )
        })}
      </div>
    </div>
  )
}
