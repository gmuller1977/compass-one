import './ligarMonitor'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './index.css'
import App from './App.tsx'
import { guardarCodigoRecebido } from './utils/indicacaoLocal'

// Código de indicação vindo da apresentação no www (hrefDoApp): o
// localStorage do app. é outro, então ele chega pelo endereço.
const indicacao = new URLSearchParams(window.location.search).get('indicacao')
if (indicacao) guardarCodigoRecebido(indicacao)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// App instalável no celular (ver public/sw.js). Só no build publicado: no
// localhost o cache atrapalharia o recarregamento do Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('service worker:', e))
  })
}
