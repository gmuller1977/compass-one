-- Banco do AMBIENTE DE TESTE, do zero (gerado por teste/banco/montar-schema.mjs).
-- Rodar UMA vez no SQL Editor de um projeto Supabase NOVO. Nunca na produção.
-- Migrações incluídas: 001_create_tables.sql, 002_rls.sql, 005_delete_user_function.sql, 006_add_simulator_fields.sql, 007_create_simulacoes.sql, 008_add_user_prefs_fields.sql, 009_licoes_aprendidas.sql, 010_create_aurix.sql, 011_add_saldo_inicial_dinheiro.sql, 012_drop_limite_cartao.sql, 013_recorrencia_categoria.sql, 014_lembretes_e_uso.sql, 015_compartilhamento.sql, 016_autoria_lancamentos.sql, 017_cadastro_so_administrador.sql, 018_indicacao.sql, 019_simulacoes_compra.sql, 020_saldo_inicial_desde.sql, 021_envios_convite.sql, 022_objetivos_investimento.sql.

-- ═══ 001_create_tables.sql ═══
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

-- ═══ 002_rls.sql ═══
-- ============================================================
-- RLS — Row Level Security
-- Cada usuário vê e modifica apenas seus próprios dados
-- ============================================================

ALTER TABLE contas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrato_data        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatura_data         ENABLE ROW LEVEL SECURITY;
ALTER TABLE planejamento_data   ENABLE ROW LEVEL SECURITY;

-- Contas
CREATE POLICY "contas_usuario_proprio"
  ON contas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Categorias
CREATE POLICY "categorias_usuario_proprio"
  ON categorias FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Preferences
CREATE POLICY "prefs_usuario_proprio"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Extrato
CREATE POLICY "extrato_usuario_proprio"
  ON extrato_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fatura
CREATE POLICY "fatura_usuario_proprio"
  ON fatura_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Planejamento
CREATE POLICY "planejamento_usuario_proprio"
  ON planejamento_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══ 005_delete_user_function.sql ═══
-- ============================================================
-- Função para exclusão da conta pelo próprio usuário
--
-- SECURITY DEFINER: roda com privilégios do dono da função
-- (postgres), que tem acesso à tabela auth.users.
-- auth.uid() garante que só o próprio usuário pode deletar
-- sua conta. O CASCADE nas tabelas remove todos os dados.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Permite que qualquer usuário autenticado chame a função
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;

-- ═══ 006_add_simulator_fields.sql ═══
-- Fase D: campos para objetivo do usuário e meta de poupança salva no simulador
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS objetivo_usuario text;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS meta_simulacao   jsonb;

-- ═══ 007_create_simulacoes.sql ═══
create table if not exists simulacoes (
  id                      uuid default gen_random_uuid() primary key,
  user_id                 uuid references auth.users(id) on delete cascade not null,
  tipo                    text not null check (tipo in ('divida', 'meta')),
  nome                    text not null,
  valor_total             numeric not null,
  parcela                 numeric not null,
  juros                   numeric default 0,
  resultado_meses         integer not null,
  data_conclusao          text not null,
  total_pago              numeric,
  juros_pagos             numeric,
  ativo                   boolean default true,
  integrado_planejamento  boolean default false,
  created_at              timestamptz default now()
);

alter table simulacoes enable row level security;

create policy "simulacoes_usuario_proprio" on simulacoes
  for all to public
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══ 008_add_user_prefs_fields.sql ═══
-- Adiciona campos de configuração de alertas e sugestão de planejamento
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS percentual_alerta numeric(5,2) NOT NULL DEFAULT 5;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS metodo_sugestao   text NOT NULL DEFAULT 'media_3_meses';

-- ═══ 009_licoes_aprendidas.sql ═══
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

-- ═══ 010_create_aurix.sql ═══
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

-- ═══ 011_add_saldo_inicial_dinheiro.sql ═══
-- Adiciona campo de saldo inicial do dinheiro em carteira
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS saldo_inicial_dinheiro numeric(12,2) NOT NULL DEFAULT 0;

