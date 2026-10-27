/**
 * As perguntas frequentes da página de apresentação. Uma fonte só: a página
 * as desenha e o build as escreve nos dados estruturados (FAQPage) do
 * index.html, para o Google ler o mesmo texto que a pessoa lê.
 */
export const PERGUNTAS_FREQUENTES: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'O Compass One é grátis?',
    resposta: 'Sim. O plano Grátis tem todas as funcionalidades liberadas, sem limite de uso, sem anúncios e sem pedir cartão de crédito.',
  },
  {
    pergunta: 'Qual a diferença para um app de anotar gastos?',
    resposta: 'Anotar mostra o que já aconteceu. O Compass One usa o seu plano e o que já está lançado, como parcelas e contas fixas, para mostrar com quanto cada mês vai terminar e responder, antes de você comprar, se a compra cabe no seu plano.',
  },
  {
    pergunta: 'Como o Compass One sabe se uma compra cabe no meu bolso?',
    resposta: 'O simulador coloca a compra dentro do seu plano, mês a mês, até o fim do plano. Se nenhum mês fica negativo, ela cabe. Ele compara à vista e parcelado, mostra o juro embutido e diz se a sua meta de economia continua de pé.',
  },
  {
    pergunta: 'Preciso informar a senha do meu banco?',
    resposta: 'Não. O Compass One não se conecta ao seu banco. Você informa os saldos e anota os gastos, e o app confere tudo com você.',
  },
  {
    pergunta: 'Preciso entender de finanças para usar?',
    resposta: 'Não. No primeiro acesso o app faz algumas perguntas simples, como quanto você recebe e quais contas paga todo mês, e monta um plano inicial. Tudo pode ser aproximado e ajustado depois.',
  },
  {
    pergunta: 'Funciona no celular?',
    resposta: 'Funciona no celular e no computador, com as mesmas informações nos dois. No celular dá para instalar o app na tela inicial e entrar com a digital.',
  },
  {
    pergunta: 'Posso usar junto com a minha família?',
    resposta: 'Sim. Com a conta compartilhada você convida outra pessoa por e-mail; cada uma entra com o próprio login e vê as mesmas finanças.',
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta: 'A conexão é criptografada e os seus dados ficam na sua conta, acessíveis só por você e por quem você convidar. Você pode baixar uma cópia de todos os seus dados quando quiser.',
  },
]
