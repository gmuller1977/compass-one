-- ============================================================
-- 014 — Lembretes no celular (push) e medição de uso
-- ============================================================
-- Só CRIA tabelas: nenhum dado existente muda. O código que usa as duas já
-- está no ar e não quebra sem elas — o botão de lembrete só aparece com a
-- chave VAPID configurada, e a medição ignora o erro de tabela inexistente.
--
-- push_inscricoes: um aparelho que aceitou notificações. `contas_proximas`
--   é a lista de contas dos próximos dias que o PRÓPRIO app calcula
--   (contasAVencer) e atualiza a cada abertura e a cada pagamento: o servidor
--   não refaz a conta do saldo, só lê a lista para o aviso "vence amanhã".
--
-- uso_lancamentos: quantos lançamentos novos cada gravação levou ao banco,
--   por dia e por aparelho (celular ou computador). É a métrica do plano
--   mobile: % de lançamentos pelo celular e dias com lançamento por semana.

create table push_inscricoes (
  endpoint text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  p256dh text not null,
  auth text not null,
  contas_proximas jsonb not null default '[]',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table push_inscricoes enable row level security;
create policy "push_inscricoes_usuario_proprio" on push_inscricoes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index idx_push_inscricoes_user on push_inscricoes(user_id);

create table uso_lancamentos (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  dispositivo text not null check (dispositivo in ('celular', 'computador')),
  quantidade integer not null check (quantidade > 0),
  criado_em timestamptz not null default now()
);
alter table uso_lancamentos enable row level security;
-- Só inserir e ler o próprio. Sem update/delete: é um registro.
create policy "uso_lancamentos_inserir" on uso_lancamentos
  for insert to authenticated with check (auth.uid() = user_id);
create policy "uso_lancamentos_ler" on uso_lancamentos
  for select to authenticated using (auth.uid() = user_id);
create index idx_uso_lancamentos_dia on uso_lancamentos(dia, user_id);
