-- Migration 009: Criar tabela licoes_aprendidas
-- Armazena justificativas de desvios da revisão mensal do planejamento.
-- Usada para alertas futuros, sugestões no Wizard e contexto do agente Norte.

create table licoes_aprendidas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ano integer not null,
  mes integer not null, -- 0-indexed (0=Jan, 11=Dez)
  categoria_nome text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  valor_previsto numeric not null default 0,
  valor_realizado numeric not null default 0,
  desvio numeric not null default 0,              -- realizado - previsto
  desvio_percentual numeric not null default 0,
  justificativa text not null,
  tipo_evento text check (tipo_evento in ('pontual', 'anual', 'sazonal')),
  meses_recorrencia integer[] default null,       -- ex: [0,6] = jan e jul
  tags text[] default null,
  acao_tomada text check (acao_tomada in ('aceito', 'mantido', 'ajustado')),
  valor_ajustado numeric,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Row Level Security
alter table licoes_aprendidas enable row level security;

create policy "licoes_usuario_proprio" on licoes_aprendidas
  for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Índices para consultas frequentes
create index idx_licoes_mes on licoes_aprendidas(user_id, mes);
create index idx_licoes_tipo_evento on licoes_aprendidas(user_id, tipo_evento);
