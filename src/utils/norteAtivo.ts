/**
 * Liga e desliga o Norte, o assistente com IA, no app inteiro.
 *
 * Desligado em 17/10/2026 a pedido do Guilherme: o Norte usa a chave GRATUITA
 * do Gemini, cujos termos deixam o Google usar o conteúdo enviado (o resumo
 * financeiro da pessoa). Volta quando houver uma conta paga do Gemini. Para
 * religar: `true` aqui e o parágrafo do Google na política de privacidade.
 *
 * Desligado: a rota /norte cai na "/", a barra de baixo mostra "Comprar?"
 * (o Simulador) no lugar do Norte, e somem o cartão da Sidebar, as perguntas
 * do "?" e o botão de Preferências. O código do Norte fica intacto.
 */
export const NORTE_ATIVO = false
