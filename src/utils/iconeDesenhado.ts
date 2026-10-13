import { COR } from './cores'

/**
 * O ícone de categoria e de conta é gravado como emoji (é o que o cadastro
 * sempre gravou, e o que está no banco de todo usuário). Na tela ele vira o
 * ícone desenhado (Tabler) correspondente, no mesmo traço do resto do app.
 * Nenhuma migração: só a leitura muda. Emoji fora da tabela segue como emoji.
 */
const TABELA: Record<string, string> = {
  '🛒': 'ti-shopping-cart', '⛽': 'ti-gas-station', '💊': 'ti-pill', '📱': 'ti-device-mobile',
  '💡': 'ti-bulb', '💧': 'ti-droplet', '🎓': 'ti-school', '✈': 'ti-plane', '🎭': 'ti-masks-theater',
  '👕': 'ti-shirt', '🍽': 'ti-tools-kitchen-2', '🎁': 'ti-gift', '🏋': 'ti-barbell', '🐾': 'ti-paw',
  '📺': 'ti-device-tv', '🎮': 'ti-device-gamepad-2', '🏥': 'ti-building-hospital', '📌': 'ti-pin',
  '🔧': 'ti-tool', '☕': 'ti-coffee', '🎵': 'ti-music', '📚': 'ti-books', '🏖': 'ti-beach',
  '💐': 'ti-flower', '🧴': 'ti-bottle', '💈': 'ti-scissors', '🐶': 'ti-dog', '🎯': 'ti-target',
  '💰': 'ti-coin', '💵': 'ti-cash', '💼': 'ti-briefcase', '📈': 'ti-trending-up',
  '🏦': 'ti-building-bank', '💹': 'ti-chart-line', '🤑': 'ti-moneybag', '🧾': 'ti-receipt',
  '🏠': 'ti-home', '🚗': 'ti-car', '💎': 'ti-diamond', '📊': 'ti-chart-bar', '🏢': 'ti-building',
  '⭐': 'ti-star', '🏆': 'ti-trophy', '🔑': 'ti-key', '📥': 'ti-inbox', '🪙': 'ti-coins',
  '💳': 'ti-credit-card', '🤝': 'ti-heart-handshake', '📑': 'ti-files', '🎉': 'ti-confetti',
  '🌟': 'ti-sparkles', '🏗': 'ti-crane', '🛡': 'ti-shield', '🌱': 'ti-plant', '🏧': 'ti-pig-money',
  '📁': 'ti-folder', '📂': 'ti-folder-open', '💸': 'ti-cash-banknote', '🏷': 'ti-tag', '👛': 'ti-wallet',
}

/** "ti-…" do emoji gravado, ou null quando não há desenho para ele. */
export function iconeDesenhado(icone: string | undefined | null): string | null {
  if (!icone) return null
  const s = icone.trim()
  if (s.startsWith('ti-')) return s
  return TABELA[s.replace(/️/g, '')] ?? null
}

/** O ícone na própria cor da categoria, escurecida até passar 3:1 no fundo claro (gráfico). */
export function corDoIcone(cor: string) {
  if (!/^#[0-9a-f]{6}$/i.test(cor)) return COR.azul
  const rgb = [1, 3, 5].map(i => parseInt(cor.slice(i, i + 2), 16))
  const lum = (c: number[]) => c.reduce((s, v, k) => {
    const x = v / 255; const l = x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    return s + l * [0.2126, 0.7152, 0.0722][k]
  }, 0)
  // 3,3 contra o branco deixa folga para o tom de 12% da própria cor no fundo.
  for (let f = 1; f > 0.2; f -= 0.05) {
    const c = rgb.map(v => Math.round(v * f))
    if (1.05 / (lum(c) + 0.05) >= 3.3) return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('')
  }
  return COR.azul
}
