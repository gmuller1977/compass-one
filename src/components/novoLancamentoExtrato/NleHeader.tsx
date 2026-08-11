import type { User } from '@supabase/supabase-js'
import type { Conta } from '../../context/AppContext'
import { COR } from './NleShared'

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
}

export default function NleHeader({
  isMobile, user, sairDaConta,
  tabPrincipal, setTabPrincipal,
  contasExtrato, setContaId, setMobileDiaForm,
}: Props) {
  if (!isMobile) return null

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
