-- Adiciona campo de saldo inicial do dinheiro em carteira
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS saldo_inicial_dinheiro numeric(12,2) NOT NULL DEFAULT 0;
