// Entrada do build que pré-renderiza a página de apresentação em HTML
// (scripts/prerender.mjs). Não entra no app: só no Node, durante o build.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import { PERGUNTAS_FREQUENTES } from './utils/perguntasFrequentes'

export function apresentacao(): string {
  return renderToString(<StaticRouter location="/"><LandingPage /></StaticRouter>)
}

export function perguntasEmDadosEstruturados(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PERGUNTAS_FREQUENTES.map(p => ({
      '@type': 'Question',
      name: p.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: p.resposta },
    })),
  })
}
