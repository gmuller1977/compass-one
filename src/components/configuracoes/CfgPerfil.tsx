import React from 'react'
import type { User } from '@supabase/supabase-js'
import type { Conta, Categoria, Perfil } from '../../context/AppContext'
import PageHeader from '../PageHeader'
import { COR, EmBreve, inputSt, labelSt } from './CfgShared'

interface Props {
  user: User | null
  contas: Conta[]
  categorias: Categoria[]
  perfil: Perfil
  setPerfil: (v: Perfil) => void
  formPerfil: { nome: string; apelido: string }
  setFormPerfil: React.Dispatch<React.SetStateAction<{ nome: string; apelido: string }>>
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void
  onAbrirModalExcluir: () => void
}

export default function CfgPerfil({
  user, contas, categorias, perfil: _perfil,
  setPerfil, formPerfil, setFormPerfil,
  toast, onAbrirModalExcluir,
}: Props) {
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'center', padding:'0 0 28px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:500 }}>

        <PageHeader
          icon="ti-user"
          breadcrumb="CONTA"
          title="Perfil"
          subtitle={user?.email ?? ''}
        />

        {/* Dados pessoais */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:28 }}>

          {/* Avatar */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
            <div style={{ position:'relative' }}>
              <div style={{ width:80, height:80, borderRadius:'50%',
                background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:30, color:'#fff', fontWeight:700 }}>G</div>
              <div title="Em breve" style={{ position:'absolute', bottom:0, right:0,
                width:24, height:24, borderRadius:'50%', background:'#e2e8f0',
                border:`2px solid ${COR.branco}`, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:11, cursor:'not-allowed' }}>✏</div>
            </div>
          </div>

          {/* Mini-stats */}
          <div style={{ display:'flex', marginBottom:22, border:`1px solid ${COR.borda}`, borderRadius:10, overflow:'hidden' }}>
            {[
              { label:'Contas',       valor: String(contas.length) },
              { label:'Categorias',   valor: String(categorias.length) },
              { label:'Membro desde', valor: '2025' },
            ].map((s, i) => (
              <div key={s.label} style={{ flex:1, padding:'10px 0', textAlign:'center',
                borderLeft: i > 0 ? `1px solid ${COR.borda}` : 'none' }}>
                <div style={{ fontSize:17, fontWeight:700, color:COR.azul }}>{s.valor}</div>
                <div style={{ fontSize:10, color:COR.textoSuave, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={labelSt}>Nome completo</label>
              <input value={formPerfil.nome}
                onChange={e => setFormPerfil(p => ({ ...p, nome: e.target.value }))}
                placeholder="Seu nome completo" className="campo-cfg" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Como prefere ser chamado</label>
              <input value={formPerfil.apelido}
                onChange={e => setFormPerfil(p => ({ ...p, apelido: e.target.value }))}
                placeholder="Ex: Gui, Guilherme, Pri..." className="campo-cfg" style={inputSt} />
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>
                Este nome aparece na saudação do Início.
              </div>
            </div>
            <div style={{ opacity:.6 }}>
              <label style={labelSt}>E-mail</label>
              <input disabled value={user?.email ?? 'seu@email.com'}
                style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }} />
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                Vinculado à sua conta de login. Não editável aqui.
              </div>
            </div>
            <button
              onClick={() => { setPerfil({ nome: formPerfil.nome.trim(), apelido: formPerfil.apelido.trim() }); toast('Perfil salvo!') }}
              style={{ padding:'10px 0', border:'none', borderRadius:8,
                background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
                fontFamily:'inherit', marginTop:2 }}>
              Salvar perfil
            </button>
          </div>
        </div>

        {/* Segurança */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24, opacity:.6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>Segurança</h3>
            <EmBreve />
          </div>
          <button disabled style={{ width:'100%', padding:'10px 0',
            border:`1.5px solid ${COR.borda}`, borderRadius:8,
            background:COR.branco, color:COR.textoSuave, fontSize:13, fontWeight:600,
            cursor:'not-allowed', fontFamily:'inherit' }}>
            🔑 Trocar senha
          </button>
          <div style={{ fontSize:10, color:'#94a3b8', marginTop:6, textAlign:'center' }}>
            Um e-mail de redefinição será enviado para o endereço cadastrado.
          </div>
        </div>

        {/* Versão */}
        <div style={{ padding:14, background:'#f8faff', borderRadius:10,
          border:`1px solid ${COR.borda}`, textAlign:'center' }}>
          <div style={{ fontSize:12, color:COR.textoSuave, marginBottom:4 }}>Versão do app</div>
          <div style={{ fontSize:14, fontWeight:600, color:COR.texto }}>Compass One v0.1.0</div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>MVP — em desenvolvimento</div>
        </div>

        {/* Zona de perigo */}
        <div style={{ background:'#fff5f5', border:'1.5px solid #fecaca', borderRadius:14, padding:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:COR.vermelho, margin:'0 0 8px' }}>
            Zona de perigo
          </h3>
          <p style={{ fontSize:12, color:COR.textoSuave, margin:'0 0 16px', lineHeight:1.6 }}>
            Ao excluir a conta, todos os seus dados — contas, categorias, extratos e planejamentos — serão permanentemente removidos. Esta ação não pode ser desfeita.
          </p>
          <button
            onClick={onAbrirModalExcluir}
            style={{ padding:'9px 20px', border:`1.5px solid ${COR.vermelho}`, borderRadius:8,
              background:'transparent', color:COR.vermelho, fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}>
            Excluir minha conta
          </button>
        </div>

      </div>
      </div>
    </div>
  )
}
