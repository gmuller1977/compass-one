import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { parseBRL } from '../utils/moeda'
import { COR } from '../utils/cores'
import { marcarVisto } from '../utils/vistoNaConta'
import { TOPO_AZUL, BOLINHA_AZUL } from '../components/mobile/estilo'
import {
  CONTAS_DO_MES, DIA_A_DIA, aplicarRespostas, resumoDasRespostas, fechamentoDoVencimento,
  CHAVE_PRIMEIRO_ACESSO, type FormaDaConta, type Respostas,
} from '../utils/primeiroAcesso'

/**
 * O primeiro acesso de uma conta nova (17/10/2026, protótipo aprovado pelo
 * Guilherme). Cinco perguntas, uma por tela, sobre o que a pessoa sabe de
 * cabeça, e um resultado que já mostra o mês dela. Tudo aproximado e tudo
 * pulável. O que cada resposta vira está em utils/primeiroAcesso.
 *
 * "Prefiro configurar tudo sozinho" leva para Configurações, como antes.
 */

const BANCOS = ['Nubank', 'Itaú', 'Bradesco', 'Caixa', 'Banco do Brasil', 'Santander', 'Inter', 'C6 Bank', 'Sicredi', 'Outro']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const TOTAL = 5

const FORMAS: { id: FormaDaConta; rotulo: string }[] = [
  { id: 'manual', rotulo: 'Eu pago (PIX, boleto)' },
  { id: 'automatico', rotulo: 'Débito automático' },
  { id: 'cartao', rotulo: 'No cartão' },
  { id: 'dinheiro', rotulo: 'Em dinheiro' },
]

const R = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// Gráfico sobre branco: 3:1 no mínimo (CLAUDE.md).
const BARRA = { contas: '#1e40af', dia: '#b45309', parcelas: '#3b82f6', sobra: '#16a34a' }

type Estado = {
  banco: string; bancoOutro: string; saldo: string
  renda: string; diaRenda: number
  usaCartao: '' | 'sim' | 'nao'; cartao: string; venc: number
  outrosBancos: { banco: string; saldo: string }[]
  outrosCartoes: { cartao: string; venc: number }[]
  contas: Record<string, { valor: string; dia: string; forma: FormaDaConta }>
  outrasContas: { nome: string; valor: string; dia: string; forma: FormaDaConta }[]
  diaADia: Record<string, string>
  outrosGastos: { nome: string; valor: string }[]
  parcelas: { nome: string; valor: string; faltam: string }[]
  meta: string
}

const INICIAL: Estado = {
  banco: '', bancoOutro: '', saldo: '', renda: '', diaRenda: 0, usaCartao: '', cartao: '', venc: 0,
  outrosBancos: [], outrosCartoes: [], contas: {}, outrasContas: [], diaADia: {}, outrosGastos: [], parcelas: [], meta: '',
}

