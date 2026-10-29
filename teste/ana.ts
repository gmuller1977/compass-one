// A conta de teste "Ana Teste", montada pelo mesmo caminho do primeiro acesso
// do app (aplicarRespostas + planoDoPrimeiroAcesso, como PrimeiroAcesso.tsx),
// mais os lançamentos feitos à mão em outubro. Usada pela semente do banco de
// teste (semente.ts) e pela prova da importação (provas/prova105.ts).
// O cenário e o resultado esperado de cada linha estão em teste/LEIA-ME.md.
import { aplicarRespostas, fixasDoPrimeiroAcesso, type Respostas } from '../src/utils/primeiroAcesso'
import { planoDoPrimeiroAcesso } from '../src/utils/primeiroPlano'
import { lancarNaFatura, lancarNoExtrato } from '../src/utils/lancamentoRapido'
import type { Conta, Categoria, DadosMes, PlanoAnoData } from '../src/context/AppContext'

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
export const categorias: Categoria[] = fixasDoPrimeiroAcesso(res.categorias, res.plano.estimativas)
export const contas: Conta[] = res.contas
export const planos: Record<number, PlanoAnoData> = {}
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
export const extrato: Record<string, DadosMes> = {}
let dm = { lancamentos: {}, saldoBanco: '' }
dm = lancarNoExtrato(dm, { id: 'manual-mercado-1510', dia: 15, tipo: 'saida', categoria: cat('Mercado / Supermercado').nome,
  descricao: 'Zaffari', valor: 312.45, formaPagamento: 'debito' })
dm = lancarNoExtrato(dm, { id: 'manual-farmacia-1210', dia: 12, tipo: 'saida', categoria: cat('Farmácia').nome,
  descricao: 'Drogasil', valor: 48.9, formaPagamento: 'debito' })
extrato[chave(sicredi.id, 2026, 9)] = dm

let faturasMontadas = res.faturas
faturasMontadas = lancarNaFatura(faturasMontadas, { cartao: xp, ano: 2026, mes: 9, dia: 14, tipoDaCategoria: 'saida',
  categoria: cat('Restaurante / Delivery').nome, descricao: 'Outback', valorParcela: 186, parcelas: 1, baseId: 'manual-outback-1410' })

export const faturas = faturasMontadas
