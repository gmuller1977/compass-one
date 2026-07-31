-- ============================================================
-- FASE 1 — Tabelas estruturadas (contas, categorias, prefs)
-- FASE 2 — Dados transacionais em JSONB (extrato, fatura, planos)
--
-- IDs usam text (não uuid) para compatibilidade com o formato
-- atual da aplicação: id-{timestamp}-{random}
-- ============================================================


-- ── CONTAS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas (
  id                       text NOT NULL PRIMARY KEY,
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                     text NOT NULL,
  banco                    text NOT NULL DEFAULT '',
  tipo                     text NOT NULL CHECK (tipo IN ('corrente','poupanca','cartao')),
  saldo_inicial            numeric(12,2) NOT NULL DEFAULT 0,
  cor                      text NOT NULL DEFAULT '',
  icone                    text NOT NULL DEFAULT '',
  -- cartão
  limite_cartao            numeric(12,2),
  dia_vencimento           integer,
  dia_fechamento           integer,
  forma_pagamento_fatura   text,
  conta_pagamento_id       text,               -- FK lógica p/ contas.id (sem constraint, self-ref)
  -- corrente / poupança
  incluir_no_saldo_inicial boolean NOT NULL DEFAULT true,
  agencia                  text,
  numero_conta             text,
  -- geral
  apelido                  text,
  preferida                boolean NOT NULL DEFAULT false,
  ativo                    boolean NOT NULL DEFAULT true,
  criado_em                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contas_user_id_idx ON contas (user_id);


-- ── CATEGORIAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id               text NOT NULL PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('entrada','saida')),
  grupo            text,
  fixa             boolean NOT NULL DEFAULT false,
  tipo_movimento   text NOT NULL DEFAULT 'banco' CHECK (tipo_movimento IN ('banco','cartao','dinheiro')),
  forma_pagamento  text,
  cor              text NOT NULL DEFAULT '',
  icone            text NOT NULL DEFAULT '',
  ativa            boolean NOT NULL DEFAULT true,
  dia_vencimento   integer,
  valor_padrao     numeric(12,2),
  descricao        text,
  numero_parcelas  integer NOT NULL DEFAULT 1,
  conta_debito_id  text,                       -- FK lógica p/ contas.id
  pin_quick        boolean NOT NULL DEFAULT false,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categorias_user_id_idx ON categorias (user_id);


-- ── USER PREFERENCES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  perfil_nome            text NOT NULL DEFAULT '',
  perfil_apelido         text NOT NULL DEFAULT '',
  onboarding_completo    boolean NOT NULL DEFAULT false,
  planejamento_lockado   boolean NOT NULL DEFAULT false,
  desvio_min_perc        numeric(5,2) NOT NULL DEFAULT 10,
  atualizado_em          timestamptz NOT NULL DEFAULT now()
);


-- ── EXTRATO DATA (JSONB híbrido) ──────────────────────────────
CREATE TABLE IF NOT EXISTS extrato_data (
  id        uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id  text NOT NULL,
  ano       integer NOT NULL,
  mes       integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  dados     jsonb NOT NULL DEFAULT '{}',
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, conta_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS extrato_data_user_conta_idx ON extrato_data (user_id, conta_id);


-- ── FATURA DATA (JSONB híbrido) ───────────────────────────────
CREATE TABLE IF NOT EXISTS fatura_data (
  id        uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id  text NOT NULL,
  ano       integer NOT NULL,
  mes       integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  dados     jsonb NOT NULL DEFAULT '{}',
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, conta_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS fatura_data_user_conta_idx ON fatura_data (user_id, conta_id);


-- ── PLANEJAMENTO DATA (JSONB híbrido) ─────────────────────────
CREATE TABLE IF NOT EXISTS planejamento_data (
  id                uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ano               integer NOT NULL,
  tipo_plano        text NOT NULL CHECK (tipo_plano IN ('previsto','real')),
  saldo_inicial_jan numeric(12,2) NOT NULL DEFAULT 0,
  meta_anual        numeric(12,2),
  mes_inicio        integer NOT NULL DEFAULT 1,
  objetivos         jsonb NOT NULL DEFAULT '[]',
  dados             jsonb NOT NULL DEFAULT '{}',
  criado_em         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ano, tipo_plano)
);

CREATE INDEX IF NOT EXISTS planejamento_data_user_idx ON planejamento_data (user_id);
