-- Migration 010: Programa Aurix — gamificação
-- Tabelas: aurix, conquistas, indicacoes
-- Campos extras em user_preferences: streak, nivel, codigo_indicacao

-- Tabela de transações de Aurix
create table aurix (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tipo text not null check (tipo in ('acao', 'conquista', 'indicacao', 'bonus', 'resgate')),
  descricao text not null,
  pontos integer not null,
  referencia text,
  created_at timestamptz default now()
);

alter table aurix enable row level security;
create policy "aurix_usuario_proprio" on aurix
  for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index idx_aurix_user on aurix(user_id, created_at);

-- Tabela de conquistas desbloqueadas
create table conquistas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  codigo text not null,
  desbloqueada_em timestamptz default now(),
  unique(user_id, codigo)
);

alter table conquistas enable row level security;
create policy "conquistas_usuario_proprio" on conquistas
  for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabela de indicações
create table indicacoes (
  id uuid default gen_random_uuid() primary key,
  indicador_id uuid references auth.users(id) on delete cascade not null,
  indicado_email text not null,
  indicado_id uuid references auth.users(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'cadastrado', 'ativo')),
  created_at timestamptz default now()
);

alter table indicacoes enable row level security;
create policy "indicacoes_indicador" on indicacoes
  for all to public
  using (auth.uid() = indicador_id)
  with check (auth.uid() = indicador_id);

-- Campos adicionais em user_preferences
alter table user_preferences
  add column if not exists streak_atual integer default 0,
  add column if not exists maior_streak integer default 0,
  add column if not exists ultimo_acesso_ativo date,
  add column if not exists nivel text default 'iniciante',
  add column if not exists codigo_indicacao text unique;
