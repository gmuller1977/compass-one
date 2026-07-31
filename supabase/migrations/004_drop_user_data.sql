-- ============================================================
-- LIMPEZA FINAL — remover tabela legada user_data
--
-- Execute APENAS após confirmar que:
-- 1. As novas tabelas têm todos os dados corretos
-- 2. O app está funcionando com as novas tabelas
-- 3. Testes de login/logout passaram
-- ============================================================

DROP TABLE IF EXISTS user_data;
DROP TABLE IF EXISTS user_data_history;
