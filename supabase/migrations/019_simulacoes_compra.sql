-- Simulações de COMPRA salvas no Simulador (15/10/2026): o item, de quem
-- (fornecedor) e o formulário inteiro para reabrir (detalhes).
-- Só AMPLIA: o check passa a aceitar 'compra' e entram duas colunas opcionais.
-- Nenhuma linha existente muda.

alter table simulacoes drop constraint if exists simulacoes_tipo_check;
alter table simulacoes add constraint simulacoes_tipo_check
  check (tipo in ('divida', 'meta', 'compra'));

alter table simulacoes add column if not exists fornecedor text;
alter table simulacoes add column if not exists detalhes jsonb;
