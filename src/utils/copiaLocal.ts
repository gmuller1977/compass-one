/**
 * Cópia dos dados do usuário NESTE aparelho, para o app abrir sem internet.
 *
 * Até aqui o service worker guardava só o esqueleto do app, e quem abria sem
 * sinal (mercado, estacionamento, avião) via a tela vazia: o carregamento do
 * Supabase falhava e não havia de onde ler. Agora, a cada carregamento e a
 * cada gravação confirmada, o AppContext guarda aqui as linhas que leu do
 * banco — no MESMO formato da consulta, para o caminho sem internet passar
 * pelo mesmo código que monta o estado.
 *
 * É só leitura. Extrato e fatura guardados aqui são os meses que o BANCO
 * confirmou; o que foi lançado e ainda não subiu está em pendentesLocais, e
 * os dois se somam na abertura.
 *
 * IndexedDB, e não localStorage: o histórico inteiro de extratos passa da
 * cota de 5 MB do localStorage em quem usa o app há anos. Toda falha
 * (navegador sem IndexedDB, modo privado, cota) devolve `null` e o app segue
 * como antes — sem a cópia, não quebrado. Sair da conta apaga as cópias.
 */
export type LinhasDoBanco = {
  contas: unknown[]
  categorias: unknown[]
  pref: unknown | null
  extrato: { conta_id: string; ano: number; mes: number; dados: unknown }[]
  fatura: { conta_id: string; ano: number; mes: number; dados: unknown }[]
  planos: { ano: number; tipo_plano: string; dados: unknown }[]
}
export type Copia = { salvaEm: number; linhas: LinhasDoBanco }

const BANCO = 'compass-copia'
const LOJA = 'copias'

function abrir(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(BANCO, 1)
      req.onupgradeneeded = () => { req.result.createObjectStore(LOJA) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function operar<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | null> {
  const db = await abrir()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const tx = db.transaction(LOJA, modo)
      const req = fn(tx.objectStore(LOJA))
      tx.oncomplete = () => { db.close(); resolve((req.result as T) ?? null) }
      tx.onerror = () => { db.close(); resolve(null) }
      tx.onabort = () => { db.close(); resolve(null) }
    } catch {
      db.close()
      resolve(null)
    }
  })
}

export async function guardarCopia(uid: string, linhas: LinhasDoBanco, agora = Date.now()): Promise<boolean> {
  const r = await operar<IDBValidKey>('readwrite', s => s.put({ salvaEm: agora, linhas } satisfies Copia, uid))
  return r !== null
}

export async function lerCopia(uid: string): Promise<Copia | null> {
  const c = await operar<Copia>('readonly', s => s.get(uid))
  return c && c.linhas ? c : null
}

export async function apagarCopias(): Promise<void> {
  await operar('readwrite', s => s.clear())
}
