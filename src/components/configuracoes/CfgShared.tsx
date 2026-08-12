import { useState, useEffect, useRef } from 'react'
import type { Conta, Categoria, FormaPagamentoCategoria, TipoMovimento } from '../../context/AppContext'

// ── Tipos exportados ─────────────────────────────────────────────────
export type Aba = 'home' | 'bancos' | 'cartoes' | 'categorias' | 'perfil' | 'preferencias'
export type ConfirmState = {
  titulo: string
  mensagem?: string
  detalhe?: string
  apenasFechar?: boolean
  onConfirmar: () => void
}

// ── Paleta de cores ──────────────────────────────────────────────────
import { COR } from '../../utils/cores'
export { COR }

// ── Constantes ───────────────────────────────────────────────────────
export const CORES_PRESET = [
  '#1a56db','#16a34a','#dc2626','#d97706','#7c3aed',
  '#0891b2','#db2777','#65a30d','#ea580c','#6b7280',
  '#0f172a','#be123c',
]
export const ICONES_CONTA = ['🏦','💳','🏧','💰','🏠','🚗','💎','📊','🏢','💵']
export const ICONES_CAT   = [
  '🛒','⛽','💊','📱','💡','💧','🎓','✈️','🎭','👕',
  '🍽️','🎁','🏋️','🐾','📺','🎮','🏥','📌','🔧','☕',
  '🎵','📚','🏖️','💐','🧴','💈','🐶','🎯',
]
export const ICONES_CAT_ENTRADA = [
  '💰','💵','💼','📈','🏦','💹','🤑','🧾','🏠','🚗',
  '💎','📊','🏢','🎯','⭐','🏆','🔑','📥','🪙','💳',
  '🤝','📑','🎉','🌟','💡','🏗️','🛡️','🌱',
]
export const BANCOS = ['Banco do Brasil','Bradesco','C6 Bank','Caixa','Inter','Itaú','Nubank','Santander','Sicredi','Outro']

export const TIPOS_MOVIMENTO: { id: TipoMovimento; label: string }[] = [
  { id:'banco',    label:'Banco' },
  { id:'cartao',   label:'Cartão de Crédito' },
  { id:'dinheiro', label:'Dinheiro' },
]
export const FORMAS_PAG_BANCO: { id: FormaPagamentoCategoria; label: string }[] = [
  { id:'automatico',    label:'Débito Automático' },
  { id:'debito',        label:'Débito'            },
  { id:'pix',           label:'PIX'               },
  { id:'boleto',        label:'Boleto'            },
  { id:'transferencia', label:'Transferência'     },
]
export const FORMAS_PAG_CARTAO: { id: FormaPagamentoCategoria; label: string }[] = [
  { id:'avista',    label:'À Vista' },
  { id:'parcelado', label:'Parcelado' },
]
export const CORES_FORMA_PAG: Record<string,{bg:string;cor:string}> = {
  automatico:    { bg:'#e0f2fe', cor:'#0369a1' },
  debito:        { bg:'#fef9c3', cor:'#92400e' },
  manual:        { bg:'#f1f5f9', cor:'#475569' },
  pix:           { bg:'#d1fae5', cor:'#065f46' },
  boleto:        { bg:'#fce7f3', cor:'#9d174d' },
  transferencia: { bg:'#eff6ff', cor:'#1a56db' },
  avista:        { bg:'#f3e8ff', cor:'#7c3aed' },
  parcelado:     { bg:'#fce7f3', cor:'#be185d' },
  dinheiro:      { bg:'#f1f5f9', cor:'#475569' },
}

// ── Estilos reutilizados ─────────────────────────────────────────────
export const inputSt: React.CSSProperties = {
  border:'1.5px solid #e2e8f0', borderRadius:12,
  padding:'11px 14px', fontSize:14, outline:'none',
  background:'#fff', fontFamily:'inherit',
  color:COR.texto, width:'100%',
}
export const labelSt: React.CSSProperties = {
  display:'block', fontSize:10, fontWeight:700,
  color:COR.azul, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5,
}

// ── Helpers ──────────────────────────────────────────────────────────
export function labelCobranca(c: Categoria): { label: string; bg: string; cor: string } {
  if (c.tipoMovimento === 'dinheiro') return { label:'Dinheiro', ...CORES_FORMA_PAG.dinheiro }
  if (c.tipoMovimento === 'cartao') {
    const f = FORMAS_PAG_CARTAO.find(x => x.id === c.formaPagamento)
    const cores = CORES_FORMA_PAG[c.formaPagamento ?? ''] ?? { bg:'#f1f5f9', cor:'#64748b' }
    return { label: f?.label ?? 'Cartão', ...cores }
  }
  const f = FORMAS_PAG_BANCO.find(x => x.id === c.formaPagamento)
  const cores = CORES_FORMA_PAG[c.formaPagamento ?? ''] ?? { bg:'#f1f5f9', cor:'#64748b' }
  return { label: f?.label ?? 'Débito', ...cores }
}

export function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
}

export function gerarId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

// ── Mini-componentes ─────────────────────────────────────────────────
export function EmBreve() {
  return (
    <span style={{ fontSize:9, padding:'2px 7px', borderRadius:6,
      background:'#fef9c3', color:'#92400e', fontWeight:700,
      textTransform:'uppercase', letterSpacing:.5, flexShrink:0 }}>
      Em breve
    </span>
  )
}

