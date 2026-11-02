// Monitor de erros (02/11/2026, revisão técnica, escolha do Guilherme).
// Quando uma tela quebra para algum cliente, o Sentry manda um e-mail com o
// erro e a tela. Sem isso, o erro só aparecia no console do aparelho da
// pessoa, e ninguém ficava sabendo.
//
// Vai para o Sentry SÓ o erro: a mensagem, onde no código, o endereço da tela
// (sem nada depois do "?") e o navegador. Nada financeiro, nenhum e-mail ou
// id do login. Por isso ficam de fora as "migalhas" que o Sentry junta sozinho
// (console, chamadas ao Supabase, cliques), que podem carregar valores e ids.
// O DSN é público por natureza (vai em todo app que usa o Sentry); sem ele
// configurado, ou no localhost, nada é enviado.
import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

let ligado = false

const semConsulta = (url?: string) => (url ? url.split(/[?#]/)[0] : url)

export function ligarMonitorDeErros() {
  if (!DSN || !import.meta.env.PROD) return
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    environment: location.hostname.startsWith('www.') ? 'producao' : 'previa',
    beforeBreadcrumb: b => (b.category === 'navigation' ? { ...b, data: { from: semConsulta(b.data?.from), to: semConsulta(b.data?.to) } } : null),
    beforeSend: evento => {
      if (evento.request) evento.request = { url: semConsulta(evento.request.url) }
      delete evento.user
      return evento
    },
  })
  Sentry.setTag('aparelho', window.matchMedia('(max-width: 768px)').matches ? 'celular' : 'computador')
  ligado = true
}

/** Erro de tela pego pelo ErroDeTela (o Sentry já pega os não tratados). */
export function avisarErroDeTela(erro: Error, pilhaDosComponentes?: string | null) {
  if (!ligado) return
  Sentry.captureException(erro, { contexts: { react: { componentStack: pilhaDosComponentes ?? '' } } })
}
