/**
 * Os endereços públicos (11/11/2026, pedido do Guilherme: "quando o usuário
 * fizer login, entrar no site app.compass-one.com.br").
 *
 * - SITE_URL (www): a página de apresentação, termos e privacidade, e o
 *   link de indicação (o indicado vê a apresentação antes de se cadastrar).
 * - APP_URL (app.): login, cadastro e o app inteiro. Link de e-mail de
 *   confirmação e de nova senha e a volta do login com Google apontam para
 *   cá, e não para o endereço em que a tela por acaso está aberta: o link
 *   sai do aparelho e é lido por outra pessoa.
 *
 * O mesmo Worker serve os dois endereços. Quem abre uma tela do app no www
 * é mandado para o app. pelo script do index.html, antes de o app carregar.
 * Sessão, digital "cadastrada aqui" e cópia sem internet ficam no
 * localStorage de CADA endereço: quem usava o www entra de novo uma vez.
 *
 * Em localhost fica o próprio localhost, para o e-mail de teste voltar para
 * a máquina de quem está testando.
 */
export const SITE_URL = 'https://www.compass-one.com.br'
export const APP_URL = 'https://app.compass-one.com.br'

const HOSTS_DO_SITE = ['www.compass-one.com.br', 'compass-one.com.br']
const HOST_DO_APP = 'app.compass-one.com.br'

const hostAtual = () => (typeof window === 'undefined' ? '' : window.location.hostname)

export const ehHostDoSite = (host = hostAtual()) => HOSTS_DO_SITE.includes(host)
export const ehHostDoApp = (host = hostAtual()) => host === HOST_DO_APP

export function urlDoApp(caminho = '/', origem = typeof window === 'undefined' ? '' : window.location.origin): string {
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem)
  return (local ? origem : APP_URL) + caminho
}

/**
 * Link da apresentação para o app (Entrar, Comece já). No www ele leva ao
 * app. e carrega o código de indicação guardado aqui, porque o localStorage
 * do app. não o enxerga; o app. o guarda ao abrir (main.tsx). Na página
 * pronta do HTML (sem window) também é o app.; em localhost e prévias, o
 * próprio endereço.
 */
export function hrefDoApp(caminho: string, indicacao: string | null = null, host = hostAtual()): string {
  if (host && !ehHostDoSite(host)) return caminho
  return APP_URL + caminho + (indicacao ? `?indicacao=${encodeURIComponent(indicacao)}` : '')
}
