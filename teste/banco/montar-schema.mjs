// Junta as migrações num arquivo só para criar o banco do AMBIENTE DE TESTE
// do zero: teste/banco/schema-completo.sql.
//
//   node teste/banco/montar-schema.mjs
//
// Ficam de fora a 003 e a 004, que só migravam a tabela antiga user_data. No
// fim entram duas coisas que a produção tem e as migrações não:
// - a coluna `cenario_previsao` (criada direto no painel em 10/09/2026);
// - os GRANTs das tabelas: projeto novo não dá mais acesso automático da
//   Data API a tabela criada por SQL (aviso do Supabase de 30/10/2026).
// Rodar de novo quando entrar migração nova.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const pasta = join(aqui, '..', '..', 'supabase', 'migrations')
const arquivos = readdirSync(pasta).filter(f => /^\d{3}_.*\.sql$/.test(f) && !/^00[34]_/.test(f)).sort()

const partes = arquivos.map(f => `-- ═══ ${f} ═══\n${readFileSync(join(pasta, f), 'utf8').trim()}\n`)
const final = `-- ═══ Depois das migrações ═══
alter table public.user_preferences add column if not exists cenario_previsao text not null default 'pessimista';

-- A Data API do app (login) lê e grava as tabelas; o RLS decide o quê.
-- envios_convite é só do servidor (função convite-email). anon: nada.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'envios_convite' loop
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end $$;
grant select, insert, update, delete on public.envios_convite to service_role;
`
const sql = `-- Banco do AMBIENTE DE TESTE, do zero (gerado por teste/banco/montar-schema.mjs).
-- Rodar UMA vez no SQL Editor de um projeto Supabase NOVO. Nunca na produção.
-- Migrações incluídas: ${arquivos.join(', ')}.

${partes.join('\n')}
${final}`
writeFileSync(join(aqui, 'schema-completo.sql'), sql)
console.log(`schema-completo.sql: ${arquivos.length} migrações`)
