import { supabase } from '../lib/supabase'

/**
 * Entrar com a digital (11/10/2026, pedido do Guilherme: "criar login por
 * digital"). É passkey (WebAuthn), o mesmo mecanismo dos apps de banco: a
 * digital, o rosto ou o PIN do aparelho destravam uma chave guardada nele, e o
 * Supabase confere a chave e abre a sessão. A digital nunca sai do aparelho.
 *
 * O e-mail e a senha continuam valendo: a digital é um atalho, cadastrado no
 * Perfil ou na oferta logo depois de entrar com a senha.
 *
 * Depende de "Passkeys" ligado no painel do Supabase (Authentication). Sem
 * isso o servidor recusa e `traduzirErroDigital` diz que falta ativar.
 */

/** O aparelho tem leitor próprio (digital, rosto ou PIN) para passkey? */
export async function aparelhoTemDigital(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// "Já cadastrou a digital neste aparelho" e "não quero a oferta". Só decidem
// o que oferecer: quem vale é o cadastro no Supabase.
const CHAVE_CADASTRADA = 'compass-digital-cadastrada'
const CHAVE_RECUSOU = 'compass-digital-recusou'

function ler(chave: string): string[] {
  try { return JSON.parse(localStorage.getItem(chave) ?? '[]') as string[] } catch { return [] }
}
function marcar(chave: string, userId: string) {
  try {
    const l = ler(chave)
    if (!l.includes(userId)) localStorage.setItem(chave, JSON.stringify([...l, userId]))
  } catch { /* sem localStorage, a oferta só volta a aparecer */ }
}

export const digitalCadastradaAqui = (userId: string) => ler(CHAVE_CADASTRADA).includes(userId)
export const recusouDigital = (userId: string) => ler(CHAVE_RECUSOU).includes(userId)
export const recusarDigital = (userId: string) => marcar(CHAVE_RECUSOU, userId)
export function esquecerDigitalAqui(userId: string) {
  try { localStorage.setItem(CHAVE_CADASTRADA, JSON.stringify(ler(CHAVE_CADASTRADA).filter(id => id !== userId))) } catch { /* idem */ }
}

// Quem acabou de tocar em "Sair" não quer a digital pedida na cara logo em
// seguida. Vale só para a próxima tela de login desta aba.
const CHAVE_SAIU = 'compass-saiu-agora'
export function marcarSaida() {
  try { sessionStorage.setItem(CHAVE_SAIU, '1') } catch { /* sem sessionStorage, pede a digital */ }
}
/** A tela de login abre a digital sozinha, salvo logo depois de "Sair". */
export function acabouDeSair(): boolean {
  try { return sessionStorage.getItem(CHAVE_SAIU) === '1' } catch { return false }
}
export function esquecerSaida() {
  try { sessionStorage.removeItem(CHAVE_SAIU) } catch { /* idem */ }
}

/** Algum login já cadastrou a digital neste aparelho? Põe o botão em destaque. */
export const algumaDigitalAqui = () => ler(CHAVE_CADASTRADA).length > 0

/** Mensagem em português; `null` quando a pessoa só cancelou a leitura. */
export function traduzirErroDigital(e: unknown): string | null {
  const err = (e ?? {}) as { name?: string; message?: string; code?: string; status?: number }
  const msg = `${err.name ?? ''} ${err.code ?? ''} ${err.message ?? ''}`.toLowerCase()
  if (msg.includes('notallowed') || msg.includes('abort') || msg.includes('cancel') || msg.includes('timed out')) return null
  if (msg.includes('does not support webauthn')) return 'Este navegador não aceita entrada por digital.'
  if (err.status === 404 || msg.includes('not enabled') || msg.includes('disabled') || msg.includes('feature'))
    return 'A entrada por digital ainda não foi ativada no servidor. Entre com e-mail e senha por enquanto.'
  if (msg.includes('not found') || msg.includes('credential'))
    return 'Esta digital não está cadastrada no Compass One. Entre com a senha e cadastre a digital no Perfil.'
  if (msg.includes('invalidstate') || msg.includes('already'))
    return 'Este aparelho já tem a digital cadastrada para esta conta.'
  return err.message || 'Não foi possível usar a digital. Tente de novo ou entre com a senha.'
}

// A chave deste aparelho (24/10/2026, pedido do Guilherme: "não dá para ir
// direto?"). Sem dizer qual chave usar, o Android abre antes da digital a
// janela "Usar chave de acesso salva?" para a pessoa escolher a conta.
// Guardamos o id da chave criada ou usada aqui e o passamos ao navegador
// (allowCredentials), para ele poder ir direto à leitura. O servidor não
// depende disso: a assinatura vale igual. Se a chave guardada falhar,
// esquecemos o id e a tentativa seguinte volta à janela de escolha.
const CHAVE_ID = 'compass-digital-chave-id'
const paraB64 = (b: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function deB64(s: string): ArrayBuffer {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}
function lerIdDaChave(): string | null {
  try { return localStorage.getItem(CHAVE_ID) } catch { return null }
}
function guardarIdDaChave(id: string | null) {
  try { if (id) localStorage.setItem(CHAVE_ID, id); else localStorage.removeItem(CHAVE_ID) } catch { /* segue com a janela */ }
}

/** Roda `fn` com o navegador avisado da chave deste aparelho, e guarda a que for usada. */
async function comChaveDoAparelho<T>(fn: (usouId: boolean) => Promise<T>): Promise<T> {
  const cc = navigator.credentials
  const getOriginal = cc.get.bind(cc)
  const createOriginal = cc.create.bind(cc)
  const id = lerIdDaChave()
  const guardar = (c: Credential | null) => {
    if (c && 'rawId' in c) guardarIdDaChave(paraB64((c as PublicKeyCredential).rawId))
    return c
  }
  cc.get = async (opts?: CredentialRequestOptions) => {
    if (id && opts?.publicKey && !opts.publicKey.allowCredentials?.length) {
      opts = { ...opts, publicKey: { ...opts.publicKey,
        allowCredentials: [{ type: 'public-key', id: deB64(id), transports: ['internal'] }] } }
    }
    return guardar(await getOriginal(opts))
  }
  cc.create = async (opts?: CredentialCreationOptions) => guardar(await createOriginal(opts))
  try { return await fn(id !== null) } finally { cc.get = getOriginal; cc.create = createOriginal }
}

export async function entrarComDigital(): Promise<{ ok: boolean; erro: string | null }> {
  try {
    const { data, error } = await comChaveDoAparelho(async usouId => {
      const r = await supabase.auth.signInWithPasskey()
      if ((r.error || !r.data?.session) && usouId) guardarIdDaChave(null)
      return r
    })
    if (error || !data?.session) return { ok: false, erro: traduzirErroDigital(error) }
    marcar(CHAVE_CADASTRADA, data.session.user.id)
    return { ok: true, erro: null }
  } catch (e) {
    return { ok: false, erro: traduzirErroDigital(e) }
  }
}

/** Cadastra a digital deste aparelho para quem está logado. */
export async function cadastrarDigital(userId: string): Promise<{ ok: boolean; erro: string | null }> {
  try {
    const { data, error } = await comChaveDoAparelho(() => supabase.auth.registerPasskey())
    if (error) return { ok: false, erro: traduzirErroDigital(error) }
    marcar(CHAVE_CADASTRADA, userId)
    // O nome é só para a lista do Perfil dizer qual aparelho é qual.
    if (data?.id && !data.friendly_name)
      await supabase.auth.passkey.update({ passkeyId: data.id, friendlyName: nomeDoAparelho() }).catch(() => {})
    return { ok: true, erro: null }
  } catch (e) {
    return { ok: false, erro: traduzirErroDigital(e) }
  }
}

export function nomeDoAparelho(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return 'Celular Android'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'Computador Windows'
  if (/Linux/i.test(ua)) return 'Computador Linux'
  return 'Aparelho'
}

export type DigitalCadastrada = { id: string; nome: string; criada: string; usada: string | null }

export async function listarDigitais(): Promise<{ lista: DigitalCadastrada[]; erro: string | null }> {
  try {
    const { data, error } = await supabase.auth.passkey.list()
    if (error) return { lista: [], erro: traduzirErroDigital(error) }
    const lista = (data ?? []).map(p => ({
      id: p.id, nome: p.friendly_name || 'Aparelho', criada: p.created_at, usada: p.last_used_at ?? null,
    }))
    return { lista, erro: null }
  } catch (e) {
    return { lista: [], erro: traduzirErroDigital(e) }
  }
}

export async function removerDigital(id: string): Promise<string | null> {
  try {
    const { error } = await supabase.auth.passkey.delete({ passkeyId: id })
    return error ? traduzirErroDigital(error) ?? 'Não foi possível remover.' : null
  } catch (e) {
    return traduzirErroDigital(e) ?? 'Não foi possível remover.'
  }
}
