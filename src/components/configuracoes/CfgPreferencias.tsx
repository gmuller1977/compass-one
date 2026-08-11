import { reativarTutoriais } from '../TutorialCard'
import PageHeader from '../PageHeader'
import { COR, EmBreve, inputSt } from './CfgShared'

interface Props {
  desvioMinPerc: number
  setDesvioMinPerc: (v: number) => void
  percentualAlerta: number
  setPercentualAlerta: (v: number) => void
  metodoSugestao: string
  setMetodoSugestao: (v: string) => void
  planejamentoLockado: boolean
  setPlanejamentoLockado: (v: boolean) => void
  setOnboardingCompleto: (v: boolean) => void
  navigate: (path: string, options?: { state?: unknown }) => void
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function CfgPreferencias({
  desvioMinPerc, setDesvioMinPerc,
  percentualAlerta, setPercentualAlerta,
  metodoSugestao, setMetodoSugestao,
  planejamentoLockado, setPlanejamentoLockado,
  setOnboardingCompleto,
  navigate, toast,
}: Props) {
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'center', padding:'0 0 28px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:500 }}>

        <PageHeader
          icon="ti-adjustments"
          breadcrumb="CONTA"
          title="Preferências"
          subtitle="Personalize o app"
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
                    border:`1.5px solid ${v==='2' ? COR.azul : COR.borda}`, borderRadius:7,
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
              padding:'10px 14px', borderRadius:9, background:'#f8fafc', border:`1px solid ${COR.borda}` }}>
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

          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:COR.textoSuave,
              textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
              Sensibilidade — Revisão por Desvio
            </label>
            <div style={{ display:'flex', gap:6 }}>
              {[5, 10, 15, 20].map(p => (
                <button key={p} onClick={() => setDesvioMinPerc(p)}
                  style={{ flex:1, padding:'7px 0', fontFamily:'inherit', fontSize:12, fontWeight:500,
                    border:`1.5px solid ${desvioMinPerc === p ? '#2563eb' : COR.borda}`, borderRadius:7,
                    cursor:'pointer', background: desvioMinPerc === p ? '#eff6ff' : COR.branco,
                    color: desvioMinPerc === p ? '#2563eb' : COR.textoSuave }}>
                  {p}%
                </button>
              ))}
            </div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:5 }}>
              Categorias com desvio acima deste % entre previsto e realizado aparecem na revisão.
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:COR.textoSuave,
              textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
              Tolerância de Alerta — Lançamento
            </label>
            <div style={{ display:'flex', gap:6 }}>
              {[5, 10, 15, 20].map(p => (
                <button key={p} onClick={() => setPercentualAlerta(p)}
                  style={{ flex:1, padding:'7px 0', fontFamily:'inherit', fontSize:12, fontWeight:500,
                    border:`1.5px solid ${percentualAlerta === p ? '#2563eb' : COR.borda}`, borderRadius:7,
                    cursor:'pointer', background: percentualAlerta === p ? '#eff6ff' : COR.branco,
                    color: percentualAlerta === p ? '#2563eb' : COR.textoSuave }}>
                  {p}%
                </button>
              ))}
            </div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:5 }}>
              Alerta aparece ao lançar uma despesa que ultrapassa este % acima do planejado.
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:COR.textoSuave,
              textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
              Método de Sugestão — Revisão Mensal
            </label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const }}>
              {[
                { id:'media_3_meses', label:'Média 3 meses' },
                { id:'maior_valor',   label:'Maior valor'   },
                { id:'mes_mais_margem', label:'Mês + margem 5%' },
              ].map(m => (
                <button key={m.id} onClick={() => setMetodoSugestao(m.id)}
                  style={{ flex:1, minWidth:100, padding:'7px 8px', fontFamily:'inherit', fontSize:11, fontWeight:500,
                    border:`1.5px solid ${metodoSugestao === m.id ? '#2563eb' : COR.borda}`, borderRadius:7,
                    cursor:'pointer', background: metodoSugestao === m.id ? '#eff6ff' : COR.branco,
                    color: metodoSugestao === m.id ? '#2563eb' : COR.textoSuave }}>
                  {m.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:5 }}>
              Como calcular o valor sugerido de cada categoria na Revisão Mensal.
            </div>
          </div>

          <div style={{ height:1, background:COR.borda, margin:'0 0 16px' }} />

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 14px', borderRadius:9,
            background: planejamentoLockado ? '#fff7ed' : '#f0fdf4',
            border:`1px solid ${planejamentoLockado ? '#fed7aa' : '#bbf7d0'}` }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>
                {planejamentoLockado ? '🔒 Planejamento bloqueado' : '🔓 Planejamento desbloqueado'}
              </div>
              <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                {planejamentoLockado
                  ? 'Desbloqueie para editar o previsto, o real ou refinalizar.'
                  : 'Edição livre. Finalize o planejamento para bloqueá-lo novamente.'}
              </div>
            </div>
            <button onClick={() => setPlanejamentoLockado(!planejamentoLockado)} style={{
              padding:'7px 14px', border:'none', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
              background: planejamentoLockado ? '#ea580c' : '#16a34a', color:'#fff' }}>
              {planejamentoLockado ? 'Desbloquear' : 'Bloquear'}
            </button>
          </div>

          <div style={{ height:1, background:COR.borda, margin:'16px 0' }} />

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 14px', borderRadius:9, background:'#fff5f5',
            border:'1px solid #fecaca' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>🔄 Refazer planejamento</div>
              <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                Apaga o plano de {new Date().getFullYear()} e abre o assistente do zero.
              </div>
            </div>
            <button onClick={() => navigate('/wizard-planejamento', { state: { refazer: true } })} style={{
              padding:'7px 14px', border:'none', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
              background:'#dc2626', color:'#fff' }}>
              Refazer
            </button>
          </div>
        </div>

        {/* Card: Tutoriais */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:'0 0 16px' }}>Tutoriais</h3>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 14px', borderRadius:9, background:'#f0f9ff',
            border:'1px solid #bae6fd', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>💡 Reativar tutoriais das telas</div>
              <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                Faz os cards de dica aparecerem novamente em cada tela.
              </div>
            </div>
            <button onClick={() => { reativarTutoriais(); toast('Tutoriais reativados!') }} style={{
              padding:'7px 14px', border:'none', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
              background:'#0284c7', color:'#fff' }}>
              Reativar
            </button>
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 14px', borderRadius:9, background:'#f8faff',
            border:`1px solid ${COR.borda}` }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>🧭 Rever boas-vindas</div>
              <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                Volta à tela de introdução com os slides iniciais.
              </div>
            </div>
            <button onClick={() => { setOnboardingCompleto(false); toast('Boas-vindas reativadas!') }} style={{
              padding:'7px 14px', border:'none', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
              background:COR.azul, color:'#fff' }}>
              Rever
            </button>
          </div>
        </div>

      </div>
      </div>
    </div>
  )
}
