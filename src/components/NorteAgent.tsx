import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import NortePanel from './NortePanel'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

export type Mensagem = { role: 'user' | 'assistant'; content: string; ts: number }

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const SYSTEM_PROMPT = `Você é o Norte, assistente financeiro pessoal do app Compass One.

## Quem você é
- Consultor financeiro amigável, direto e prático
- Você conhece todos os dados financeiros do usuário (fornecidos abaixo)
- Você NÃO inventa dados — só responde com base no que está no contexto
- Se não tem a informação, diga "Não tenho essa informação nos seus dados"
- Responda em português brasileiro, de forma clara e sem jargão financeiro
- Use emojis com moderação para tornar as respostas mais visuais
- Formate valores monetários no padrão brasileiro (R$ X.XXX,XX)
- Seja breve — respostas curtas e diretas, máximo 3-4 parágrafos
- Quando relevante, dê uma dica prática no final

## O que você pode fazer (Fase 1 — apenas consulta)
- Informar saldos de contas e limites de cartões
- Resumir receitas e despesas do mês
- Comparar planejado vs realizado
- Identificar maiores gastos por categoria
- Analisar tendências (mês atual vs anteriores)
- Dar dicas personalizadas baseadas nos dados reais
- Responder sobre faturas de cartão

## O que você NÃO pode fazer (ainda)
- Registrar lançamentos (diga: "Em breve você poderá lançar gastos por aqui!")
- Alterar planejamento (diga: "Ainda não consigo alterar dados, mas posso te ajudar a analisar o que você tem.")
- Fazer simulações (diga: "Para simulações, use o Simulador no menu Meu Plano!")
- Acessar dados bancários reais (você só vê o que o usuário registrou no app)

## Dados do usuário
{CONTEXTO_DINAMICO}`

