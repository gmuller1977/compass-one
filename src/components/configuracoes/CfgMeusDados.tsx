import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { baixarJson, juntarMeusDados } from '../../utils/baixarMeusDados'

/**
 * "Baixar meus dados", no Perfil (LGPD): um arquivo com tudo o que o banco
 * guarda com o login de quem pede. Regras em src/utils/baixarMeusDados.ts.
 */
export default function CfgMeusDados() {
  const { user } = useApp()
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  async function baixar() {
    if (!user || ocupado) return
    setOcupado(true); setMsg(null)
    try {
      const dados = await juntarMeusDados(user)
      baixarJson(dados)
      const faltaram = Object.keys(dados.naoLidas)
      setMsg(faltaram.length
        ? { ok: false, texto: `Arquivo gerado, mas não deu para ler: ${faltaram.join(', ')}. Tente de novo mais tarde.` }
        : { ok: true, texto: 'Pronto. O arquivo foi salvo nos downloads deste aparelho.' })
    } catch (e) {
      console.error('baixar meus dados', e)
      setMsg({ ok: false, texto: 'Não foi possível gerar o arquivo agora. Tente de novo mais tarde.' })
    }
    setOcupado(false)
  }

  return (
    <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 6px' }}>
        <i aria-hidden className="ti ti-download" style={{ fontSize: 16, verticalAlign: '-2px', marginRight: 6 }} />Baixar meus dados
      </h3>
      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
        Um arquivo com tudo o que o Compass One guarda da sua conta: contas, categorias,
        lançamentos, faturas, planejamento e simulações. É um direito seu pela LGPD.
      </p>
      <button onClick={baixar} disabled={ocupado}
        style={{ width: '100%', minHeight: 44, border: `1.5px solid ${COR.azul}`, borderRadius: 8,
          background: COR.branco, color: COR.azul, fontSize: 14, fontWeight: 600,
          cursor: ocupado ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
        {ocupado ? 'Gerando o arquivo…' : 'Baixar meus dados'}
      </button>
      {msg && (
        <div role="status" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5,
          color: msg.ok ? COR.sucessoTexto : COR.erroTexto }}>
          {msg.texto}
        </div>
      )}
    </div>
  )
}
