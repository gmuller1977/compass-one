import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useApp, type Conta } from '../../context/AppContext'
import { useToast } from '../Toast'
import ModalTopo from '../ModalTopo'
import NleNovaCategoria from './NleNovaCategoria'
import { COR, fmt } from './NleShared'
import { saldoFinalConta, type Deps } from '../../utils/saldoConta'
import { marcarConferido } from '../../utils/conferirSaldos'
import { CARTEIRA_ID } from '../../utils/transferencia'
import {
  aplicarMudancas, classificar, decodificarArquivo, lerArquivoDoBanco, mudancasDaImportacao, normalizar, outraPontaJaExiste,
  podeGravar, type ArquivoDoBanco, type ContextoImportacao, type Escolha, type LinhaImportada,
} from '../../utils/importarExtrato'

/**
 * A janela "Importar extrato" de Lançamentos > Banco (29/10/2026, pedido do
 * Guilherme). A regra mora em utils/importarExtrato; aqui a pessoa vê o que
 * cada linha do banco vai virar, troca o que quiser e confirma. Nada é
 * gravado antes do botão "Importar". No computador é uma janela central; no
 * celular, a tela inteira (a mesma janela, só a arrumação muda).
 */
type Props = {
  aberto: boolean
  onFechar: () => void
  isMobile: boolean
  contaId: string
  contasExtrato: Conta[]
}

const ddmm = (l: LinhaImportada) => `${String(l.dia).padStart(2, '0')}/${String(l.mes + 1).padStart(2, '0')}`

