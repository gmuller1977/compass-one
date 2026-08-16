import React, { useState } from 'react'
import PageHeader, { PH_BTN_SOLID } from '../PageHeader'
import type { Conta } from '../../context/AppContext'
import {
  COR, BANCOS, ICONES_CONTA, fmt,
  ColorPicker, IconPicker,
  inputSt, labelSt,
} from './CfgShared'
import type { Aba } from './CfgShared'

interface Props {
  aba: Aba
  isMobile: boolean
  mobileView: 'list' | 'form'
  setMobileView: (v: 'list' | 'form') => void
  nenhumaConta: boolean
  contas: Conta[]
  editContaId: string | null
  formConta: Omit<Conta, 'id'>
  setFormConta: React.Dispatch<React.SetStateAction<Omit<Conta, 'id'>>>
  bancoCustom: string
  setBancoCustom: (v: string) => void
  saldoStr: string
  setSaldoStr: (v: string) => void
  limiteStr: string
  setLimiteStr: (v: string) => void
  faturaStr: string
  setFaturaStr: (v: string) => void
  saldoInicialDinheiro: number
  onSaveSaldoDinheiro: (v: number) => void
  erroConta: string
  nomeContaRef: React.RefObject<HTMLInputElement | null>
  tipoBancoRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>
  novaConta: (tipoAba?: Aba) => void
  editarConta: (c: Conta) => void
  salvarConta: () => void
  excluirConta: (id: string) => void
}

