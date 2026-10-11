import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import {
  aparelhoTemDigital, cadastrarDigital, esquecerDigitalAqui, listarDigitais, removerDigital,
  type DigitalCadastrada,
} from '../../utils/digital'

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/**
 * "Entrar com digital", no Perfil: cadastra a digital deste aparelho e lista
 * as já cadastradas, uma por aparelho. Regras em src/utils/digital.ts.
 */
export default function CfgDigital() {
  const { user } = useApp()
  const [temDigital, setTemDigital] = useState(false)
  const [lista, setLista] = useState<DigitalCadastrada[]>([])
  const [erroLista, setErroLista] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const atualizar = useCallback(async () => {
    if (!user) return
    const r = await listarDigitais()
    setLista(r.lista); setErroLista(r.erro ?? '')
  }, [user])
  useEffect(() => { atualizar() }, [atualizar])
  useEffect(() => { aparelhoTemDigital().then(setTemDigital) }, [])

  async function cadastrar() {
    if (!user || ocupado) return
    setOcupado(true); setMsg(null)
    const r = await cadastrarDigital(user.id)
    setOcupado(false)
    if (r.ok) { setMsg({ ok: true, texto: 'Pronto. Na próxima vez, toque em "Entrar com digital".' }); atualizar() }
    else if (r.erro) setMsg({ ok: false, texto: r.erro })
  }

  async function remover(d: DigitalCadastrada) {
    if (!user || !window.confirm(`Remover a digital de "${d.nome}"? Nesse aparelho, a entrada volta a ser com a senha.`)) return
    const erro = await removerDigital(d.id)
    if (erro) { setMsg({ ok: false, texto: erro }); return }
    // Não há como saber se a removida era a deste aparelho; na dúvida, a
    // tela de login volta a oferecer a digital como opção, não em destaque.
    esquecerDigitalAqui(user.id)
    atualizar()
  }

  return (
    <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 6px' }}>👆 Entrar com digital</h3>
      <p style={{ fontSize: 14, color: COR.textoSuave, margin: '0 0 14px', lineHeight: 1.55 }}>
        Entre encostando o dedo ou olhando para a câmera, sem digitar a senha. A digital não sai do aparelho, e o
        e-mail e a senha continuam valendo.
      </p>

      {erroLista ? (
        <div style={{ fontSize: 14, color: COR.textoSuave, background: '#f8faff', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>{erroLista}</div>
      ) : lista.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {lista.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#f8faff' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>{d.nome}</div>
                <div style={{ fontSize: 13, color: COR.textoSuave }}>
                  Cadastrada em {dataCurta(d.criada)}{d.usada ? ` · usada em ${dataCurta(d.usada)}` : ''}
                </div>
              </div>
              <button onClick={() => remover(d)} aria-label={`Remover a digital de ${d.nome}`} style={{ border: 'none', background: 'none',
                color: COR.erroTexto, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 }}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {temDigital ? (
        <button onClick={cadastrar} disabled={ocupado} style={{ padding: '11px 18px', minHeight: 46, border: 'none', borderRadius: 10,
          background: COR.azul, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {ocupado ? 'Aguardando a digital…' : 'Cadastrar a digital deste aparelho'}
        </button>
      ) : (
        <div style={{ fontSize: 14, color: COR.textoSuave }}>
          Este aparelho não tem leitor de digital ou de rosto disponível para o navegador. Abra o Compass One no celular para cadastrar.
        </div>
      )}

      {msg && (
        <div role="status" style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, borderRadius: 10, padding: '10px 12px',
          color: msg.ok ? COR.sucessoTexto : COR.erroTexto, background: msg.ok ? COR.sucessoFundo : COR.erroFundo }}>{msg.texto}</div>
      )}
    </div>
  )
}
