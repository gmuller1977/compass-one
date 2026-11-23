import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { COR } from '../../utils/cores'
import { textoDoCodigo, telefoneMascarado } from '../../utils/whatsapp'

/**
 * "WhatsApp", no Perfil (23/11/2026, pedido do Guilherme: Z-API + n8n).
 * Lançar mandando "47 mercado" para o número do Compass One; ele responde o
 * que entendeu e só lança com o SIM. Regras em utils/whatsapp.ts e na
 * função `whatsapp`.
 *
 * Ligar = gerar um código aqui e mandá-lo DO PRÓPRIO WhatsApp (o link já
 * abre a conversa com o texto pronto): só quem tem o celular liga o número.
 * O app não grava o número; quem grava é a função, ao receber o código.
 * Sem VITE_WHATSAPP_NUMERO (o número do Compass na Z-API), ou sem a
 * migração 028, o cartão não aparece.
 */
const NUMERO = ((import.meta.env.VITE_WHATSAPP_NUMERO as string | undefined) ?? '').replace(/\D/g, '')

type Vinculo = { telefone: string | null; codigo: string | null; codigo_expira: string | null }

export default function CfgWhatsapp() {
  const [v, setV] = useState<Vinculo | null>(null)
  const [disponivel, setDisponivel] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const ler = useCallback(async () => {
    const { data, error } = await supabase.from('whatsapp_vinculos').select('telefone, codigo, codigo_expira').maybeSingle()
    if (error) { setDisponivel(false); return }
    setDisponivel(true)
    setV(data as Vinculo | null)
  }, [])
  useEffect(() => { if (NUMERO) void ler() }, [ler])

  const codigoValido = !!v?.codigo && !!v.codigo_expira && new Date(v.codigo_expira) > new Date()
  const ligado = !!v?.telefone
  // Esperando o código chegar pelo WhatsApp: confere sozinho a cada 4 s,
  // até ligar ou o código vencer.
  const esperando = !!v?.codigo && !ligado ? v.codigo_expira : null
  useEffect(() => {
    if (!esperando) return
    const id = setInterval(() => { if (new Date(esperando) > new Date()) void ler() }, 4000)
    return () => clearInterval(id)
  }, [esperando, ler])
  useEffect(() => { if (ligado) setMsg(m => (m?.ok === false ? m : null)) }, [ligado])

  if (!NUMERO || !disponivel) return null

  async function gerar() {
    setOcupado(true); setMsg(null)
    const { error } = await supabase.rpc('gerar_codigo_whatsapp')
    setOcupado(false)
    if (error) { setMsg({ ok: false, texto: 'Não foi possível gerar o código agora. Tente de novo.' }); return }
    await ler()
  }
  async function desligar() {
    setOcupado(true); setMsg(null)
    const { error } = await supabase.rpc('desligar_whatsapp')
    setOcupado(false)
    if (error) { setMsg({ ok: false, texto: 'Não foi possível desligar agora. Tente de novo.' }); return }
    setMsg({ ok: true, texto: '✓ Pronto, o WhatsApp foi desligado do Compass One.' })
    await ler()
  }

  const botao = (primario: boolean): CSSProperties => ({
    padding: '11px 18px', minHeight: 46, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: primario ? 'none' : `1px solid ${COR.borda}`, background: primario ? COR.azul : COR.branco, color: primario ? '#fff' : COR.texto,
    display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
  })
  const exemplo = (t: string) => (
    <span style={{ display: 'inline-block', background: '#f1f5f9', color: COR.texto, borderRadius: 8, padding: '3px 9px', fontSize: 13, fontWeight: 600 }}>{t}</span>
  )

  return (
    <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 6px' }}>
        <i aria-hidden className="ti ti-brand-whatsapp" style={{ fontSize: 17, verticalAlign: '-2px', marginRight: 6 }} />Lançar pelo WhatsApp
      </h3>
      <p style={{ fontSize: 14, color: COR.textoSuave, margin: '0 0 12px', lineHeight: 1.55 }}>
        Mande o valor e a categoria numa mensagem. O Compass One mostra o que entendeu e só lança depois do seu SIM.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {exemplo('47 mercado')}{exemplo('32,90 farmácia ontem')}{exemplo('350 em 3x loja no nubank')}
      </div>

      {ligado ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: COR.sucessoFundo, marginBottom: 14 }}>
            <i aria-hidden className="ti ti-circle-check" style={{ fontSize: 20, color: COR.sucessoTexto }} />
            <div style={{ fontSize: 14, color: COR.texto, lineHeight: 1.45 }}>
              Ligado ao número <strong>{telefoneMascarado(v!.telefone!)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <a href={`https://wa.me/${NUMERO}`} target="_blank" rel="noreferrer" style={botao(true)}>
              <i aria-hidden className="ti ti-message-circle" style={{ fontSize: 18 }} />Abrir a conversa
            </a>
            <button onClick={desligar} disabled={ocupado} style={botao(false)}>Desligar</button>
          </div>
        </>
      ) : codigoValido ? (
        <>
          <div style={{ fontSize: 14, color: COR.texto, lineHeight: 1.55, marginBottom: 10 }}>
            Toque em <strong>Mandar o código</strong>: o WhatsApp abre com a mensagem pronta, é só enviar. Use o celular do número que você quer ligar.
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: COR.texto, margin: '4px 0 12px', fontVariantNumeric: 'tabular-nums' }}>
            {v!.codigo!.slice(0, 3)} {v!.codigo!.slice(3)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <a href={`https://wa.me/${NUMERO}?text=${encodeURIComponent(textoDoCodigo(v!.codigo!))}`} target="_blank" rel="noreferrer" style={botao(true)}>
              <i aria-hidden className="ti ti-send" style={{ fontSize: 18 }} />Mandar o código
            </a>
            <button onClick={gerar} disabled={ocupado} style={botao(false)}>Gerar outro</button>
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 10 }}>
            O código vale 15 minutos. Esta tela confirma sozinha quando ele chegar.
          </div>
        </>
      ) : (
        <>
          <button onClick={gerar} disabled={ocupado} style={botao(true)}>
            <i aria-hidden className="ti ti-brand-whatsapp" style={{ fontSize: 18 }} />{ocupado ? 'Gerando…' : 'Ligar meu WhatsApp'}
          </button>
          <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 10, lineHeight: 1.5 }}>
            Ao ligar, você autoriza o Compass One a ler as mensagens que mandar para o número dele, só para fazer os lançamentos.
            Desligue aqui quando quiser, ou mande SAIR na conversa.
          </div>
        </>
      )}

      {msg && <div role="status" style={{ marginTop: 10, fontSize: 13, color: msg.ok ? COR.sucessoTexto : COR.erroTexto }}>{msg.texto}</div>}
    </div>
  )
}