-- ═══ 012_drop_limite_cartao.sql ═══
-- ============================================================
-- 012 — Remover contas.limite_cartao
-- ============================================================
-- Aplicada em produção em 30/08/2026.
--
-- O "limite do cartão" deixou de ser informado no cadastro da conta. O
-- limite passou a ser calculado do planejamento: a soma do planejado nas
-- categorias marcadas como "Gastos pagos no cartão" (tipoMovimento =
-- 'cartao'). Ver src/utils/limiteCartao.ts.
--
-- O motivo: o número útil não é o teto que o banco concede, é quanto o
-- usuário planejou gastar. E o limite é agregado, nunca por cartão — não
-- existe no dado a que cartão cada categoria pertence.
--
-- O código parou de ler e gravar a coluna no commit a01f53e, antes deste
-- drop. Antes de remover, uma consulta mostrou o que se perdia: uma única
-- linha, Santander = 5000.00, de um único usuário.
-- ============================================================

alter table contas drop column if exists limite_cartao;

-- ── Nota para quem recriar o banco do zero ───────────────────
-- As migrations 001 e 003 continuam citando limite_cartao, e isso está
-- certo: elas registram o que o banco era naquele momento. Uma reaplicação
-- em ordem cria a coluna, preenche e depois remove aqui. Migration é log,
-- não é o estado atual — editar as antigas apagaria a história e quebraria
-- a 003, que faz INSERT na coluna.

-- ═══ 013_recorrencia_categoria.sql ═══
-- ============================================================
-- 013 — Recorrência da categoria fixa: anual (com fim opcional) ou temporária
-- ============================================================
-- Aplicada em produção em 07/10/2026, pelo Guilherme, ANTES do código que
-- a usa ir ao ar: o app grava as categorias com todas as colunas, e o código
-- novo antes da coluna faria salvar categoria falhar.
--
-- Uma conta fixa nem sempre é fixa o ano inteiro:
--   - anual: repete todo mês; `recorrencia_fim` (AAAA-MM) diz quando acaba —
--     o financiamento até março/2029. Nulo = sem fim, como era antes.
--   - temporaria: vale por um período curto (IPVA, IPTU, seguro), perguntado
--     na hora de planejar ("Parcelas fixas até qual mês?").
--
-- Nenhum dado existente muda: tudo fica 'anual' e sem fim, que é o
-- comportamento de antes da coluna.

alter table categorias
  add column recorrencia text not null default 'anual'
    check (recorrencia in ('anual', 'temporaria')),
  add column recorrencia_fim text
    check (recorrencia_fim is null or recorrencia_fim ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

-- ═══ 014_lembretes_e_uso.sql ═══
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

-- ═══ 015_compartilhamento.sql ═══
-- ============================================================
-- 015 — Conta compartilhada: duas ou mais pessoas nas mesmas finanças
-- ============================================================
-- Pedido do Guilherme em 10/10/2026: "duas ou mais pessoas acessarem a mesma
-- conta". Cada pessoa continua com o PRÓPRIO login; os dados financeiros
-- continuam gravados com o user_id do DONO, e quem aceita o convite passa a
-- ler e gravar essas linhas.
--
-- Só CRIA: uma tabela, duas funções e políticas NOVAS. Nenhuma política
-- existente é alterada ou apagada — no Postgres as políticas permissivas se
-- somam (OR), então "o próprio usuário" continua valendo exatamente como
-- antes, e a nova só acrescenta "ou um membro aceito do dono".
--
-- O app já está no ar sem esta migração: sem a tabela, a tela de
-- compartilhamento avisa que falta configurar e todo o resto segue igual.
--
-- Convite: o dono informa o e-mail. A pessoa entra no app com esse e-mail
-- (e-mail CONFIRMADO, ver aceitar_convite) e aceita. Aceitar é por função,
-- e não por UPDATE direto, para que quem foi convidado não possa trocar o
-- dono_id da linha.

create table compartilhamentos (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users(id) on delete cascade,
  dono_nome text not null default '',
  dono_email text not null default '',
  email text not null,
  membro_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'aceito')),
  criado_em timestamptz not null default now(),
  aceito_em timestamptz,
  unique (dono_id, email)
);
create index idx_compartilhamentos_membro on compartilhamentos(membro_id) where status = 'aceito';
create index idx_compartilhamentos_email on compartilhamentos(lower(email)) where status = 'pendente';
-- Uma pessoa participa de UMA conta compartilhada por vez.
create unique index uq_compartilhamentos_um_dono on compartilhamentos(membro_id) where status = 'aceito';

