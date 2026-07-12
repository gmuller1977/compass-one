import type { Categoria } from '../context/AppContext'

type CatSugestao = Pick<Categoria, 'nome' | 'tipo' | 'icone'> &
  Pick<Categoria, 'fixa' | 'tipoMovimento' | 'cor' | 'ativa'>

// Apenas nome e ícone são sugeridos — todos os outros campos ficam no padrão
// para o usuário configurar conforme sua realidade.
const NEUTRO: Pick<CatSugestao, 'fixa' | 'tipoMovimento' | 'cor' | 'ativa'> = {
  fixa: false, tipoMovimento: 'banco', cor: '#6b7280', ativa: false,
}

export const CATEGORIAS_PADRAO: CatSugestao[] = [
  // ── ENTRADAS ──────────────────────────────────────────────────────────
  { ...NEUTRO, tipo:'entrada', nome:'Salário',                 icone:'💰' },
  { ...NEUTRO, tipo:'entrada', nome:'Renda Extra',             icone:'📊' },

  // ── SAÍDAS ────────────────────────────────────────────────────────────
  { ...NEUTRO, tipo:'saida',   nome:'Aluguel / Financiamento', icone:'🏠' },
  { ...NEUTRO, tipo:'saida',   nome:'Energia Elétrica',        icone:'💡' },
  { ...NEUTRO, tipo:'saida',   nome:'Água / Saneamento',       icone:'💧' },
  { ...NEUTRO, tipo:'saida',   nome:'Internet / Celular',      icone:'📱' },
  { ...NEUTRO, tipo:'saida',   nome:'Plano de Saúde',          icone:'🏥' },
  { ...NEUTRO, tipo:'saida',   nome:'Educação',                icone:'🎓' },
  { ...NEUTRO, tipo:'saida',   nome:'Academia',                icone:'🏋️' },
  { ...NEUTRO, tipo:'saida',   nome:'Streaming / Assinaturas', icone:'📺' },
  { ...NEUTRO, tipo:'saida',   nome:'Mercado / Supermercado',  icone:'🛒' },
  { ...NEUTRO, tipo:'saida',   nome:'Restaurante / Delivery',  icone:'🍽️' },
  { ...NEUTRO, tipo:'saida',   nome:'Combustível',             icone:'⛽' },
  { ...NEUTRO, tipo:'saida',   nome:'Transporte / Uber',       icone:'🚗' },
  { ...NEUTRO, tipo:'saida',   nome:'Farmácia',                icone:'💊' },
  { ...NEUTRO, tipo:'saida',   nome:'Roupas / Vestuário',      icone:'👕' },
  { ...NEUTRO, tipo:'saida',   nome:'Lazer / Entretenimento',  icone:'🎭' },
  { ...NEUTRO, tipo:'saida',   nome:'Presentes / Datas',       icone:'🎁' },
  { ...NEUTRO, tipo:'saida',   nome:'Manutenção / Reparos',    icone:'🔧' },
  { ...NEUTRO, tipo:'saida',   nome:'Pet',                     icone:'🐾' },
]
