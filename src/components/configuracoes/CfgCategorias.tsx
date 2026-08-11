import React from 'react'
import PageHeader, { PH_BTN_SOLID } from '../PageHeader'
import type { Categoria, Conta, TipoCategoria } from '../../context/AppContext'
import { GRUPOS_PADRAO } from '../../data/categoriasPadrao'
import {
  COR, ICONES_CAT, ICONES_CAT_ENTRADA,
  TIPOS_MOVIMENTO, FORMAS_PAG_BANCO,
  ColorPicker, IconPicker, CatCard,
  inputSt, labelSt,
} from './CfgShared'
import type { ConfirmState } from './CfgShared'

interface Props {
  isMobile: boolean
  mobileView: 'list' | 'form'
  setMobileView: (v: 'list' | 'form') => void
  subAbaCat: 'categorias' | 'grupos'
  abaCat: TipoCategoria
  setAbaCat: (v: TipoCategoria) => void
  filtroAtiva: 'ativas' | 'inativas' | 'todas'
  setFiltroAtiva: (v: 'ativas' | 'inativas' | 'todas') => void
  categorias: Categoria[]
  setCategorias: React.Dispatch<React.SetStateAction<Categoria[]>>
  contas: Conta[]
  formCat: Omit<Categoria, 'id'>
  setFormCat: React.Dispatch<React.SetStateAction<Omit<Categoria, 'id'>>>
  editCatId: string | null
  erroCat: string
  nomeCatRef: React.RefObject<HTMLInputElement | null>
  grupoSelectRef: React.RefObject<HTMLSelectElement | null>
  tipoCatRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>
  freqCatRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>
  tipoMovRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>
  formaPagCatRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>
  catsFiltradas: Categoria[]
  temSugestoesPendentes: boolean
  gruposExtra: string[]
  setGruposExtra: React.Dispatch<React.SetStateAction<string[]>>
  gruposOcultos: string[]
  setGruposOcultos: React.Dispatch<React.SetStateAction<string[]>>
  gruposExtraTipos: Record<string, TipoCategoria>
  setGruposExtraTipos: React.Dispatch<React.SetStateAction<Record<string, TipoCategoria>>>
  novoGrupoNome: string
  setNovoGrupoNome: (v: string) => void
  novoGrupoTipo: TipoCategoria
  setNovoGrupoTipo: (v: TipoCategoria) => void
  editGrupo: string | null
  setEditGrupo: (v: string | null) => void
  editGrupoNome: string
  setEditGrupoNome: (v: string) => void
  editGrupoTipo: TipoCategoria
  setEditGrupoTipo: (v: TipoCategoria) => void
  novaCategoria: () => void
  editarCategoria: (c: Categoria) => void
  salvarCategoria: () => void
  excluirCategoria: (id: string) => void
  toggleAtiva: (id: string) => void
  importarSugestoes: () => void
  confirmar: (state: ConfirmState) => void
  fecharConfirm: () => void
}

