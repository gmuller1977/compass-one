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
