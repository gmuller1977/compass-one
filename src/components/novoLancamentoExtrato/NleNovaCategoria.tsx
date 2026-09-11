import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { montarCategoria, previaDe } from '../../utils/novaCategoria'
import type { Categoria, TipoCategoria } from '../../context/AppContext'

/**
 * Criar categoria sem sair do lançamento.
 *
 * UM campo: o nome. Todo o resto a tela já sabe — ver
 * [`utils/novaCategoria`](../../utils/novaCategoria.ts), onde mora a regra e
 * a prova. A prévia existe para que ele veja o ícone e o grupo ANTES de
 * confirmar, e entenda que o app reconheceu o que ele escreveu.
 *
 * O que esta caixa deliberadamente NÃO pergunta: ícone, cor, grupo, forma de
 * pagamento, se é fixa, dia de vencimento, variante, número de parcelas. Cada
 * um deles é uma chance de abandonar o registro — e registrar é a única
 * tarefa de quem ainda está descobrindo os próprios números.
 */
export default function NleNovaCategoria({
  aberto, tipo, isDinheiro, contaId, categorias, onCriar, onFechar,
}: {
  aberto: boolean
  tipo: TipoCategoria
  isDinheiro: boolean
  contaId?: string
  categorias: Categoria[]
  /** Recebe a categoria pronta. Quem grava é a página. */
  onCriar: (c: Categoria) => void
  onFechar: () => void
}) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aberto) return
    setNome(''); setErro('')
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  if (!aberto) return null

  const previa = previaDe(nome, tipo)
  const ehEntrada = tipo === 'entrada'

  function confirmar() {
    const r = montarCategoria(nome, { tipo, isDinheiro, contaId, categorias })
    if ('erro' in r) { setErro(r.erro); return }
    onCriar(r)
  }

  return (
    <div
      onClick={onFechar}
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15,23,42,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Nova categoria"
        style={{
          background: COR.branco, borderRadius: 14, padding: '22px 22px 18px',
          maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: COR.texto, marginBottom: 4 }}>
          Nova {ehEntrada ? 'receita' : 'despesa'}
        </div>
        <div style={{ fontSize: 12.5, color: COR.textoSuave, lineHeight: 1.5, marginBottom: 14 }}>
          Só o nome. O resto o app preenche a partir deste lançamento — e você
          ajusta depois em Configurações, se quiser.
        </div>

        <input
          ref={inputRef}
          value={nome}
          onChange={e => { setNome(e.target.value); setErro('') }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmar() } }}
          placeholder={ehEntrada ? 'Ex.: Freelas' : 'Ex.: Mercado'}
          maxLength={40}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1.5px solid ${erro ? '#dc2626' : COR.borda}`, borderRadius: 10,
            padding: '10px 12px', fontSize: 14, color: COR.texto,
            background: COR.branco, outline: 'none', fontFamily: 'inherit',
          }}
        />

        {/* A prévia só aparece quando há o que prever. Mostrar "📁 Outros"
            para um campo vazio ensinaria que tudo cai em Outros. */}
        {nome.trim() && (
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12.5, color: '#475569',
          }}>
            <span style={{ fontSize: 17 }}>{previa.icone}</span>
            <span>
              {previa.reconhecida
                ? <>vai para o grupo <b style={{ color: COR.texto }}>{previa.grupo}</b></>
                : <>não reconheci esse nome — vai para <b style={{ color: COR.texto }}>Outros</b></>}
            </span>
          </div>
        )}

        {erro && (
          <div role="alert" style={{ marginTop: 10, fontSize: 12.5, color: '#b91c1c', lineHeight: 1.5 }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onFechar} style={{
            flex: '0 0 auto', padding: '10px 16px', borderRadius: 10,
            border: `1.5px solid ${COR.borda}`, background: COR.branco,
            color: COR.texto, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Cancelar</button>
          <button onClick={confirmar} disabled={!nome.trim()} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 10,
            background: nome.trim()
              ? `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`
              : '#cbd5e1',
            color: '#fff', fontSize: 13.5, fontWeight: 800,
            cursor: nome.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          }}>Criar e usar</button>
        </div>
      </div>
    </div>
  )
}
