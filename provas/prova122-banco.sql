-- prova122 (18/11/2026): caixa de mensagens, migração 026, num Postgres 16.
-- psql -v ON_ERROR_STOP=1 -f provas/prova122-banco.sql (de dentro do repositório)
\set ON_ERROR_STOP 1
create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
create role authenticated; create role anon; create role service_role;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
grant usage on schema public to authenticated;
create table public.user_preferences(user_id uuid primary key, perfil_nome text not null default '');
\i supabase/migrations/026_mensagens.sql
\i supabase/migrations/026_mensagens.sql
insert into auth.users(id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','ana@x.com','{"nome":"Ana"}'),
 ('00000000-0000-0000-0000-00000000000b','bia@x.com','{}'),
 ('00000000-0000-0000-0000-0000000000ad','suporte@x.com','{}');
insert into public.suporte_admins values ('00000000-0000-0000-0000-0000000000ad');
set role authenticated;

set app.uid = '00000000-0000-0000-0000-00000000000a';
select eh_suporte() = false as "1 ana não é suporte";
insert into mensagens_suporte(user_id, autor, texto) values (auth.uid(), 'pessoa', 'Oi, ajuda?');
select '2 ana escreve na própria conversa' as ok;
do $$ begin
  insert into mensagens_suporte(user_id, autor, texto) values ('00000000-0000-0000-0000-00000000000b', 'pessoa', 'falsa');
  raise exception 'inseriu';
exception when insufficient_privilege then null; end $$;
select '3 ana não escreve na conversa de bia' as ok;
do $$ begin
  insert into mensagens_suporte(user_id, autor, texto) values (auth.uid(), 'suporte', 'finge suporte');
  raise exception 'inseriu';
exception when insufficient_privilege then null; end $$;
select '4 ana não escreve como suporte' as ok;
do $$ begin
  insert into comunicados(titulo, texto) values ('x', 'y');
  raise exception 'inseriu';
exception when insufficient_privilege then null; end $$;
select '5 ana não cria comunicado' as ok;
update mensagens_suporte set lida_em = now();
select count(*) = 1 as "6 update direto não marca (sem política)" from mensagens_suporte where lida_em is null;
select count(*) = 0 as "7 ana não lista conversas" from conversas_suporte();
reset role; select count(*) = 1 as "8b só existe 1 admin" from suporte_admins; set role authenticated;
set app.uid = '00000000-0000-0000-0000-00000000000a';
select count(*) = 0 as "8c ana não enxerga a linha do admin" from suporte_admins;

set app.uid = '00000000-0000-0000-0000-00000000000b';
insert into mensagens_suporte(user_id, autor, texto) values (auth.uid(), 'pessoa', 'Sou a Bia');
select count(*) = 1 as "9 bia só vê a própria conversa" from mensagens_suporte;

set app.uid = '00000000-0000-0000-0000-0000000000ad';
select eh_suporte() as "10 admin é suporte";
select count(*) = 2 as "11 suporte vê as duas conversas" from conversas_suporte();
select nome = 'Ana' and nao_lidas = 1 as "12 nome e não lidas" from conversas_suporte() where email = 'ana@x.com';
insert into mensagens_suporte(user_id, autor, texto) values ('00000000-0000-0000-0000-00000000000a', 'suporte', 'Claro!');
select marcar_conversa_lida('00000000-0000-0000-0000-00000000000a');
select nao_lidas = 0 and ultima_autor = 'suporte' as "13 suporte leu e respondeu" from conversas_suporte() where email = 'ana@x.com';
select count(*) = 1 as "14 resposta do suporte segue não lida para ana" from mensagens_suporte where autor = 'suporte' and lida_em is null;
insert into comunicados(titulo, texto) values ('Novidade', 'Chegou a tela X');
select '15 suporte cria comunicado' as ok;
do $$ begin
  insert into comunicados(titulo, texto, email_enviado_em) values ('x', 'y', now());
  raise exception 'inseriu';
exception when insufficient_privilege then null; end $$;
select '16 comunicado não nasce como enviado' as ok;

set app.uid = '00000000-0000-0000-0000-00000000000a';
select marcar_conversa_lida('00000000-0000-0000-0000-00000000000a');
select count(*) = 0 as "17 ana leu a resposta" from mensagens_suporte where lida_em is null and autor = 'suporte';
select count(*) = 1 as "18 ana vê o comunicado" from comunicados;
insert into comunicados_lidos(comunicado_id) select id from comunicados;
select count(*) = 1 as "19 ana marca o comunicado como lido" from comunicados_lidos;
set app.uid = '00000000-0000-0000-0000-00000000000b';
select marcar_conversa_lida('00000000-0000-0000-0000-00000000000a');
reset role;
select count(*) = 1 as "20 bia não marca a conversa de ana" from mensagens_suporte where autor='pessoa' and lida_em is null and user_id='00000000-0000-0000-0000-00000000000b';
set role authenticated;
select count(*) = 0 as "21 bia não vê o lido de ana" from comunicados_lidos;
set role anon;
do $$ begin
  perform 1 from comunicados;
  raise exception 'leu';
exception when insufficient_privilege then null; end $$;
select '22 anon não lê nada' as ok;
