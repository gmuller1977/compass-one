-- ============================================================
-- 026 — Caixa de mensagens no app (18/11/2026, pedido do Guilherme):
-- comunicados para todos e conversa de cada pessoa com o suporte.
-- Só CRIA; nada existente muda. Idempotente. Rodar ANTES de publicar o
-- app e a função mensagem-email.
--
--   suporte_admins       quem responde como "Suporte Compass One"
--   comunicados          o que o suporte manda para todos
--   comunicados_lidos    o que cada login já leu
--   mensagens_suporte    a conversa de cada login com o suporte
--
-- A conversa é por LOGIN (auth.uid()), não pelo dono da conta
-- compartilhada: cada pessoa fala com o suporte por si.
--
-- DEPOIS DE RODAR, cadastre o seu login de administrador (troque o e-mail):
--   insert into public.suporte_admins (user_id)
--   select id from auth.users where email = 'SEU-EMAIL-DE-LOGIN'
--   on conflict do nothing;
-- ============================================================

-- 1. Administradores do suporte ---------------------------------------
create table if not exists public.suporte_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
grant select, insert, update, delete on public.suporte_admins to authenticated;
grant select, insert, update, delete on public.suporte_admins to service_role;
alter table public.suporte_admins enable row level security;
-- Cada login só enxerga a própria linha (é como o app sabe se é
-- administrador). Ninguém grava pelo app: o cadastro é pelo SQL acima.
drop policy if exists suporte_admins_ler_a_sua on public.suporte_admins;
create policy suporte_admins_ler_a_sua on public.suporte_admins
  for select to authenticated using (user_id = auth.uid());

create or replace function public.eh_suporte()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.suporte_admins where user_id = auth.uid())
$$;
revoke execute on function public.eh_suporte() from public, anon;
grant execute on function public.eh_suporte() to authenticated;

-- 2. Comunicados -------------------------------------------------------
create table if not exists public.comunicados (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(titulo) between 1 and 120),
  texto text not null check (char_length(texto) between 1 and 4000),
  autor uuid references auth.users(id) on delete set null default auth.uid(),
  avisar_por_email boolean not null default false,
  email_enviado_em timestamptz,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.comunicados to authenticated;
grant select, insert, update, delete on public.comunicados to service_role;
alter table public.comunicados enable row level security;
drop policy if exists comunicados_todos_leem on public.comunicados;
create policy comunicados_todos_leem on public.comunicados
  for select to authenticated using (true);
drop policy if exists comunicados_suporte_cria on public.comunicados;
create policy comunicados_suporte_cria on public.comunicados
  for insert to authenticated with check (public.eh_suporte() and email_enviado_em is null);
drop policy if exists comunicados_suporte_apaga on public.comunicados;
create policy comunicados_suporte_apaga on public.comunicados
  for delete to authenticated using (public.eh_suporte());
create index if not exists idx_comunicados_criado on public.comunicados(criado_em desc);

create table if not exists public.comunicados_lidos (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  comunicado_id bigint not null references public.comunicados(id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (user_id, comunicado_id)
);
grant select, insert, update, delete on public.comunicados_lidos to authenticated;
grant select, insert, update, delete on public.comunicados_lidos to service_role;
alter table public.comunicados_lidos enable row level security;
drop policy if exists comunicados_lidos_seus on public.comunicados_lidos;
create policy comunicados_lidos_seus on public.comunicados_lidos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Conversa com o suporte -------------------------------------------
create table if not exists public.mensagens_suporte (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,  -- de quem é a conversa
  autor text not null check (autor in ('pessoa', 'suporte')),
  texto text not null check (char_length(texto) between 1 and 4000),
  criado_em timestamptz not null default now(),
  lida_em timestamptz,
  email_enviado_em timestamptz
);
grant select, insert, update, delete on public.mensagens_suporte to authenticated;
grant select, insert, update, delete on public.mensagens_suporte to service_role;
alter table public.mensagens_suporte enable row level security;
drop policy if exists mensagens_ler on public.mensagens_suporte;
create policy mensagens_ler on public.mensagens_suporte
  for select to authenticated using (user_id = auth.uid() or public.eh_suporte());
-- A pessoa só escreve na própria conversa, como "pessoa"; o suporte só
-- escreve como "suporte". Lida e e-mail não vêm do app na criação.
drop policy if exists mensagens_pessoa_escreve on public.mensagens_suporte;
create policy mensagens_pessoa_escreve on public.mensagens_suporte
  for insert to authenticated with check (
    user_id = auth.uid() and autor = 'pessoa' and lida_em is null and email_enviado_em is null);
drop policy if exists mensagens_suporte_escreve on public.mensagens_suporte;
create policy mensagens_suporte_escreve on public.mensagens_suporte
  for insert to authenticated with check (
    public.eh_suporte() and autor = 'suporte' and lida_em is null and email_enviado_em is null);
-- Sem UPDATE e DELETE pelo app: "lida" é pela função abaixo.
create index if not exists idx_mensagens_conversa on public.mensagens_suporte(user_id, criado_em);
create index if not exists idx_mensagens_nao_lidas on public.mensagens_suporte(autor) where lida_em is null;

-- Marca como lidas as mensagens do OUTRO lado da conversa: a pessoa lê as
-- do suporte na própria conversa; o suporte lê as da pessoa.
create or replace function public.marcar_conversa_lida(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid() then
    update public.mensagens_suporte set lida_em = now()
     where user_id = p_user and autor = 'suporte' and lida_em is null;
  end if;
  if public.eh_suporte() then
    update public.mensagens_suporte set lida_em = now()
     where user_id = p_user and autor = 'pessoa' and lida_em is null;
  end if;
end $$;
revoke execute on function public.marcar_conversa_lida(uuid) from public, anon;
grant execute on function public.marcar_conversa_lida(uuid) to authenticated;

-- Lista de conversas para o suporte: quem é a pessoa, a última mensagem e
-- quantas ainda não foram lidas. Só administrador recebe linhas.
create or replace function public.conversas_suporte()
returns table (user_id uuid, email text, nome text, ultima text, ultima_em timestamptz,
               ultima_autor text, nao_lidas int)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text,
         coalesce(nullif(p.perfil_nome, ''), u.raw_user_meta_data->>'nome',
                  u.raw_user_meta_data->>'full_name', u.email)::text,
         ult.texto, ult.criado_em, ult.autor,
         (select count(*)::int from public.mensagens_suporte x
           where x.user_id = m.user_id and x.autor = 'pessoa' and x.lida_em is null)
    from (select distinct user_id from public.mensagens_suporte) m
    join auth.users u on u.id = m.user_id
    left join public.user_preferences p on p.user_id = m.user_id
    cross join lateral (select texto, criado_em, autor from public.mensagens_suporte y
                         where y.user_id = m.user_id order by criado_em desc, id desc limit 1) ult
   where public.eh_suporte()
   order by ult.criado_em desc
$$;
revoke execute on function public.conversas_suporte() from public, anon;
grant execute on function public.conversas_suporte() to authenticated;
