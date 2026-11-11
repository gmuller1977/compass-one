-- ============================================================
-- 024 — Liga o RLS em toda tabela do schema public que esteja sem
-- (alerta do Supabase de 08/11/2026: rls_disabled_in_public, CRITICAL).
--
-- Todas as tabelas que o app usa já nascem com RLS nas migrações 001–022.
-- Uma tabela SEM RLS, portanto, foi criada fora das migrações (pelo painel,
-- cópia de segurança, teste, ou a legada user_data / user_data_history se a
-- 004 não foi rodada) e o app não a lê. Por isso é seguro:
--   1. ligar o RLS (sem política, ninguém pela API lê nem grava);
--   2. tirar o acesso do anon e do authenticated;
--   3. manter o service_role (backup e funções), que ignora o RLS.
-- Nenhum dado é apagado. Idempotente: rodar de novo não muda nada.
--
-- ANTES, veja quais são (e mande o resultado para revisão):
--   select tablename from pg_tables
--   where schemaname = 'public' and rowsecurity = false
--   order by tablename;
-- ============================================================

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and rowsecurity = false
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon, authenticated', t.tablename);
    execute format('grant select, insert, update, delete on public.%I to service_role', t.tablename);
    raise notice 'RLS ligado em public.%', t.tablename;
  end loop;
end $$;

-- DEPOIS, deve voltar vazio:
--   select tablename from pg_tables
--   where schemaname = 'public' and rowsecurity = false;