export default function PrimeiroAcesso() {
  const navigate = useNavigate()
  const { user, perfil, contas, categorias, planos, setContas, setCategorias, setPlanos, setOnboardingCompleto } = useApp()
  const [passo, setPasso] = useState(0)
  const [e, setE] = useState<Estado>(INICIAL)
  const topoRef = useRef<HTMLDivElement>(null)
  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setE(p => ({ ...p, [k]: v }))

  const nomeCompleto = (perfil.nome || (user?.user_metadata?.nome as string | undefined) || '').trim()
  const nome = (perfil.apelido || nomeCompleto).split(' ')[0]

  useEffect(() => { topoRef.current?.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0) }, [passo])

  const banco = e.banco === 'Outro' ? e.bancoOutro.trim() : e.banco
  const respostas: Respostas = {
    banco,
    saldo: parseBRL(e.saldo),
    renda: parseBRL(e.renda),
    diaRenda: e.diaRenda,
    usaCartao: e.usaCartao === 'sim',
    cartao: e.cartao,
    vencimento: e.venc,
    outrosBancos: e.outrosBancos.map(b => ({ banco: b.banco, saldo: parseBRL(b.saldo) })),
    outrosCartoes: e.outrosCartoes.map(c => ({ cartao: c.cartao, vencimento: c.venc })),
    outrasContas: e.outrasContas.map(c => ({ nome: c.nome, valor: parseBRL(c.valor), dia: Math.min(31, parseInt(c.dia) || 0), forma: c.forma })),
    outrosGastos: e.outrosGastos.map(g => ({ nome: g.nome, valor: parseBRL(g.valor) })),
    contas: Object.fromEntries(Object.entries(e.contas).map(([id, c]) => [id, {
      valor: parseBRL(c.valor), dia: Math.min(31, Math.max(0, parseInt(c.dia) || 0)), forma: c.forma,
    }])),
    diaADia: Object.fromEntries(Object.entries(e.diaADia).map(([id, v]) => [id, parseBRL(v)])),
    parcelas: e.parcelas.map(p => ({ nome: p.nome.trim() || 'Compra parcelada', valor: parseBRL(p.valor), faltam: parseInt(p.faltam) || 1 })),
    meta: parseBRL(e.meta),
  }

  function concluir(destino: string) {
    const ano = new Date().getFullYear()
    const r = aplicarRespostas({ r: respostas, nomeTitular: nomeCompleto, contas, categorias, planoDoAno: planos[ano] })
    setContas(r.contas)
    setCategorias(r.categorias)
    setPlanos(prev => ({ ...prev, [ano]: r.plano }))
    setOnboardingCompleto(true)
    void marcarVisto(user, CHAVE_PRIMEIRO_ACESSO)
    navigate(destino, { replace: true })
  }

  function configurarSozinho() {
    void marcarVisto(user, CHAVE_PRIMEIRO_ACESSO)
    navigate('/configuracoes', { replace: true })
  }

  const seguir = () => setPasso(p => Math.min(TOTAL + 1, p + 1))
  const voltar = passo > 0 ? () => setPasso(p => p - 1) : undefined

  let titulo = '', sub = '', corpo: ReactNode = null, pe: ReactNode = null

  if (passo === 0) {
    titulo = nome ? `Que bom ter você aqui, ${nome}!` : 'Que bom ter você aqui!'
    sub = 'Vamos olhar juntos para o seu dinheiro, sem planilha e sem complicação.'
    corpo = (
      <Cartao>
        <p style={ola}><b style={{ color: COR.texto }}>Para te ajudar, preciso te conhecer um pouco melhor.</b> Vamos lá?</p>
        <Ponto icone="ti-pencil">Pode ser tudo <b style={{ color: COR.texto }}>aproximado</b>. Dá para ajustar depois, quando quiser.</Ponto>
        <Ponto icone="ti-calendar">Não sabe alguma resposta? <b style={{ color: COR.texto }}>Pule</b>. O app descobre com o tempo.</Ponto>
        <Ponto icone="ti-lock">Nunca pedimos <b style={{ color: COR.texto }}>senha do banco</b>. Você conta só o que quiser.</Ponto>
      </Cartao>
    )
    pe = <Pe rotulo="Vamos lá" onSeguir={seguir} pular="Prefiro configurar tudo sozinho" onPular={configurarSozinho} />
  }

  if (passo === 1) {
    titulo = 'Em qual banco cai o seu salário?'
    sub = 'É por ele que a gente começa.'
    corpo = (<>
      <Cartao><Chips lista={BANCOS} valor={e.banco} onEscolher={v => set('banco', v)} /></Cartao>
      {e.banco && (
        <Cartao>
          {e.banco === 'Outro' && (<>
            <Rotulo>Qual banco?</Rotulo>
            <Campo valor={e.bancoOutro} onMudar={v => set('bancoOutro', v)} placeholder="Nome do banco" texto />
          </>)}
          <Rotulo>Quanto tem lá hoje, mais ou menos?</Rotulo>
          <Campo valor={e.saldo} onMudar={v => set('saldo', v)} placeholder="0" />
          <Dica>Um valor redondo já serve. Se não lembrar, deixe em branco.</Dica>
        </Cartao>
      )}
      {banco && (
        <Cartao>
          <Rotulo>Tem dinheiro em outro banco também?</Rotulo>
          {e.outrosBancos.map((b, i) => (
            <Bloco key={i} onRemover={() => set('outrosBancos', e.outrosBancos.filter((_, j) => j !== i))}>
              <Chips pequeno lista={BANCOS.filter(x => x !== 'Outro' && x !== e.banco)} valor={b.banco}
                onEscolher={v => set('outrosBancos', e.outrosBancos.map((q, j) => (j === i ? { ...q, banco: v } : q)))} />
              {b.banco && (<><Mini>Quanto tem lá hoje, mais ou menos?</Mini>
                <Campo valor={b.saldo} onMudar={v => set('outrosBancos', e.outrosBancos.map((q, j) => (j === i ? { ...q, saldo: v } : q)))} placeholder="0" pequeno /></>)}
            </Bloco>
          ))}
          <Adicionar onClick={() => set('outrosBancos', [...e.outrosBancos, { banco: '', saldo: '' }])}>Adicionar outro banco</Adicionar>
        </Cartao>
      )}
    </>)
    pe = <Pe rotulo="Continuar" onSeguir={seguir} desabilitado={!banco} />
  }

  if (passo === 2) {
    titulo = 'Quanto você recebe por mês?'
    sub = 'O que cai na conta, já com os descontos.'
    corpo = (
      <Cartao>
        <Campo valor={e.renda} onMudar={v => set('renda', v)} placeholder="0" />
        <Rotulo>Em que dia costuma cair?</Rotulo>
        <Chips lista={[1, 5, 10, 15, 20, 25, 30].map(d => `Dia ${d}`)} valor={e.diaRenda ? `Dia ${e.diaRenda}` : ''}
          onEscolher={v => set('diaRenda', parseInt(v.slice(4)))} />
      </Cartao>
    )
    pe = <Pe rotulo="Continuar" onSeguir={seguir} desabilitado={!(respostas.renda > 0)} pular="Prefiro não dizer agora" onPular={() => { set('renda', ''); seguir() }} />
  }

  if (passo === 3) {
    titulo = 'Você usa cartão de crédito?'
    sub = 'Assim a gente sabe em que mês cada compra pesa no bolso.'
    corpo = (<>
      <Cartao><Chips lista={['Uso', 'Não uso']} valor={e.usaCartao === 'sim' ? 'Uso' : e.usaCartao === 'nao' ? 'Não uso' : ''}
        onEscolher={v => set('usaCartao', v === 'Uso' ? 'sim' : 'nao')} /></Cartao>
      {e.usaCartao === 'sim' && (
        <Cartao>
          <Rotulo>De qual banco?</Rotulo>
          <Chips lista={BANCOS.filter(b => b !== 'Outro')} valor={e.cartao} onEscolher={v => set('cartao', v)} />
          <Rotulo>Em que dia vence a fatura?</Rotulo>
          <Chips lista={[1, 5, 10, 15, 20, 25].map(d => `Dia ${d}`)} valor={e.venc ? `Dia ${e.venc}` : ''}
            onEscolher={v => set('venc', parseInt(v.slice(4)))} />
          <Dica>
            {e.venc
              ? `Vamos considerar que a fatura fecha no dia ${fechamentoDoVencimento(e.venc)}, uma semana antes. Se for outro dia, você ajusta em Configurações.`
              : 'Tem mais de um cartão? Dá para adicionar os outros logo abaixo.'}
          </Dica>
          {e.outrosCartoes.map((c, i) => (
            <Bloco key={i} onRemover={() => set('outrosCartoes', e.outrosCartoes.filter((_, j) => j !== i))}>
              <Mini>Outro cartão: de qual banco?</Mini>
              <Chips pequeno lista={BANCOS.filter(b => b !== 'Outro')} valor={c.cartao}
                onEscolher={v => set('outrosCartoes', e.outrosCartoes.map((q, j) => (j === i ? { ...q, cartao: v } : q)))} />
              <Mini>Vence no dia</Mini>
              <Chips pequeno lista={[1, 5, 10, 15, 20, 25].map(d => `Dia ${d}`)} valor={c.venc ? `Dia ${c.venc}` : ''}
                onEscolher={v => set('outrosCartoes', e.outrosCartoes.map((q, j) => (j === i ? { ...q, venc: parseInt(v.slice(4)) } : q)))} />
            </Bloco>
          ))}
          {e.cartao && e.venc > 0 && (
            <Adicionar onClick={() => set('outrosCartoes', [...e.outrosCartoes, { cartao: '', venc: 0 }])}>Adicionar outro cartão</Adicionar>
          )}
        </Cartao>
      )}
    </>)
    pe = <Pe rotulo="Continuar" onSeguir={seguir} desabilitado={!(e.usaCartao === 'nao' || (e.cartao && e.venc))} />
  }

  if (passo === 4) {
    const formas = FORMAS.filter(f => f.id !== 'cartao' || e.usaCartao === 'sim')
    titulo = 'Quais contas você paga todo mês?'
    sub = 'Toque nas suas. Um valor aproximado já serve.'
    corpo = (<>
      <Cartao>
        {CONTAS_DO_MES.map(item => {
          const v = e.contas[item.id]
          const on = !!v
          return (
            <Item key={item.id} icone={item.icone} rotulo={item.rotulo} on={on}
              onTocar={() => setE(p => {
                const contas = { ...p.contas }
                if (contas[item.id]) delete contas[item.id]
                else contas[item.id] = { valor: '', dia: '', forma: 'manual' }
                return { ...p, contas }
              })}>
              {on && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8 }}>
                  <div><Mini>Quanto, mais ou menos</Mini>
                    <Campo valor={v.valor} onMudar={x => setE(p => ({ ...p, contas: { ...p.contas, [item.id]: { ...p.contas[item.id], valor: x } } }))} placeholder="0" pequeno autoFoco /></div>
                  <div><Mini>Dia</Mini>
                    <Campo valor={v.dia} onMudar={x => setE(p => ({ ...p, contas: { ...p.contas, [item.id]: { ...p.contas[item.id], dia: x.replace(/\D/g, '').slice(0, 2) } } }))} placeholder="10" pequeno numerico /></div>
                </div>
                <Mini>Como você paga?</Mini>
                <Chips pequeno lista={formas.map(f => f.rotulo)} valor={FORMAS.find(f => f.id === v.forma)?.rotulo ?? ''}
                  onEscolher={x => setE(p => ({ ...p, contas: { ...p.contas, [item.id]: { ...p.contas[item.id], forma: FORMAS.find(f => f.rotulo === x)!.id } } }))} />
              </>)}
            </Item>
          )
        })}
        {e.outrasContas.map((c, i) => {
          const mudar = (k: 'nome' | 'valor' | 'dia' | 'forma', x: string) =>
            set('outrasContas', e.outrasContas.map((q, j) => (j === i ? { ...q, [k]: k === 'dia' ? x.replace(/\D/g, '').slice(0, 2) : x } : q)))
          return (
            <Bloco key={i} onRemover={() => set('outrasContas', e.outrasContas.filter((_, j) => j !== i))}>
              <NomeLivre valor={c.nome} onMudar={x => mudar('nome', x)} placeholder="Qual conta? Ex.: Condomínio" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8 }}>
                <div><Mini>Quanto, mais ou menos</Mini><Campo valor={c.valor} onMudar={x => mudar('valor', x)} placeholder="0" pequeno /></div>
                <div><Mini>Dia</Mini><Campo valor={c.dia} onMudar={x => mudar('dia', x)} placeholder="10" pequeno numerico /></div>
              </div>
              <Mini>Como você paga?</Mini>
              <Chips pequeno lista={formas.map(f => f.rotulo)} valor={FORMAS.find(f => f.id === c.forma)?.rotulo ?? ''}
                onEscolher={x => mudar('forma', FORMAS.find(f => f.rotulo === x)!.id)} />
            </Bloco>
          )
        })}
        <Adicionar onClick={() => set('outrasContas', [...e.outrasContas, { nome: '', valor: '', dia: '', forma: 'manual' }])}>Outra conta</Adicionar>
        <Dica>Só as que você lembra. As outras aparecem quando você anotar os gastos.</Dica>
      </Cartao>
      <Cartao>
        <Rotulo>E no dia a dia, quanto vai por mês?</Rotulo>
        <p style={ola}>Mercado, combustível, farmácia... Não precisa saber certinho: um chute já ajuda.</p>
        {DIA_A_DIA.map(item => {
          const v = e.diaADia[item.id]
          const on = v !== undefined
          return (
            <Item key={item.id} icone={item.icone} rotulo={item.rotulo} on={on}
              onTocar={() => setE(p => {
                const diaADia = { ...p.diaADia }
                if (diaADia[item.id] !== undefined) delete diaADia[item.id]
                else diaADia[item.id] = ''
                return { ...p, diaADia }
              })}>
              {on && (<div><Mini>Por mês, mais ou menos</Mini>
                <Campo valor={v} onMudar={x => setE(p => ({ ...p, diaADia: { ...p.diaADia, [item.id]: x } }))} placeholder="0" pequeno autoFoco /></div>)}
            </Item>
          )
        })}
        {e.outrosGastos.map((g, i) => (
          <Bloco key={i} onRemover={() => set('outrosGastos', e.outrosGastos.filter((_, j) => j !== i))}>
            <NomeLivre valor={g.nome} onMudar={x => set('outrosGastos', e.outrosGastos.map((q, j) => (j === i ? { ...q, nome: x } : q)))} placeholder="Qual gasto? Ex.: Pet" />
            <div><Mini>Por mês, mais ou menos</Mini>
              <Campo valor={g.valor} onMudar={x => set('outrosGastos', e.outrosGastos.map((q, j) => (j === i ? { ...q, valor: x } : q)))} placeholder="0" pequeno /></div>
          </Bloco>
        ))}
        <Adicionar onClick={() => set('outrosGastos', [...e.outrosGastos, { nome: '', valor: '' }])}>Outro gasto</Adicionar>
        <Dica>Não faz ideia? Tudo bem, pule. Em 30 dias anotando, o app descobre para você.</Dica>
      </Cartao>
    </>)
    pe = <Pe rotulo="Continuar" onSeguir={seguir} />
  }

  if (passo === 5) {
    titulo = 'Tem compras parceladas ainda sendo pagas?'
    sub = 'Muita gente tem, é super comum. Anotar aqui mostra quando cada uma termina.'
    const mudar = (i: number, k: 'nome' | 'valor' | 'faltam', x: string) =>
      setE(p => ({ ...p, parcelas: p.parcelas.map((q, j) => (j === i ? { ...q, [k]: k === 'faltam' ? x.replace(/\D/g, '').slice(0, 3) : x } : q)) }))
    corpo = (
      <Cartao>
        {e.parcelas.map((p, i) => (
          <div key={i} style={{ border: `1.5px solid ${COR.borda}`, borderRadius: 16, padding: 12, display: 'grid', gap: 8 }}>
            <input value={p.nome} onChange={ev => mudar(i, 'nome', ev.target.value)} placeholder="O que foi? Ex.: Geladeira"
              aria-label="O que foi comprado" autoFocus={!p.nome && !p.valor}
              style={{ border: 'none', borderBottom: `1.5px solid ${COR.borda}`, font: 'inherit', fontSize: 16, fontWeight: 700,
                padding: '6px 0', outline: 'none', color: COR.texto, background: 'transparent' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8 }}>
              <div><Mini>Valor da parcela</Mini><Campo valor={p.valor} onMudar={x => mudar(i, 'valor', x)} placeholder="0" pequeno /></div>
              <div><Mini>Faltam</Mini><Campo valor={p.faltam} onMudar={x => mudar(i, 'faltam', x)} placeholder="6" pequeno numerico /></div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set('parcelas', [...e.parcelas, { nome: '', valor: '', faltam: '' }])} style={chip(false)}>
          <i className="ti ti-shopping-bag" aria-hidden style={{ fontSize: 18 }} /> Adicionar uma compra parcelada
        </button>
        <Dica>Não precisa ser exato. "Faltam" é quantas parcelas ainda vão vir, contando a deste mês.</Dica>
      </Cartao>
    )
    pe = <Pe rotulo={e.parcelas.length ? 'Ver o resultado' : 'Não tenho, ver o resultado'} onSeguir={seguir} />
  }

  if (passo === 6) {
    const s = resumoDasRespostas(respostas)
    const hoje = new Date()
    const semRenda = s.renda <= 0
    const pct = (v: number) => (s.renda > 0 ? Math.max(0, Math.min(100, (v / s.renda) * 100)) : 0)
    const mesFim = (() => { const t = hoje.getMonth() + s.mesesDeParcela - 1; return `${MESES[t % 12]} de ${hoje.getFullYear() + Math.floor(t / 12)}` })()
    const meta = respostas.meta
    titulo = nome ? `Pronto, ${nome}! Olha o que já descobrimos` : 'Pronto! Olha o que já descobrimos'
    sub = 'Com o que você contou, já dá para ver o seu mês de um jeito novo.'
    const destaque = semRenda
      ? <p style={ola}>Quando você anotar o que entra e o que sai, a gente mostra aqui quanto sobra por mês.</p>
      : s.sobra >= 0 && s.diaADia > 0 ? (<>
          <Rotulo>Sobra no fim do mês</Rotulo>
          <div style={numeroGrande}>{R(s.sobra)}</div>
          <p style={ola}>É o que fica do seu salário depois das contas{s.parcelas ? ', do dia a dia e das parcelas' : ' e do dia a dia'}. Como o dia a dia foi um chute, em 30 dias a gente confere esse número com os seus gastos de verdade.</p>
        </>)
      : s.sobra >= 0 ? (<>
          <Rotulo>Sobra para o dia a dia</Rotulo>
          <div style={numeroGrande}>{R(s.sobra)}</div>
          <p style={ola}>É o que fica depois das contas{s.parcelas ? ' e das parcelas' : ''}. <b style={{ color: COR.texto }}>Daqui ainda saem</b> mercado, combustível, farmácia e o resto. Em 30 dias anotando, a gente descobre quanto vai nisso e quanto sobra de verdade.</p>
        </>)
      : (<>
          <Rotulo>Seu mês hoje</Rotulo>
          <p style={ola}>Somando tudo o que você contou, os gastos passam um pouco do salário. <b style={{ color: COR.texto }}>Calma:</b> isso é mais comum do que parece, e é exatamente aqui que o Compass One vai te ajudar, um passo de cada vez.</p>
        </>)
    let respostaMeta: string | null = null
    if (meta > 0 && !semRenda) {
      if (s.sobra >= meta) respostaMeta = `Dá para guardar ${R(meta)}${s.diaADia ? '' : ', se o dia a dia couber no resto'}. A gente te mostra ao longo do mês se você está no caminho.`
      else if (s.sobra > 0) respostaMeta = `Hoje sobram ${R(s.sobra)}, faltam ${R(meta - s.sobra)} para a sua meta. Nos próximos 30 dias a gente te mostra onde dá para ajustar.`
      else respostaMeta = `Primeiro a gente equilibra o mês, depois começa a guardar. Sua meta de ${R(meta)} fica anotada.`
    }
    corpo = (<>
      <Cartao>
        {destaque}
        {!semRenda && (<>
          <div role="img" aria-label={`Contas ${R(s.contas)}, dia a dia ${R(s.diaADia)}, parcelas ${R(s.parcelas)}, sobra ${R(Math.max(0, s.sobra))}`}
            style={{ display: 'flex', height: 18, borderRadius: 9, overflow: 'hidden', background: '#e2e8f0' }}>
            <i style={{ width: `${pct(s.contas)}%`, background: BARRA.contas }} />
            <i style={{ width: `${pct(s.diaADia)}%`, background: BARRA.dia }} />
            <i style={{ width: `${pct(s.parcelas)}%`, background: BARRA.parcelas }} />
            <i style={{ width: `${pct(Math.max(0, s.sobra))}%`, background: BARRA.sobra }} />
          </div>
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            <Legenda cor={BARRA.contas} rotulo="Contas do mês" valor={s.contas} />
            {s.diaADia > 0 && <Legenda cor={BARRA.dia} rotulo="Dia a dia (estimado)" valor={s.diaADia} />}
            {s.parcelas > 0 && <Legenda cor={BARRA.parcelas} rotulo="Parcelas" valor={s.parcelas} />}
            <Legenda cor={BARRA.sobra} rotulo={s.diaADia ? 'Sobra' : 'Sobra para o dia a dia'} valor={Math.max(0, s.sobra)} />
          </div>
        </>)}
        {s.mesesDeParcela > 0 && (
          <div style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 700, color: COR.sucessoTexto, background: '#f0fdf4',
            padding: '6px 11px', borderRadius: 12, lineHeight: 1.4 }}>
            Suas parcelas terminam em {mesFim}. Depois disso, sobram mais {R(s.parcelas)} por mês.
          </div>
        )}
      </Cartao>
      {!semRenda && (
        <Cartao>
          <Rotulo>Quanto você quer guardar por mês?</Rotulo>
          <p style={ola}>Pode ser pouco. Começar já faz diferença.</p>
          <Chips lista={['R$ 100', 'R$ 200', 'R$ 300', 'R$ 500']} valor={e.meta ? `R$ ${e.meta}` : ''}
            onEscolher={v => set('meta', v.slice(3))} />
          <Campo valor={e.meta} onMudar={v => set('meta', v)} placeholder="Outro valor" />
          {respostaMeta && <Dica>{respostaMeta}</Dica>}
          {meta > 0 && <Dica>Fica como a sua meta de economia de cada mês no Planejamento, até dezembro.</Dica>}
        </Cartao>
      )}
      <Cartao>
        <Rotulo>Agora, o seu próximo passo</Rotulo>
        <p style={ola}>Anote seus gastos por <b style={{ color: COR.texto }}>30 dias</b>, do jeito que der. Leva poucos segundos cada um. Não precisa acertar tudo: é só para conhecer o seu mês de verdade.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'center', fontSize: 12, color: COR.textoSuave }}>
          <Etapa icone="ti-pencil" forte titulo="Hoje">anote o primeiro gasto</Etapa>
          <Etapa icone="ti-calendar" titulo="30 dias">anotando o dia a dia</Etapa>
          <Etapa icone="ti-compass" titulo={(m => m[0].toUpperCase() + m.slice(1))(MESES[(hoje.getMonth() + 1) % 12])}>seu plano pronto</Etapa>
        </div>
      </Cartao>
    </>)
    pe = <Pe rotulo="Anotar meu primeiro gasto" onSeguir={() => concluir('/lancar')} pular="Agora não, só quero olhar o app" onPular={() => concluir('/')} />
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#f2f5fc', display: 'flex', justifyContent: 'center' }}>
      <div ref={topoRef} style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: TOPO_AZUL, color: '#fff', padding: '22px 22px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>
            {voltar && (
              <button type="button" onClick={voltar} aria-label="Voltar" style={{ background: 'rgba(255,255,255,.14)', border: 'none', color: '#fff',
                width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-chevron-left" aria-hidden style={{ fontSize: 18 }} />
              </button>
            )}
            <i className="ti ti-compass" aria-hidden style={{ fontSize: 20 }} /> Compass One
          </div>
          {passo >= 1 && passo <= TOTAL && (
            <div style={{ display: 'flex', gap: 5, marginTop: 16 }} aria-label={`Pergunta ${passo} de ${TOTAL}`} role="img">
              {Array.from({ length: TOTAL }, (_, i) => (
                <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < passo ? '#fff' : 'rgba(255,255,255,.25)' }} />
              ))}
            </div>
          )}
          <h1 style={{ fontSize: 23, lineHeight: 1.25, margin: '14px 0 0', textWrap: 'balance' } as CSSProperties}>{titulo}</h1>
          {sub && <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(255,255,255,.85)', lineHeight: 1.5 }}>{sub}</p>}
        </div>
        <div style={{ flex: 1, padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: -14 }}>{corpo}</div>
        <div style={{ padding: '12px 16px 26px' }}>{pe}</div>
      </div>
    </div>
  )
}

