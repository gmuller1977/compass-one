// Depois do `vite build`: escreve a página de apresentação pronta dentro do
// dist/index.html (27/10/2026). O app é uma SPA, e sem isso o HTML publicado
// tinha só um <div id="root"> vazio: o Google e as prévias de link não viam
// texto nenhum. O bloco sai assim que o React desenha a primeira tela
// (src/utils/apresentacaoEstatica.ts).
import { build } from 'vite'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = join(raiz, 'dist-ssr')

await build({
  root: raiz,
  logLevel: 'warn',
  build: { ssr: join(raiz, 'src/prerender.tsx'), outDir: saida, emptyOutDir: true, rolldownOptions: { output: { codeSplitting: false } } },
})

const { apresentacao, perguntasEmDadosEstruturados } = await import(pathToFileURL(join(saida, 'prerender.js')).href)
const arquivo = join(raiz, 'dist', 'index.html')
let html = readFileSync(arquivo, 'utf8')
for (const marca of ['<!--apresentacao-->', '<!--perguntas-frequentes-->']) {
  if (!html.includes(marca)) throw new Error(`prerender: ${marca} não está no dist/index.html`)
}
html = html
  .replace('<!--apresentacao-->', `<div id="apresentacao">${apresentacao()}</div>`)
  .replace('<!--perguntas-frequentes-->', `<script type="application/ld+json">${perguntasEmDadosEstruturados().replace(/</g, '\\u003c')}</script>`)
writeFileSync(arquivo, html)
rmSync(saida, { recursive: true, force: true })
console.log('prerender: apresentação escrita no dist/index.html')
