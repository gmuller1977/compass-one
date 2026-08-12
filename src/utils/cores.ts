// ── Paleta de cores centralizada ─────────────────────────────────────
// Fonte única de verdade para todas as cores do app.
// Conflitos documentados:
//   fundo:  spec '#f0f4ff'; Dashboard/Simulacao usavam '#f8faff'
//   borda:  spec '#e2e8f0'; Dashboard/Simulacao usavam '#e8edf3'
//   texto:  spec '#1e293b'; todos os locais usam '#0f172a'
//   amarelo: spec '#f59e0b'; Dashboard/AcShared usavam '#d97706'
// ─────────────────────────────────────────────────────────────────────
export const COR = {
  // Azuis
  azulEscuro: '#0f2878',
  azul:       '#1a56db',
  azulMedio:  '#2563eb',

  // Destaque
  verde:    '#16a34a',
  vermelho: '#dc2626',
  amarelo:  '#d97706',  // conflito: spec '#f59e0b'; local usa '#d97706'
  roxo:     '#7c3aed',

  // Fundos
  fundo:  '#f0f4ff',  // conflito: Dashboard/Simulacao usavam '#f8faff'
  branco: '#ffffff',

  // Texto
  texto:      '#0f172a',  // conflito: spec '#1e293b'; todos os locais usam '#0f172a'
  textoSuave: '#64748b',
  textoMuted: '#94a3b8',

  // Bordas
  borda:      '#e2e8f0',  // conflito: Dashboard/Simulacao usavam '#e8edf3'
  bordaSuave: '#f1f5f9',

  // Extras (usados em Acompanhamento)
  vermelhoFundoGrupo: '#ffeaea',
  verdeFundoGrupo:    '#e8fdf0',
}
