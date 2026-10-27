/**
 * A página de apresentação vem pronta no HTML (scripts/prerender.mjs), num
 * bloco ao lado do app, para o Google e para quem abre a página pela
 * primeira vez a verem antes do JavaScript carregar. Assim que o React
 * desenha qualquer tela, o bloco sai. Quem já usa o app (sessão salva) ou
 * abre outro endereço nem chega a vê-lo: o script do index.html o esconde.
 */
const ID = 'apresentacao'

export function temApresentacaoEstatica(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.getElementById(ID)
  return !!el && !document.documentElement.classList.contains('sem-apresentacao')
}

export function tirarApresentacaoEstatica() {
  if (typeof document === 'undefined') return
  document.getElementById(ID)?.remove()
}
