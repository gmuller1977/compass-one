// Monta a conta de teste "Ana Teste" no AMBIENTE DE TESTE (outro projeto
// Supabase, nunca o de produção) e escreve teste/banco/semente.sql.
//
//   npx jiti teste/semente.ts
//
// A conta nasce pelo mesmo caminho do app: as respostas do primeiro acesso
// passam por `aplicarRespostas` e `planoDoPrimeiroAcesso`, como em
// PrimeiroAcesso.tsx (`concluir`). Por cima, os lançamentos feitos à mão em
// outubro que os extratos de teste (teste/extratos) precisam encontrar.
// O cenário e o resultado esperado de cada linha estão em teste/LEIA-ME.md.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { aplicarRespostas, fixasDoPrimeiroAcesso, type Respostas } from '../src/utils/primeiroAcesso'
import { planoDoPrimeiroAcesso } from '../src/utils/primeiroPlano'
import { lancarNaFatura, lancarNoExtrato } from '../src/utils/lancamentoRapido'
import type { Conta, Categoria, PlanoAnoData } from '../src/context/AppContext'

export const EMAIL_TESTE = 'ana.teste@compass-one.com.br'

/** O primeiro acesso foi em 1º/10/2026: o plano começa no próprio outubro. */
const HOJE = new Date(2026, 9, 1)

const r: Respostas = {
  banco: 'Sicredi', saldo: 3000, renda: 5000, diaRenda: 5, decimo: true,
  usaCartao: true, cartao: 'XP', vencimento: 6,
  outrosBancos: [{ banco: 'Caixa', saldo: 1200 }], outrosCartoes: [],
  contas: {
    aluguel: { valor: 1800, dia: 10, forma: 'manual' },
    luz: { valor: 180, dia: 15, forma: 'automatico' },
    internet: { valor: 99.9, dia: 20, forma: 'boleto' },
    academia: { valor: 120, dia: 8, forma: 'cartao' },
  },
  outrasContas: [],
  diaADia: { mercado: 900, combustivel: 300, transporte: 150, farmacia: 100, restaurante: 400, lazer: 200 },
  outrosGastos: [],
  parcelas: [{ nome: 'Geladeira', valor: 250, faltam: 8, total: 10, forma: 'cartao', cartao: 'XP' }],
  // A fatura que vence em 06/10 já fechou: 1.240,30 (o PAGTO FATURA do extrato).
  // A aberta (305,90) tem a Netflix de 30/09 e a parcela 3 da geladeira, como o app do banco mostra.
  faturas: { XP: { aberta: 305.9, aPagar: 1240.3 } },
  meta: 300,
  saldoDe: 'dia1',
}

const res = aplicarRespostas({ r, nomeTitular: 'Ana Teste', contas: [], categorias: [], planoDoAno: undefined, hoje: HOJE })
const novos = planoDoPrimeiroAcesso(res.categorias, res.plano.estimativas, HOJE)
const categorias: Categoria[] = fixasDoPrimeiroAcesso(res.categorias, res.plano.estimativas)
const contas: Conta[] = res.contas
const planos: Record<number, PlanoAnoData> = {}
for (const x of novos) {
  const metas = Array.from({ length: 12 }, (_, i) => (i >= x.mesInicio && i <= x.mesFim ? r.meta : 0))
  planos[x.ano] = { ...(x.ano === 2026 ? res.plano : {}), ...x.plano, objetivos: metas } as PlanoAnoData
}

const conta = (banco: string) => contas.find(c => c.banco === banco && c.tipo !== 'cartao')!
const sicredi = conta('Sicredi')
const xp = contas.find(c => c.tipo === 'cartao')!
const cat = (nome: string) => categorias.find(c => c.nome === nome)!
const chave = (id: string, ano: number, mes: number) => `${id}-${ano}-${String(mes + 1).padStart(2, '0')}`

// Lançados à mão em outubro, antes de qualquer importação.
const extrato: Record<string, unknown> = {}
let dm = { lancamentos: {}, saldoBanco: '' }
dm = lancarNoExtrato(dm, { id: 'manual-mercado-1510', dia: 15, tipo: 'saida', categoria: cat('Mercado / Supermercado').nome,
  descricao: 'Zaffari', valor: 312.45, formaPagamento: 'debito' })
dm = lancarNoExtrato(dm, { id: 'manual-farmacia-1210', dia: 12, tipo: 'saida', categoria: cat('Farmácia').nome,
  descricao: 'Drogasil', valor: 48.9, formaPagamento: 'debito' })
extrato[chave(sicredi.id, 2026, 9)] = dm

let faturas = res.faturas
faturas = lancarNaFatura(faturas, { cartao: xp, ano: 2026, mes: 9, dia: 14, tipoDaCategoria: 'saida',
  categoria: cat('Restaurante / Delivery').nome, descricao: 'Outback', valorParcela: 186, parcelas: 1, baseId: 'manual-outback-1410' })

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
console.log('XP fecha', xp.diaFechamento, 'vence', xp.diaVencimento)
