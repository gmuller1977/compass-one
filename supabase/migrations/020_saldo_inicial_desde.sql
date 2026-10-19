-- De quando é o saldo inicial de cada conta (19/10/2026, utils/saldoDesde.ts).
-- Lançamento novo anterior a essa data é recusado pelo app: já está no saldo.
-- Sem a coluna o app segue gravando as contas, só sem a data.
alter table contas add column if not exists saldo_inicial_desde date;