// ── Peças ─────────────────────────────────────────────────────────────

const ola: CSSProperties = { fontSize: 15, lineHeight: 1.6, color: COR.textoSuave, margin: 0 }
const numeroGrande: CSSProperties = { fontSize: 34, fontWeight: 800, color: COR.sucessoTexto, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }

function chip(on: boolean, pequeno?: boolean): CSSProperties {
  return {
    font: 'inherit', fontSize: pequeno ? 13 : 14, fontWeight: 600, padding: pequeno ? '8px 12px' : '10px 14px', minHeight: pequeno ? 40 : 44,
    borderRadius: 999, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
    border: `1.5px solid ${on ? '#1a56db' : '#dbe3f0'}`, background: on ? '#eff6ff' : '#fff', color: on ? '#1e40af' : COR.texto,
  }
}

function Cartao({ children }: { children: ReactNode }) {
  return <div style={{ background: '#fff', borderRadius: 20, padding: 16, boxShadow: '0 4px 16px rgba(30,64,175,.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
}

function Rotulo({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: COR.textoSuave }}>{children}</div>
}

function Mini({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: COR.textoSuave, marginBottom: 4 }}>{children}</div>
}

function Dica({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <i className="ti ti-info-circle" aria-hidden style={{ fontSize: 16, color: '#1a56db', marginTop: 1 }} /><span>{children}</span>
    </div>
  )
}

