-- Fase D: campos para objetivo do usuário e meta de poupança salva no simulador
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS objetivo_usuario text;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS meta_simulacao   jsonb;
