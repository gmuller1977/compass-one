-- ============================================================
-- MIGRAÇÃO — user_data → tabelas novas
--
-- Execute APÓS confirmar que 001 e 002 rodaram sem erros.
-- Se não houver user_data, os SELECTs retornam zero linhas
-- e não há problema.
-- ============================================================


-- ── 1. CONTAS ────────────────────────────────────────────────
INSERT INTO contas (
  id, user_id, nome, banco, tipo,
  saldo_inicial, cor, icone,
  limite_cartao, dia_vencimento, dia_fechamento,
  forma_pagamento_fatura, conta_pagamento_id,
  incluir_no_saldo_inicial, agencia, numero_conta,
  apelido, preferida, ativo
)
SELECT
  conta->>'id',
  ud.user_id,
  COALESCE(conta->>'nome', ''),
  COALESCE(conta->>'banco', ''),
  conta->>'tipo',
  COALESCE((conta->>'saldoInicial')::numeric, 0),
  COALESCE(conta->>'cor', ''),
  COALESCE(conta->>'icone', ''),
  NULLIF(conta->>'limiteCartao', '')::numeric,
  NULLIF(conta->>'diaVencimento', '')::integer,
  NULLIF(conta->>'diaFechamento', '')::integer,
  conta->>'formaPagamentoFatura',
  conta->>'contaPagamentoId',
  COALESCE((conta->>'incluirNoSaldoInicial')::boolean, true),
  conta->>'agencia',
  conta->>'numeroConta',
  conta->>'apelido',
  COALESCE((conta->>'preferida')::boolean, false),
  true
FROM user_data ud,
     jsonb_array_elements(ud.value) AS conta
WHERE ud.key = 'compass_contas'
  AND jsonb_typeof(ud.value) = 'array'
  AND conta->>'id' IS NOT NULL
ON CONFLICT (id) DO NOTHING;


-- ── 2. CATEGORIAS ────────────────────────────────────────────
INSERT INTO categorias (
  id, user_id, nome, tipo, grupo,
  fixa, tipo_movimento, forma_pagamento,
  cor, icone, ativa,
  dia_vencimento, descricao, numero_parcelas,
  conta_debito_id, pin_quick
)
SELECT
  cat->>'id',
  ud.user_id,
  COALESCE(cat->>'nome', ''),
  cat->>'tipo',
  cat->>'grupo',
  COALESCE((cat->>'fixa')::boolean, false),
  COALESCE(cat->>'tipoMovimento', 'banco'),
  cat->>'formaPagamento',
  COALESCE(cat->>'cor', ''),
  COALESCE(cat->>'icone', ''),
  COALESCE((cat->>'ativa')::boolean, true),
  NULLIF(cat->>'diaVencimento', '')::integer,
  cat->>'descricao',
  COALESCE(NULLIF(cat->>'numeroParcelas', '')::integer, 1),
  cat->>'contaDebitoId',
  COALESCE((cat->>'pinQuick')::boolean, false)
FROM user_data ud,
     jsonb_array_elements(ud.value) AS cat
WHERE ud.key = 'compass_categorias'
  AND jsonb_typeof(ud.value) = 'array'
  AND cat->>'id' IS NOT NULL
ON CONFLICT (id) DO NOTHING;


-- ── 3. USER PREFERENCES ──────────────────────────────────────
INSERT INTO user_preferences (
  user_id, perfil_nome, perfil_apelido,
  onboarding_completo, planejamento_lockado, desvio_min_perc
)
SELECT DISTINCT ON (ud.user_id)
  ud.user_id,
  COALESCE(
    (SELECT ud2.value->>'nome'
     FROM user_data ud2
     WHERE ud2.user_id = ud.user_id AND ud2.key = 'compass_perfil'),
    ''
  ),
  COALESCE(
    (SELECT ud2.value->>'apelido'
     FROM user_data ud2
     WHERE ud2.user_id = ud.user_id AND ud2.key = 'compass_perfil'),
    ''
  ),
  COALESCE(
    (SELECT (ud2.value)::boolean
     FROM user_data ud2
     WHERE ud2.user_id = ud.user_id AND ud2.key = 'compass_onboarding_completo'),
    false
  ),
  COALESCE(
    (SELECT (ud2.value)::boolean
     FROM user_data ud2
     WHERE ud2.user_id = ud.user_id AND ud2.key = 'compass_planejamento_lockado'),
    false
  ),
  COALESCE(
    (SELECT (ud2.value)::numeric
     FROM user_data ud2
     WHERE ud2.user_id = ud.user_id AND ud2.key = 'compass_desvio_min_perc'),
    10
  )
