import { useMemo, useState, type CSSProperties } from 'react'
import { useApp } from '../../context/AppContext'
import { Cartao, Etiqueta, Pilula, TituloCartao } from '../mobile/ui'
import { M, fmt, mostrar } from '../mobile/estilo'
import { COR } from '../../utils/cores'
import { parseValor } from '../../utils/moeda'
import { debitoComOutroValor, debitoConfere, debitoDesconferir, debitoNaoSaiu, debitoSaiuSim, debitosDoMes, type DebitoDoMes } from '../../utils/debitoAutomatico'
import type { DadosMes } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'

/**
 * "Automáticos do mês" (18/10/2026, pedido do Guilherme; era "Débitos
 * automáticos" até os recebimentos entrarem, no mesmo dia), ao lado de
 * "Confira seus saldos" na Início do computador e embaixo dele na Bússola.
 * O app confirma o débito sozinho no vencimento; aqui a pessoa confere no
 * extrato do banco se saiu e no valor certo. Regras em utils/debitoAutomatico.ts.
 */
export default function DebitosAutomaticosCard({ deps, oculto }: { deps: Deps; oculto: boolean }) {
  const { updateExtratoMes } = useApp()
  const debitos = useMemo(() => debitosDoMes(deps), [deps])
  const [editando, setEditando] = useState<string | null>(null)
  const [escolhendo, setEscolhendo] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  // Os conferidos ficam recolhidos (pedido do Guilherme, 19/10/2026: "para
  // não ocupar tanto a tela"), no celular e, no mesmo dia, no computador.
  const [verConferidos, setVerConferidos] = useState(false)
  const recolhe = !verConferidos


  const vazio: DadosMes = { lancamentos: {}, saldoBanco: '' }
  const gravar = (d: DebitoDoMes, f: (dm: DadosMes) => DadosMes) =>
    updateExtratoMes(d.chave, prev => f(prev ?? vazio))
  const bancoDe = (d: DebitoDoMes) => {
    const c = deps.contas.find(x => x.id === d.contaId)
    return c ? (c.banco || c.nome) : ''
  }
  const salvar = (d: DebitoDoMes) => {
    const n = parseValor(texto)
    if (n === null || n <= 0 || texto.trim() === '') { setErro(`Digite o valor que ${d.entrada ? 'entrou' : 'saiu'}, por exemplo 123,45.`); return }
    gravar(d, dm => debitoComOutroValor(dm, d, n))
    setEditando(null); setTexto(''); setErro('')
  }

  // Três grupos, nesta ordem (pedido do Guilherme, 18/10/2026: "agendados
  // sempre acima dos conferidos"): o que falta conferir, o que ainda vai
  // sair e o que já foi conferido. Dentro de cada um, pelo dia.
  const ordenados = [...debitos].sort((a, b) => ORDEM[grupoDe(a)] - ORDEM[grupoDe(b)] || a.dia - b.dia)
  const pendentes = debitos.filter(d => !d.conferido && !d.agendado).length
  const vencidos = debitos.filter(d => !d.agendado).length
  const temEntrada = debitos.some(d => d.entrada && !d.agendado)
  const nConferidos = debitos.filter(d => grupoDe(d) === 'conferido').length

  return (
    <Cartao>
      <TituloCartao direita={pendentes === 0 && vencidos > 0
        ? <Etiqueta cor={COR.sucessoTexto} fundo={COR.sucessoFundo}>✓ conferido</Etiqueta>
        : undefined}>
        Automáticos do mês
      </TituloCartao>
      {pendentes > 0 && (
        <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: -4, marginBottom: 6, lineHeight: 1.45 }}>
          {temEntrada ? 'Já marcamos o que entrou e saiu sozinho.' : 'Já marcamos como pagos.'} Viu no extrato? Toque na bolinha. Valor diferente: toque na linha.
        </div>
      )}
      {debitos.length === 0 && (
        <div style={{ fontSize: M.corpo, color: COR.textoSuave, lineHeight: 1.45, padding: '6px 0' }}>
          Não há recebimento nem débito automático agendado para este mês.
        </div>
      )}

      {ordenados.map((d, i) => {
        const grupo = grupoDe(d)
        const titulo = i === 0 || grupoDe(ordenados[i - 1]) !== grupo ? ROTULO_GRUPO[grupo] : null
        const emAcordeao = grupo === 'conferido'
        const acordeao = emAcordeao && titulo ? (
              // Com cara de botão (pedido do Guilherme, mesmo dia: "não dá
              // para saber que ao clicar abre"): caixa cinza, ✓ verde e
              // "Ver" / "Esconder" em azul. #1a56db no #f1f5f9: 4,9.
              <div style={{ paddingTop: i === 0 ? 0 : 12, borderTop: i === 0 ? 'none' : '1px solid #eef2f8', marginTop: i === 0 ? 0 : 2 }}>
                <button type="button" aria-expanded={!recolhe} onClick={() => setVerConferidos(v => !v)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 48, padding: '0 14px',
                  border: `1px solid ${COR.borda}`, borderRadius: 14, background: '#f1f5f9',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}>
                  <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', background: COR.sucessoTexto, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>✓</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: M.corpo, fontWeight: 600, color: COR.texto }}>
                    {nConferidos} {nConferidos === 1 ? 'conferido' : 'conferidos'}
                  </span>
                  <span style={{ fontSize: M.legenda, fontWeight: 700, color: '#1a56db', whiteSpace: 'nowrap' }}>
                    {recolhe ? 'Ver' : 'Esconder'} <span aria-hidden style={{ display: 'inline-block', transform: recolhe ? 'none' : 'rotate(180deg)' }}>▾</span>
                  </span>
                </button>
              </div>
        ) : null
        if (emAcordeao && recolhe) return titulo ? <div key={d.id}>{acordeao}</div> : null
        const aberto = editando === d.id
        const opcoes = escolhendo === d.id
        const mudou = !d.naoSaiu && Math.abs(d.valor - d.previsto) > 0.004
        const conferido = d.conferido && !d.naoSaiu
        const saiu = d.entrada ? 'caiu' : 'saiu'
        // A bolinha de Lançamentos: vazia = falta conferir; verde = confere;
        // tracejada = agendado; âmbar = não saiu. Tocar nela confere (ou
        // desfaz); tocar na linha abre "Outro valor" e "Não saiu".
        const bolinha: CSSProperties = d.agendado
          ? { border: `2px dashed ${COR.borda}`, background: '#fff', cursor: 'default' }
          : d.naoSaiu
            ? { border: 'none', background: COR.avisoFundo, color: COR.avisoTexto }
            : conferido
              ? { border: 'none', background: COR.sucessoTexto, color: '#fff' }
              : { border: '2px solid #94a3b8', background: '#fff' }
        return (
          <div key={d.id}>
            {titulo && emAcordeao && acordeao}
            {titulo && !emAcordeao && (
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: COR.textoSuave,
                padding: i === 0 ? '4px 0 0' : '14px 0 0', borderTop: i === 0 ? 'none' : '1px solid #eef2f8' }}>{titulo}</div>
            )}
            <div onClick={() => { if (!d.agendado && !aberto) setEscolhendo(opcoes ? null : d.id) }} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', minHeight: 48,
              borderTop: titulo ? 'none' : '1px solid #eef2f8', cursor: d.agendado ? undefined : 'pointer',
            }}>
              <button type="button" disabled={d.agendado}
                aria-label={d.agendado ? `${d.nome}: agendado` : d.naoSaiu ? `${d.nome}: não ${saiu}` : conferido ? `Desfazer: ${d.nome} confere` : `${d.nome} confere`}
                aria-pressed={conferido}
                onClick={e => {
                  e.stopPropagation()
                  if (d.agendado) return
                  if (d.naoSaiu) { setEscolhendo(opcoes ? null : d.id); return }
                  gravar(d, dm => (conferido ? debitoDesconferir(dm, d) : debitoConfere(dm, d)))
                }}
                style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
                  fontSize: 16, fontWeight: 800, fontFamily: 'inherit', lineHeight: 1, ...bolinha }}>
                {d.naoSaiu ? '!' : conferido ? '✓' : ''}
              </button>
              {/* Dia e banco ao lado do nome; sem espaço (celular), descem para a linha de baixo. */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6, rowGap: 0, overflow: 'hidden' }}>
                <span style={{ fontSize: M.corpo, fontWeight: 600, color: COR.texto, minWidth: 0, overflowWrap: 'anywhere' }}>{d.nome}</span>
                <span style={{ fontSize: M.legenda, color: COR.textoSuave, whiteSpace: 'nowrap' }}>
                  dia {String(d.dia).padStart(2, '0')} · {bancoDe(d)}{d.naoSaiu ? ` · não ${saiu}` : ''}
                </span>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: M.corpo, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                  color: d.naoSaiu || d.agendado ? COR.textoSuave : d.entrada ? COR.sucessoTexto : COR.erroTexto,
                  textDecoration: d.naoSaiu ? 'line-through' : undefined }}>
                  {d.entrada ? '+ ' : '− '}{mostrar(d.valor, oculto)}
                </div>
                {mudou && <div style={{ fontSize: 12, color: COR.textoSuave, whiteSpace: 'nowrap' }}>previsto {mostrar(d.previsto, oculto)}</div>}
              </div>
            </div>

            {opcoes && !aberto && (
              <div style={botoes}>
                {d.naoSaiu
                  ? <Pilula forte onClick={() => { gravar(d, dm => debitoSaiuSim(dm, d)); setEscolhendo(null) }}>{d.entrada ? 'Caiu, sim' : 'Saiu, sim'}</Pilula>
                  : <Pilula onClick={() => { setEditando(d.id); setEscolhendo(null); setTexto(''); setErro('') }}>Outro valor</Pilula>}
                {!d.naoSaiu && <Pilula onClick={() => { gravar(d, dm => debitoNaoSaiu(dm, d)); setEscolhendo(null) }}>{d.entrada ? 'Não caiu' : 'Não saiu'}</Pilula>}
                <button type="button" onClick={() => setEscolhendo(null)} style={link}>Cancelar</button>
              </div>
            )}

            {aberto && (
              <div style={botoes}>
                <input autoFocus inputMode="decimal" value={texto} placeholder={fmt(d.valor)}
                  aria-label={d.entrada ? 'Quanto entrou no extrato?' : 'Quanto saiu no extrato?'}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') salvar(d) }}
                  style={campo} />
                <Pilula forte onClick={() => salvar(d)}>Salvar</Pilula>
                <button type="button" onClick={() => setEditando(null)} style={link}>Cancelar</button>
                {erro && <div role="alert" style={{ flexBasis: '100%', fontSize: M.legenda, color: COR.erroTexto }}>{erro}</div>}
              </div>
            )}
          </div>
        )
      })}
      {debitos.length > 0 && !debitos.some(d => d.agendado) && (
        <div style={{ fontSize: M.legenda, color: COR.textoSuave, lineHeight: 1.45, paddingTop: 10, borderTop: '1px solid #eef2f8' }}>
          Não há mais nada automático agendado para os próximos dias deste mês.
        </div>
      )}
    </Cartao>
  )
}

type Grupo = 'conferir' | 'agendado' | 'conferido'
const grupoDe = (d: DebitoDoMes): Grupo => (d.agendado ? 'agendado' : d.conferido ? 'conferido' : 'conferir')
const ORDEM: Record<Grupo, number> = { conferir: 0, agendado: 1, conferido: 2 }
const ROTULO_GRUPO: Record<Grupo, string> = { conferir: 'A conferir', agendado: 'Agendados', conferido: 'Conferidos' }

const botoes: CSSProperties = { display: 'flex', gap: 8, padding: '0 0 12px 42px', flexWrap: 'wrap', alignItems: 'center' }

// 16 px: abaixo disso o iPhone dá zoom no campo.
const campo: CSSProperties = {
  flex: '1 1 140px', minWidth: 0, height: 40, padding: '0 12px', borderRadius: 10,
  border: `1.5px solid ${COR.borda}`, fontSize: 16, fontFamily: 'inherit', color: COR.texto,
}

const link: CSSProperties = {
  border: 'none', background: 'none', color: COR.textoSuave, minHeight: 40, padding: '0 6px',
  fontFamily: 'inherit', fontSize: M.legenda, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
}
