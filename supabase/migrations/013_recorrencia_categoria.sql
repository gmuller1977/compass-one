-- ============================================================
-- 013 — Recorrência da categoria fixa: anual (com fim opcional) ou temporária
-- ============================================================
-- Aplicada em produção em 07/10/2026, pelo Guilherme, ANTES do código que
-- a usa ir ao ar: o app grava as categorias com todas as colunas, e o código
-- novo antes da coluna faria salvar categoria falhar.
--
-- Uma conta fixa nem sempre é fixa o ano inteiro:
--   - anual: repete todo mês; `recorrencia_fim` (AAAA-MM) diz quando acaba —
--     o financiamento até março/2029. Nulo = sem fim, como era antes.
--   - temporaria: vale por um período curto (IPVA, IPTU, seguro), perguntado
--     na hora de planejar ("Parcelas fixas até qual mês?").
--
-- Nenhum dado existente muda: tudo fica 'anual' e sem fim, que é o
-- comportamento de antes da coluna.

alter table categorias
  add column recorrencia text not null default 'anual'
    check (recorrencia in ('anual', 'temporaria')),
  add column recorrencia_fim text
    check (recorrencia_fim is null or recorrencia_fim ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
