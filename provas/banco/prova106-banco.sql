-- prova106-banco: convite "Só visualizar" (migração 023), num Postgres 16 de verdade.
-- Não roda no `npm run provas` (precisa de um Postgres). Para rodar:
--   createdb prova106 && psql -d prova106 -v ON_ERROR_STOP=0 -f provas/banco/prova106-banco.sql
-- Monta um "auth" de mentira (o do Supabase), as migrações 001, 002, 015, 016,
-- 017 e 023, e confere quem lê e quem grava. Imprime "prova106: X ok, Y falhas".

set client_min_messages = warning;

-- ── O auth do Supabase, de mentira ───────────────────────────────────
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as
  $$ select jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create extension if not exists pgcrypto;

\ir ../../supabase/migrations/001_create_tables.sql
\ir ../../supabase/migrations/002_rls.sql
\ir ../../supabase/migrations/015_compartilhamento.sql
\ir ../../supabase/migrations/016_autoria_lancamentos.sql
\ir ../../supabase/migrations/017_cadastro_so_administrador.sql
\ir ../../supabase/migrations/023_convite_so_visualizar.sql

grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema auth to authenticated;

-- ── Pessoas: dono, quem lança, quem só visualiza, e um estranho ───────
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000d', 'dono@x.com', now()),
  ('00000000-0000-0000-0000-00000000000a', 'lanca@x.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'consultor@x.com', now()),
  ('00000000-0000-0000-0000-00000000000e', 'estranho@x.com', now());

create table resultado (n serial, nome text, ok boolean);
create or replace function como(id text, email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', id, false);
  perform set_config('request.jwt.claim.email', email, false);
end $$;
-- Roda `sql` como authenticated; devolve true se deu certo (e alterou linha, quando `conta`).
create or replace function tenta(sql text, conta boolean default false) returns boolean language plpgsql as $$
declare n int;
begin
  execute 'set local role authenticated';
  execute sql;
  get diagnostics n = row_count;
  execute 'reset role';
  return not conta or n > 0;
exception when others then
  execute 'reset role';
  return false;
end $$;
grant execute on function tenta(text, boolean) to authenticated;
-- Quantas linhas `sql` (um select count) devolve como authenticated.
create or replace function ve(sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'set local role authenticated';
  execute sql into n;
  execute 'reset role';
  return n;
end $$;
grant insert, select on resultado to authenticated;
grant usage on sequence resultado_n_seq to authenticated;

-- O dono convida os dois, um de cada jeito.
select como('00000000-0000-0000-0000-00000000000d', 'dono@x.com');
insert into resultado(nome, ok) select 'dono convida "pode lançar"', tenta($$insert into compartilhamentos(dono_id, email) values ('00000000-0000-0000-0000-00000000000d', 'lanca@x.com')$$);
insert into resultado(nome, ok) select 'dono convida "só visualizar"', tenta($$insert into compartilhamentos(dono_id, email, acesso) values ('00000000-0000-0000-0000-00000000000d', 'consultor@x.com', 'visualizar')$$);
insert into resultado(nome, ok) select 'acesso inválido é recusado', not tenta($$insert into compartilhamentos(dono_id, email, acesso) values ('00000000-0000-0000-0000-00000000000d', 'outro@x.com', 'tudo')$$);
insert into resultado(nome, ok) select 'convite antigo (sem acesso) vale "lancar"',
  (select acesso = 'lancar' from compartilhamentos where email = 'lanca@x.com');
-- O mês do dono, com um lançamento dele.
insert into extrato_data(user_id, conta_id, ano, mes, dados) values
  ('00000000-0000-0000-0000-00000000000d', 'c1', 2026, 10, '{"lancamentos":{"5":[{"id":"l1","valor":10}]}}');
insert into fatura_data(user_id, conta_id, ano, mes, dados) values
  ('00000000-0000-0000-0000-00000000000d', 'k1', 2026, 10, '{"lancamentos":{}}');
insert into contas(id, user_id, nome, tipo) values ('c1', '00000000-0000-0000-0000-00000000000d', 'Sicredi', 'corrente');
-- Um segundo cliente, que também convida o consultor.
insert into auth.users values ('00000000-0000-0000-0000-00000000000c', 'cliente2@x.com', now());
select como('00000000-0000-0000-0000-00000000000c', 'cliente2@x.com');
insert into resultado(nome, ok) select 'segundo cliente convida o mesmo consultor', tenta($$insert into compartilhamentos(dono_id, email, acesso) values ('00000000-0000-0000-0000-00000000000c', 'consultor@x.com', 'visualizar')$$);
insert into extrato_data(user_id, conta_id, ano, mes, dados) values
  ('00000000-0000-0000-0000-00000000000c', 'z1', 2026, 10, '{"lancamentos":{}}');

-- Aceitam.
select como('00000000-0000-0000-0000-00000000000a', 'lanca@x.com');
insert into resultado(nome, ok) select 'quem lança aceita', tenta($$select aceitar_convite((select id from compartilhamentos where email = 'lanca@x.com'))$$);
select como('00000000-0000-0000-0000-00000000000b', 'consultor@x.com');
insert into resultado(nome, ok) select 'quem só visualiza aceita', tenta($$select aceitar_convite((select id from compartilhamentos where email = 'consultor@x.com' and dono_id = '00000000-0000-0000-0000-00000000000d'))$$);
insert into resultado(nome, ok) select 'e aceita o do segundo cliente também (várias contas)', tenta($$select aceitar_convite((select id from compartilhamentos where email = 'consultor@x.com' and dono_id = '00000000-0000-0000-0000-00000000000c'))$$);
insert into resultado(nome, ok) select 'vê as duas contas que aceitou', ve($$select count(*) from compartilhamentos where membro_id = auth.uid() and status = 'aceito'$$) = 2;
insert into resultado(nome, ok) select 'lê o extrato de cada cliente pelo user_id', ve($$select count(*) from extrato_data where user_id = '00000000-0000-0000-0000-00000000000c'$$) = 1;

-- ── Só visualizar: lê tudo, não grava nada ────────────────────────────
insert into resultado(nome, ok) select 'visualizar: lê o extrato do dono',
  ve($$select count(*) from extrato_data where user_id = '00000000-0000-0000-0000-00000000000d'$$) = 1;
insert into resultado(nome, ok) select 'visualizar: lê a fatura do dono',
  ve($$select count(*) from fatura_data$$) = 1;
insert into resultado(nome, ok) select 'visualizar: lê as contas do dono',
  ve($$select count(*) from contas$$) = 1;
insert into resultado(nome, ok) select 'visualizar: lê o próprio convite com o acesso',
  ve($$select count(*) from compartilhamentos where membro_id = auth.uid() and acesso = 'visualizar'$$) = 2;
insert into resultado(nome, ok) select 'visualizar: NÃO lança mês novo',
  not tenta($$insert into extrato_data(user_id, conta_id, ano, mes, dados) values ('00000000-0000-0000-0000-00000000000d', 'c1', 2026, 11, '{"lancamentos":{"1":[{"id":"n1","autor":"00000000-0000-0000-0000-00000000000b"}]}}')$$);
insert into resultado(nome, ok) select 'visualizar: NÃO altera o mês',
  not tenta($$update extrato_data set dados = '{"lancamentos":{}}', atualizado_em = now() where user_id = '00000000-0000-0000-0000-00000000000d'$$, true);
insert into resultado(nome, ok) select 'visualizar: NÃO apaga o mês',
  not tenta($$delete from extrato_data where user_id = '00000000-0000-0000-0000-00000000000d'$$, true);
insert into resultado(nome, ok) select 'visualizar: NÃO grava na fatura',
  not tenta($$update fatura_data set dados = '{"lancamentos":{"2":[]}}' where user_id = '00000000-0000-0000-0000-00000000000d'$$, true);
insert into resultado(nome, ok) select 'visualizar: NÃO troca o próprio acesso',
  not tenta($$select trocar_acesso_convite((select id from compartilhamentos where membro_id = auth.uid() limit 1), 'lancar')$$);
insert into resultado(nome, ok) select 'visualizar: NÃO edita conta do dono',
  not tenta($$update contas set nome = 'x' where id = 'c1'$$, true);

-- ── Pode lançar: continua como antes ──────────────────────────────────
select como('00000000-0000-0000-0000-00000000000a', 'lanca@x.com');
insert into resultado(nome, ok) select 'lançar: grava mês novo com o próprio lançamento',
  tenta($$insert into extrato_data(user_id, conta_id, ano, mes, dados) values ('00000000-0000-0000-0000-00000000000d', 'c1', 2026, 11, '{"lancamentos":{"1":[{"id":"n1","autor":"00000000-0000-0000-0000-00000000000a"}]}}')$$);
insert into resultado(nome, ok) select 'lançar: acrescenta lançamento no mês do dono',
  tenta($$update extrato_data set dados = '{"lancamentos":{"5":[{"id":"l1","valor":10},{"id":"n2","autor":"00000000-0000-0000-0000-00000000000a"}]}}' where mes = 10 and conta_id = 'c1'$$, true);
insert into resultado(nome, ok) select 'lançar: segue sem mexer no lançamento do dono (016)',
  not tenta($$update extrato_data set dados = '{"lancamentos":{}}' where mes = 10 and conta_id = 'c1'$$, true);

-- ── Estranho: nada ────────────────────────────────────────────────────
select como('00000000-0000-0000-0000-00000000000e', 'estranho@x.com');
insert into resultado(nome, ok) select 'estranho não lê o extrato',
  ve($$select count(*) from extrato_data$$) = 0;
insert into resultado(nome, ok) select 'estranho não troca o acesso',
  not tenta($$select trocar_acesso_convite((select id from compartilhamentos limit 1), 'lancar')$$);

-- ── O dono troca o acesso, e vale na hora ─────────────────────────────
select como('00000000-0000-0000-0000-00000000000d', 'dono@x.com');
insert into resultado(nome, ok) select 'dono troca o consultor para "pode lançar"',
  tenta($$select trocar_acesso_convite((select id from compartilhamentos where email = 'consultor@x.com' and dono_id = auth.uid()), 'lancar')$$);
select como('00000000-0000-0000-0000-00000000000b', 'consultor@x.com');
insert into resultado(nome, ok) select 'trocado num cliente, o outro segue só visualizar',
  not tenta($$update extrato_data set dados = dados || '{"x":1}' where user_id = '00000000-0000-0000-0000-00000000000c'$$, true);
insert into resultado(nome, ok) select 'trocado: agora grava',
  tenta($$update extrato_data set dados = dados || '{"x":1}' where mes = 10 and conta_id = 'c1'$$, true);
select como('00000000-0000-0000-0000-00000000000d', 'dono@x.com');
insert into resultado(nome, ok) select 'dono volta o consultor para "só visualizar"',
  tenta($$select trocar_acesso_convite((select id from compartilhamentos where email = 'consultor@x.com' and dono_id = auth.uid()), 'visualizar')$$);
select como('00000000-0000-0000-0000-00000000000b', 'consultor@x.com');
insert into resultado(nome, ok) select 'voltou: não grava de novo',
  not tenta($$update extrato_data set dados = dados || '{"y":1}' where mes = 10 and conta_id = 'c1'$$, true);
select como('00000000-0000-0000-0000-00000000000d', 'dono@x.com');
insert into resultado(nome, ok) select 'o dono segue gravando tudo',
  tenta($$update extrato_data set dados = '{"lancamentos":{}}' where mes = 10 and conta_id = 'c1'$$, true);

select nome, case when ok then 'ok' else 'FALHOU' end from resultado order by n;
-- ── Ligar e desligar (Educador Financeiro) ────────────────────────────
select como('00000000-0000-0000-0000-00000000000d', 'dono@x.com');
insert into resultado(nome, ok) select 'dono desliga o acesso do consultor',
  tenta($$select ativar_convite((select id from compartilhamentos where email = 'consultor@x.com' and dono_id = auth.uid()), false)$$);
select como('00000000-0000-0000-0000-00000000000b', 'consultor@x.com');
insert into resultado(nome, ok) select 'desligado: não lê o extrato desse cliente',
  ve($$select count(*) from extrato_data where user_id = '00000000-0000-0000-0000-00000000000d'$$) = 0;
insert into resultado(nome, ok) select 'desligado: não lê as contas desse cliente',
  ve($$select count(*) from contas where user_id = '00000000-0000-0000-0000-00000000000d'$$) = 0;
insert into resultado(nome, ok) select 'desligado: o outro cliente segue visível',
  ve($$select count(*) from extrato_data where user_id = '00000000-0000-0000-0000-00000000000c'$$) = 1;
insert into resultado(nome, ok) select 'desligado: vê a linha do convite, marcada desligada',
  ve($$select count(*) from compartilhamentos where membro_id = auth.uid() and not ativo$$) = 1;
insert into resultado(nome, ok) select 'desligado: o convidado não se religa',
  not tenta($$select ativar_convite((select id from compartilhamentos where membro_id = auth.uid() and not ativo), true)$$);
select como('00000000-0000-0000-0000-00000000000d', 'dono@x.com');
select ativar_convite((select id from compartilhamentos where email = 'lanca@x.com'), false);
select como('00000000-0000-0000-0000-00000000000a', 'lanca@x.com');
insert into resultado(nome, ok) select 'Família desligada também não grava',
  not tenta($$update extrato_data set dados = dados || '{"z":1}' where user_id = '00000000-0000-0000-0000-00000000000d'$$, true);
select como('00000000-0000-0000-0000-00000000000d', 'dono@x.com');
select ativar_convite((select id from compartilhamentos where email = 'lanca@x.com'), true);
select como('00000000-0000-0000-0000-00000000000d', 'dono@x.com');
insert into resultado(nome, ok) select 'dono religa',
  tenta($$select ativar_convite((select id from compartilhamentos where email = 'consultor@x.com' and dono_id = auth.uid()), true)$$);
select como('00000000-0000-0000-0000-00000000000b', 'consultor@x.com');
insert into resultado(nome, ok) select 'religado: lê de novo (os dois meses do cliente)',
  ve($$select count(*) from extrato_data where user_id = '00000000-0000-0000-0000-00000000000d'$$) = 2;
insert into resultado(nome, ok) select 'convite antigo nasce ligado',
  (select bool_and(ativo) from compartilhamentos);

select 'prova106: ' || count(*) filter (where ok) || ' ok, ' || count(*) filter (where not ok) || ' falhas' from resultado;
