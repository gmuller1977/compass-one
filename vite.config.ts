import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    rolldownOptions: {
      output: {
        // As bibliotecas num arquivo à parte (20/10/2026): elas quase nunca
        // mudam, e assim a publicação de uma versão nova só troca o código do
        // app — o resto continua no cache do aparelho (public/sw.js). Tudo
        // segue carregando na abertura, como antes: nenhuma tela fica para
        // depois, e abrir sem internet funciona igual.
        codeSplitting: {
          groups: [{ name: 'bibliotecas', test: /node_modules[\\/]/ }],
        },
      },
    },
  },
})