export default function CfgCategorias({
  isMobile, mobileView, setMobileView,
  subAbaCat,
  abaCat, setAbaCat,
  filtroAtiva, setFiltroAtiva,
  categorias, setCategorias, contas,
  formCat, setFormCat, editCatId, erroCat,
  nomeCatRef, grupoSelectRef,
  tipoCatRefs, freqCatRefs, tipoMovRefs, formaPagCatRefs,
  catsFiltradas, temSugestoesPendentes,
  gruposExtra, setGruposExtra,
  gruposOcultos, setGruposOcultos,
  gruposExtraTipos, setGruposExtraTipos,
  novoGrupoNome, setNovoGrupoNome,
  novoGrupoTipo, setNovoGrupoTipo,
  editGrupo, setEditGrupo,
  editGrupoNome, setEditGrupoNome,
  editGrupoTipo, setEditGrupoTipo,
  novaCategoria, editarCategoria, salvarCategoria,
  excluirCategoria, toggleAtiva, importarSugestoes,
  confirmar, fecharConfirm,
}: Props) {
  const gruposCustom = Array.from(new Set([
    ...gruposExtra,
    ...categorias.map(c => c.grupo).filter((g): g is string => !!g && !GRUPOS_PADRAO.includes(g)),
  ])).sort()
  const todosGrupos = [...GRUPOS_PADRAO.filter(g => !gruposOcultos.includes(g)), ...gruposCustom].sort((a,b) => a.localeCompare(b,'pt-BR'))
  const gruposParaTipo = todosGrupos.filter(g =>
    g !== 'Cartão de Crédito' && (
      !categorias.some(c => c.grupo === g && c.ativa) ||
      categorias.some(c => c.grupo === g && c.tipo === formCat.tipo && c.ativa)
    )
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
      {subAbaCat === 'categorias' && (
        <div style={{ flex:1, display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:16, minWidth:0, overflow: isMobile ? 'visible' : 'hidden' }}>
          <div style={{ flex:1, display: isMobile && mobileView==='form' ? 'none' : 'flex', flexDirection:'column', minWidth:0 }}>
            <PageHeader
              icon="ti-category"
              breadcrumb="CONTA"
              title="Categorias"
              subtitle={`${categorias.filter(c=>c.ativa).length} ativas de ${categorias.length}`}
              rightContent={
                <>
                  {temSugestoesPendentes && !isMobile && (
                    <button onClick={importarSugestoes} style={{
                      background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}>✨ Sugestões</button>
                  )}
                  <button onClick={() => { novaCategoria(); if (isMobile) setMobileView('form') }} style={PH_BTN_SOLID}>
                    + Nova categoria
                  </button>
                </>
              }
            />

            {categorias.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8, padding:3 }}>
                  {([['entrada','↑ Entradas'],['saida','↓ Saídas']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setAbaCat(v)} style={{
                      padding:'6px 20px', border:'none', borderRadius:6,
                      cursor:'pointer', fontSize:13, fontWeight:500,
                      fontFamily:'inherit', transition:'all .15s',
                      background: abaCat===v ? COR.branco : 'transparent',
                      color: abaCat===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.textoSuave,
                      boxShadow: abaCat===v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8, padding:3 }}>
                  {([['ativas','Ativas'],['inativas','Inativas'],['todas','Todas']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setFiltroAtiva(v)} style={{
                      padding:'6px 14px', border:'none', borderRadius:6,
                      cursor:'pointer', fontSize:12, fontWeight:500,
                      fontFamily:'inherit', transition:'all .15s',
                      background: filtroAtiva===v ? COR.branco : 'transparent',
                      color: filtroAtiva===v ? (v==='inativas' ? COR.vermelho : COR.azul) : COR.textoSuave,
                      boxShadow: filtroAtiva===v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ overflowY:'auto', flex:1 }}>
              {(() => {
                const gruposOrdenados = [
                  ...GRUPOS_PADRAO.filter(g => catsFiltradas.some(c => c.grupo === g)),
                  ...Array.from(new Set(catsFiltradas.map(c => c.grupo).filter(g => g && !GRUPOS_PADRAO.includes(g)))).sort() as string[],
                ].sort((a,b) => a.localeCompare(b,'pt-BR'))
                const semGrupo = catsFiltradas.filter(c => !c.grupo)
                return <>
                  {gruposOrdenados.map(g => (
                    <div key={g} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                        textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                        {g}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {catsFiltradas.filter(c => c.grupo === g).map(c => (
                          <CatCard key={c.id} c={c} editCatId={editCatId}
                            toggleAtiva={toggleAtiva} editarCategoria={editarCategoria} contas={contas} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {semGrupo.length > 0 && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                        textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                        Sem grupo
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {semGrupo.map(c => (
                          <CatCard key={c.id} c={c} editCatId={editCatId}
                            toggleAtiva={toggleAtiva} editarCategoria={editarCategoria} contas={contas} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              })()}
            </div>
          </div>

          {/* Formulário categoria */}
          <div onKeyDown={e => { if (e.key==='Enter' && (e.target as HTMLElement).tagName==='INPUT') salvarCategoria() }}
            style={{ width: isMobile ? '100%' : 340, flexShrink:0, background:COR.branco,
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
                {editCatId ? 'Editar categoria' : 'Nova categoria'}
              </h3>
              {editCatId && (
                <button onClick={() => { novaCategoria(); setMobileView('list') }} title="Cancelar edição" style={{
                  border:'none', background:'transparent',
                  cursor:'pointer', fontSize:18, color:COR.textoSuave }}>✕</button>
              )}
            </div>

            {/* Preview card */}
            <div style={{ background:'#fff', borderRadius:18, padding:16,
              boxShadow:'0 2px 12px rgba(0,0,0,.08)', marginBottom:18,
              display:'flex', alignItems:'center', gap:14, border:`1px solid ${COR.borda}` }}>
              <div style={{ width:52, height:52, borderRadius:16, background:formCat.cor,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:24, flexShrink:0 }}>
                {formCat.icone}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:COR.texto }}>
                  {formCat.nome || 'Nome da categoria'}
                </div>
                <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:700,
                    background: formCat.tipo === 'entrada' ? '#dcfce7' : '#fee2e2',
                    color: formCat.tipo === 'entrada' ? COR.verde : COR.vermelho }}>
                    {formCat.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </span>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:700,
                    background: formCat.fixa ? '#fef9c3' : '#f1f5f9',
                    color: formCat.fixa ? '#92400e' : '#64748b' }}>
                    {formCat.fixa ? 'Fixa' : 'Variável'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Movimentação */}
              <div>
                <label style={labelSt}>Movimentação</label>
                <div style={{ display:'flex', gap:6 }}>
                  {([['entrada','↑ Entrada'],['saida','↓ Saída']] as const).map(([v,l], i) => (
                    <button key={v}
                      ref={el => { tipoCatRefs.current[i] = el }}
                      tabIndex={formCat.tipo===v ? 0 : -1}
                      onClick={() => setFormCat(p=>({
                        ...p, tipo:v, grupo:undefined,
                        icone: v==='entrada' ? ICONES_CAT_ENTRADA[0] : ICONES_CAT[0],
                        tipoMovimento: v==='entrada' && p.tipoMovimento==='cartao' ? 'banco' : p.tipoMovimento,
                        formaPagamento: v==='entrada'
                          ? (p.tipoMovimento==='dinheiro' ? undefined : 'pix')
                          : p.formaPagamento,
                      }))}
                      onKeyDown={e => {
                        if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                          e.preventDefault(); const n=tipoCatRefs.current[(i+1)%2]; n?.click(); n?.focus()
                        } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                          e.preventDefault(); const n=tipoCatRefs.current[(i-1+2)%2]; n?.click(); n?.focus()
                        }
                      }}
                      style={{
                        flex:1, padding:'7px 0', fontFamily:'inherit', outline:'none',
                        border:`1.5px solid ${formCat.tipo===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.borda}`,
                        borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                        background: formCat.tipo===v ? (v==='entrada' ? '#f0fdf4' : '#fff1f2') : COR.branco,
                        color: formCat.tipo===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.textoSuave }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grupo */}
              <div>
                <label style={labelSt}>Grupo</label>
                <select
                  ref={grupoSelectRef}
                  value={formCat.grupo && !gruposParaTipo.includes(formCat.grupo) ? '__outro__' : (formCat.grupo ?? '')}
                  onChange={e => {
                    if (e.target.value === '__outro__') setFormCat(p=>({...p, grupo:''}))
                    else setFormCat(p=>({...p, grupo: e.target.value || undefined}))
                  }}
                  className="campo-cfg" style={{...inputSt, cursor:'pointer'}}>
                  <option value="">Selecione um grupo...</option>
                  {gruposParaTipo.map(g => <option key={g} value={g}>{g}</option>)}
                  <option value="__outro__">Outro...</option>
                </select>
                {formCat.grupo != null && !gruposParaTipo.includes(formCat.grupo) && (
                  <input value={formCat.grupo}
                    onChange={e => setFormCat(p=>({...p, grupo: e.target.value || undefined}))}
                    placeholder="Nome do grupo personalizado"
                    className="campo-cfg" style={{...inputSt, marginTop:6}} />
                )}
              </div>

              <div>
                <label style={labelSt}>Nome da categoria</label>
                <input ref={nomeCatRef} value={formCat.nome}
                  onChange={e => setFormCat(p=>({...p, nome:e.target.value}))}
                  placeholder="Ex: Supermercado, Lazer..." className="campo-cfg" style={inputSt} />
              </div>

              <div>
                <label style={labelSt}>Variante</label>
                <input value={(formCat as any).descricao||''}
                  onChange={e => setFormCat(p=>({...p, descricao:e.target.value||undefined}))}
                  placeholder="Ex: Banco, Prefeitura, Fitway..."
                  className="campo-cfg" style={inputSt} />
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                  Diferencia categorias de mesmo nome. Aparece nos chips de seleção no lançamento.
                </div>
              </div>

              <div>
                <label style={labelSt}>Tipo</label>
                <div style={{ display:'flex', gap:6 }}>
                  {([[false,'Variável'],[true,'Fixa']] as const).map(([v,l], i) => (
                    <button key={String(v)}
                      ref={el => { freqCatRefs.current[i] = el }}
                      tabIndex={formCat.fixa===v ? 0 : -1}
                      onClick={() => setFormCat(p=>({...p,fixa:v as boolean}))}
                      onKeyDown={e => {
                        if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                          e.preventDefault(); const n=freqCatRefs.current[(i+1)%2]; n?.click(); n?.focus()
                        } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                          e.preventDefault(); const n=freqCatRefs.current[(i-1+2)%2]; n?.click(); n?.focus()
                        }
                      }}
                      style={{
                        flex:1, padding:'7px 0', fontFamily:'inherit', outline:'none',
                        border:`1.5px solid ${formCat.fixa===v ? COR.azul : COR.borda}`,
                        borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                        background: formCat.fixa===v ? '#eff6ff' : COR.branco,
                        color: formCat.fixa===v ? COR.azul : COR.textoSuave }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {((formCat.fixa && formCat.tipoMovimento !== 'cartao') || (formCat.tipoMovimento === 'banco' && formCat.formaPagamento === 'automatico')) && (
                <div>
                  <label style={labelSt}>Dia de vencimento</label>
                  <input type="number" min="1" max="31"
                    value={formCat.diaVencimento||''}
                    onChange={e => setFormCat(p=>({...p, diaVencimento:parseInt(e.target.value)||undefined}))}
                    placeholder="Ex: 10" className="campo-cfg" style={inputSt} />
                </div>
              )}

              {(() => {
                const tiposVisiveis = formCat.tipo === 'entrada'
                  ? TIPOS_MOVIMENTO.filter(t => t.id !== 'cartao')
                  : TIPOS_MOVIMENTO
                return (
                  <div>
                    <label style={labelSt}>Lançamentos</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {tiposVisiveis.map((t, i) => (
                        <button key={t.id}
                          ref={el => { tipoMovRefs.current[i] = el }}
                          tabIndex={formCat.tipoMovimento===t.id ? 0 : -1}
                          onClick={() => setFormCat(p=>({
                            ...p, tipoMovimento:t.id,
                            formaPagamento: t.id==='dinheiro' ? undefined
                              : t.id==='cartao' ? 'avista'
                              : p.tipo==='entrada' ? 'pix' : 'automatico',
                            contaDebitoId: undefined,
                          }))}
                          onKeyDown={e => {
                            const total = tiposVisiveis.length
                            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                              e.preventDefault(); const n=tipoMovRefs.current[(i+1)%total]; n?.click(); n?.focus()
                            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                              e.preventDefault(); const n=tipoMovRefs.current[(i-1+total)%total]; n?.click(); n?.focus()
                            }
                          }}
                          style={{
                            flex:1, padding:'7px 0', fontFamily:'inherit', outline:'none',
                            border:`1.5px solid ${formCat.tipoMovimento===t.id ? COR.azul : COR.borda}`,
                            borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:500,
                            background: formCat.tipoMovimento===t.id ? '#eff6ff' : COR.branco,
                            color: formCat.tipoMovimento===t.id ? COR.azul : COR.textoSuave }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize:11, color:COR.textoSuave, marginTop:6, lineHeight:1.5 }}>
                      {formCat.tipoMovimento === 'banco'    && (formCat.tipo==='entrada'
                        ? 'Receitas creditadas na conta bancária (PIX, transferência).'
                        : 'Gastos debitados diretamente na conta bancária (débito, Pix, boleto).')}
                      {formCat.tipoMovimento === 'cartao'   && 'Gastos pagos com cartão de crédito — aparecem na fatura do cartão.'}
                      {formCat.tipoMovimento === 'dinheiro' && (formCat.tipo==='entrada'
                        ? 'Receitas recebidas em espécie — aparecem no extrato de dinheiro em carteira.'
                        : 'Gastos pagos em espécie — aparecem no extrato de dinheiro em carteira.')}
                    </p>
                  </div>
                )
              })()}

              {formCat.tipoMovimento==='banco' && (
                <div>
                  <label style={labelSt}>Forma de lançamento</label>
                  {(() => {
                    const formasVisiveis = formCat.tipo==='entrada'
                      ? FORMAS_PAG_BANCO.filter(f => f.id==='pix' || f.id==='transferencia')
                      : FORMAS_PAG_BANCO
                    return (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {formasVisiveis.map((f, i) => (
                          <button key={f.id}
                            ref={el => { formaPagCatRefs.current[i] = el }}
                            tabIndex={formCat.formaPagamento===f.id ? 0 : -1}
                            onClick={() => setFormCat(p=>({
                              ...p, formaPagamento:f.id,
                              contaDebitoId: f.id === 'automatico' ? p.contaDebitoId : undefined,
                            }))}
                            onKeyDown={e => {
                              const total = formasVisiveis.length
                              if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                                e.preventDefault(); const n=formaPagCatRefs.current[(i+1)%total]; n?.click(); n?.focus()
                              } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                                e.preventDefault(); const n=formaPagCatRefs.current[(i-1+total)%total]; n?.click(); n?.focus()
                              }
                            }}
                            style={{
                              padding:'7px 10px', fontFamily:'inherit', outline:'none',
                              border:`1.5px solid ${formCat.formaPagamento===f.id ? COR.azul : COR.borda}`,
                              borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:500,
                              background: formCat.formaPagamento===f.id ? '#eff6ff' : COR.branco,
                              color: formCat.formaPagamento===f.id ? COR.azul : COR.textoSuave }}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:6, lineHeight:1.5 }}>
                    {formCat.formaPagamento==='automatico'
                      ? 'A despesa é debitada automaticamente na conta vinculada no dia do vencimento.'
                      : 'Você informa a data e o meio de pagamento ao consolidar cada lançamento.'
                    }
                  </div>
                  {formCat.fixa && formCat.formaPagamento==='automatico' && (
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>
                      Se vencer em dia não útil, o sistema desloca para o próximo dia útil.
                    </div>
                  )}
                </div>
              )}

              {formCat.tipoMovimento==='banco' && formCat.formaPagamento==='automatico' && (
                <div>
                  <label style={labelSt}>Conta de débito</label>
                  <select value={formCat.contaDebitoId ?? ''}
                    onChange={e => setFormCat(p=>({...p, contaDebitoId: e.target.value || undefined}))}
                    className="campo-cfg" style={inputSt}>
                    <option value="">Selecione a conta...</option>
                    {contas.filter(c => c.tipo !== 'cartao').map(c => (
                      <option key={c.id} value={c.id}>{c.icone} {c.nome} — {c.banco}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={labelSt}>Ícone</label>
                <IconPicker icones={formCat.tipo==='entrada' ? ICONES_CAT_ENTRADA : ICONES_CAT} valor={formCat.icone}
                  onChange={i => setFormCat(p=>({...p,icone:i}))} />
              </div>
              <div>
                <label style={labelSt}>Cor</label>
                <ColorPicker valor={formCat.cor}
                  onChange={c => setFormCat(p=>({...p,cor:c}))} />
              </div>
              {erroCat && (
                <div style={{ background:'#fee2e2', color:COR.vermelho,
                  borderRadius:7, padding:'7px 12px', fontSize:12 }}>
                  ⚠ {erroCat}
                </div>
              )}
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                {editCatId && (
                  <button onClick={() => excluirCategoria(editCatId)} style={{
                    flex:1, padding:'10px 0', border:`1.5px solid ${COR.borda}`,
                    borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500,
                    background:COR.branco, color:COR.vermelho, fontFamily:'inherit' }}>
                    Excluir
                  </button>
                )}
                <button onClick={salvarCategoria} style={{
                  flex:2, padding:'10px 0', border:'none', borderRadius:8,
                  background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                  color:'#fff', fontSize:13, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit' }}>
                  {editCatId ? 'Salvar alterações' : 'Adicionar categoria'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {subAbaCat === 'grupos' && (
        <div style={{ flex:1, display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:16, minWidth:0, overflow: isMobile ? 'visible' : 'hidden' }}>
          {/* Lista de grupos */}
          <div style={{ flex:1, overflowY:'auto', display: isMobile && mobileView==='form' ? 'none' : 'flex', flexDirection:'column', gap:6 }}>
            <PageHeader
              icon="ti-folders"
              breadcrumb="CONTA"
              title="Grupos"
              subtitle={`${todosGrupos.filter(g => g !== 'Cartão de Crédito').length} grupos`}
              rightContent={
                <button onClick={() => { setEditGrupo(null); setNovoGrupoNome(''); if (isMobile) setMobileView('form') }} style={PH_BTN_SOLID}>
                  + Novo grupo
                </button>
              }
            />
            {todosGrupos.filter(g => g !== 'Cartão de Crédito').map(g => {
              const count = categorias.filter(c => c.grupo === g).length
              const isPadrao = GRUPOS_PADRAO.includes(g)
              const tipoG: TipoCategoria = gruposExtraTipos[g]
                ?? (categorias.some(c => c.grupo === g && c.tipo === 'entrada') ? 'entrada' : 'saida')
              const selecionado = editGrupo === g
              return (
                <div key={g}
                  onClick={() => { setEditGrupo(g); setEditGrupoNome(g); setEditGrupoTipo(tipoG); setMobileView('form') }}
                  style={{
                    background: selecionado ? '#eff6ff' : COR.branco,
                    border: `1.5px solid ${selecionado ? COR.azul : COR.borda}`,
                    borderRadius:10, padding:'10px 14px',
                    display:'flex', alignItems:'center', gap:10, cursor:'pointer',
                  }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>{g}</div>
                    <div style={{ fontSize:10, color: tipoG==='entrada' ? COR.verde : COR.vermelho, marginTop:1, fontWeight:500 }}>
                      {tipoG === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:COR.textoSuave, background:'#f1f5f9', padding:'2px 8px', borderRadius:10, flexShrink:0 }}>
                    {count} {count === 1 ? 'categoria' : 'categorias'}
                  </span>
                  {!isPadrao && (
                    <button onClick={e => {
                      e.stopPropagation()
                      confirmar({
                        titulo: `Excluir grupo "${g}"?`,
                        mensagem: count > 0
                          ? `As ${count} ${count === 1 ? 'categoria ficará' : 'categorias ficarão'} sem grupo.`
                          : 'Esta ação não pode ser desfeita.',
                        onConfirmar: () => {
                          setCategorias(prev => prev.map(c => c.grupo === g ? {...c, grupo:undefined} : c))
                          setGruposExtra(prev => prev.filter(x => x !== g))
                          setGruposExtraTipos(prev => { const n={...prev}; delete n[g]; return n })
                          if (editGrupo === g) setEditGrupo(null)
                          fecharConfirm()
                        },
                      })
                    }} title="Excluir" style={{
                      border:'none', background:'transparent', cursor:'pointer',
                      fontSize:14, color:COR.vermelho, padding:'2px 4px', flexShrink:0 }}>✕</button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Formulário de grupo */}
          <div style={{ width: isMobile ? '100%' : 300, flexShrink:0, background:COR.branco,
            border:`1px solid ${COR.borda}`, borderRadius:12,
            padding:20, overflowY:'auto',
            display: isMobile && mobileView==='list' ? 'none' : 'block' }}>
            {isMobile && (
              <button onClick={() => { setEditGrupo(null); setMobileView('list') }} style={{
                display:'flex', alignItems:'center', gap:4, marginBottom:14,
                border:'none', background:'transparent', cursor:'pointer',
                fontSize:13, color:COR.azul, fontFamily:'inherit', fontWeight:500, padding:0 }}>
                ← Voltar
              </button>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>
                {editGrupo ? 'Editar grupo' : 'Novo grupo'}
              </h3>
              {editGrupo && (
                <button onClick={() => { setEditGrupo(null); setMobileView('list') }} title="Cancelar" style={{
                  border:'none', background:'transparent', cursor:'pointer', fontSize:18, color:COR.textoSuave }}>✕</button>
              )}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={labelSt}>Movimentação</label>
                <div style={{ display:'flex', gap:6 }}>
                  {([['entrada','↑ Entrada'],['saida','↓ Saída']] as const).map(([v,l]) => {
                    const cur = editGrupo ? editGrupoTipo : novoGrupoTipo
                    const set = editGrupo ? setEditGrupoTipo : setNovoGrupoTipo
                    return (
                      <button key={v} onClick={() => set(v as TipoCategoria)} style={{
                        flex:1, padding:'7px 0', fontFamily:'inherit',
                        border:`1.5px solid ${cur===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.borda}`,
                        borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                        background: cur===v ? (v==='entrada' ? '#f0fdf4' : '#fff1f2') : COR.branco,
                        color: cur===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.textoSuave }}>
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={labelSt}>Nome do grupo</label>
                <input
                  value={editGrupo ? editGrupoNome : novoGrupoNome}
                  onChange={e => editGrupo ? setEditGrupoNome(e.target.value) : setNovoGrupoNome(e.target.value)}
                  placeholder="Ex: Moradia, Transporte..."
                  className="campo-cfg" style={inputSt} />
              </div>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                {editGrupo && (
                  <button onClick={() => setEditGrupo(null)} style={{
                    flex:1, padding:'10px 0', border:`1.5px solid ${COR.borda}`,
                    borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500,
                    background:COR.branco, color:COR.textoSuave, fontFamily:'inherit' }}>
                    Cancelar
                  </button>
                )}
                <button onClick={() => {
                  if (editGrupo) {
                    const nome = editGrupoNome.trim()
                    if (!nome) return
                    if (nome !== editGrupo) {
                      setCategorias(prev => prev.map(c => c.grupo === editGrupo ? {...c, grupo:nome} : c))
                      const isPadrao = GRUPOS_PADRAO.includes(editGrupo)
                      if (isPadrao) {
                        setGruposOcultos(prev => [...prev, editGrupo])
                        if (!GRUPOS_PADRAO.includes(nome)) setGruposExtra(prev => [...prev, nome].sort())
                      } else {
                        setGruposExtra(prev => prev.map(x => x === editGrupo ? nome : x))
                      }
                      setGruposExtraTipos(prev => { const n={...prev}; if(prev[editGrupo]) n[nome]=prev[editGrupo]; delete n[editGrupo]; return n })
                    }
                    setGruposExtraTipos(prev => ({...prev, [nome||editGrupo]: editGrupoTipo}))
                    setEditGrupo(null)
                    setMobileView('list')
                  } else {
                    const nome = novoGrupoNome.trim()
                    if (!nome || todosGrupos.includes(nome)) return
                    setGruposExtra(prev => [...prev, nome].sort())
                    setGruposExtraTipos(prev => ({...prev, [nome]: novoGrupoTipo}))
                    setNovoGrupoNome('')
                    setMobileView('list')
                  }
                }} style={{
                  flex:2, padding:'10px 0', border:'none', borderRadius:8,
                  background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                  color:'#fff', fontSize:13, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit' }}>
                  {editGrupo ? 'Salvar alterações' : 'Adicionar grupo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