function Ponto({ icone, children }: { icone: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: '#eff6ff', color: '#1e40af',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={`ti ${icone}`} aria-hidden style={{ fontSize: 20 }} /></span>
      <p style={ola}>{children}</p>
    </div>
  )
}

function Chips({ lista, valor, onEscolher, pequeno }: { lista: string[]; valor: string; onEscolher: (v: string) => void; pequeno?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {lista.map(v => (
        <button key={v} type="button" aria-pressed={valor === v} onClick={() => onEscolher(v)} style={chip(valor === v, pequeno)}>{v}</button>
      ))}
    </div>
  )
}

function Campo({ valor, onMudar, placeholder, pequeno, numerico, texto, autoFoco }: {
  valor: string; onMudar: (v: string) => void; placeholder: string; pequeno?: boolean; numerico?: boolean; texto?: boolean; autoFoco?: boolean
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #dbe3f0', borderRadius: 14, padding: '0 14px',
      minHeight: pequeno ? 46 : 52, background: '#fff' }}>
      {!numerico && !texto && <span style={{ fontWeight: 700, color: COR.textoSuave }}>R$</span>}
      <input value={valor} onChange={ev => onMudar(ev.target.value)} placeholder={placeholder} autoFocus={autoFoco}
        inputMode={texto ? 'text' : numerico ? 'numeric' : 'decimal'}
        style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: pequeno ? 16 : 20, fontWeight: 700, width: '100%', minWidth: 0,
          color: COR.texto, background: 'transparent', fontVariantNumeric: 'tabular-nums' }} />
    </label>
  )
}

