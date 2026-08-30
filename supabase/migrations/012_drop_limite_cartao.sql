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
