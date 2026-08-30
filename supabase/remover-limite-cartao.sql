-- ============================================================
-- Remover a coluna limite_cartao da tabela contas
-- ============================================================
-- NÃO EXECUTAR SEM LER. Este arquivo existe para revisão.
--
-- Contexto: o "limite do cartão" deixou de ser informado no cadastro. O
-- limite passou a ser calculado do planejamento — a soma do planejado nas
-- categorias pagas com cartão. O código já não lê nem grava esta coluna
-- (commit a01f53e).
--
-- Rode em duas etapas, com alguns dias entre elas. Se algo precisar voltar
-- atrás, o dado ainda está lá na etapa 1.
-- ============================================================


-- ── ETAPA 1 — conferir o que se perde ────────────────────────
-- Rode primeiro e olhe o resultado. Se vier vazio, ninguém preencheu o
-- campo e a etapa 2 não descarta nada.

select
  id,
  nome,
  apelido,
  limite_cartao
from contas
where tipo = 'cartao'
  and limite_cartao is not null
  and limite_cartao > 0
order by limite_cartao desc;


-- ── ETAPA 1b — guardar, se a consulta acima trouxer linhas ───
-- Opcional. Cria uma cópia do que será descartado. A tabela pode ser
-- apagada depois, quando você tiver certeza.

-- create table contas_limite_cartao_backup as
-- select id, user_id, nome, limite_cartao, now() as guardado_em
-- from contas
-- where limite_cartao is not null;


-- ── ETAPA 2 — remover a coluna ───────────────────────────────
-- Só depois de conferir a etapa 1. Descomente para executar.
--
-- É irreversível: o `drop column` apaga o dado junto. Sem a etapa 1b,
-- não há como recuperar.

-- alter table contas drop column limite_cartao;


-- ── Depois de rodar a etapa 2 ────────────────────────────────
-- Atualizar supabase/migrations/001_create_tables.sql, que ainda declara
-- limite_cartao numeric(12,2). Um banco recriado do zero pelas migrations
-- ficaria diferente da produção.