export function ColorPicker({ valor, onChange }: { valor:string; onChange:(c:string)=>void }) {
  const refs = useRef<(HTMLButtonElement|null)[]>([])
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {CORES_PRESET.map((c, i) => (
        <button key={c}
          ref={el => { refs.current[i] = el }}
          tabIndex={valor===c ? 0 : -1}
          onClick={() => onChange(c)}
          onKeyDown={e => {
            const total = CORES_PRESET.length
            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
              e.preventDefault(); const n=refs.current[(i+1)%total]; n?.click(); n?.focus()
            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
              e.preventDefault(); const n=refs.current[(i-1+total)%total]; n?.click(); n?.focus()
            }
          }}
          style={{
            width:26, height:26, borderRadius:'50%', background:c, cursor:'pointer', padding:0,
            border:`3px solid ${valor===c ? '#0f172a' : 'transparent'}`,
            boxShadow: valor===c ? '0 0 0 2px #fff, 0 0 0 4px #0f172a' : 'none',
            outline:'none', transition:'all .15s',
          }} />
      ))}
    </div>
  )
}

export function IconPicker({ icones, valor, onChange }: { icones:string[]; valor:string; onChange:(i:string)=>void }) {
  const refs = useRef<(HTMLButtonElement|null)[]>([])
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {icones.map((ic, i) => (
        <button key={ic}
          ref={el => { refs.current[i] = el }}
          tabIndex={valor===ic ? 0 : -1}
          onClick={() => onChange(ic)}
          onKeyDown={e => {
            const total = icones.length
            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
              e.preventDefault(); const n=refs.current[(i+1)%total]; n?.click(); n?.focus()
            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
              e.preventDefault(); const n=refs.current[(i-1+total)%total]; n?.click(); n?.focus()
            }
          }}
          style={{
            width:34, height:34, border:`2px solid ${valor===ic ? COR.azul : COR.borda}`,
            borderRadius:8, background: valor===ic ? '#eff6ff' : COR.branco,
            cursor:'pointer', fontSize:16, display:'flex', outline:'none',
            alignItems:'center', justifyContent:'center',
          }}>{ic}</button>
      ))}
    </div>
  )
}

export function CatCard({ c, editCatId, toggleAtiva, editarCategoria, contas }: {
  c: Categoria
  editCatId: string|null
  toggleAtiva: (id:string) => void
  editarCategoria: (c:Categoria) => void
  contas: Conta[]
}) {
  return (
    <div onClick={() => editarCategoria(c)} style={{
      background:COR.branco, border:`1px solid ${COR.borda}`,
      borderRadius:10, padding:'11px 14px', cursor:'pointer',
      display:'flex', alignItems:'center', gap:12,
      borderLeft:`4px solid ${c.cor}`,
      opacity: c.ativa ? 1 : 0.5,
      boxShadow: editCatId===c.id ? `0 0 0 2px ${COR.azul}` : 'none',
    }}>
      <div style={{ width:36, height:36, borderRadius:10, background:c.cor,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:17, flexShrink:0 }}>
        {c.icone}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:COR.texto }}>{c.nome}</div>
        {c.descricao && (
          <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            maxWidth:300 }}>
            {c.descricao}
          </div>
        )}
        <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap', alignItems:'center' }}>
          {(() => {
            const cfg: Record<string,{bg:string;cor:string;label:string}> = {
              banco:    { bg:'#f1f5f9', cor:'#334155', label:'Banco' },
              cartao:   { bg:'#f3e8ff', cor:'#7c3aed', label:'Cartão' },
              dinheiro: { bg:'#f0fdf4', cor:'#16a34a', label:'Dinheiro' },
            }
            const s = cfg[c.tipoMovimento] ?? cfg.banco
            return (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600,
                background:s.bg, color:s.cor }}>
                {s.label}
              </span>
            )
          })()}
          {c.tipoMovimento !== 'dinheiro' && c.tipoMovimento !== 'cartao' && (() => {
            const tc = labelCobranca(c)
            return (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600,
                background:tc.bg, color:tc.cor }}>
                {tc.label}
              </span>
            )
          })()}
          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600,
            background: c.fixa ? '#fef9c3' : '#f1f5f9', color: c.fixa ? '#92400e' : '#64748b' }}>
            {c.fixa ? 'Fixa' : 'Variável'}
          </span>
          {c.diaVencimento && (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600,
              background:'#e0f2fe', color:'#0369a1' }}>
              Vence dia {c.diaVencimento}
            </span>
          )}
          {c.contaDebitoId && (() => {
            const conta = contas.find(x => x.id === c.contaDebitoId)
            return conta ? (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600,
                background:'#f0f4ff', color:'#1a56db' }}>
                {conta.icone} {conta.banco}
              </span>
            ) : null
          })()}
        </div>
      </div>
      <div onClick={e => { e.stopPropagation(); toggleAtiva(c.id) }}
        title={c.ativa ? 'Inativar' : 'Ativar'}
        style={{ cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
        <div style={{
          width:40, height:22, borderRadius:12,
          background: c.ativa ? COR.verde : '#cbd5e1',
          position:'relative', transition:'background .2s',
          flexShrink:0 }}>
          <div style={{
            width:16, height:16, borderRadius:'50%', background:'#fff',
            position:'absolute', top:3,
            left: c.ativa ? 20 : 3,
            boxShadow:'0 1px 4px rgba(0,0,0,.25)',
            transition:'left .2s',
          }} />
        </div>
      </div>
    </div>
  )
}