export default function NorteAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Mensagem[]>([])
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const isMobile = useIsMobile()

  const { contas, extratoData, faturaData, planos, planosReal, perfil, metaSim } = useApp()

  function buildContext() {
    const hoje = new Date()
    const mes = hoje.getMonth()
    const ano = hoje.getFullYear()
    const mesKey = String(mes + 1).padStart(2, '0')

    // Lançamentos do mês atual em todas as contas bancárias
    const lancMes: { tipo: string; categoria: string; descricao: string; valor: number; dia: number }[] = []
    Object.entries(extratoData).forEach(([k, v]) => {
      if (k.endsWith(`-${ano}-${mesKey}`)) {
        Object.entries(v.lancamentos).forEach(([dia, lcs]) => {
          lcs.forEach(l => lancMes.push({
            tipo: l.tipo, categoria: l.categoria,
            descricao: l.descricao, valor: l.valor, dia: Number(dia),
          }))
        })
      }
    })

    const receitas = lancMes.filter(l => l.tipo === 'entrada')
    const despesas = lancMes.filter(l => l.tipo === 'saida')
    const totalReceitas = receitas.reduce((s, l) => s + l.valor, 0)
    const totalDespesas = despesas.reduce((s, l) => s + l.valor, 0)
    const resultado = totalReceitas - totalDespesas

    // Gastos agrupados por categoria
    const porCat: Record<string, number> = {}
    despesas.forEach(d => { porCat[d.categoria] = (porCat[d.categoria] ?? 0) + d.valor })
    const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1])

    // Top 5 despesas individuais
    const top5 = [...despesas].sort((a, b) => b.valor - a.valor).slice(0, 5)

    // Planejamento vs realizado
    const planoAno = planos[ano]
    const realAno = planosReal[ano]
    const linhasPlano: string[] = []
    if (planoAno) {
      const previstas = [...(planoAno.entradas ?? []), ...(planoAno.saidas ?? [])]
      const reais = [...(realAno?.entradas ?? []), ...(realAno?.saidas ?? [])]
      previstas.forEach(p => {
        const prev = p.v[mes] ?? 0
        if (prev === 0) return
        const realItem = reais.find(r => (r.id && r.id === p.id) || r.nome === p.nome)
        const real = realItem?.v[mes] ?? 0
        const icon = real <= prev ? '✅' : '⚠️'
        linhasPlano.push(`- ${p.nome}: Previsto ${fmtBRL(prev)} | Realizado ${fmtBRL(real)} ${icon}`)
      })
    }

    // Faturas de cartão do mês
    const faturas = contas
      .filter(c => c.tipo === 'cartao')
      .map(c => {
        const key = `${c.id}-${ano}-${mesKey}`
        const raw = faturaData[key] as { lancamentos?: Record<number, { valor?: number }[]> } | undefined
        if (!raw?.lancamentos) return null
        const total = Object.values(raw.lancamentos).flat().reduce((s, l) => s + (l.valor ?? 0), 0)
        return { cartao: c.apelido || c.banco, total, limite: c.limiteCartao ?? 0 }
      })
      .filter(Boolean) as { cartao: string; total: number; limite: number }[]

    return `
### Perfil
- Nome: ${perfil.apelido || perfil.nome || 'Usuário'}
- Data de hoje: ${hoje.toLocaleDateString('pt-BR')}
- Mês/Ano atual: ${MESES[mes]}/${ano}

### Contas bancárias
${contas.filter(c => c.tipo !== 'cartao').map(c =>
  `- ${c.banco}${c.nome ? ` (${c.nome})` : ''}: Saldo ${fmtBRL(c.saldoInicial)}`
).join('\n') || '- Nenhuma conta cadastrada'}

### Cartões de crédito
${contas.filter(c => c.tipo === 'cartao').map(c =>
  `- ${c.apelido || c.banco}: Limite ${fmtBRL(c.limiteCartao ?? 0)}${c.diaVencimento ? `, vencimento dia ${c.diaVencimento}` : ''}${c.diaFechamento ? `, fechamento dia ${c.diaFechamento}` : ''}`
).join('\n') || '- Nenhum cartão cadastrado'}

### Receitas do mês (${MESES[mes]})
${receitas.map(r => `- ${r.categoria}: ${fmtBRL(r.valor)} (dia ${r.dia})`).join('\n') || '- Nenhuma receita registrada'}
Total receitas: ${fmtBRL(totalReceitas)}

### Despesas do mês (${MESES[mes]})
${despesas.map(d => `- ${d.categoria}: ${fmtBRL(d.valor)} — "${d.descricao}" (dia ${d.dia})`).join('\n') || '- Nenhuma despesa registrada'}
Total despesas: ${fmtBRL(totalDespesas)}

### Resultado do mês
- Receitas: ${fmtBRL(totalReceitas)}
- Despesas: ${fmtBRL(totalDespesas)}
- Resultado: ${resultado >= 0 ? '+' : ''}${fmtBRL(resultado)}

### Gastos por categoria (${MESES[mes]})
${topCat.map(([cat, total]) =>
  `- ${cat}: ${fmtBRL(total)} (${totalDespesas > 0 ? Math.round(total / totalDespesas * 100) : 0}% do total)`
).join('\n') || '- Sem dados'}

### Top 5 maiores despesas individuais do mês
${top5.map(d => `- ${fmtBRL(d.valor)} — ${d.descricao} (${d.categoria}, dia ${d.dia})`).join('\n') || '- Sem dados'}

### Planejamento vs Realizado (${MESES[mes]}/${ano})
${linhasPlano.join('\n') || '- Sem planejamento cadastrado para este mês'}

### Faturas de cartão (${MESES[mes]})
${faturas.map(f =>
  `- ${f.cartao}: ${fmtBRL(f.total)}${f.limite > 0 ? ` de ${fmtBRL(f.limite)} (${Math.round(f.total / f.limite * 100)}% do limite)` : ''}`
).join('\n') || '- Sem dados de fatura'}

### Metas/Simulações ativas
${metaSim
  ? `- 🐷 ${metaSim.nome}: meta ${fmtBRL(metaSim.objetivo)}, guardando ${fmtBRL(metaSim.guardaPorMes)}/mês`
  : '- Nenhuma meta ativa'}
`
  }

  async function enviarMensagem(texto: string) {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    const userMsg: Mensagem = { role: 'user', content: texto, ts: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
      const history = newMessages.slice(-20)
      const systemPrompt = SYSTEM_PROMPT.replace('{CONTEXTO_DINAMICO}', buildContext())

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json() as { content: { type: string; text: string }[] }
      const text = data.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n')

      setMessages(prev => [...prev, { role: 'assistant', content: text, ts: Date.now() }])
    } catch {
      clearTimeout(timeout)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua pergunta. Tente novamente.',
        ts: Date.now(),
      }])
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Abrir assistente Norte"
        style={{
          position: 'fixed',
          bottom: isMobile ? 80 : 24,
          right: 24,
          zIndex: 9000,
          width: 52, height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#0f2878,#1a56db)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
          boxShadow: '0 4px 16px rgba(26,86,219,0.45)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(26,86,219,0.55)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(26,86,219,0.45)'
        }}
      >
        🧭
      </button>

      <NortePanel
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        loading={loading}
        onEnviar={enviarMensagem}
        nomeUsuario={perfil.apelido || perfil.nome}
      />
    </>
  )
}
