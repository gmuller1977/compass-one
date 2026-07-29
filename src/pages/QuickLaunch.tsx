import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'
import type { DadosMes } from '../context/AppContext'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', verde: '#16a34a', vermelho: '#dc2626',
  texto: '#0f172a', textoSuave: '#64748b', borda: '#e2e8f0',
}

function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(s: string) {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

function NOMES_MESES_SHORT() {
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
}

const NOMES_DIA = ['dom','seg','ter','qua','qui','sex','sáb']

export default function QuickLaunch() {
  const { user, contas, categorias, extratoData, updateExtratoMes, setCategorias } = useApp()
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()

  // Desktop: redireciona para Dashboard
  useEffect(() => {
    if (!isMobile) navigate('/dashboard', { replace: true })
  }, [isMobile, navigate])

  const hoje = new Date()
  const ano  = hoje.getFullYear()
  const mes  = hoje.getMonth()
  const dia  = hoje.getDate()

  const [contaIdx, setContaIdx] = useState(0)
  const [catSel, setCatSel] = useState<string | null>(null)
  const [tipoSel, setTipoSel] = useState<'saida' | 'entrada'>('saida')
  const [valor, setValor]   = useState('')
  const [desc,  setDesc]    = useState('')
  const [feedback, setFeedback] = useState(false)

  // Gerenciamento do grid
  const [gerenciar, setGerenciar] = useState(false)
  const [pinLocal, setPinLocal]   = useState<Set<string>>(new Set())

  const valorRef = useRef<HTMLInputElement>(null)

  const contasBanco = useMemo(
    () => contas.filter(c => c.tipo !== 'cartao'),
    [contas]
  )
  const contaSel = contasBanco[contaIdx % Math.max(1, contasBanco.length)]

  const key = contaSel ? mesKey(contaSel.id, ano, mes) : ''
  const mesDados: DadosMes = (extratoData as Record<string, DadosMes>)[key] ?? {
    lancamentos: {}, saldoBanco: '0',
  }

  const saldoAtual = useMemo(() => {
    if (!contaSel) return 0
    if (mesDados.saldoBanco && mesDados.saldoBanco !== '0') {
      return parseBRL(mesDados.saldoBanco)
    }
    let base = contaSel.saldoInicial
    Object.entries(mesDados.lancamentos).forEach(([d, lcs]) => {
      if (Number(d) <= dia) {
        lcs.forEach(l => { base += l.tipo === 'entrada' ? l.valor : -l.valor })
      }
    })
    return base
  }, [contaSel, mesDados, dia])

  const gastosHoje = useMemo(() => {
    const lcsHoje = mesDados.lancamentos[dia] ?? []
    return lcsHoje.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  }, [mesDados, dia])

  // Categorias variáveis (não fixas) para o gerenciador
  const catsVariaveis = useMemo(
    () => categorias.filter(c => !c.fixa),
    [categorias]
  )

  // Se alguma categoria tem pinQuick definido, usa-o; senão mostra todas variáveis ativas
  const hasAnyPin = useMemo(
    () => categorias.some(c => c.pinQuick === true),
    [categorias]
  )

  const catsGrid = useMemo(() => {
    if (hasAnyPin) return categorias.filter(c => c.ativa && c.pinQuick === true)
    return categorias.filter(c => c.ativa && !c.fixa)
  }, [categorias, hasAnyPin])

  function abrirGerenciar() {
    if (hasAnyPin) {
      setPinLocal(new Set(categorias.filter(c => c.pinQuick === true).map(c => c.id)))
    } else {
      // Inicializa com todas as variáveis ativas selecionadas
      setPinLocal(new Set(categorias.filter(c => c.ativa && !c.fixa).map(c => c.id)))
    }
    setGerenciar(true)
  }

  function toggleLocal(catId: string) {
    setPinLocal(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  function salvarPins() {
    setCategorias(prev => prev.map(c => ({ ...c, pinQuick: pinLocal.has(c.id) })))
    setGerenciar(false)
  }

  function ultimoValorCat(catNome: string): number | null {
    const keys = Object.keys(extratoData as Record<string, DadosMes>)
    let max = 0
    for (const k of keys) {
      const d = (extratoData as Record<string, DadosMes>)[k]
      Object.values(d.lancamentos ?? {}).forEach(lcs => {
        lcs.forEach(l => {
          if (l.categoria === catNome && l.valor > max) max = l.valor
        })
      })
    }
    return max > 0 ? max : null
  }

  function abrirCat(c: typeof catsGrid[0]) {
    setCatSel(c.nome)
    setTipoSel(c.tipo)
    setValor('')
    setDesc('')
    setTimeout(() => valorRef.current?.focus(), 80)
  }

  function fecharInput() {
    setCatSel(null)
    setValor('')
    setDesc('')
  }

  function registrar() {
    const v = parseBRL(valor)
    if (!catSel || v <= 0 || !contaSel) return

    const cat = categorias.find(c => c.nome === catSel)
    const fp = cat?.formaPagamento ?? (tipoSel === 'saida' ? 'debito' : 'dinheiro')

    updateExtratoMes(key, prev => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [dia]: [...(prev.lancamentos[dia] ?? []), {
          id: `v-${Date.now()}`,
          tipo: tipoSel,
          descricao: desc.trim() || catSel,
          categoria: catSel,
          valor: v,
          formaPagamento: (fp as 'debito' | 'pix' | 'transferencia' | 'dinheiro'),
          tipoLanc: 'variavel' as const,
          consolidado: true,
        }],
      },
    }))

    setFeedback(true)
    fecharInput()
    setTimeout(() => setFeedback(false), 2000)
  }

  const dataHoje = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const nomeUser = user?.email?.split('@')[0] ?? 'Usuário'
  const inicial  = nomeUser.charAt(0).toUpperCase()

  const mesStr = `${NOMES_MESES_SHORT()[mes]}/${ano}`

  return (
    <div style={{
      minHeight: '100vh', background: COR.fundo,
      display: 'flex', flexDirection: 'column',
      fontFamily: "-apple-system,'Inter',sans-serif",
      paddingBottom: 80,
    }}>

      {/* Header gradient */}
      <div style={{
        background: `linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
        padding: '52px 20px 32px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginBottom: 2 }}>Bom dia,</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{nomeUser} 👋</div>
            <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, marginTop: 3 }}>
              {dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)} · {mesStr}
            </div>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 15, fontWeight: 700,
          }}>{inicial}</div>
        </div>
      </div>

      {/* Conta card */}
      {contaSel && (
        <div
          onClick={() => setContaIdx(i => (i + 1) % contasBanco.length)}
          style={{
            margin: '0 16px', marginTop: -18,
            background: '#fff', borderRadius: 18, padding: '14px 16px',
            boxShadow: '0 6px 24px rgba(0,0,0,.12)',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: contasBanco.length > 1 ? 'pointer' : 'default',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 11, background: contaSel.cor || COR.azul,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>{contaSel.icone || '🏦'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COR.textoSuave, fontWeight: 500 }}>{contaSel.nome}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: COR.texto, letterSpacing: '-.5px' }}>
              {fmt(saldoAtual)}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{contaSel.banco}</div>
          </div>
          {contasBanco.length > 1 && (
            <div style={{
              fontSize: 11, color: COR.azul, background: '#eff6ff',
              padding: '5px 10px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap',
            }}>trocar ↕</div>
          )}
        </div>
      )}

      {/* Hoje strip */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 6px', flexShrink: 0 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 11, padding: '8px 10px', border: `1px solid ${COR.borda}` }}>
          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Gastos hoje</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: gastosHoje > 0 ? COR.vermelho : COR.textoSuave }}>
            {fmt(gastosHoje)}
          </div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 11, padding: '8px 10px', border: `1px solid ${COR.borda}` }}>
          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Mês atual</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: COR.azul }}>{mesStr}</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 11, padding: '8px 10px', border: `1px solid ${COR.borda}` }}>
          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Dia</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: COR.texto }}>
            {NOMES_DIA[hoje.getDay()]} {dia}
          </div>
        </div>
      </div>

      {/* Grid de categorias */}
      <div style={{ flex: 1, padding: '4px 16px 6px', overflowY: 'auto' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: COR.textoSuave,
          textTransform: 'uppercase', letterSpacing: '.5px',
          marginBottom: 10, marginTop: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⚡ Lançamento rápido</span>
          <button
            onClick={abrirGerenciar}
            style={{
              border: `1px solid ${COR.borda}`, background: '#fff', color: COR.azul,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              borderRadius: 20, padding: '4px 10px',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >✏️ Editar</button>
        </div>

        {catsGrid.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ color: COR.textoSuave, fontSize: 13, marginBottom: 12 }}>
              Nenhuma categoria no lançamento rápido.
            </div>
            <button
              onClick={abrirGerenciar}
              style={{
                border: 'none', borderRadius: 12, padding: '10px 20px',
                background: COR.azul, color: '#fff', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Adicionar categorias</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
            {catsGrid.map(c => {
              const ult = ultimoValorCat(c.nome)
              const active = catSel === c.nome
              return (
                <button
                  key={c.id}
                  onClick={() => catSel === c.nome ? fecharInput() : abrirCat(c)}
                  style={{
                    background: active ? '#eff6ff' : '#fff',
                    border: `2px solid ${active ? COR.azul : COR.borda}`,
                    borderRadius: 14, padding: '13px 8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    cursor: 'pointer',
                    transform: active ? 'scale(.95)' : undefined,
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{c.icone}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: COR.texto, textAlign: 'center', lineHeight: 1.2 }}>
                    {c.nome}
                  </span>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>
                    {ult ? `últ. ${fmt(ult)}` : c.tipo}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Input rápido — slide-up */}
      {catSel && (
        <div style={{
          background: '#fff', borderTop: `2px solid ${COR.azul}`,
          padding: '12px 16px 8px', flexShrink: 0,
          animation: 'slideUp .2s ease',
        }}>
          <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}`}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {categorias.find(c => c.nome === catSel)?.icone ?? '💰'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>{catSel}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                {tipoSel === 'saida' ? 'Saída' : 'Entrada'} · {contaSel?.nome} · {tipoSel === 'saida' ? 'Débito' : 'Crédito'}
              </div>
            </div>
            <button
              onClick={fecharInput}
              style={{ marginLeft: 'auto', border: 'none', background: 'transparent', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 4 }}
            >✕</button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              ref={valorRef}
              value={valor}
              onChange={e => setValor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && registrar()}
              placeholder="R$ 0,00"
              inputMode="decimal"
              style={{
                flex: '1.2', border: `2px solid ${COR.azul}`, borderRadius: 12,
                padding: '10px 12px', fontSize: 20, fontWeight: 700,
                color: COR.azul, background: '#eff6ff', outline: 'none',
                fontFamily: 'inherit', textAlign: 'center',
              }}
            />
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && registrar()}
              placeholder="Descrição (opcional)"
              style={{
                flex: 1, border: `1.5px solid ${COR.borda}`, borderRadius: 12,
                padding: '10px 12px', fontSize: 13, color: COR.texto,
                background: '#f8fafc', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            onClick={registrar}
            style={{
              width: '100%', padding: 13, border: 'none', borderRadius: 13,
              background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >✓ Registrar lançamento</button>
        </div>
      )}

      {/* Feedback toast */}
      {feedback && (
        <div style={{
          position: 'fixed', top: '45%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: COR.verde, color: '#fff', borderRadius: 16,
          padding: '14px 24px', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 200, boxShadow: '0 8px 30px rgba(22,163,74,.4)',
          whiteSpace: 'nowrap',
        }}>
          ✓ Lançamento registrado!
        </div>
      )}

      {/* Bottom sheet: gerenciar categorias do grid */}
      {gerenciar && (
        <>
          <div
            onClick={() => setGerenciar(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 110,
            }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 111,
            background: '#fff', borderRadius: '20px 20px 0 0',
            maxHeight: '82vh', display: 'flex', flexDirection: 'column',
            animation: 'slideUp .25s ease',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }}/>
            </div>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '12px 20px 14px',
              borderBottom: `1px solid ${COR.borda}`,
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COR.texto }}>
                  Categorias no Início
                </div>
                <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 3 }}>
                  Categorias variáveis disponíveis no lançamento rápido
                </div>
              </div>
              <button
                onClick={() => setGerenciar(false)}
                style={{
                  border: 'none', background: 'transparent',
                  fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 4, flexShrink: 0,
                }}
              >✕</button>
            </div>

            {/* Lista */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {catsVariaveis.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: COR.textoSuave, fontSize: 13 }}>
                  Nenhuma categoria variável cadastrada.
                </div>
              ) : (
                ['saida', 'entrada'].map(tipo => {
                  const cats = catsVariaveis.filter(c => c.tipo === tipo)
                  if (cats.length === 0) return null
                  return (
                    <div key={tipo}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: COR.textoSuave,
                        textTransform: 'uppercase', letterSpacing: '.5px',
                        padding: '12px 20px 6px',
                        background: '#f8fafc',
                      }}>
                        {tipo === 'saida' ? '📤 Saídas' : '📥 Entradas'}
                      </div>
                      {cats.map(c => {
                        const ativo = pinLocal.has(c.id)
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleLocal(c.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '12px 20px', cursor: 'pointer',
                              borderBottom: `1px solid ${COR.borda}`,
                              background: ativo ? '#f0f7ff' : '#fff',
                              transition: 'background .15s',
                            }}
                          >
                            <span style={{ fontSize: 24, opacity: c.ativa ? 1 : .4, flexShrink: 0 }}>
                              {c.icone}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 14, fontWeight: 600,
                                color: c.ativa ? COR.texto : '#94a3b8',
                              }}>
                                {c.nome}
                              </div>
                              {!c.ativa && (
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                                  inativa
                                </div>
                              )}
                            </div>
                            {/* Toggle */}
                            <div style={{
                              width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                              background: ativo ? COR.azul : '#e2e8f0',
                              position: 'relative', transition: 'background .2s',
                            }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: 2,
                                left: ativo ? 22 : 2, transition: 'left .2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                              }}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px 20px',
              borderTop: `1px solid ${COR.borda}`,
            }}>
              <div style={{ fontSize: 11, color: COR.textoSuave, textAlign: 'center', marginBottom: 10 }}>
                {pinLocal.size} categoria{pinLocal.size !== 1 ? 's' : ''} selecionada{pinLocal.size !== 1 ? 's' : ''}
              </div>
              <button
                onClick={salvarPins}
                style={{
                  width: '100%', padding: '13px', border: 'none', borderRadius: 13,
                  background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
