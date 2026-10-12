// ============================================================
// O desenho dos e-mails do Compass One — uma fonte só.
// ============================================================
// Usado pela função convite-email e pelo gerador dos modelos do Supabase
// (supabase/templates/gerar.ts), que escreve os HTML colados no painel em
// Authentication → Emails → Templates. Mudou aqui, rodar o gerador de novo.
//
// E-mail não é página: tabela, estilo inline, nada de fonte externa nem
// SVG (Gmail e Outlook descartam). O logo é o PNG publicado no site.
// Topo #0f2878 → #1e40af só com branco (a regra do #1e40af); botão #1a56db
// com texto branco, 6,2:1; corpo #1e293b no branco, 14,6:1; apoio #475569,
// 7,6:1.
// ============================================================

export const SITE = 'https://www.compass-one.com.br'

export type Email = {
  preview: string       // a linha cinza que a caixa de entrada mostra
  titulo: string
  paragrafos: string[]  // HTML simples; já escapado por quem chama
  botao: { texto: string; url: string }
  depois?: string[]     // abaixo do botão, menor
  rodape: string
}

export function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function emailHtml(e: Email): string {
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1e293b;">${t}</p>`
  const pq = (t: string) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#475569;">${t}</p>`
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e.titulo}</title>
</head>
<body style="margin:0;padding:0;background:#eef2fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e.preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2fb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(15,40,120,.10);">
<tr><td bgcolor="#0f2878" style="background:#0f2878;background-image:linear-gradient(135deg,#0f2878,#1e40af);padding:28px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${SITE}/icone-192.png" width="44" height="44" alt="" style="display:block;border-radius:12px;"></td>
<td style="vertical-align:middle;padding-left:12px;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.3px;">Compass One</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:800;color:#0f172a;">${e.titulo}</h1>
${e.paragrafos.map(p).join('\n')}
</td></tr>
<tr><td align="center" style="padding:8px 32px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#1a56db" style="border-radius:14px;">
<a href="${e.botao.url}" target="_blank" style="display:inline-block;padding:15px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">${e.botao.texto}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 28px;">
${(e.depois ?? []).map(pq).join('\n')}
<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#475569;">Se o botão não abrir, copie este endereço no navegador:<br>
<a href="${e.botao.url}" style="color:#1a56db;word-break:break-all;">${e.botao.url}</a></p>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.6;color:#475569;">
${e.rodape}<br>
<a href="${SITE}" style="color:#1a56db;text-decoration:none;">compass-one.com.br</a> · organize hoje, decida melhor amanhã.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`
}
