// O "olho" da Início vale para o app inteiro (21/11/2026, Guilherme: "todas
// as telas que têm saldo, quando o início estiver oculto, devem ser
// ocultadas"; primeiro Lançamentos e Radar). O estado mora aqui, sem React,
// para que os formatadores das telas (`fmt` de NleShared, FcShared,
// AcShared, radarCores…) o leiam sem receber prop. A tela que os usa assina
// `useValoresOcultos` (mobile/estilo) para redesenhar quando o olho muda.
//
// Fora do navegador (as provas, no node) nada se esconde: as regras e os
// textos continuam testáveis com o número de verdade.

export const EVENTO_OCULTAR = 'compass-ocultar'
export const VALOR_OCULTO = 'R$ ••••'

let ocultoAgora = true

export function valoresOcultos(): boolean {
  return typeof window !== 'undefined' && ocultoAgora
}

export function definirOculto(v: boolean) {
  ocultoAgora = v
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_OCULTAR))
}

/** Valor em reais pronto para a tela: "R$ ••••" com o olho fechado. */
export function moedaNaTela(v: number, opcoes?: Intl.NumberFormatOptions): string {
  if (valoresOcultos()) return VALOR_OCULTO
  return v.toLocaleString('pt-BR', opcoes ?? { style: 'currency', currency: 'BRL' })
}
