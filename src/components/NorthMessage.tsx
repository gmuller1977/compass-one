type Props = {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

function renderMd(raw: string): string {
  const lines = raw.split('\n')
  const out: string[] = []
  let inList = false

  for (const line of lines) {
    const isItem = /^[-•]\s/.test(line)
    if (isItem) {
      if (!inList) { out.push('<ul style="margin:4px 0 4px 0;padding-left:18px">'); inList = true }
      const text = line.replace(/^[-•]\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      out.push(`<li>${text}</li>`)
    } else {
      if (inList) { out.push('</ul>'); inList = false }
      const text = line
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      out.push(line === '' ? '<div style="height:6px"></div>' : `<span>${text}</span><br/>`)
    }
  }
  if (inList) out.push('</ul>')
  return out.join('')
}

function fmtHora(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function NorthMessage({ role, content, ts }: Props) {
  const isUser = role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 8,
      marginBottom: 12,
      alignItems: 'flex-end',
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#0f2878,#1a56db)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, marginBottom: 2,
        }}>
          🧭
        </div>
      )}
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div
          style={{
            background: isUser ? '#1a56db' : '#f8faff',
            color: isUser ? '#fff' : '#0f172a',
            borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
            padding: '10px 14px',
            fontSize: 14, lineHeight: 1.55,
            fontFamily: "-apple-system,'Inter',sans-serif",
          }}
          dangerouslySetInnerHTML={{ __html: renderMd(content) }}
        />
        <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, paddingLeft: 2, paddingRight: 2 }}>
          {fmtHora(ts)}
        </span>
      </div>
    </div>
  )
}