alter table compartilhamentos enable row level security;

-- O dono vê, convida e remove os membros da conta dele. Sem UPDATE: o dono
-- não pode pôr ninguém na conta dele sem a pessoa aceitar.
create policy "compartilhamentos_dono_ler" on compartilhamentos
  for select to authenticated using (auth.uid() = dono_id);
create policy "compartilhamentos_dono_convidar" on compartilhamentos
  for insert to authenticated
  with check (auth.uid() = dono_id and status = 'pendente' and membro_id is null
    and email <> '' and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "compartilhamentos_dono_remover" on compartilhamentos
  for delete to authenticated using (auth.uid() = dono_id);
-- O convidado vê o convite que é para o e-mail dele, e o membro vê a linha dele.
create policy "compartilhamentos_convidado_ler" on compartilhamentos
  for select to authenticated
  using (membro_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- O membro pode sair (apagar a própria participação) e recusar convite.
create policy "compartilhamentos_membro_sair" on compartilhamentos
  for delete to authenticated
  using (membro_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Os donos cujas finanças o usuário atual pode acessar. SECURITY DEFINER para
-- as políticas abaixo não dependerem da política da própria tabela.
create or replace function public.donos_acessiveis()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select dono_id from compartilhamentos where membro_id = auth.uid() and status = 'aceito'
$$;
grant execute on function public.donos_acessiveis() to authenticated;

-- Aceitar: só com o e-mail do convite, e só com o e-mail CONFIRMADO — sem
-- isso, alguém poderia criar uma conta com o e-mail de outra pessoa e aceitar.
create or replace function public.aceitar_convite(convite uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  meu_email text;
  confirmado timestamptz;
begin
  select email, email_confirmed_at into meu_email, confirmado from auth.users where id = auth.uid();
  if meu_email is null then raise exception 'sem usuário'; end if;
  if confirmado is null then raise exception 'confirme o seu e-mail antes de aceitar'; end if;
  if exists (select 1 from compartilhamentos where membro_id = auth.uid() and status = 'aceito') then
    raise exception 'você já participa de uma conta compartilhada';
  end if;
  update compartilhamentos
     set membro_id = auth.uid(), status = 'aceito', aceito_em = now()
   where id = convite and status = 'pendente' and lower(email) = lower(meu_email) and dono_id <> auth.uid();
  if not found then raise exception 'convite não encontrado'; end if;
end;
$$;
grant execute on function public.aceitar_convite(uuid) to authenticated;

-- Os dados financeiros: membro aceito lê e grava as linhas do dono.
create policy "contas_compartilhado" on contas for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "categorias_compartilhado" on categorias for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "prefs_compartilhado" on user_preferences for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "extrato_compartilhado" on extrato_data for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "fatura_compartilhado" on fatura_data for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "planejamento_compartilhado" on planejamento_data for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));

-- ═══ 016_autoria_lancamentos.sql ═══
-- ============================================================
-- 016 — Conta compartilhada: cada um mexe só nos próprios lançamentos
-- ============================================================
-- Regra do Guilherme (10/10/2026): "os dois podem ver tudo, o adm pode editar
-- e excluir lançamentos de todos, e os outros podem fazer manutenção somente
-- dos seus lançamentos".
--
-- O ADMINISTRADOR é o dono das finanças (o user_id da linha). Cada lançamento
-- guarda `autor` (o id do login de quem lançou), carimbado pelo app na
-- gravação. Lançamento sem autor é de antes do compartilhamento: é do dono.
--
-- O app já devolve o lançamento alheio antes de gravar
-- (src/utils/autorDoLancamento.ts). Este gatilho confere de novo no banco,
-- para que nada passe por fora do app: um membro que tente gravar um mês em
-- que o lançamento de outra pessoa mudou, sumiu ou trocou de dia recebe erro.
--
-- Só CRIA duas funções e dois gatilhos. Rodar DEPOIS da 015. Não muda dado
-- nenhum, e o dono (e o próprio servidor) passa direto pelo gatilho.

-- Os lançamentos de um mês que NÃO são de `eu`, por id, com o dia junto
-- (trocar de dia também é alterar).
create or replace function public.lancamentos_de_outros(d jsonb, eu uuid)
returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_object_agg(item ->> 'id', jsonb_build_object('dia', dia.k, 'item', item)), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(d -> 'lancamentos') = 'object' then d -> 'lancamentos' else '{}'::jsonb end) as dia(k, itens),
       jsonb_array_elements(case when jsonb_typeof(dia.itens) = 'array' then dia.itens else '[]'::jsonb end) as item
  where coalesce(item ->> 'autor', '') <> eu::text
$$;

create or replace function public.proteger_lancamentos()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  eu uuid := auth.uid();
  existe boolean;
begin
  -- Servidor (chave de serviço) e o próprio dono: sem restrição.
  if eu is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    if old.user_id <> eu and public.lancamentos_de_outros(old.dados, eu) <> '{}'::jsonb then
      raise exception 'Só o administrador da conta exclui lançamentos de outras pessoas';
    end if;
    return old;
  end if;
  if new.user_id = eu then return new; end if;
  if tg_op = 'INSERT' then
    -- O app grava por upsert, e no upsert o gatilho de INSERT roda antes mesmo
    -- quando a linha já existe (aí vira UPDATE e o gatilho de UPDATE confere).
    execute format('select exists (select 1 from %I where user_id = $1 and conta_id = $2 and ano = $3 and mes = $4)', tg_table_name)
      into existe using new.user_id, new.conta_id, new.ano, new.mes;
    if existe then return new; end if;
    if public.lancamentos_de_outros(new.dados, eu) <> '{}'::jsonb then
      raise exception 'Lançamento novo precisa ter como autor quem lançou';
    end if;
    return new;
  end if;
  if public.lancamentos_de_outros(old.dados, eu) <> public.lancamentos_de_outros(new.dados, eu) then
    raise exception 'Só o administrador da conta altera lançamentos de outras pessoas';
  end if;
  return new;
end;
$$;

create trigger extrato_proteger_lancamentos
  before insert or update or delete on extrato_data
  for each row execute function public.proteger_lancamentos();
create trigger fatura_proteger_lancamentos
  before insert or update or delete on fatura_data
  for each row execute function public.proteger_lancamentos();

-- ═══ 017_cadastro_so_administrador.sql ═══
-- ============================================================
-- 017 — Conta compartilhada: cadastro só do administrador
-- ============================================================
-- Escolha do Guilherme (10/10/2026): contas, categorias e plano são do
-- ADMINISTRADOR (o dono das finanças). Quem entrou por convite vê tudo e
-- lança (extrato e fatura, com a regra de autoria da 016), mas não cria,
-- altera nem apaga conta, categoria, plano ou as preferências do dono.
--
-- O app já não grava nada disso para o membro (AppContext). Esta migração
-- faz o banco conferir de novo.
--
-- Só troca PERMISSÕES, nenhum dado: as quatro políticas "_compartilhado"
-- criadas na 015 como FOR ALL passam a FOR SELECT. As políticas de cada
-- usuário sobre as próprias linhas não são tocadas — o dono continua igual,
-- e o membro continua gravando o próprio nome na linha dele de
-- user_preferences. Extrato e fatura ficam como estão.
--
-- Rodar DEPOIS da 015 (e da 016).

begin;

drop policy if exists "contas_compartilhado" on contas;
create policy "contas_compartilhado" on contas for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

drop policy if exists "categorias_compartilhado" on categorias;
create policy "categorias_compartilhado" on categorias for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

drop policy if exists "planejamento_compartilhado" on planejamento_data;
create policy "planejamento_compartilhado" on planejamento_data for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

drop policy if exists "prefs_compartilhado" on user_preferences;
create policy "prefs_compartilhado" on user_preferences for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

commit;

-- ═══ 018_indicacao.sql ═══
-- ============================================================
-- 018 — Link de indicação (substitui a gamificação Aurix)
-- ============================================================
-- Pedido do Guilherme (11/10/2026): tirar a gamificação e deixar só um link
-- de compartilhamento. No futuro cada indicação vira desconto na
-- mensalidade, então o link precisa dizer QUEM indicou, e a contagem não
-- pode ser inflada por quem indicou.
--
-- O que faz:
--   1. indicacao_codigos: um código por login (o do link /i/<código>).
--   2. indicacoes (já existe desde a 010, vazia — a aba era "em breve"):
--      um indicado só pode ter UM indicador.
--   3. A política antiga da 010 deixava o indicador INSERIR as próprias
--      indicações (FOR ALL). Sai: agora só as funções abaixo gravam, e o
--      indicador não lê a tabela direto (ela tem o e-mail do indicado).
--   4. Funções:
--      - meu_codigo_indicacao(): devolve o código, criando na 1ª vez.
--      - registrar_indicacao(codigo): chamada pelo indicado no 1º acesso.
--        Só vale para conta criada há até 30 dias, nunca a si mesmo, e uma
--        vez por indicado.
--      - minhas_indicacoes(): lista do indicador, com e-mail mascarado.
--
-- Nenhum dado é apagado. As tabelas aurix e conquistas e as colunas de
-- streak/nível em user_preferences ficam como estão (o app não lê mais).

begin;

create table if not exists indicacao_codigos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  codigo text not null unique,
  created_at timestamptz default now()
);
alter table indicacao_codigos enable row level security;
drop policy if exists "indicacao_codigos_proprio" on indicacao_codigos;
create policy "indicacao_codigos_proprio" on indicacao_codigos
  for select to authenticated using (auth.uid() = user_id);

