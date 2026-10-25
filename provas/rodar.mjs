// Roda todas as provas (provas/prova*.ts) e falha se alguma falhar.
// Cada prova imprime "provaNN: X ok, Y falhas" no fim; erro ao rodar também
// conta como falha. Chamada pelo `npm run provas`, pela verificação do GitHub
// e pela Vercel antes do build (vercel.json): prova vermelha não publica.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pasta = dirname(fileURLToPath(import.meta.url))
const provas = readdirSync(pasta).filter(f => /^prova.*\.ts$/.test(f)).sort()
let ruins = 0
for (const f of provas) {
  const r = spawnSync(process.execPath, [join(pasta, '..', 'node_modules', 'jiti', 'lib', 'jiti-cli.mjs'), join(pasta, f)], { encoding: 'utf8' })
  const saida = (r.stdout ?? '') + (r.stderr ?? '')
  const m = saida.match(/(\d+) ok, (\d+) falhas?/)
  const ok = r.status === 0 && m && Number(m[2]) === 0
  if (!ok) ruins++
  console.log(`${ok ? '✓' : '✗'} ${m ? m[0] : 'não terminou'}  ${f}`)
  if (!ok) console.log(saida.trim().split('\n').map(l => '    ' + l).join('\n'))
}
console.log(ruins ? `\n${ruins} de ${provas.length} provas falharam` : `\n${provas.length} provas ok`)
process.exit(ruins ? 1 : 0)
