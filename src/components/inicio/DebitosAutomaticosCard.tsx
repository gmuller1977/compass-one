import { useMemo, useState, type CSSProperties } from 'react'
import { useApp } from '../../context/AppContext'
import { Cartao, Etiqueta, Linha, Pilula, TituloCartao } from '../mobile/ui'
import { M, fmt, mostrar } from '../mobile/estilo'
import { COR } from '../../utils/cores'
import { parseValor } from '../../utils/moeda'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { debitoComOutroValor, debitoConfere, debitoNaoSaiu, debitosDoMes, type DebitoDoMes } from '../../utils/debitoAutomatico'
import type { DadosMes } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'

/**
 * "Débitos automáticos" (18/10/2026, pedido do Guilherme), ao lado de
 * "Confira seus saldos" na Início do computador e embaixo dele na Bússola.
 * O app confirma o débito sozinho no vencimento; aqui a pessoa confere no
 * extrato do banco se saiu e no valor certo. Regras em utils/debitoAutomatico.ts.
 */
export default function DebitosAutomaticosCard({ deps, oculto }: { deps: Deps; oculto: boolean }) {
  const { updateExtratoMes, categorias } = useApp()
  const debitos = useMemo(() => debitosDoMes(deps), [deps])
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  if (debitos.length === 0) return null

  const vazio: DadosMes = { lancamentos: {}, saldoBanco: '' }
  const gravar = (d: DebitoDoMes, f: (dm: DadosMes) => DadosMes) =>
    updateExtratoMes(d.chave, prev => f(prev ?? vazio))
  const bancoDe = (d: DebitoDoMes) => {
    const c = deps.contas.find(x => x.id === d.contaId)
    return c ? (c.banco || c.nome) : ''
  }
  const salvar = (d: DebitoDoMes) => {
    const n = parseValor(texto)
    if (n === null || n <= 0 || texto.trim() === '') { setErro('Digite o valor que saiu, por exemplo 123,45.'); return }
    gravar(d, dm => debitoComOutroValor(dm, d, n))
    setEditando(null); setTexto(''); setErro('')
  }

  const pendentes = debitos.filter(d => !d.conferido).length

  return (
    <Cartao>
      <TituloCartao direita={pendentes === 0
        ? <Etiqueta cor={COR.sucessoTexto} fundo={COR.sucessoFundo}>✓ conferido</Etiqueta>
        : undefined}>
        Débitos automáticos
      </TituloCartao>
      {pendentes > 0 && (
        <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: -4, marginBottom: 6, lineHeight: 1.45 }}>
          Já marcamos como pagos. Veja no extrato do banco se saíram e no valor certo.
        </div>
      )}

      {debitos.map((d, i) => {
        const cat = categorias.find(c => c.id === d.id)
        const vis = cat ? { icone: cat.icone, cor: cat.cor } : iconeCategoria(categorias, d.nome)
        const aberto = editando === d.id
        const mudou = !d.naoSaiu && Math.abs(d.valor - d.previsto) > 0.004
        return (
          <div key={d.id}>
            <Linha primeira={i === 0} icone={vis.icone} cor={vis.cor}
              titulo={d.nome}
              legenda={<>Dia {String(d.dia).padStart(2, '0')} · {bancoDe(d)}{mudou && <> · previsto {mostrar(d.previsto, oculto)}</>}</>}
              direita={<div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: M.corpo, fontWeight: 700, color: d.naoSaiu ? COR.textoSuave : COR.texto,
                  textDecoration: d.naoSaiu ? 'line-through' : undefined, fontVariantNumeric: 'tabular-nums' }}>
                  {mostrar(d.valor, oculto)}
                </div>
                {d.conferido && !aberto && (d.naoSaiu
                  ? <Etiqueta cor={COR.avisoTexto} fundo={COR.avisoFundo}>não saiu</Etiqueta>
                  : <Etiqueta cor={COR.sucessoTexto} fundo={COR.sucessoFundo}>✓ confere</Etiqueta>)}
              </div>} />

            {!d.conferido && !aberto && (
              <div style={botoes}>
                <Pilula forte onClick={() => gravar(d, dm => debitoConfere(dm, d))}>Confere</Pilula>
                <Pilula onClick={() => { setEditando(d.id); setTexto(''); setErro('') }}>Outro valor</Pilula>
                <Pilula onClick={() => gravar(d, dm => debitoNaoSaiu(dm, d))}>Não saiu</Pilula>
              </div>
            )}

            {aberto && (
              <div style={{ padding: '0 0 12px 56px' }}>
                <label style={{ display: 'block', fontSize: M.legenda, color: COR.textoSuave, marginBottom: 6 }}>
                  Quanto saiu no extrato?
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input autoFocus inputMode="decimal" value={texto} placeholder={fmt(d.valor)}
                    onChange={e => setTexto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') salvar(d) }}
                    style={campo} />
                  <Pilula forte onClick={() => salvar(d)}>Salvar</Pilula>
                  <button type="button" onClick={() => setEditando(null)} style={link}>Cancelar</button>
                </div>
                {erro && <div role="alert" style={{ fontSize: M.legenda, color: COR.erroTexto, marginTop: 6 }}>{erro}</div>}
              </div>
            )}
          </div>
        )
      })}
    </Cartao>
  )
}

const botoes: CSSProperties = { display: 'flex', gap: 8, padding: '0 0 12px 56px', flexWrap: 'wrap' }

// 16 px: abaixo disso o iPhone dá zoom no campo.
const campo: CSSProperties = {
  flex: '1 1 140px', minWidth: 0, height: 40, padding: '0 12px', borderRadius: 10,
  border: `1.5px solid ${COR.borda}`, fontSize: 16, fontFamily: 'inherit', color: COR.texto,
}

const link: CSSProperties = {
  border: 'none', background: 'none', color: COR.textoSuave, minHeight: 40, padding: '0 6px',
  fontFamily: 'inherit', fontSize: M.legenda, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
}
