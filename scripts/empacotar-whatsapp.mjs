// Junta a função `whatsapp` e as regras de src/utils num arquivo só
// (supabase/functions/whatsapp/index.ts), para publicar pelo editor do
// painel do Supabase ou pela CLI. Rodar depois de mudar fonte.ts ou as
// regras: node scripts/empacotar-whatsapp.mjs
import { rolldown } from 'rolldown'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const pasta = join(raiz, 'supabase/functions/whatsapp')
const b = await rolldown({
  input: join(pasta, 'fonte.ts'),
  external: id => id.startsWith('jsr:') || id.startsWith('npm:'),
  platform: 'neutral',
})
const { output } = await b.generate({ format: 'esm' })
writeFileSync(join(pasta, 'index.ts'),
  '// GERADO por scripts/empacotar-whatsapp.mjs a partir de fonte.ts. Não editar à mão.\n' +
  '// deno-lint-ignore-file\n// @ts-nocheck\n' + output[0].code)
console.log('ok:', join(pasta, 'index.ts'))