create unique index if not exists idx_indicacoes_indicado
  on indicacoes(indicado_id) where indicado_id is not null;
create index if not exists idx_indicacoes_indicador on indicacoes(indicador_id);

drop policy if exists "indicacoes_indicador" on indicacoes;

-- ── Código do link ────────────────────────────────────────────
create or replace function public.meu_codigo_indicacao()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_codigo text;
  -- sem 0/O, 1/I/L: o código pode ser ditado
  v_alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
begin
  if v_uid is null then raise exception 'sem login'; end if;
  select codigo into v_codigo from indicacao_codigos where user_id = v_uid;
  if v_codigo is not null then return v_codigo; end if;
  loop
    v_codigo := '';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    begin
      insert into indicacao_codigos(user_id, codigo) values (v_uid, v_codigo);
      return v_codigo;
    exception when unique_violation then
      -- outro login já tem esse código, ou este login criou o seu agora
      select codigo into v_codigo from indicacao_codigos where user_id = v_uid;
      if v_codigo is not null then return v_codigo; end if;
    end;
  end loop;
end $$;

-- ── Registro pelo indicado ────────────────────────────────────
-- Devolve: 'ok', 'ja_indicado', 'codigo_invalido', 'proprio', 'conta_antiga'.
create or replace function public.registrar_indicacao(p_codigo text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_indicador uuid;
  v_email text;
  v_criado timestamptz;
begin
  if v_uid is null then raise exception 'sem login'; end if;
  select user_id into v_indicador from indicacao_codigos
    where codigo = upper(trim(p_codigo));
  if v_indicador is null then return 'codigo_invalido'; end if;
  if v_indicador = v_uid then return 'proprio'; end if;
  if exists (select 1 from indicacoes where indicado_id = v_uid) then return 'ja_indicado'; end if;
  select email, created_at into v_email, v_criado from auth.users where id = v_uid;
  if v_criado < now() - interval '30 days' then return 'conta_antiga'; end if;
  begin
    insert into indicacoes(indicador_id, indicado_email, indicado_id, status)
      values (v_indicador, coalesce(v_email, ''), v_uid, 'cadastrado');
  exception when unique_violation then
    return 'ja_indicado';
  end;
  return 'ok';
end $$;

-- ── Lista do indicador ────────────────────────────────────────
create or replace function public.minhas_indicacoes()
returns table (email text, status text, criado_em timestamptz)
language sql security definer set search_path = public stable as $$
  select
    case when position('@' in i.indicado_email) > 1
      then left(i.indicado_email, 1) || '***' || substr(i.indicado_email, position('@' in i.indicado_email))
      else '***' end,
    i.status,
    i.created_at
  from indicacoes i
  where i.indicador_id = auth.uid()
  order by i.created_at desc
$$;

revoke all on function public.meu_codigo_indicacao() from public, anon;
revoke all on function public.registrar_indicacao(text) from public, anon;
revoke all on function public.minhas_indicacoes() from public, anon;
grant execute on function public.meu_codigo_indicacao() to authenticated;
grant execute on function public.registrar_indicacao(text) to authenticated;
grant execute on function public.minhas_indicacoes() to authenticated;

commit;

-- Consulta para o desconto, quando chegar a hora:
-- select c.codigo, i.indicador_id, count(*) filter (where i.status = 'ativo') ativos,
--        count(*) total
-- from indicacoes i join indicacao_codigos c on c.user_id = i.indicador_id
-- group by 1, 2 order by total desc;

-- ═══ 019_simulacoes_compra.sql ═══
-- Simulações de COMPRA salvas no Simulador (15/10/2026): o item, de quem
-- (fornecedor) e o formulário inteiro para reabrir (detalhes).
-- Só AMPLIA: o check passa a aceitar 'compra' e entram duas colunas opcionais.
-- Nenhuma linha existente muda.

alter table simulacoes drop constraint if exists simulacoes_tipo_check;
alter table simulacoes add constraint simulacoes_tipo_check
  check (tipo in ('divida', 'meta', 'compra'));

alter table simulacoes add column if not exists fornecedor text;
alter table simulacoes add column if not exists detalhes jsonb;

-- ═══ 020_saldo_inicial_desde.sql ═══
-- De quando é o saldo inicial de cada conta (19/10/2026, utils/saldoDesde.ts).
-- Lançamento novo anterior a essa data é recusado pelo app: já está no saldo.
-- Sem a coluna o app segue gravando as contas, só sem a data.
alter table contas add column if not exists saldo_inicial_desde date;

-- ═══ 021_envios_convite.sql ═══
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

-- ═══ 022_objetivos_investimento.sql ═══
-- ============================================================
-- 022 — Objetivos dos investimentos (a "caixinha")
-- ============================================================
-- Pedido do Guilherme (28/10/2026, tela de Investimentos): o objetivo fica
-- SEPARADO da conta, porque a mesma poupança pode guardar a reserva, a
-- viagem e o carro. Cada objetivo mora numa conta de investimento; a
-- aplicação e o resgate dizem para qual objetivo vão (o id fica no próprio
-- lançamento, em extrato_data), e o rendimento se divide pelo saldo de cada
-- objetivo. Aqui só o cadastro.
--
-- Só CRIA; nada existente muda. Rodar antes de publicar a tela.
-- Cadastro é do ADMINISTRADOR (a regra da 017): quem entrou por convite
-- só lê.

begin;

create table if not exists public.objetivos_investimento (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  conta_id      text not null references public.contas(id) on delete cascade,
  nome          text not null,
  -- Quanto quer juntar (opcional) e até quando, 'AAAA-MM' (opcional).
  valor_alvo    numeric(14,2) check (valor_alvo is null or valor_alvo > 0),
  ate           text check (ate is null or ate ~ '^[0-9]{4}-[0-9]{2}$'),
  -- Quanto do saldo que já estava na conta passou a ser deste objetivo.
  saldo_inicial numeric(14,2) not null default 0 check (saldo_inicial >= 0),
  criado_em     date not null default current_date,
  created_at    timestamptz not null default now()
);

grant select, insert, update, delete on public.objetivos_investimento to authenticated;
grant select, insert, update, delete on public.objetivos_investimento to service_role;

alter table public.objetivos_investimento enable row level security;

drop policy if exists "objetivos_usuario_proprio" on public.objetivos_investimento;
create policy "objetivos_usuario_proprio" on public.objetivos_investimento
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "objetivos_compartilhado" on public.objetivos_investimento;
create policy "objetivos_compartilhado" on public.objetivos_investimento
  for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

create index if not exists idx_objetivos_investimento_user on public.objetivos_investimento(user_id);

commit;

-- ═══ Depois das migrações ═══
alter table public.user_preferences add column if not exists cenario_previsao text not null default 'pessimista';

-- A Data API do app (login) lê e grava as tabelas; o RLS decide o quê.
-- envios_convite é só do servidor (função convite-email). anon: nada.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'envios_convite' loop
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end $$;
grant select, insert, update, delete on public.envios_convite to service_role;