export default function NleImportar({ aberto, onFechar, isMobile, contaId, contasExtrato }: Props) {
  const { contas, categorias, extratoData, faturaData, planos, saldoInicialDinheiro, updateExtratoMes, setCategorias } = useApp()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [contaSel, setContaSel] = useState(contaId)
  const [arquivo, setArquivo] = useState<ArquivoDoBanco | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [erro, setErro] = useState('')
  const [escolhas, setEscolhas] = useState<Escolha[]>([])
  const [arrastando, setArrastando] = useState(false)
  const [verJa, setVerJa] = useState(false)
  const [verFora, setVerFora] = useState(false)
  const [novaCatPara, setNovaCatPara] = useState<number | null>(null)

  const hoje = useMemo(() => new Date(), [aberto]) // eslint-disable-line react-hooks/exhaustive-deps
  const ctx: ContextoImportacao = useMemo(() => ({
    extratoData, faturaData: faturaData as Deps['faturaData'], contas, categorias, planos, saldoInicialDinheiro,
    contaId: contaSel, hoje,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, contaSel, hoje])

  // A classificação é feita uma vez por arquivo e conta: gravar outra coisa
  // na tela por trás não deve mexer no que a pessoa está revisando.
  const [linhas, setLinhas] = useState<LinhaImportada[]>([])
  function revisar(a: ArquivoDoBanco, conta: string) {
    const ls = classificar(a, { ...ctx, contaId: conta })
    setLinhas(ls)
    // Corrigir um valor muda um número: essa parte já abre à vista.
    setVerJa(ls.some(l => l.acao === 'corrigir'))
    setEscolhas(ls.map(l => {
      const e: Escolha = { marcada: true, categoriaId: l.categoriaId, destinoId: l.destinoId }
      return { ...e, marcada: podeGravar(l, e) }
    }))
  }

  async function abrirArquivo(f: File | undefined) {
    if (!f) return
    setErro(''); setNomeArquivo(f.name)
    const lido = lerArquivoDoBanco(decodificarArquivo(new Uint8Array(await f.arrayBuffer())))
    if ('erro' in lido) { setArquivo(null); setLinhas([]); setErro(lido.erro); return }
    setArquivo(lido)
    revisar(lido, contaSel)
  }

  function trocarConta(id: string) {
    setContaSel(id)
    if (arquivo) revisar(arquivo, id)
  }

  function fechar() {
    setArquivo(null); setLinhas([]); setEscolhas([]); setErro(''); setNomeArquivo(''); setVerJa(false); setVerFora(false)
    setContaSel(contaId)
    onFechar()
  }

  const mudar = (i: number, e: Partial<Escolha>) => setEscolhas(prev => prev.map((x, j) => j === i ? { ...x, ...e } : x))

  /** A categoria escolhida numa linha vale para as outras iguais ainda sem categoria. */
  function escolherCategoria(i: number, categoriaId: string) {
    if (categoriaId === '__nova__') { setNovaCatPara(i); return }
    const texto = normalizar(linhas[i].descricao)
    setEscolhas(prev => prev.map((x, j) => {
      if (j === i) return { ...x, categoriaId: categoriaId || undefined, marcada: !!categoriaId }
      const l = linhas[j]
      if (categoriaId && l.acao === 'novo' && !x.categoriaId && l.tipo === linhas[i].tipo && normalizar(l.descricao) === texto)
        return { ...x, categoriaId, marcada: true }
      return x
    }))
  }

  const conta = contas.find(c => c.id === contaSel)
  const gravaveis = linhas.map((l, i) => escolhas[i]?.marcada && podeGravar(l, escolhas[i]))
  const quantas = gravaveis.filter(Boolean).length

  // O saldo que o banco informa no arquivo, contra o do Compass depois da
  // importação. Só no mês de hoje: é o saldo que a Início confere.
  const saldo = useMemo(() => {
    if (!arquivo?.saldo || !conta) return null
    const [a, m] = arquivo.saldo.data.split('-').map(Number)
    if (a !== hoje.getFullYear() || m - 1 !== hoje.getMonth()) return null
    const marcadas = escolhas.map((e, i) => ({ ...e, marcada: !!gravaveis[i] }))
    const depois = aplicarMudancas(extratoData, mudancasDaImportacao(linhas, marcadas, ctx))
    const k = `${conta.id}-${a}-${String(m).padStart(2, '0')}`
    const semInformado = { ...depois, [k]: { ...(depois[k] ?? { lancamentos: {}, saldoBanco: '' }), saldoBanco: '' } }
    const noCompass = saldoFinalConta(conta, a, m - 1, { ...ctx, extratoData: semInformado })
    return { noBanco: arquivo.saldo.valor, data: arquivo.saldo.data, noCompass, chave: k }
  }, [arquivo, conta, escolhas, linhas, extratoData, ctx, hoje]) // eslint-disable-line react-hooks/exhaustive-deps
  const bate = saldo !== null && Math.abs(saldo.noBanco - saldo.noCompass) < 0.005

  function importar() {
    const marcadas = escolhas.map((e, i) => ({ ...e, marcada: !!gravaveis[i] }))
    const m = mudancasDaImportacao(linhas, marcadas, ctx)
    for (const [k, fns] of m) updateExtratoMes(k, dm => fns.reduce((acc, fn) => fn(acc), dm))
    if (bate && saldo) updateExtratoMes(saldo.chave, dm => marcarConferido(dm, hoje))
    toast(`${quantas} ${quantas === 1 ? 'linha importada' : 'linhas importadas'}${bate ? ' · saldo conferido com o banco' : ''}`)
    fechar()
  }

  if (!aberto) return null

  const opcoesCategoria = (tipo: 'entrada' | 'saida') => categorias
    .filter(c => c.ativa && c.tipo === tipo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || (a.descricao ?? '').localeCompare(b.descricao ?? '', 'pt-BR'))
  const destinos = [
    ...contas.filter(c => c.id !== contaSel && (c.tipo === 'corrente' || c.tipo === 'poupanca'))
      .map(c => ({ id: c.id, nome: (c.apelido || c.banco || c.nome) + (c.tipo === 'poupanca' ? ' · Investimento' : '') })),
    { id: CARTEIRA_ID, nome: 'Dinheiro (carteira)' },
  ]

  const grupos: { titulo: string; ajuda: string; idx: number[]; recolhido?: boolean; alternar?: () => void }[] = [
    { titulo: 'Novos lançamentos', ajuda: 'Escolha a categoria. A escolhida numa linha vale para as iguais.',
      idx: linhas.flatMap((l, i) => l.acao === 'novo' ? [i] : []) },
    { titulo: 'Transferências entre suas contas', ajuda: 'Não são receita nem despesa: só mudam o dinheiro de lugar.',
      idx: linhas.flatMap((l, i) => l.acao === 'transferencia' ? [i] : []) },
    { titulo: 'Contas do mês', ajuda: 'Ficam pagas no dia e no valor do banco.',
      idx: linhas.flatMap((l, i) => l.acao === 'fixa' || l.acao === 'fatura' ? [i] : []) },
    { titulo: 'Já estão no Compass', ajuda: 'Não entram de novo. Valor diferente é corrigido para o do banco.',
      idx: linhas.flatMap((l, i) => l.acao === 'ja_lancado' || l.acao === 'corrigir' ? [i] : []),
      recolhido: !verJa, alternar: () => setVerJa(v => !v) },
    { titulo: 'Fora da importação', ajuda: '',
      idx: linhas.flatMap((l, i) => l.acao === 'fora' ? [i] : []),
      recolhido: !verFora, alternar: () => setVerFora(v => !v) },
  ]

  const caixa: CSSProperties = isMobile
    ? { position: 'fixed', inset: 0, background: COR.branco, display: 'flex', flexDirection: 'column', zIndex: 600 }
    : { background: COR.branco, borderRadius: 16, overflow: 'hidden', width: 'min(820px, 100%)', maxHeight: 'calc(100vh - 40px)',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }

  return (
    <div role="presentation" onClick={isMobile ? undefined : fechar}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(15,23,42,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="importar-titulo" onClick={e => e.stopPropagation()} style={caixa}>
        <ModalTopo icone="ti-file-import" rotulo="Lançamentos · Banco" titulo="Importar extrato" id="importar-titulo"
          onFechar={fechar}
          subtitulo={arquivo ? `${nomeArquivo} · ${arquivo.formato} · ${arquivo.transacoes.length} linhas`
            : 'O arquivo que o app ou o site do banco exporta (OFX ou CSV).'} />

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 16px 20px' : '16px 22px 20px' }}>
          {/* Em qual conta. Começa na que está aberta em Lançamentos. */}
          {contasExtrato.length > 1 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontSize: 14, color: COR.texto }}>
              <span style={{ fontWeight: 700 }}>Conta</span>
              <select value={contaSel} onChange={e => trocarConta(e.target.value)} style={campo}>
                {contasExtrato.map(c => <option key={c.id} value={c.id}>{c.apelido || c.banco || c.nome}</option>)}
              </select>
            </label>
          )}

          {!arquivo && (
            <div
              onDragOver={e => { e.preventDefault(); setArrastando(true) }}
              onDragLeave={() => setArrastando(false)}
              onDrop={e => { e.preventDefault(); setArrastando(false); abrirArquivo(e.dataTransfer.files[0]) }}
              style={{ border: `2px dashed ${arrastando ? COR.azul : '#93c5fd'}`, borderRadius: 16,
                background: arrastando ? '#eff6ff' : '#f8faff', padding: isMobile ? '28px 16px' : '36px 20px', textAlign: 'center' }}>
              <i className="ti ti-file-upload" aria-hidden style={{ fontSize: 40, color: COR.azul }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginTop: 8 }}>
                {isMobile ? 'Escolha o arquivo do extrato' : 'Arraste o arquivo do extrato para cá'}
              </div>
              <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 4, lineHeight: 1.5 }}>
                No app ou no site do banco, procure "exportar extrato" e escolha OFX (ou CSV).
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} style={{ ...botaoAzul, marginTop: 14 }}>
                Escolher arquivo
              </button>
              <input ref={inputRef} type="file" accept=".ofx,.csv,.txt,.qfx" hidden
                onChange={e => { abrirArquivo(e.target.files?.[0]); e.target.value = '' }} />
            </div>
          )}

          {erro && (
            <div role="alert" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#fef2f2',
              color: '#b91c1c', fontSize: 13.5, lineHeight: 1.5 }}>{erro}</div>
          )}

          {arquivo && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {grupos.filter(g => g.idx.length).map(g => (
                  <span key={g.titulo} style={pilula}>{g.titulo} · {g.idx.length}</span>
                ))}
              </div>

              {grupos.filter(g => g.idx.length).map(g => (
                <section key={g.titulo} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: COR.texto }}>{g.titulo} · {g.idx.length}</h3>
                    {g.alternar && (
                      <button type="button" onClick={g.alternar} style={linkBotao}>{g.recolhido ? 'Ver' : 'Esconder'}</button>
                    )}
                  </div>
                  {g.ajuda && !g.recolhido && <div style={{ fontSize: 12.5, color: COR.textoSuave, marginBottom: 8 }}>{g.ajuda}</div>}
                  {!g.recolhido && (
                    <div style={{ border: '1px solid #93c5fd', borderRadius: 14, overflow: 'hidden' }}>
                      {g.idx.map((i, n) => (
                        <Linha key={linhas[i].t.id} l={linhas[i]} e={escolhas[i]} primeira={n === 0} isMobile={isMobile}
                          onMarcar={v => mudar(i, { marcada: v })}
                          podeMarcar={linhas[i].acao !== 'fora' && podeGravar(linhas[i], { ...escolhas[i], marcada: true })}>
                          {detalhe(i)}
                        </Linha>
                      ))}
                    </div>
                  )}
                </section>
              ))}

              <button type="button" onClick={() => { setArquivo(null); setLinhas([]); setNomeArquivo('') }} style={linkBotao}>
                Escolher outro arquivo
              </button>
            </>
          )}
        </div>

        {arquivo && (
          <div style={{ borderTop: `1px solid ${COR.borda}`, padding: isMobile ? '12px 16px 18px' : '12px 22px 16px', background: '#f8faff' }}>
            {saldo && (
              <div style={{ fontSize: 13.5, color: COR.texto, marginBottom: 10, lineHeight: 1.5 }}>
                Saldo no banco em {saldo.data.slice(8)}/{saldo.data.slice(5, 7)}: <b>{fmt(saldo.noBanco)}</b> · no Compass, depois de importar: <b>{fmt(saldo.noCompass)}</b>
                <div style={{ fontWeight: 700, color: bate ? '#15803d' : '#b45309' }}>
                  {bate ? '✓ Igual ao banco. O saldo fica conferido.'
                    : saldo.noBanco > saldo.noCompass ? `O banco tem ${fmt(saldo.noBanco - saldo.noCompass)} a mais: falta marcar ou lançar algo.`
                    : `O Compass fica com ${fmt(saldo.noCompass - saldo.noBanco)} a mais: falta marcar ou lançar algo.`}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={fechar} style={botaoBranco}>Cancelar</button>
              <button type="button" onClick={importar} disabled={!quantas}
                style={{ ...botaoAzul, flex: 1, opacity: quantas ? 1 : 0.5, cursor: quantas ? 'pointer' : 'not-allowed' }}>
                Importar {quantas} {quantas === 1 ? 'linha' : 'linhas'}
              </button>
            </div>
          </div>
        )}
      </div>

      <NleNovaCategoria
        aberto={novaCatPara !== null}
        tipo={novaCatPara !== null ? linhas[novaCatPara].tipo : 'saida'}
        isDinheiro={false}
        contaId={contaSel}
        categorias={categorias}
        onFechar={() => setNovaCatPara(null)}
        onCriar={c => {
          setCategorias(prev => [...prev, c])
          if (novaCatPara !== null) mudar(novaCatPara, { categoriaId: c.id, marcada: true })
          setNovaCatPara(null)
        }}
      />
    </div>
  )

  /** O que aparece embaixo da descrição, conforme o que a linha vira. */
  function detalhe(i: number): ReactNode {
    const l = linhas[i], e = escolhas[i]
    if (l.acao === 'fora') return <span>{l.motivo}</span>
    if (l.acao === 'fixa' || l.acao === 'fatura') {
      const f = l.fixa!
      const outro = Math.abs(l.valor - f.previsto) > 0.004
      return <span>
        {f.jaConfirmada ? 'Já estava confirmada' : l.tipo === 'entrada' ? 'Marca como recebida' : 'Marca como paga'}
        {outro ? ` · no app era ${fmt(f.previsto)}, fica ${fmt(l.valor)}` : ' · mesmo valor'}
      </span>
    }
    if (l.acao === 'ja_lancado') return <span>✓ Já lançado em {String(l.existente!.dia).padStart(2, '0')}/{String(l.mes + 1).padStart(2, '0')} como "{l.existente!.descricao}"</span>
    if (l.acao === 'corrigir') return <span>Lançado como "{l.existente!.descricao}" com {fmt(l.existente!.valor)}: corrige para {fmt(l.valor)}</span>
    if (l.acao === 'transferencia') {
      const naoE = e.destinoId === undefined && e.categoriaId !== undefined
      return <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <select aria-label="Para qual conta" value={naoE ? '__nao__' : e.destinoId ?? ''} style={campo}
          onChange={ev => ev.target.value === '__nao__'
            ? mudar(i, { destinoId: undefined, categoriaId: '', marcada: false })
            : mudar(i, { destinoId: ev.target.value, categoriaId: undefined, marcada: true })}>
          {destinos.map(d => <option key={d.id} value={d.id}>{l.tipo === 'saida' ? 'Para' : 'De'} {d.nome}</option>)}
          <option value="__nao__">Não é transferência</option>
        </select>
        {naoE && seletorCategoria(i)}
        {!naoE && outraPontaJaExiste({ ...l, destinoId: e.destinoId }, ctx) && <span>A outra ponta já está lá: entra só aqui.</span>}
      </span>
    }
    return <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {seletorCategoria(i)}
      {l.motivo && <span>{l.motivo}</span>}
    </span>
  }

  function seletorCategoria(i: number) {
    const l = linhas[i], e = escolhas[i]
    return (
      <select aria-label="Categoria" value={e.categoriaId ?? ''} onChange={ev => escolherCategoria(i, ev.target.value)}
        style={{ ...campo, borderColor: e.categoriaId ? COR.borda : '#93c5fd', background: e.categoriaId ? COR.branco : '#eff6ff' }}>
        <option value="">Escolha a categoria</option>
        {opcoesCategoria(l.tipo).map(c => (
          <option key={c.id} value={c.id}>{c.descricao ? `${c.nome} · ${c.descricao}` : c.nome}</option>
        ))}
        <option value="__nova__">+ Nova categoria</option>
      </select>
    )
  }
}

