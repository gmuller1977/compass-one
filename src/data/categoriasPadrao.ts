import type { Categoria } from '../context/AppContext'

type CatSugestao = Pick<Categoria, 'nome' | 'tipo' | 'icone' | 'fixa' | 'tipoMovimento' | 'cor' | 'ativa' | 'grupo'>

export const GRUPOS_PADRAO = [
  'Renda', 'Moradia', 'Alimentação', 'Transporte', 'Saúde',
  'Educação', 'Lazer', 'Vestuário', 'Pet', 'Tecnologia', 'Finanças',
  'Cartão de Crédito', 'Outros',
]

const NEUTRO: Pick<CatSugestao, 'fixa' | 'tipoMovimento' | 'cor' | 'ativa'> = {
  fixa: false, tipoMovimento: 'banco', cor: '#6b7280', ativa: false,
}

export const CATEGORIAS_PADRAO: CatSugestao[] = [
  // ── ENTRADAS ──────────────────────────────────────────────────────────
  { ...NEUTRO, tipo:'entrada', nome:'Salário',                 icone:'💰', grupo:'Renda' },
  { ...NEUTRO, tipo:'entrada', nome:'Renda Extra',             icone:'📊', grupo:'Renda' },

  // ── SAÍDAS ────────────────────────────────────────────────────────────
  { ...NEUTRO, tipo:'saida',   nome:'Aluguel / Financiamento', icone:'🏠', grupo:'Moradia' },
  { ...NEUTRO, tipo:'saida',   nome:'Energia Elétrica',        icone:'💡', grupo:'Moradia' },
  { ...NEUTRO, tipo:'saida',   nome:'Água / Saneamento',       icone:'💧', grupo:'Moradia' },
  { ...NEUTRO, tipo:'saida',   nome:'Manutenção / Reparos',    icone:'🔧', grupo:'Moradia' },
  { ...NEUTRO, tipo:'saida',   nome:'Mercado / Supermercado',  icone:'🛒', grupo:'Alimentação' },
  { ...NEUTRO, tipo:'saida',   nome:'Restaurante / Delivery',  icone:'🍽️', grupo:'Alimentação' },
  { ...NEUTRO, tipo:'saida',   nome:'Combustível',             icone:'⛽', grupo:'Transporte' },
  { ...NEUTRO, tipo:'saida',   nome:'Transporte / Uber',       icone:'🚗', grupo:'Transporte' },
  { ...NEUTRO, tipo:'saida',   nome:'Plano de Saúde',          icone:'🏥', grupo:'Saúde' },
  { ...NEUTRO, tipo:'saida',   nome:'Farmácia',                icone:'💊', grupo:'Saúde' },
  { ...NEUTRO, tipo:'saida',   nome:'Academia',                icone:'🏋️', grupo:'Saúde' },
  { ...NEUTRO, tipo:'saida',   nome:'Educação',                icone:'🎓', grupo:'Educação' },
  { ...NEUTRO, tipo:'saida',   nome:'Streaming / Assinaturas', icone:'📺', grupo:'Lazer' },
  { ...NEUTRO, tipo:'saida',   nome:'Lazer / Entretenimento',  icone:'🎭', grupo:'Lazer' },
  { ...NEUTRO, tipo:'saida',   nome:'Roupas / Vestuário',      icone:'👕', grupo:'Vestuário' },
  { ...NEUTRO, tipo:'saida',   nome:'Pet',                     icone:'🐾', grupo:'Pet' },
  { ...NEUTRO, tipo:'saida',   nome:'Internet / Celular',      icone:'📱', grupo:'Tecnologia' },
  { ...NEUTRO, tipo:'saida',   nome:'Presentes / Datas',       icone:'🎁', grupo:'Outros' },
]