FROM user_data ud
ON CONFLICT (user_id) DO NOTHING;


-- ── 4. EXTRATO DATA ───────────────────────────────────────────
-- Chave formato: {contaId}-{YYYY}-{MM}
-- Últimos 8 chars = '-YYYY-MM'
INSERT INTO extrato_data (user_id, conta_id, ano, mes, dados)
SELECT
  ud.user_id,
  substring(kv.key, 1, length(kv.key) - 8)           AS conta_id,
  substring(kv.key, length(kv.key) - 6, 4)::integer   AS ano,
  right(kv.key, 2)::integer                            AS mes,
  kv.value
FROM user_data ud,
     jsonb_each(ud.value) AS kv(key, value)
WHERE ud.key = 'compass_extrato_dados'
  AND jsonb_typeof(ud.value) = 'object'
  AND length(kv.key) >= 8
  AND right(kv.key, 2) ~ '^\d{2}$'
  AND substring(kv.key, length(kv.key) - 6, 4) ~ '^\d{4}$'
ON CONFLICT (user_id, conta_id, ano, mes) DO NOTHING;


-- ── 5. FATURA DATA ────────────────────────────────────────────
INSERT INTO fatura_data (user_id, conta_id, ano, mes, dados)
SELECT
  ud.user_id,
  substring(kv.key, 1, length(kv.key) - 8)           AS conta_id,
  substring(kv.key, length(kv.key) - 6, 4)::integer   AS ano,
  right(kv.key, 2)::integer                            AS mes,
  kv.value
FROM user_data ud,
     jsonb_each(ud.value) AS kv(key, value)
WHERE ud.key = 'compass_fatura_dados'
  AND jsonb_typeof(ud.value) = 'object'
  AND length(kv.key) >= 8
  AND right(kv.key, 2) ~ '^\d{2}$'
  AND substring(kv.key, length(kv.key) - 6, 4) ~ '^\d{4}$'
ON CONFLICT (user_id, conta_id, ano, mes) DO NOTHING;


-- ── 6. PLANEJAMENTO DATA — previsto ───────────────────────────
INSERT INTO planejamento_data (
  user_id, ano, tipo_plano,
  saldo_inicial_jan, meta_anual, mes_inicio, objetivos, dados
)
SELECT
  ud.user_id,
  (kv.key)::integer                                                 AS ano,
  'previsto'                                                         AS tipo_plano,
  COALESCE((kv.value->>'saldoInicialJan')::numeric, 0),
  NULLIF(kv.value->>'metaAnual', '')::numeric,
  COALESCE(NULLIF(kv.value->>'mesInicio','')::integer, 1),
  COALESCE(kv.value->'objetivos', '[]'::jsonb),
  kv.value
FROM user_data ud,
     jsonb_each(ud.value) AS kv(key, value)
WHERE ud.key = 'compass_planos'
  AND jsonb_typeof(ud.value) = 'object'
  AND kv.key ~ '^\d{4}$'
ON CONFLICT (user_id, ano, tipo_plano) DO NOTHING;


-- ── 7. PLANEJAMENTO DATA — real ───────────────────────────────
INSERT INTO planejamento_data (
  user_id, ano, tipo_plano,
  saldo_inicial_jan, meta_anual, mes_inicio, objetivos, dados
)
SELECT
  ud.user_id,
  (kv.key)::integer                                                 AS ano,
  'real'                                                             AS tipo_plano,
  COALESCE((kv.value->>'saldoInicialJan')::numeric, 0),
  NULLIF(kv.value->>'metaAnual', '')::numeric,
  COALESCE(NULLIF(kv.value->>'mesInicio','')::integer, 1),
  COALESCE(kv.value->'objetivos', '[]'::jsonb),
  kv.value
FROM user_data ud,
     jsonb_each(ud.value) AS kv(key, value)
WHERE ud.key = 'compass_planos_real'
  AND jsonb_typeof(ud.value) = 'object'
  AND kv.key ~ '^\d{4}$'
ON CONFLICT (user_id, ano, tipo_plano) DO NOTHING;


-- ── Verificação após migração ─────────────────────────────────
SELECT 'contas'            AS tabela, count(*) FROM contas
UNION ALL
SELECT 'categorias',                  count(*) FROM categorias
UNION ALL
SELECT 'user_preferences',            count(*) FROM user_preferences
UNION ALL
SELECT 'extrato_data',                count(*) FROM extrato_data
UNION ALL
SELECT 'fatura_data',                 count(*) FROM fatura_data
UNION ALL
SELECT 'planejamento_data',           count(*) FROM planejamento_data;