function Item({ icone, rotulo, on, onTocar, children }: { icone: string; rotulo: string; on: boolean; onTocar: () => void; children: ReactNode }) {
  return (
    <div style={{ border: `1.5px solid ${on ? '#93c5fd' : '#dbe3f0'}`, background: on ? '#f8fbff' : '#fff', borderRadius: 16, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button type="button" aria-pressed={on} onClick={onTocar} style={{ font: 'inherit', background: 'none', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', cursor: 'pointer', textAlign: 'left', color: COR.texto }}>
        <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: on ? BOLINHA_AZUL : '#eff6ff', color: on ? '#fff' : '#1e40af' }}><i className={`ti ${icone}`} aria-hidden style={{ fontSize: 20 }} /></span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>{rotulo}</span>
        <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${on ? '#1a56db' : '#dbe3f0'}`, background: on ? '#1a56db' : 'transparent', color: '#fff' }}>
          {on && <i className="ti ti-check" style={{ fontSize: 14 }} />}
        </span>
      </button>
      {children}
    </div>
  )
}

function Bloco({ children, onRemover }: { children: ReactNode; onRemover: () => void }) {
  return (
    <div style={{ border: '1.5px solid #93c5fd', background: '#f8fbff', borderRadius: 16, padding: '12px 40px 12px 12px', display: 'grid', gap: 8, position: 'relative' }}>
      <button type="button" onClick={onRemover} aria-label="Remover" style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32,
        borderRadius: '50%', border: 'none', background: 'transparent', color: COR.textoSuave, cursor: 'pointer' }}>
        <i className="ti ti-x" aria-hidden style={{ fontSize: 16 }} />
      </button>
      {children}
    </div>
  )
}

function NomeLivre({ valor, onMudar, placeholder }: { valor: string; onMudar: (v: string) => void; placeholder: string }) {
  return (
    <input value={valor} onChange={ev => onMudar(ev.target.value)} placeholder={placeholder} aria-label={placeholder} autoFocus={!valor}
      maxLength={40} style={{ border: 'none', borderBottom: `1.5px solid ${COR.borda}`, font: 'inherit', fontSize: 16, fontWeight: 700,
        padding: '6px 36px 6px 0', outline: 'none', color: COR.texto, background: 'transparent' }} />
  )
}

function Adicionar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...chip(false), alignSelf: 'flex-start', color: '#1e40af' }}>
      <i className="ti ti-plus" aria-hidden style={{ fontSize: 18 }} /> {children}
    </button>
  )
}

function Legenda({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COR.texto }}>
      <span style={{ width: 12, height: 12, borderRadius: 4, background: cor, flexShrink: 0 }} />{rotulo}
      <span style={{ marginLeft: 'auto', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{R(valor)}</span>
    </div>
  )
}

function Etapa({ icone, titulo, forte, children }: { icone: string; titulo: string; forte?: boolean; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: forte ? BOLINHA_AZUL : '#eff6ff', color: forte ? '#fff' : '#1e40af' }}><i className={`ti ${icone}`} aria-hidden style={{ fontSize: 20 }} /></span>
      <b style={{ color: COR.texto, fontSize: 13 }}>{titulo}</b>{children}
    </div>
  )
}

function Pe({ rotulo, onSeguir, desabilitado, pular, onPular }: { rotulo: string; onSeguir: () => void; desabilitado?: boolean; pular?: string; onPular?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button type="button" onClick={onSeguir} disabled={desabilitado} style={{ font: 'inherit', fontSize: 16, fontWeight: 700, minHeight: 52,
        borderRadius: 16, border: 'none', background: BOLINHA_AZUL, color: '#fff', cursor: desabilitado ? 'default' : 'pointer', opacity: desabilitado ? 0.45 : 1 }}>
        {rotulo}
      </button>
      {pular && onPular && (
        <button type="button" onClick={onPular} style={{ font: 'inherit', fontSize: 14, fontWeight: 600, background: 'none', border: 'none',
          color: '#1a56db', cursor: 'pointer', padding: 6 }}>{pular}</button>
      )}
    </div>
  )
}
