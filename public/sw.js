// Service worker do Compass One — o mínimo para o app ser instalável e abrir
// rápido no celular. NÃO guarda dado financeiro: só o "esqueleto" do app
// (HTML, JS e CSS do build). As chamadas ao Supabase (outro domínio) passam
// direto, sem cache, sempre.
//
//   - navegação: rede primeiro; sem rede, a última página guardada
//   - /assets/*: cache primeiro (o nome do arquivo muda a cada build)
//   - push: o lembrete das 21h (supabase/functions/lembrete-diario); tocar
//     na notificação abre o app na tela que ela indica
const CACHE = 'compass-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const resp = await fetch(req)
        const cache = await caches.open(CACHE)
        cache.put('/', resp.clone())
        return resp
      } catch {
        return (await caches.match('/')) ?? Response.error()
      }
    })())
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith((async () => {
      const hit = await caches.match(req)
      if (hit) return hit
      const resp = await fetch(req)
      if (resp.ok) (await caches.open(CACHE)).put(req, resp.clone())
      return resp
    })())
  }
})

self.addEventListener('push', e => {
  let msg = { titulo: 'Compass One', corpo: '', url: '/' }
  try { msg = { ...msg, ...e.data.json() } } catch { /* corpo vazio */ }
  e.waitUntil(self.registration.showNotification(msg.titulo, {
    body: msg.corpo, icon: '/icone-192.png', badge: '/icone-192.png', lang: 'pt-BR',
    tag: 'lembrete-diario', data: { url: msg.url },
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/'
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of abertas) if ('focus' in c) { await c.navigate(url).catch(() => {}); return c.focus() }
    return self.clients.openWindow(url)
  })())
})
