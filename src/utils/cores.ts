// ── Paleta de cores centralizada ─────────────────────────────────────
// Fonte única de verdade para todas as cores do app.
//
// Os quatro conflitos que este arquivo documentava foram resolvidos em
// 30/08/2026. Onde a spec e o código divergiam, venceu quem tinha mais uso
// — menos arquivos para mudar, menos risco:
//   fundo   #f8faff  (o código; a spec pedia #f0f4ff)
//   borda   #e2e8f0  (a spec; só 7 lugares usavam #e8edf3)
//   texto   #0f172a  (o código; a spec pedia #1e293b)
//
// O âmbar foi exceção: nenhum dos dois candidatos servia como TEXTO.
// #f59e0b dava 1,95:1 e #d97706 dava 2,90:1 sobre o fundo do app — os dois
// reprovavam, e o âmbar rotula "A receber", "Pendente" e "Faltou".
// #b45309 dá 4,56:1. As barras seguem em #fbbf24, que é gráfico e vale 3:1.
// ─────────────────────────────────────────────────────────────────────
export const COR = {
  // Azuis
  azulEscuro: '#0f2878',
  azul:       '#1a56db',
  azulMedio:  '#2563eb',

  // Destaque
  verde:    '#16a34a',
  vermelho: '#dc2626',
  amarelo:  '#b45309',  // 4,6:1 sobre o fundo do app
  roxo:     '#7c3aed',

  // Fundos
  fundo:  '#f8faff',
  branco: '#ffffff',

  // Texto
  texto:      '#0f172a',  // 17,9:1 sobre branco
  textoSuave: '#64748b',
  textoMuted: '#94a3b8',

  // Bordas
  borda:      '#e2e8f0',
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