export default function CfgBancosCartoes({
  aba, isMobile, mobileView, setMobileView, nenhumaConta,
  contas, editContaId, formConta, setFormConta,
  bancoCustom, setBancoCustom, saldoStr, setSaldoStr,
  limiteStr, setLimiteStr, faturaStr, setFaturaStr,
  saldoInicialDinheiro, onSaveSaldoDinheiro,
  erroConta, nomeContaRef, tipoBancoRefs,
  novaConta, editarConta, salvarConta, excluirConta,
}: Props) {
  const [editandoDinheiro, setEditandoDinheiro] = useState(false)
  const [localDinheiro, setLocalDinheiro] = useState('')
  return (
    <>
      <div style={{ flex:1, display: (isMobile && mobileView==='form') || nenhumaConta ? 'none' : 'flex', flexDirection:'column', minWidth:0 }}>
        <PageHeader
          icon={aba==='bancos' ? 'ti-building-bank' : 'ti-credit-card'}
          breadcrumb="CONTA"
          title={aba==='bancos' ? 'Minhas contas' : 'Meus cartões'}
          subtitle={(() => {
            const n = contas.filter(c => aba==='bancos' ? c.tipo!=='cartao' : c.tipo==='cartao').length
            return aba==='bancos'
              ? `${n} conta${n!==1?'s':''} cadastrada${n!==1?'s':''}`
              : `${n} cartão${n!==1?'ões':''} cadastrado${n!==1?'s':''}`
          })()}
          rightContent={
            <button onClick={() => { novaConta(); if (isMobile) setMobileView('form') }} style={PH_BTN_SOLID}>
              {aba==='bancos' ? '+ Nova conta' : '+ Novo cartão'}
            </button>
          }
        />

        <div style={{ overflowY:'auto', flex:1 }}>
          {(aba==='bancos' ? (['corrente','poupanca'] as const) : (['cartao'] as const)).map(tipo => {
            const isBanco = tipo === 'corrente' || tipo === 'poupanca'
            const grupo = contas.filter(c => c.tipo===tipo && (isBanco ? !c.preferida : true))
            const favorita = isBanco ? contas.find(c => c.tipo===tipo && c.preferida) : null
            const itens = favorita ? [favorita, ...grupo] : grupo
            if (!itens.length) return null
            const titulo = tipo==='corrente' ? '🏦 Contas Correntes'
              : tipo==='poupanca' ? '🏧 Poupanças' : '💳 Cartões de Crédito'
            return (
              <div key={tipo} style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                  textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                  {titulo}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {itens.map((c) => (
                    <div key={c.id} style={{
                      background: c.preferida ? '#fffbeb' : COR.branco,
                      border: c.preferida ? '1px solid #fbbf24' : `1px solid ${COR.borda}`,
                      borderRadius:12, padding:'14px 16px', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:14,
                      borderLeft: c.preferida ? `4px solid #f59e0b` : `4px solid ${c.cor}`,
                      boxShadow: editContaId===c.id ? `0 0 0 2px ${COR.azul}` : c.preferida ? '0 2px 8px rgba(245,158,11,.15)' : '0 1px 4px rgba(0,0,0,.05)' }}>
                      <div style={{ width:48, height:48, borderRadius:14, background:c.cor+'22',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:22, flexShrink:0 }}>
                        {c.icone}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:COR.texto, display:'flex', alignItems:'center', gap:6 }}>
                          {c.tipo==='cartao' ? (c.apelido || c.banco) : c.banco}
                          {c.preferida && <span style={{ fontSize:11, fontWeight:700, color:'#92400e', background:'#fef3c7', border:'1px solid #fbbf24', borderRadius:6, padding:'1px 6px' }}>⭐ Favorito</span>}
                        </div>
                        <div style={{ fontSize:12, color:COR.textoSuave, marginTop:1 }}>
                          {c.tipo==='cartao'
                            ? `${c.banco}${c.apelido ? ` · ${c.apelido}` : ''}`
                            : `${c.nome}${c.agencia ? ` · Ag ${c.agencia}` : ''}${c.numeroConta ? ` · CC ${c.numeroConta}` : ''}`}
                        </div>
                        <button onClick={() => editarConta(c)} style={{
                          marginTop:6, border:`1px solid ${COR.borda}`, borderRadius:8,
                          background:COR.branco, color:COR.azul, fontSize:11, fontWeight:600,
                          cursor:'pointer', padding:'3px 10px', fontFamily:'inherit' }}>
                          ✏ Editar
                        </button>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        {c.tipo==='cartao' ? (
                          <>
                            <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>
                              {fmt(c.limiteCartao??0)}
                            </div>
                            <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                              Limite
                            </div>
                            <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                              Fecha {c.diaFechamento} · Vence {c.diaVencimento}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize:13, fontWeight:600, color:COR.verde }}>
                              {fmt(c.saldoInicial)}
                            </div>
                            <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                              Saldo inicial
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {/* Divisor + Card Dinheiro — só na aba Bancos */}
          {aba === 'bancos' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave,
                textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>
                💵 Dinheiro em carteira
              </div>

              <div style={{
                background: COR.branco, border: `1px solid ${COR.borda}`,
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                borderLeft: '4px solid #16a34a',
                boxShadow: '0 1px 4px rgba(0,0,0,.05)',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  💵
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto }}>Dinheiro em carteira</div>
                  <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 1 }}>Saldo inicial em espécie</div>
                  {editandoDinheiro ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        step="0.01"
                        value={localDinheiro}
                        onChange={e => setLocalDinheiro(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const v = parseFloat(localDinheiro.replace(',', '.')) || 0
                            onSaveSaldoDinheiro(v)
                            setEditandoDinheiro(false)
                          }
                          if (e.key === 'Escape') setEditandoDinheiro(false)
                        }}
                        placeholder="0.00"
                        style={{ width: 120, border: `1.5px solid ${COR.azul}`, borderRadius: 8, padding: '5px 8px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                      />
                      <button
                        onClick={() => {
                          const v = parseFloat(localDinheiro.replace(',', '.')) || 0
                          onSaveSaldoDinheiro(v)
                          setEditandoDinheiro(false)
                        }}
                        style={{ border: 'none', borderRadius: 8, background: COR.azul, color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditandoDinheiro(false)}
                        style={{ border: `1px solid ${COR.borda}`, borderRadius: 8, background: 'transparent', color: COR.textoSuave, fontSize: 12, fontWeight: 600, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setLocalDinheiro(saldoInicialDinheiro > 0 ? saldoInicialDinheiro.toString() : ''); setEditandoDinheiro(true) }}
                      style={{ marginTop: 6, border: `1px solid ${COR.borda}`, borderRadius: 8, background: COR.branco, color: COR.azul, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '3px 10px', fontFamily: 'inherit' }}>
                      ✏ Editar
                    </button>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COR.verde }}>
                    {fmt(saldoInicialDinheiro)}
                  </div>
                  <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 2 }}>Saldo inicial</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formulário conta */}
      <div onKeyDown={e => { if (e.key==='Enter' && (e.target as HTMLElement).tagName==='INPUT') salvarConta() }}
        style={{ width: isMobile ? '100%' : nenhumaConta ? 440 : 340,
          margin: nenhumaConta ? '0 auto' : undefined,
          flexShrink:0, background:COR.branco,
          border:`1px solid ${COR.borda}`, borderRadius:12,
          padding:20, overflowY:'auto',
          display: isMobile && mobileView==='list' ? 'none' : 'block' }}>
        {isMobile && (
          <button onClick={() => setMobileView('list')} style={{
            display:'flex', alignItems:'center', gap:4, marginBottom:14,
            border:'none', background:'transparent', cursor:'pointer',
            fontSize:13, color:COR.azul, fontFamily:'inherit', fontWeight:500, padding:0 }}>
            ← Voltar
          </button>
        )}
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>
            {editContaId
              ? (aba==='cartoes' ? 'Editar cartão' : 'Editar conta')
              : (aba==='cartoes' ? 'Novo cartão' : 'Nova conta')}
          </h3>
          {editContaId && (
            <button onClick={() => { novaConta(); setMobileView('list') }} title="Cancelar edição" style={{
              border:'none', background:'transparent',
              cursor:'pointer', fontSize:18, color:COR.textoSuave }}>✕</button>
          )}
        </div>

        {/* Preview */}
        {formConta.tipo !== 'cartao' ? (
          <div style={{ borderRadius:20, padding:'18px 20px', marginBottom:18,
            background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
            color:'#fff', display:'flex', alignItems:'center', gap:14,
            boxShadow:'0 6px 20px rgba(26,86,219,.30)' }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,.15)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
              {formConta.icone}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:800, opacity:.95 }}>
                {formConta.nome || 'Titular'}
              </div>
              <div style={{ fontSize:12, opacity:.75, marginTop:2 }}>
                {formConta.banco || 'Banco'}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:800 }}>
                {fmt(formConta.saldoInicial || 0)}
              </div>
              <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>Saldo inicial</div>
            </div>
            {editContaId && (
              <button
                onClick={() => setFormConta(prev => ({ ...prev, preferida: !prev.preferida }))}
                title={formConta.preferida ? 'Remover como preferida' : 'Marcar como preferida'}
                style={{ background:'none', border:'none', cursor:'pointer', padding:0,
                  fontSize:22, lineHeight:1, alignSelf:'flex-start',
                  color: formConta.preferida ? '#fbbf24' : 'rgba(255,255,255,.4)' }}>
                ★
              </button>
            )}
          </div>
        ) : (
          <div style={{ borderRadius:20, padding:'18px 20px', marginBottom:18,
            background:`linear-gradient(135deg,${formConta.cor},${formConta.cor}cc)`,
            color:'#fff', display:'flex', alignItems:'center', gap:14,
            boxShadow:`0 6px 20px ${formConta.cor}55` }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,.15)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
              {formConta.icone}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:800, opacity:.95 }}>
                {formConta.apelido || formConta.banco || 'Cartão'}
              </div>
              <div style={{ fontSize:12, opacity:.75, marginTop:2 }}>
                {formConta.banco || 'Banco'}
                {formConta.diaFechamento ? ` · Fecha dia ${formConta.diaFechamento}` : ''}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:14, fontWeight:800 }}>
                {fmt(formConta.limiteCartao ?? 0)}
              </div>
              <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>Limite</div>
            </div>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {formConta.tipo === 'cartao' ? (
            <>
              <div>
                <label style={labelSt}>Banco</label>
                <select value={formConta.banco}
                  onChange={e => { setFormConta(p=>({...p, banco:e.target.value})); if (e.target.value !== 'Outro') setBancoCustom('') }}
                  className="campo-cfg" style={inputSt}>
                  <option value="">Selecione...</option>
                  {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {formConta.banco === 'Outro' && (
                <div>
                  <label style={labelSt}>Qual banco?</label>
                  <input ref={nomeContaRef} value={bancoCustom}
                    onChange={e => setBancoCustom(e.target.value)}
                    placeholder="Nome do banco" className="campo-cfg" style={inputSt} />
                </div>
              )}
              <div>
                <label style={labelSt}>Limite do cartão</label>
                <input value={limiteStr}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9.,]/g, '')
                    setLimiteStr(raw)
                    setFormConta(p=>({...p, limiteCartao:parseFloat(raw.replace(',','.'))||0}))
                  }}
                  placeholder="R$ 0,00" className="campo-cfg" style={inputSt} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={labelSt}>Dia fechamento</label>
                  <input type="number" min="1" max="31"
                    value={formConta.diaFechamento||''}
                    onChange={e => setFormConta(p=>({...p, diaFechamento:parseInt(e.target.value)||undefined}))}
                    placeholder="Ex: 10" className="campo-cfg" style={inputSt} />
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                    Não sabe? Verifique no app do banco ou deixe em branco.
                  </div>
                </div>
                <div>
                  <label style={labelSt}>Dia vencimento</label>
                  <input type="number" min="1" max="31"
                    value={formConta.diaVencimento||''}
                    onChange={e => setFormConta(p=>({...p, diaVencimento:parseInt(e.target.value)||undefined}))}
                    placeholder="Ex: 17" className="campo-cfg" style={inputSt} />
                </div>
              </div>
              <div>
                <label style={labelSt}>Apelido do cartão <span style={{ fontWeight:400, color:COR.textoSuave }}>(opcional)</span></label>
                <input value={formConta.apelido||''}
                  onChange={e => setFormConta(p=>({...p, apelido:e.target.value||undefined}))}
                  placeholder="Ex: Nubank Gold, Itaú Família..."
                  className="campo-cfg" style={inputSt} />
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>
                  Se não informado, o banco será usado como identificador do cartão.
                </div>
              </div>
              <div style={{ background:'#f5f3ff', border:'1px solid #ede9fe', borderRadius:10, padding:'12px 14px' }}>
                <label style={{ ...labelSt, color:'#6d28d9', marginBottom:6, display:'block' }}>
                  💳 Fatura informada no planejamento
                </label>
                <input
                  value={faturaStr}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9.,]/g, '')
                    setFaturaStr(raw)
                  }}
                  placeholder="R$ 0,00"
                  className="campo-cfg"
                  style={{ ...inputSt, borderColor:'#ddd6fe' }}
                />
                <div style={{ fontSize:10, color:'#7c3aed', marginTop:5, lineHeight:1.5 }}>
                  {faturaStr.trim()
                    ? 'Salvar vai atualizar a fatura no planejamento do mês atual.'
                    : editContaId
                      ? 'Nenhuma fatura informada para este cartão. Preencha para incluir no planejamento.'
                      : 'Opcional — você pode informar depois no Planejamento.'
                  }
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={labelSt}>Banco</label>
                <select value={formConta.banco}
                  onChange={e => setFormConta(p=>({...p, banco:e.target.value}))}
                  className="campo-cfg" style={inputSt}>
                  <option value="">Selecione...</option>
                  {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Nome da conta</label>
                <input ref={nomeContaRef} value={formConta.nome}
                  onChange={e => setFormConta(p=>({...p, nome:e.target.value}))}
                  placeholder="Ex: João Silva, Maria Souza..."
                  className="campo-cfg" style={inputSt} />
              </div>
              {aba==='bancos' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <label style={labelSt}>Agência</label>
                      <input value={formConta.agencia||''}
                        onChange={e => setFormConta(p=>({...p, agencia:e.target.value}))}
                        placeholder="Ex: 0001" className="campo-cfg" style={inputSt} />
                    </div>
                    <div>
                      <label style={labelSt}>Conta</label>
                      <input value={formConta.numeroConta||''}
                        onChange={e => setFormConta(p=>({...p, numeroConta:e.target.value}))}
                        placeholder="Ex: 12345-6" className="campo-cfg" style={inputSt} />
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:-8 }}>
                    Agência e conta são apenas informativas, não são obrigatórias.
                  </div>
                  <div>
                    <label style={labelSt}>Tipo</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {([['corrente','Corrente'],['poupanca','Poupança']] as const).map(([v,l], i) => (
                        <button key={v}
                          ref={el => { tipoBancoRefs.current[i] = el }}
                          tabIndex={formConta.tipo===v ? 0 : -1}
                          onClick={() => setFormConta(p=>({...p,tipo:v}))}
                          onKeyDown={e => {
                            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                              e.preventDefault(); const n=tipoBancoRefs.current[(i+1)%2]; n?.click(); n?.focus()
                            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                              e.preventDefault(); const n=tipoBancoRefs.current[(i-1+2)%2]; n?.click(); n?.focus()
                            }
                          }}
                          style={{
                            flex:1, padding:'7px 0', fontFamily:'inherit', outline:'none',
                            border:`1.5px solid ${formConta.tipo===v ? COR.azul : COR.borda}`,
                            borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500,
                            background: formConta.tipo===v ? '#eff6ff' : COR.branco,
                            color: formConta.tipo===v ? COR.azul : COR.textoSuave }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label style={labelSt}>Saldo inicial</label>
                <input value={saldoStr}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9.,]/g, '')
                    setSaldoStr(raw)
                    setFormConta(p=>({...p, saldoInicial:parseFloat(raw.replace(',','.'))||0}))
                  }}
                  placeholder="R$ 0,00" className="campo-cfg" style={inputSt} />
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                  Pode ser um valor aproximado — você ajusta depois.
                </div>
              </div>
            </>
          )}
          <div>
            <label style={labelSt}>Ícone</label>
            <IconPicker icones={ICONES_CONTA} valor={formConta.icone}
              onChange={i => setFormConta(p=>({...p, icone:i}))} />
          </div>
          <div>
            <label style={labelSt}>Cor</label>
            <ColorPicker valor={formConta.cor}
              onChange={c => setFormConta(p=>({...p, cor:c}))} />
          </div>
          {erroConta && (
            <div style={{ background:'#fee2e2', color:COR.vermelho,
              borderRadius:8, padding:'7px 12px', fontSize:12 }}>
              ⚠ {erroConta}
            </div>
          )}
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            {editContaId && (
              <button onClick={() => excluirConta(editContaId)} style={{
                flex:1, padding:'10px 0', border:`1.5px solid ${COR.borda}`,
                borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500,
                background:COR.branco, color:COR.vermelho, fontFamily:'inherit' }}>
                Excluir
              </button>
            )}
            <button onClick={salvarConta} style={{
              flex:2, padding:'10px 0', border:'none', borderRadius:8,
              background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
              color:'#fff', fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}>
              {editContaId ? 'Salvar alterações' : 'Adicionar conta'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
