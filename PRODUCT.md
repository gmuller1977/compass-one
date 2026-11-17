# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Brasileiros que pagam as contas em dia e mesmo assim chegam ao fim do mês sem sobra: salário, contas fixas, cartão parcelado, às vezes a família junta. Não são da área de finanças e não querem planilha. Usam no celular no dia a dia (anotar um gasto, conferir o saldo, ver se uma compra cabe) e no computador para montar e revisar o plano.

## Product Purpose

O Compass One mostra, em qualquer dia, com quanto o mês (e os próximos) vai terminar, a partir do salário, das contas fixas, das parcelas e do plano da pessoa. Sucesso é a pessoa ver o mês no vermelho com antecedência, mudar o caminho a tempo e passar a guardar de propósito (a meta de economia).

## Positioning

Não é um anotador de gastos: é previsão. O app projeta o saldo final de cada mês até o fim do plano, julga uma compra antes de ela acontecer ("Posso comprar?") e acompanha o mês contra o plano (Radar). Grátis para sempre, sem anúncios, sem pedir a senha do banco. Criado por um educador financeiro.

## Operating Context

App web instalável (PWA), pt-BR, React + Vite + Supabase, hospedado na Cloudflare/Vercel. Apresentação pública em www.compass-one.com.br; o app em app.compass-one.com.br. Lançamento manual (não conecta no banco). Conta compartilhada para a família.

## Capabilities and Constraints

- Telas: Início, Lançamentos (banco, cartão, dinheiro), Radar, Planejamento, Simulador (Posso comprar?), Investimentos.
- Primeiro acesso com seis perguntas monta um plano inicial de 12 meses.
- Automáticos (salário, débito automático) NÃO se marcam sozinhos desde 05/11/2026: aparecem para a pessoa conferir.
- Pacotes de ajuda do educador (curso, grupo, individual) existem como oferta "sob consulta", sem preço publicado.
- E-mail de suporte ainda indefinido (há `suporte@compassone.app` e `suporte@compassone.com.br` em uso).

## Brand Commitments

- Nome "Compass One"; logo única `LogoCompass` + `NomeCompass` (src/components/LogoCompass.tsx). Nunca SVG ou texto próprio no lugar.
- Voz: português do dia a dia, frases curtas, analogia no lugar de jargão; evitar "receitas/despesas/resultado" nas frases para leigos e evitar estimular gastar ("tem para gastar").
- A apresentação conta a vida financeira como uma viagem até um destino tranquilo (v1: navegação até o porto seguro; v2: voo da decolagem até acima das nuvens, pedido de 16/11/2026).
- Fora da paleta do app (`cores.ts`); a identidade do app é o azul-marinho com ciano.

## Evidence on Hand

- Sem depoimentos, clientes ou números de uso reais: não inventar. Telas de exemplo usam números fictícios, rotulados como exemplo.
- Perguntas frequentes reais em src/utils/perguntasFrequentes.ts.
- Educador financeiro sem nome ou foto publicados ainda.

## Product Principles

1. Mostrar o futuro do mês, não só o passado.
2. A pessoa decide o destino; o app desenha o caminho e avisa da tempestade a tempo.
3. Errar para menos: previsão conservadora é o lado certo de errar.
4. Nada inventado: prova é o app funcionando, nunca depoimento fabricado.

## Accessibility & Inclusion

WCAG AA: texto 4,5:1 (no azul, nenhum fundo com valor colorido mais claro que `#1e40af`), elementos gráficos 3:1, toques de 44px no celular, `prefers-reduced-motion` respeitado.
