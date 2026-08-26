-- ============================================================
-- MIGRAÇÃO: dois planos -> um plano só
-- ============================================================
-- Copia o plano "Atualizado" (tipo_plano='real') por cima do plano
-- "Meu plano" (tipo_plano='previsto'), que passa a ser o único plano.
--
-- POR QUE nesse sentido: o 'previsto' e o que quase todo o app le por
-- padrao (Radar, Resumo, Painel, CompassCard, QuickLaunch, Simulacao).
-- Unificando nele, o ramo "lockado ? real : previsto" desaparece.
--
-- ⚠️ NAO RODE ANTES DE:
--   1. Corrigir as celulas deslocadas de set-dez no Atualizado
--   2. Rodar supabase/backup.sql de novo e salvar o arquivo
--
-- A linha 'real' NAO e apagada — fica como historico.
-- ============================================================

-- Alvo: user_id 57558480-96e3-476d-aced-dccbc7977990 (Guilherme), ano 2026.
-- O UUID aparece escrito por extenso em cada consulta — o editor do Supabase
-- nao aceita variaveis do psql (\set), so SQL puro.


-- ── PASSO 1 — CONFERIR (somente leitura) ────────────────────
-- Mostra, categoria por categoria, o que vai mudar no previsto.
-- Rode isto primeiro e leia com calma.

with p as (
  select jsonb_array_elements(dados->'saidas') c from planejamento_data
  where user_id = '57558480-96e3-476d-aced-dccbc7977990'
    and ano = 2026 and tipo_plano = 'previsto'
),
r as (
  select jsonb_array_elements(dados->'saidas') c from planejamento_data
  where user_id = '57558480-96e3-476d-aced-dccbc7977990'
    and ano = 2026 and tipo_plano = 'real'
)
select
  coalesce(p.c->>'nome', r.c->>'nome')           as categoria,
  coalesce(p.c->>'descricao', r.c->>'descricao') as variante,
  p.c->'v'  as valores_hoje_no_previsto,
  r.c->'v'  as valores_que_virao_do_real
from p
full outer join r
  on  p.c->>'nome' = r.c->>'nome'
  and coalesce(p.c->>'descricao','') = coalesce(r.c->>'descricao','')
where p.c->'v' is distinct from r.c->'v'
order by 1, 2;


-- ── PASSO 2 — APLICAR ───────────────────────────────────────
-- Só depois de conferir o passo 1 e ter o backup salvo.
-- Descomente para rodar.

-- update planejamento_data p
--    set dados             = r.dados,
--        saldo_inicial_jan = r.saldo_inicial_jan,
--        meta_anual        = r.meta_anual,
--        mes_inicio        = r.mes_inicio,
--        objetivos         = r.objetivos
--   from planejamento_data r
--  where p.user_id    = r.user_id
--    and p.ano        = r.ano
--    and p.tipo_plano = 'previsto'
--    and r.tipo_plano = 'real'
--    and p.user_id    = '57558480-96e3-476d-aced-dccbc7977990'
--    and p.ano        = 2026;


-- ── PASSO 3 — CONFERIR DEPOIS (somente leitura) ─────────────
-- O previsto deve ter ficado igual ao real. Zero linhas = deu certo.

-- with p as (
--   select jsonb_array_elements(dados->'saidas') c from planejamento_data
--   where user_id = '57558480-96e3-476d-aced-dccbc7977990'
--     and ano = 2026 and tipo_plano = 'previsto'
-- ),
-- r as (
--   select jsonb_array_elements(dados->'saidas') c from planejamento_data
--   where user_id = '57558480-96e3-476d-aced-dccbc7977990'
--     and ano = 2026 and tipo_plano = 'real'
-- )
-- select p.c->>'nome' as ainda_diferente
--   from p full outer join r
--     on  p.c->>'nome' = r.c->>'nome'
--     and coalesce(p.c->>'descricao','') = coalesce(r.c->>'descricao','')
--  where p.c->'v' is distinct from r.c->'v';


-- ── Depois disso ────────────────────────────────────────────
-- Desbloqueie o planejamento em Configuracoes -> Preferencias.
-- Com lockado = false, todo o app passa a ler o mesmo plano.
