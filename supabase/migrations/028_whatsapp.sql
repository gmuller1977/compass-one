-- ============================================================
-- 028 — WhatsApp (23/11/2026, pedido do Guilherme: Z-API + n8n).
-- Só CRIA; nada existente muda. Idempotente. Rodar ANTES de publicar o
-- app e a função `whatsapp`.
--
--   whatsapp_vinculos     o número ligado a cada LOGIN (um número, um login)
--   whatsapp_pendentes    o lançamento que espera o "SIM" (só a função)
--   whatsapp_processadas  mensagens já tratadas (a Z-API reenvia; só a função)
--
-- O número só é gravado pela FUNÇÃO, quando a pessoa manda do próprio
-- WhatsApp o código gerado no app: quem tem o código e não tem o celular
-- não liga nada, e quem tem o celular sem o código também não. Por isso o
-- app não tem UPDATE na tabela: tudo passa pelas funções abaixo.
-- ============================================================

-- 1. Vínculo do número ------------------------------------------------
create table if not exists public.whatsapp_vinculos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telefone text unique,
  codigo text,
  codigo_expira timestamptz,
  vinculado_em timestamptz,
  -- Aceite (LGPD): quando a pessoa pediu para ligar. Avisos pelo WhatsApp
  -- são um segundo aceite, desligado por padrão.
  aceite_em timestamptz,
  avisos boolean not null default false,
  atualizado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.whatsapp_vinculos to authenticated;
grant select, insert, update, delete on public.whatsapp_vinculos to service_role;
alter table public.whatsapp_vinculos enable row level security;
drop policy if exists whatsapp_vinculos_ler_o_seu on public.whatsapp_vinculos;
create policy whatsapp_vinculos_ler_o_seu on public.whatsapp_vinculos
  for select to authenticated using (user_id = auth.uid());
create unique index if not exists idx_whatsapp_codigo on public.whatsapp_vinculos(codigo) where codigo is not null;

-- Gera um código de 6 dígitos que vale 15 minutos. Não mexe no número já
-- ligado: ele só troca quando o código chega pelo WhatsApp.
create or replace function public.gerar_codigo_whatsapp()
returns text language plpgsql volatile security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'sem login'; end if;
  loop
    c := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.whatsapp_vinculos where codigo = c and user_id <> auth.uid());
  end loop;
  insert into public.whatsapp_vinculos (user_id, codigo, codigo_expira, aceite_em)
  values (auth.uid(), c, now() + interval '15 minutes', now())
  on conflict (user_id) do update
    set codigo = excluded.codigo, codigo_expira = excluded.codigo_expira,
        aceite_em = now(), atualizado_em = now();
  return c;
end $$;
revoke execute on function public.gerar_codigo_whatsapp() from public, anon;
grant execute on function public.gerar_codigo_whatsapp() to authenticated;

-- Desliga: apaga o número, o código e o aceite dos avisos.
create or replace function public.desligar_whatsapp()
returns void language sql volatile security definer set search_path = public as $$
  delete from public.whatsapp_vinculos where user_id = auth.uid();
$$;
revoke execute on function public.desligar_whatsapp() from public, anon;
grant execute on function public.desligar_whatsapp() to authenticated;

-- Liga ou desliga os avisos (fase 2). Só com o número já ligado.
create or replace function public.avisos_whatsapp(ligar boolean)
returns void language sql volatile security definer set search_path = public as $$
  update public.whatsapp_vinculos set avisos = ligar, atualizado_em = now()
  where user_id = auth.uid() and telefone is not null;
$$;
revoke execute on function public.avisos_whatsapp(boolean) from public, anon;
grant execute on function public.avisos_whatsapp(boolean) to authenticated;

-- 2. Proposta esperando o "SIM" (só a função lê e grava) -------------
create table if not exists public.whatsapp_pendentes (
  telefone text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  acao jsonb not null,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.whatsapp_pendentes to authenticated;
grant select, insert, update, delete on public.whatsapp_pendentes to service_role;
alter table public.whatsapp_pendentes enable row level security;
-- Sem política para authenticated: o app não lê nem grava aqui.

-- 3. Mensagens já tratadas (a Z-API pode mandar a mesma duas vezes) ---
create table if not exists public.whatsapp_processadas (
  message_id text primary key,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.whatsapp_processadas to authenticated;
grant select, insert, update, delete on public.whatsapp_processadas to service_role;
alter table public.whatsapp_processadas enable row level security;
create index if not exists idx_whatsapp_processadas_criado on public.whatsapp_processadas(criado_em);
