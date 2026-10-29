import type { Conta } from '../../context/AppContext'
import { COR, fmt, type DadosMes } from './NleShared'
import { iconeDesenhado } from '../../utils/iconeDesenhado'
import { textoConferido } from '../../utils/conferirSaldos'
import { mascaraCentavos } from '../../utils/moeda'

type TabPrincipal = 'extrato' | 'cartao' | 'dinheiro' | 'consolidado'

type ModalSaldoInfo = {
  contaId: string; banco: string; icone: string; cor: string; key: string
}

type Props = {
  isMobile: boolean
  tabPrincipal: TabPrincipal

  // Sub-header
  contasExtrato: Conta[]
  contaIdEfetivo: string
  dados: Record<string, DadosMes>
  hojeStr: string
  mes: number
  ano: number
  mesNome: string
  setContaId: (id: string) => void
  setModalSaldo: (v: ModalSaldoInfo | null) => void
  setModalSaldoValor: (v: string) => void
  mesKey: (conta: string, ano: number, mes: number) => string
  saldoSugerido: Record<string, string>

  // Saldo card
  isDinheiro: boolean
  contaInfo: Conta | undefined
  mesDados: DadosMes
  saldoMes: number
  diferenca: number | null
  conciliado: boolean
  /** Data em que o saldo foi conferido sem valor digitado ("Confere"), ou null. */
  conferidoEm: string | null
  chaveAtual: string
  /** Abre a janela de importar o extrato (só no Banco). */
  onImportar?: () => void
}

export default function NleMobileSubheader({
  isMobile, tabPrincipal,
  contasExtrato, contaIdEfetivo, mes, ano, mesNome,
  setContaId, setModalSaldo, setModalSaldoValor, saldoSugerido,
  isDinheiro, contaInfo, saldoMes, diferenca, conciliado, conferidoEm, chaveAtual, onImportar,
}: Props) {
  return (
    <>
      {/* SUB-HEADER MOBILE: continua o topo azul do NleHeader — contas em
          pílulas, o mês, e o saldo em destaque, como nos apps de banco.
          Sobre #0f2878 → #1e40af, medido no extremo claro: branco 8,72 ·
          rótulo a 75% 5,1 · #86efac 6,21 · #fdba74 5,17. */}
      {isMobile && tabPrincipal !== 'cartao' && (() => {
        const hoje = new Date()
        const ehMesAtual = mes === hoje.getMonth() && ano === hoje.getFullYear()
        const futuro = ano > hoje.getFullYear() || (ano === hoje.getFullYear() && mes > hoje.getMonth())
        const temSaldo = tabPrincipal === 'extrato' || tabPrincipal === 'dinheiro'
        const abrirSaldo = () => {
          setModalSaldoValor(isDinheiro ? '' : mascaraCentavos(saldoSugerido[contaIdEfetivo] ?? '', true))
          if (isDinheiro) setModalSaldo({contaId:'dinheiro', banco:'Dinheiro', icone:'💵', cor:COR.verde, key:chaveAtual})
          else setModalSaldo({contaId:contaIdEfetivo, banco:contaInfo?.banco??'', icone:contaInfo?.icone??'', cor:contaInfo?.cor??COR.azul, key:chaveAtual})
        }
        return (
          <div style={{background:'var(--cx-azul-continua)',
            borderRadius:'0 0 28px 28px',boxShadow:'var(--cx-brilho-topo)',padding:'12px 16px 20px',flexShrink:0,marginBottom:12}}>
            {tabPrincipal === 'extrato' && contasExtrato.length > 1 && (
              <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none' as never,marginBottom:12}}>
                {contasExtrato.map(c => {
                  const ativo = c.id === contaIdEfetivo
                  return (
                    <button key={c.id} aria-pressed={ativo} onClick={() => {
                      setContaId(c.id)
                    }} style={{
                      display:'flex',alignItems:'center',gap:6,minHeight:38,
                      padding:'0 14px',borderRadius:999,flexShrink:0,border:'none',
                      background:ativo?'#fff':'rgba(255,255,255,.14)',
                      cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit',
                      fontSize:14,fontWeight:700,color:ativo?'#1e40af':'#fff',
                    }}>
                      <i aria-hidden className={`ti ${iconeDesenhado(c.icone) ?? 'ti-building-bank'}`} style={{fontSize:16,lineHeight:1}} />{c.apelido ?? c.banco}
                    </button>
                  )
                })}
              </div>
            )}

            {temSaldo && (<>
              <div>
                <div style={{fontSize:15,color:'rgba(255,255,255,.75)'}}>
                  {ehMesAtual ? 'Saldo no Compass One' : futuro ? 'Saldo previsto' : `Fechou ${mesNome.toLowerCase()} com`}
                </div>
                <div style={{fontSize:34,fontWeight:800,letterSpacing:'-.02em',lineHeight:1.15,fontVariantNumeric:'tabular-nums',
                  color:'#fff'}}>{fmt(saldoMes)}</div>
              </div>
              {/* Conciliação: o saldo que o banco mostra × o do app. Tocar
                  abre a mesma caixa de antes para informar o saldo. */}
              <button onClick={abrirSaldo} style={{
                marginTop:14,width:'100%',display:'flex',alignItems:'center',gap:10,
                padding:'10px 14px',minHeight:48,borderRadius:16,border:'none',cursor:'pointer',
                background:'rgba(255,255,255,.12)',fontFamily:'inherit',textAlign:'left',
              }}>
                <i className={`ti ${isDinheiro ? 'ti-wallet' : 'ti-building-bank'}`} aria-hidden style={{fontSize:20,color:'#fff'}} />
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:'block',fontSize:13,color:'rgba(255,255,255,.75)'}}>
                    {isDinheiro ? 'Em dinheiro' : `No ${contaInfo?.banco ?? 'banco'}`}
                  </span>
                  <span style={{display:'block',fontSize:15,fontWeight:700,color:'#fff',fontVariantNumeric:'tabular-nums'}}>
                    {diferenca !== null ? fmt(saldoMes + diferenca) : conferidoEm ? fmt(saldoMes) : 'Informar saldo ✎'}
                  </span>
                </span>
                {diferenca === null && conferidoEm && (
                  <span style={{fontSize:13,fontWeight:700,padding:'5px 10px',borderRadius:999,whiteSpace:'nowrap',
                    background:'rgba(15,23,42,.3)',color:'#86efac'}}>
                    {textoConferido(conferidoEm)} <span aria-hidden style={{color:'rgba(255,255,255,.75)',marginLeft:2}}>✎</span>
                  </span>
                )}
                {diferenca !== null && (
                  <span style={{fontSize:13,fontWeight:700,padding:'5px 10px',borderRadius:999,whiteSpace:'nowrap',
                    background:'rgba(15,23,42,.3)',color:conciliado?'#86efac':'#fff'}}>
                    {conciliado ? '✓ igual ao Compass' : diferenca>0 ? `falta lançar ${fmt(diferenca)}` : `${fmt(-diferenca)} a mais no Compass`}
                  </span>
                )}
              </button>
              {tabPrincipal === 'extrato' && onImportar && (
                <button onClick={onImportar} style={{
                  marginTop:10,width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  minHeight:44,borderRadius:16,border:'1px solid rgba(255,255,255,.45)',cursor:'pointer',
                  background:'transparent',fontFamily:'inherit',fontSize:14,fontWeight:700,color:'#fff',
                }}>
                  <i className="ti ti-file-import" aria-hidden style={{fontSize:18}} /> Importar extrato do banco
                </button>
              )}
            </>)}
          </div>
        )
      })()}
    </>
  )
}
