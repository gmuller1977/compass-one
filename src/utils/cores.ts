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


  // ── Contraste sobre fundo azul (WCAG AA, minimo 4.5:1) ──────────────
  // Os ratios abaixo sao do PIOR ponto de cada gradiente, nao da media.
  // Num gradiente o limite e sempre o extremo de menor diferenca.
  //
  // Sobre azul CLARO (#bfdbfe -> #93c5fd): o verde e o vermelho normais
  // reprovam feio (1.8:1 e 2.7:1). Branco ali e ilegivel (1.4:1) — nunca usar.
  sobreAzulClaro:          '#1e3a8a',  // 5.7:1
  sobreAzulClaroVerde:     '#14532d',  // 5.1:1
  sobreAzulClaroVermelho:  '#7f1d1d',  // 5.6:1
  sobreAzulClaroLabel:     'rgba(15,23,42,0.7)',

  // Sobre azul ESCURO (#1e3a8a -> #0f2878)
  sobreAzulEscuro:         '#ffffff',  // 10.4:1
  sobreAzulEscuroVerde:    '#86efac',  //  7.4:1
  sobreAzulEscuroVermelho: '#fecaca',  //  7.2:1
  sobreAzulEscuroAmarelo:  '#fde047',  //  7.9:1
  sobreAzulEscuroLabel:    'rgba(255,255,255,0.75)',

  // Azul MEDIO (#60a5fa, #3b82f6) nao serve de fundo: nem branco passa
  // (2.5:1 e 3.7:1). Onde era usado, escurecer para este par.
  azulMedioFundoDe:        '#1d4ed8',
  azulMedioFundoPara:      '#1e40af',

  // Extras (usados em Acompanhamento)
  vermelhoFundoGrupo: '#ffeaea',
  verdeFundoGrupo:    '#e8fdf0',
}
