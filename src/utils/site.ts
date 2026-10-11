/**
 * O endereço público do app. Link de indicação, e-mail de confirmação e de
 * nova senha e a volta do login com Google apontam para cá, e não para o
 * endereço em que a tela por acaso está aberta (compassone.vercel.app, uma
 * prévia da Vercel): o link sai do aparelho e é lido por outra pessoa.
 *
 * Em localhost fica o próprio localhost, para o e-mail de teste voltar para
 * a máquina de quem está testando.
 */
export const SITE_URL = 'https://www.compass-one.com.br'

export function urlDoApp(caminho = '/', origem = window.location.origin): string {
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem)
  return (local ? origem : SITE_URL) + caminho
}
