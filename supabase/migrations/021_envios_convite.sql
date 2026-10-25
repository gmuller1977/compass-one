-- Limite de e-mails de convite (25/10/2026, revisão técnica, pacote 2).
-- A função convite-email mandava quantos e-mails alguém pedisse: um login
-- qualquer podia criar convites (ou tocar em "Reenviar") em série e usar o
-- domínio compass-one.com.br para mandar e-mail a estranhos, o que derruba a
-- reputação do domínio e faz os e-mails de cadastro e de nova senha caírem
-- no spam. Cada envio fica registrado aqui, e a função recusa:
--   * mais de 5 e-mails por dono em 24 horas;
--   * o mesmo convite de novo antes de 10 minutos.
-- Só a função (service_role) lê e grava: o app não enxerga esta tabela.
-- Só CRIA; nada existente muda. Rodar ANTES de publicar a função nova.

create table if not exists public.envios_convite (
  id bigint generated always as identity primary key,
  dono_id uuid not null references auth.users(id) on delete cascade,
  convite_id uuid,
  enviado_em timestamptz not null default now()
);

grant select, insert, update, delete on public.envios_convite to service_role;

alter table public.envios_convite enable row level security;
-- Sem políticas: authenticated e anon não leem nem gravam. A service_role
-- passa por cima do RLS.

create index if not exists idx_envios_convite_dono on public.envios_convite(dono_id, enviado_em desc);
