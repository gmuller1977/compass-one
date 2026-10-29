// Monta a conta de teste "Ana Teste" no AMBIENTE DE TESTE (outro projeto
// Supabase, nunca o de produção) e escreve teste/banco/semente.sql.
//
//   npx jiti teste/semente.ts
//
// Os dados da Ana moram em teste/ana.ts (a prova da importação usa os mesmos).
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EMAIL_TESTE, contas, categorias, planos, extrato, faturas } from './ana'

// ── SQL ─────────────────────────────────────────────────────────────────
// As linhas no formato que o AppContext grava (contaToRow, categoriaToRow,
// savePlanosData, gravação por mês).
const linhasContas = contas.map(c => ({
  id: c.id, user_id: '__UID__', nome: c.nome, banco: c.banco, tipo: c.tipo, saldo_inicial: c.saldoInicial,
  cor: c.cor, icone: c.icone, dia_vencimento: c.diaVencimento ?? null, dia_fechamento: c.diaFechamento ?? null,
  incluir_no_saldo_inicial: c.incluirNoSaldoInicial ?? true, agencia: c.agencia ?? null, numero_conta: c.numeroConta ?? null,
  forma_pagamento_fatura: c.formaPagamentoFatura ?? null, conta_pagamento_id: c.contaPagamentoId ?? null,
  apelido: c.apelido ?? null, preferida: c.preferida ?? false, ativo: true, saldo_inicial_desde: c.saldoInicialDesde ?? null,
}))
const linhasCategorias = categorias.map(c => ({
  id: c.id, user_id: '__UID__', nome: c.nome, tipo: c.tipo, grupo: c.grupo ?? null, fixa: c.fixa,
  tipo_movimento: c.tipoMovimento, forma_pagamento: c.formaPagamento ?? null, cor: c.cor, icone: c.icone, ativa: c.ativa,
  dia_vencimento: c.diaVencimento ?? null, descricao: c.descricao ?? null, numero_parcelas: c.numeroParcelas ?? 1,
  conta_debito_id: c.contaDebitoId ?? null, pin_quick: c.pinQuick ?? false, recorrencia: c.recorrencia ?? 'anual',
}))
const linhasPlano = Object.entries(planos).map(([ano, dados]) => ({
  user_id: '__UID__', ano: Number(ano), tipo_plano: 'previsto', saldo_inicial_jan: dados.saldoInicialJan ?? 0,
  meta_anual: dados.metaAnual ?? null, mes_inicio: dados.mesInicio ?? 1, objetivos: dados.objetivos ?? [], dados,
}))
const meses = (m: Record<string, unknown>) => Object.entries(m).map(([k, dados]) => ({
  user_id: '__UID__', conta_id: k.slice(0, -8), ano: Number(k.slice(-7, -3)), mes: Number(k.slice(-2)), dados,
}))
const pref = [{
  user_id: '__UID__', perfil_nome: 'Ana Teste', perfil_apelido: 'Ana', onboarding_completo: true,
  planejamento_lockado: false, cenario_previsao: 'pessimista', saldo_inicial_dinheiro: 0,
}]

function inserir(tabela: string, linhas: Record<string, unknown>[]) {
  if (!linhas.length) return ''
  const cols = Object.keys(linhas[0])
  const json = JSON.stringify(linhas).replaceAll('$j$', '')
  return `  insert into public.${tabela} (${cols.join(', ')})\n    select ${cols.join(', ')} from jsonb_populate_recordset(null::public.${tabela},\n      replace($j$${json}$j$, '__UID__', uid::text)::jsonb);\n`
}

const sql = `-- Conta de teste "Ana Teste" (gerado por teste/semente.ts; não editar à mão).
-- SÓ NO AMBIENTE DE TESTE. Rodar no SQL Editor do projeto de teste, depois de
-- criar o usuário ${EMAIL_TESTE} em Authentication > Users.
-- Pode rodar de novo: apaga e recria os dados dessa conta.
do $$
declare uid uuid := (select id from auth.users where email = '${EMAIL_TESTE}');
begin
  if (select count(*) from auth.users) > 5 then
    raise exception 'Este banco tem mais de 5 usuários: parece a produção. Nada foi feito.';
  end if;
  if uid is null then
    raise exception 'Crie antes o usuário ${EMAIL_TESTE} em Authentication > Users.';
  end if;
  delete from public.extrato_data where user_id = uid;
  delete from public.fatura_data where user_id = uid;
  delete from public.planejamento_data where user_id = uid;
  delete from public.categorias where user_id = uid;
  delete from public.contas where user_id = uid;
  delete from public.user_preferences where user_id = uid;
${inserir('contas', linhasContas)}${inserir('categorias', linhasCategorias)}${inserir('planejamento_data', linhasPlano)}${inserir('extrato_data', meses(extrato))}${inserir('fatura_data', meses(faturas))}${inserir('user_preferences', pref)}
  -- Sem as janelas de boas-vindas: a conta já passou pelo primeiro acesso.
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || '{"nome":"Ana Teste","vistos":["primeiro-acesso","boas-vindas-configuracoes"]}'::jsonb
  where id = uid;
end $$;
`
const pasta = dirname(fileURLToPath(import.meta.url))
writeFileSync(join(pasta, 'banco', 'semente.sql'), sql)
console.log(`semente.sql: ${contas.length} contas, ${categorias.length} categorias, ${linhasPlano.length} plano(s), ` +
  `${Object.keys(extrato).length} mês de extrato, ${Object.keys(faturas).length} meses de fatura`)
