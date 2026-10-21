import PageHeader from '../PageHeader'
import { NORTE_ATIVO } from '../../utils/norteAtivo'
import { COR, EmBreve, inputSt } from './CfgShared'
import CfgCenarioPrevisao from './CfgCenarioPrevisao'
import type { CenarioPrevisao } from '../../utils/saldoConta'

interface Props {
  cenarioPrevisao: CenarioPrevisao
  setCenarioPrevisao: (v: CenarioPrevisao) => void
  navigate: (path: string, options?: { state?: unknown }) => void
}

export default function CfgPreferencias({
  cenarioPrevisao, setCenarioPrevisao,
  navigate,
}: Props) {
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'center', padding:'0 0 28px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:500 }}>

        <PageHeader
          icon="ti-adjustments"
          breadcrumb="CONTA"
          ajuda="configuracoes"
          title="Preferências"
          subtitle="Personalize o app"
        />

        <CfgCenarioPrevisao
          cenarioPrevisao={cenarioPrevisao}
          setCenarioPrevisao={setCenarioPrevisao}
        />

        {/* Card: Exibição */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:'0 0 16px' }}>Exibição</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            <div style={{ opacity:.6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <label style={{ fontSize:11, fontWeight:600, color:COR.textoSuave,
                  textTransform:'uppercase', letterSpacing:.5 }}>Moeda padrão</label>
                <EmBreve />
              </div>
              <select disabled defaultValue="BRL" style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }}>
                <option value="BRL">🇧🇷 Real Brasileiro (R$)</option>
                <option value="USD">🇺🇸 Dólar Americano ($)</option>
                <option value="EUR">🇪🇺 Euro (€)</option>
              </select>
            </div>

            <div style={{ opacity:.6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <label style={{ fontSize:11, fontWeight:600, color:COR.textoSuave,
                  textTransform:'uppercase', letterSpacing:.5 }}>Casas decimais</label>
                <EmBreve />
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {([['2','R$ 1.500,00'],['0','R$ 1.500']] as const).map(([v,l]) => (
                  <button disabled key={v} style={{ flex:1, padding:'7px 0', fontFamily:'inherit',
                    border:`1.5px solid ${v==='2' ? COR.azul : COR.borda}`, borderRadius:8,
                    cursor:'not-allowed', fontSize:12, fontWeight:500,
                    background: v==='2' ? '#eff6ff' : COR.branco,
                    color: v==='2' ? COR.azul : COR.textoSuave }}>{l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card: Ciclo financeiro */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24, opacity:.6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>Ciclo financeiro</h3>
            <EmBreve />
          </div>
          <label style={{ display:'block', fontSize:11, fontWeight:600,
            color:COR.textoSuave, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
            Dia de início do mês
          </label>
          <select disabled defaultValue="1" style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>Dia {d}</option>
            ))}
          </select>
          <div style={{ fontSize:10, color:'#94a3b8', marginTop:5 }}>
            Define quando começa o ciclo mensal para relatórios e dashboards.
          </div>
        </div>

        {/* Card: Alertas de saldo */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24, opacity:.6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>Alertas de saldo</h3>
            <EmBreve />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 14px', borderRadius:10, background:'#f8fafc', border:`1px solid ${COR.borda}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:COR.texto }}>Alertar quando saldo abaixo de</div>
                <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>Destaca em vermelho no dashboard</div>
              </div>
              <div style={{ width:36, height:20, borderRadius:10, background:'#cbd5e1',
                position:'relative', cursor:'not-allowed', flexShrink:0 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff',
                  position:'absolute', top:2, left:2, boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
              </div>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600,
                color:COR.textoSuave, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                Valor mínimo
              </label>
              <input disabled type="text" defaultValue="R$ 1.000,00"
                style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }} />
            </div>
          </div>
        </div>

        {/* Card: Planejamento — funcional */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:'0 0 16px' }}>Planejamento</h3>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 14px', borderRadius:10, background:'#fff5f5',
            border:'1px solid #fecaca' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}><i aria-hidden className="ti ti-refresh" style={{ fontSize: 15, verticalAlign: '-2px', marginRight: 6 }} />Refazer planejamento</div>
              <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                Apaga o plano de {new Date().getFullYear()} e abre o assistente do zero.
              </div>
            </div>
            <button onClick={() => navigate('/wizard-planejamento', { state: { refazer: true } })} style={{
              padding:'7px 14px', border:'none', borderRadius:8, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
              background:'#dc2626', color:'#fff' }}>
              Refazer
            </button>
          </div>
        </div>

        {/* Card: Ajuda. Os tutoriais que abriam sozinhos saíram em 11/10/2026:
            a explicação de cada tela fica no "?" do cabeçalho, e o Norte
            responde dúvidas de uso (utils/ajudaDasTelas). O "Rever
            boas-vindas" saiu junto — ele reabria o cadastro inicial, e
            confirmar as categorias de novo desativava as que não estavam
            entre as sugeridas. */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:'0 0 16px' }}>Ajuda</h3>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
            padding:'12px 14px', borderRadius:10, background:'#f8faff',
            border:`1px solid ${COR.borda}` }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}><i aria-hidden className="ti ti-compass" style={{ fontSize: 15, verticalAlign: '-2px', marginRight: 6 }} />Dúvida sobre uma tela?</div>
              <div style={{ fontSize:12, color:COR.textoSuave, marginTop:2 }}>
                Toque no "?" do cabeçalho de cada tela{NORTE_ATIVO ? ', ou pergunte ao Norte como fazer' : ''}.
              </div>
            </div>
            {NORTE_ATIVO && <button onClick={() => navigate('/norte')} style={{
              padding:'7px 14px', border:'none', borderRadius:8, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
              background:COR.azul, color:'#fff' }}>
              Abrir o Norte
            </button>}
          </div>
        </div>

      </div>
      </div>
    </div>
  )
}
