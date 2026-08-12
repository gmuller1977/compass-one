import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR, fmt, barCor, type Lanc } from './AcShared'

export interface AcCatRowProps {
  uid: string
  nome: string
  descricao?: string
  prev: number
  realBanc: number
  realCart: number
  lancamentos: Lanc[]
  isEntrada?: boolean
  aberto: boolean
  toggleAberto: (uid: string) => void
  isMobile: boolean
  mes: number
  categorias: Categoria[]
}

export default function AcCatRow({
  uid, nome, descricao, prev, realBanc, realCart, lancamentos,
  isEntrada, aberto, toggleAberto, isMobile, mes, categorias,
}: AcCatRowProps) {
  const { icone, cor: corIcone } = iconeCategoria(categorias, nome)
  const lancAbs    = realBanc + realCart
  const disponivel = prev - lancAbs
  const perc       = prev > 0 ? lancAbs / prev : (lancAbs > 0 ? 1 : 0)
  const bc         = barCor(perc, isEntrada)

  const realColor = isEntrada
    ? (lancAbs > 0 ? COR.verde : '#94a3b8')
    : (lancAbs === 0 ? '#94a3b8' : (lancAbs <= prev || prev === 0) ? COR.azul : COR.vermelho)
  const realBg = isEntrada
    ? (lancAbs > 0 ? '#f0fdf4' : '#f8faff')
    : (lancAbs === 0 ? '#f8faff' : (lancAbs <= prev || prev === 0) ? '#eff6ff' : '#fff1f2')
  const realBd = isEntrada
    ? (lancAbs > 0 ? '#bbf7d0' : COR.borda)
    : (lancAbs === 0 ? COR.borda : (lancAbs <= prev || prev === 0) ? '#bfdbfe' : '#fecdd3')

  const dispColor = (prev === 0 && lancAbs === 0) ? '#94a3b8'
    : isEntrada ? (disponivel > 0 ? COR.verde : '#94a3b8')
    : (disponivel >= 0 ? COR.verde : COR.vermelho)
  const dispBg = (prev === 0 && lancAbs === 0) ? '#f8faff'
    : isEntrada ? (disponivel > 0 ? '#f0fdf4' : '#f8faff')
    : (disponivel >= 0 ? '#f0fdf4' : '#fff1f2')
  const dispBd = (prev === 0 && lancAbs === 0) ? COR.borda
    : isEntrada ? (disponivel > 0 ? '#bbf7d0' : COR.borda)
    : (disponivel >= 0 ? '#bbf7d0' : '#fecdd3')

  return (
    <div style={{borderBottom:`1px solid ${COR.borda}`}}>
      {/* Linha */}
      <div onClick={() => toggleAberto(uid)}
        style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
          cursor:'pointer',background:aberto?'#f8faff':'transparent',transition:'background .15s'}}>
        {/* Ícone + nome */}
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
          <div style={{width:30,height:30,borderRadius:8,background:corIcone,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{icone}</div>
          <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
            <span style={{fontSize:13,fontWeight:600,color:COR.texto,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nome}</span>
            {descricao && (
              <span style={{fontSize:10,color:COR.textoSuave,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{descricao}</span>
            )}
          </div>
        </div>

        {isMobile ? (
          /* Mobile: só disponível */
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,
            padding:'5px 10px',borderRadius:8,minWidth:90,
            background:dispBg,border:`1px solid ${dispBd}`}}>
            <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
              letterSpacing:.4,marginBottom:1,color:dispColor}}>{isEntrada ? 'A receber' : 'Disponível'}</span>
            <span style={{fontSize:13,fontWeight:700,color:dispColor,
              fontVariantNumeric:'tabular-nums'}}>
              {(prev===0&&lancAbs===0)?'—':fmt(disponivel)}
            </span>
          </div>
        ) : (
          /* Desktop: três caixinhas separadas */
          <div style={{display:'flex',gap:6,flexShrink:0}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'5px 10px',borderRadius:8,minWidth:90,
              background:'#f8faff',border:`1px solid ${COR.borda}`}}>
              <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Previsto</span>
              <span style={{fontSize:13,fontWeight:700,color:COR.textoSuave,
                fontVariantNumeric:'tabular-nums'}}>
                {prev > 0 ? fmt(prev) : '—'}
              </span>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'5px 10px',borderRadius:8,minWidth:90,
              background:realBg,border:`1px solid ${realBd}`}}>
              <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,color:realColor}}>Realizado</span>
              <span style={{fontSize:13,fontWeight:700,color:realColor,
                fontVariantNumeric:'tabular-nums'}}>
                {lancAbs > 0 ? fmt(lancAbs) : '—'}
              </span>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'5px 10px',borderRadius:8,minWidth:90,
              background:dispBg,border:`1px solid ${dispBd}`}}>
              <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,color:dispColor}}>Disponível</span>
              <span style={{fontSize:13,fontWeight:700,color:dispColor,
                fontVariantNumeric:'tabular-nums'}}>
                {(prev===0&&lancAbs===0)?'—':fmt(disponivel)}
              </span>
            </div>
          </div>
        )}
        {/* Chevron */}
        <div style={{flexShrink:0,fontSize:12,color:COR.textoSuave,width:16,textAlign:'center',
          transform:aberto?'rotate(180deg)':'rotate(0deg)',transition:'transform .15s'}}>⌄</div>
      </div>

      {/* Barra de progresso */}
      {(prev > 0 || lancAbs > 0) && (
        <div style={{padding:'0 12px 6px'}}>
          <div style={{background:'#e9edf2',borderRadius:99,height:3,overflow:'hidden'}}>
            <div style={{width:`${Math.min(perc*100,100)}%`,height:3,borderRadius:99,
              background:bc,transition:'width .3s'}}/>
          </div>
        </div>
      )}

      {/* Expansão: lançamentos em 3 colunas */}
      {aberto && (() => {
        const banco    = lancamentos.filter(l => l.fonte === 'banco')
        const cartao   = lancamentos.filter(l => l.fonte === 'cartao')
        const dinheiro = lancamentos.filter(l => l.fonte === 'dinheiro')
        const colunas = [
          { label:'🏦 Banco',    itens: banco    },
          { label:'💳 Cartão',   itens: cartao   },
          { label:'💵 Dinheiro', itens: dinheiro },
        ].filter(c => c.itens.length > 0)
        return (
          <div style={{background:'#f8faff',borderTop:`1px solid ${COR.borda}`,
            padding:'10px 12px 12px'}}>
            {/* Mobile: Previsto + Realizado no topo do detalhe */}
            {isMobile && (
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                  padding:'6px 8px',borderRadius:8,
                  background:'#f8faff',border:`1px solid ${COR.borda}`}}>
                  <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                    letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Previsto</span>
                  <span style={{fontSize:14,fontWeight:700,color:COR.textoSuave,
                    fontVariantNumeric:'tabular-nums'}}>
                    {prev > 0 ? fmt(prev) : '—'}
                  </span>
                </div>
                <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                  padding:'6px 8px',borderRadius:8,
                  background:realBg,border:`1px solid ${realBd}`}}>
                  <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                    letterSpacing:.4,marginBottom:1,color:realColor}}>Realizado</span>
                  <span style={{fontSize:14,fontWeight:700,color:realColor,
                    fontVariantNumeric:'tabular-nums'}}>
                    {lancAbs > 0 ? fmt(lancAbs) : '—'}
                  </span>
                </div>
              </div>
            )}
            {colunas.length === 0 ? (
              <div style={{textAlign:'center',color:COR.textoSuave,fontSize:12}}>
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div style={{display:'grid',
                gridTemplateColumns:`repeat(${colunas.length}, 1fr)`,gap:10}}>
                {colunas.map(col => (
                  <div key={col.label}>
                    <div style={{fontSize:10,fontWeight:700,color:COR.textoSuave,
                      textTransform:'uppercase',letterSpacing:.5,
                      marginBottom:6,padding:'2px 0'}}>
                      {col.label}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:3}}>
                      {col.itens.map((l,i) => (
                        <div key={i} style={{padding:'5px 8px',borderRadius:8,
                          background:COR.branco,border:`1px solid ${COR.borda}`,
                          display:'flex',flexDirection:'column',gap:1}}>
                          <div style={{display:'flex',justifyContent:'space-between',gap:6}}>
                            <span style={{fontSize:10,color:COR.textoSuave,flexShrink:0}}>
                              {String(l.dia).padStart(2,'0')}/{String(mes+1).padStart(2,'0')}
                            </span>
                            <span style={{fontSize:11,fontWeight:700,
                              color:isEntrada?COR.verde:COR.texto,
                              fontVariantNumeric:'tabular-nums',flexShrink:0}}>
                              {fmt(l.valor)}
                            </span>
                          </div>
                          <div style={{fontSize:11,color:COR.texto,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {l.descricao || nome}
                          </div>
                          {l.sub && (
                            <div style={{fontSize:9,color:COR.textoSuave}}>{l.sub}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