function Linha({ l, e, primeira, isMobile, onMarcar, podeMarcar, children }: {
  l: LinhaImportada; e: Escolha | undefined; primeira: boolean; isMobile: boolean
  onMarcar: (v: boolean) => void; podeMarcar: boolean; children: ReactNode
}) {
  const fora = l.acao === 'fora'
  const marcada = !!e?.marcada && podeMarcar
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: isMobile ? '12px 12px' : '10px 14px',
      borderTop: primeira ? 'none' : '1px solid #e2e8f0', background: fora ? '#f8fafc' : COR.branco }}>
      {!fora && (
        <input type="checkbox" checked={marcada} disabled={!podeMarcar} onChange={ev => onMarcar(ev.target.checked)}
          aria-label="Importar esta linha" style={{ width: 20, height: 20, marginTop: 2, accentColor: COR.azul, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, color: COR.textoSuave, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{ddmm(l)}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: COR.texto,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap' }} title={l.t.descricao}>
            {l.descricao}
          </span>
          <span style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
            color: l.tipo === 'entrada' ? '#15803d' : '#c2410c' }}>
            {l.tipo === 'entrada' ? '+' : '−'} {fmt(l.valor)}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: COR.textoSuave, marginTop: 4, lineHeight: 1.45 }}>
          {l.t.descricao !== l.descricao && <div style={{ marginBottom: 4 }}>No banco: {l.t.descricao}</div>}
          {children}
        </div>
      </div>
    </div>
  )
}

const campo: CSSProperties = {
  flex: 1, minWidth: 0, maxWidth: 360, border: `1.5px solid ${COR.borda}`, borderRadius: 10, padding: '8px 10px',
  fontSize: 14, color: COR.texto, background: COR.branco, fontFamily: 'inherit',
}
const pilula: CSSProperties = {
  fontSize: 12.5, fontWeight: 700, color: '#1e3a8a', background: '#eaf1fd', borderRadius: 999, padding: '4px 10px',
}
const linkBotao: CSSProperties = {
  border: 'none', background: 'none', color: COR.azul, fontWeight: 700, fontSize: 13, cursor: 'pointer',
  padding: 0, fontFamily: 'inherit',
}
const botaoAzul: CSSProperties = {
  padding: '11px 18px', border: 'none', borderRadius: 12, background: 'var(--cx-azul)', color: '#fff',
  fontSize: 14.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
}
const botaoBranco: CSSProperties = {
  padding: '11px 16px', borderRadius: 12, border: `1.5px solid ${COR.borda}`, background: COR.branco,
  color: COR.texto, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
