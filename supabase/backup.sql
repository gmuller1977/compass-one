-- ============================================================
-- BACKUP COMPLETO — Compass One
-- ============================================================
-- Como usar:
--   1. supabase.com/dashboard -> projeto -> SQL Editor -> New query
--   2. Cole tudo isto e clique em Run (ou Ctrl+Enter)
--   3. Clique na célula "backup" do resultado, copie o conteúdo
--      e salve num arquivo, ex.: backup-compassone-AAAA-MM-DD.json
--
-- SOMENTE LEITURA: só há SELECT aqui. Nada é criado, alterado ou apagado.
--
-- O resultado é UMA linha — o aviso de "limite de 100 linhas" do editor
-- não corta nada do backup.
--
-- Se aparecer 'relation "x" does not exist', a tabela não existe neste
-- projeto: apague a linha correspondente e rode de novo. Para conferir
-- quais existem:
--   select table_name from information_schema.tables
--   where table_schema = 'public' and table_type = 'BASE TABLE'
--   order by table_name;
-- ============================================================

select json_build_object(
  'exportado_em',      now(),

  -- Núcleo financeiro (o que realmente importa preservar)
  'contas',            (select coalesce(json_agg(t), '[]') from contas t),
  'categorias',        (select coalesce(json_agg(t), '[]') from categorias t),
  'user_preferences',  (select coalesce(json_agg(t), '[]') from user_preferences t),
  'extrato_data',      (select coalesce(json_agg(t), '[]') from extrato_data t),
  'fatura_data',       (select coalesce(json_agg(t), '[]') from fatura_data t),
  'planejamento_data', (select coalesce(json_agg(t), '[]') from planejamento_data t),

  -- Secundárias (aprendizado e gamificação)
  'licoes_aprendidas', (select coalesce(json_agg(t), '[]') from licoes_aprendidas t),
  'aurix',             (select coalesce(json_agg(t), '[]') from aurix t),
  'conquistas',        (select coalesce(json_agg(t), '[]') from conquistas t),
  'indicacoes',        (select coalesce(json_agg(t), '[]') from indicacoes t)
) as backup;
