-- Adiciona campos de configuração de alertas e sugestão de planejamento
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS percentual_alerta numeric(5,2) NOT NULL DEFAULT 5;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS metodo_sugestao   text NOT NULL DEFAULT 'media_3_meses';
