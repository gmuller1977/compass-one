# Base de teste

Tudo para testar sem tocar na produção (29/10/2026, pedido do Guilherme antes
de começar a importação de extrato). Duas partes:

1. **Ambiente de teste**: um segundo projeto Supabase, com o mesmo banco e
   uma conta fictícia, a "Ana Teste".
2. **Extratos fictícios** (`extratos/`): OFX e CSV no formato dos bancos, com
   um caso de cada regra que a importação precisa respeitar, e o resultado
   esperado de cada linha (abaixo).

Nenhum dado real entra aqui. Arquivo de extrato de verdade nunca vai para o
repositório; se precisar de um formato novo, ele vira fictício em `gerar.py`.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `banco/schema-completo.sql` | O banco inteiro do zero: as migrações (menos 003 e 004, da tabela antiga), a coluna `cenario_previsao` e os GRANTs. Gerado por `banco/montar-schema.mjs` |
| `banco/semente.sql` | A conta "Ana Teste". Pode rodar de novo: apaga e recria. Recusa rodar num banco com mais de 5 usuários (proteção contra a produção). Gerado por `semente.ts` |
| `semente.ts` | Monta a Ana pelo mesmo caminho do primeiro acesso do app (`aplicarRespostas`, `planoDoPrimeiroAcesso`) |
| `extratos/sicredi-conta-out2026.ofx` | Extrato do banco, OFX 1.02 (o formato antigo, sem tags de fechamento, em Windows-1252) |
| `extratos/xp-cartao-out2026.ofx` | Fatura do cartão, OFX 2 (XML) |
| `extratos/caixa-conta-out2026.csv` | Extrato em CSV brasileiro (`;`, vírgula decimal, linha de saldo) |
| `extratos/formato-nubank-cartao.csv` | Só formato: CSV americano (`,`, ponto decimal, data ISO, aspas) |

Regerar depois de uma migração nova ou de mudar o cenário:

```bash
node teste/banco/montar-schema.mjs
npx jiti teste/semente.ts
python3 teste/extratos/gerar.py
```

## Montar o ambiente de teste (uma vez)

No Supabase:

1. Criar um projeto novo, por exemplo `compass-one-teste` (o plano gratuito
   permite dois).
2. SQL Editor: colar e rodar `banco/schema-completo.sql`.
3. Authentication > Users > Add user: `ana.teste@compass-one.com.br`, com uma
   senha, marcando "Auto Confirm User".
4. SQL Editor: colar e rodar `banco/semente.sql`.
5. Authentication > URL Configuration: pôr o endereço da prévia da Vercel
   (passo 7) em Site URL e Redirect URLs.
6. Project Settings > API: copiar a Project URL e a chave `anon`.

Na Vercel:

7. Settings > Environment Variables: `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` com os valores do passo 6, marcando só
   **Preview** e o branch `teste`. Produção continua com as suas.
8. O branch `teste` publica uma prévia nesse banco. Cada push nele conta no
   limite diário da Vercel, então só se publica ali quando há algo a testar.

A digital (passkey) não funciona na prévia, porque está presa ao domínio
compass-one.com.br. Entra-se com e-mail e senha.

## A Ana Teste

Primeiro acesso em 1º/10/2026, com o saldo "desde o dia 1º". O plano vai de
outubro de 2026 a setembro de 2027, com meta de guardar R$ 300 por mês.

| Item | Valor |
| --- | --- |
| Sicredi (salário, preferida) | saldo R$ 3.000,00 em 1º/10 |
| Caixa | saldo R$ 1.200,00 em 1º/10 |
| Cartão XP | fecha dia 29, vence dia 6, pago pelo Sicredi |
| Salário | R$ 5.000,00 dia 5, no Sicredi (+ 13º) |
| Aluguel | R$ 1.800,00 dia 10, PIX |
| Luz | R$ 180,00 dia 15, débito automático |
| Internet | R$ 99,90 dia 20, boleto |
| Academia | R$ 120,00 dia 8, no cartão |
| Dia a dia (plano) | Mercado 900, Combustível 300, Transporte 150, Farmácia 100, Restaurante 400, Lazer 200 |
| Geladeira | 10× de R$ 250,00 no XP, faltavam 8 (parcelas 3 a 10 já na fatura) |
| Fatura XP fechada | R$ 1.240,30, vence 06/10 ("Compras antes do Compass One") |
| Fatura XP aberta | R$ 305,90 = Netflix 55,90 + parcela 3 da geladeira |

Lançados à mão em outubro, antes de importar qualquer coisa:

- Sicredi, 12/10: Farmácia "Drogasil" R$ 48,90.
- Sicredi, 15/10: Mercado "Zaffari" R$ 312,45.
- XP, 14/10: Restaurante "Outback" R$ 186,00.

Ao abrir o app, salário (dia 5) e luz (dia 15) já se confirmam sozinhos,
pela regra do débito automático.

## Resultado esperado: extrato do Sicredi (OFX)

Saldo no fim do arquivo: **R$ 3.479,15** (3.000 + o que entrou e saiu desde
1º/10). Depois da importação, a Início deve mostrar o Sicredi como
"✓ confere".

| Data | No arquivo | Valor | O que a importação faz |
| --- | --- | --- | --- |
| 28/09 | PIX ENVIADO CARLOS | −80,00 | Fica de fora: antes do saldo de 1º/10 |
| 03/10 | PIX RECEBIDO JOAO SILVA | +150,00 | Novo, receita, sem sugestão de categoria |
| 05/10 | CRED SALARIO EMPRESA X LTDA | +5.000,00 | Confirma a fixa Salário (já confirmada sozinha: nada muda) |
| 06/10 | PAGTO FATURA CARTAO XP | −1.240,30 | Pagamento da fatura XP que venceu em 06/10, não despesa |
| 08/10 | TED ENVIADA CAIXA ANA TESTE | −500,00 | Transferência Sicredi → Caixa |
| 10/10 | PIX ENVIADO IMOBILIARIA BOA VISTA | −1.800,00 | Confirma a fixa Aluguel |
| 12/10 | COMPRA DEBITO FARMACIA DROGASIL | −49,80 | Novo, sugere Farmácia. O manual de 48,90 tem outro valor: **não** é o mesmo |
| 15/10 | DEB AUT CEEE ENERGIA | −196,40 | Luz confirmada com "Outro valor" (previsto 180,00) |
| 16/10 | COMPRA DEBITO SUPERMERCADO ZAFFARI | −312,45 | Já lançado (manual de 15/10, mesmo valor, 1 dia antes) |
| 18/10 | SAQUE 24H BANCO24HORAS | −200,00 | Saque: transferência para a carteira |
| 20/10 | APLICACAO POUPANCA | −300,00 | Aplicação. A Ana não tem conta de investimento: pergunta onde, ou entra como transferência |
| 22/10 | COMPRA DEBITO PADARIA SAO JOSE | −18,50 | Novo |
| 22/10 | COMPRA DEBITO PADARIA SAO JOSE | −18,50 | Novo também (outro código no banco: duas compras de verdade). Escolher a categoria numa vale para a outra |
| 24/10 | TARIFA PACOTE SERVIÇOS | −34,90 | Novo, sem sugestão. Testa o acento em Windows-1252 |

Internet (boleto, dia 20) não aparece no arquivo: segue a pagar, nada muda.

**Importar o mesmo arquivo de novo não traz nada.**

## Resultado esperado: fatura XP (OFX)

Fatura que vence em 06/11 (compras de 29/09 a 28/10): **R$ 938,32** no
arquivo. Vira o valor informado da fatura, e depois da importação o cartão
diz "✓ igual ao Compass".

| Data | No arquivo | Valor | O que a importação faz |
| --- | --- | --- | --- |
| 30/09 | NETFLIX.COM | 55,90 | Já lançado ("Compras antes do Compass One" de 55,90) |
| 02/10 | MAGAZINE LUIZA PARC 03/10 | 250,00 | Parcela 3 da Geladeira, que já existe (o nome é outro: casa pelo número e valor) |
| 05/10 | AMAZON BR PARC 02/03 | 89,90 | Compra parcelada nova, já na 2ª parcela. **A decidir**: criar a 2 e a 3 (sem a 1, que é do passado)? |
| 08/10 | SMARTFIT | 120,00 | Academia, a fixa no cartão |
| 10/10 | UBER *TRIP | 23,40 | Novo, sugere Transporte / Uber |
| 10/10 | UBER *TRIP | 23,40 | Novo também (outro código) |
| 12/10 | PAGAMENTO RECEBIDO | crédito 1.240,30 | Ignorado: é o pagamento da fatura anterior |
| 14/10 | RESTAURANTE OUTBACK | 186,00 | Já lançado (manual de 14/10) |
| 15/10 | ESTORNO UBER *TRIP | crédito 23,40 | Estorno: abate na fatura (tipo saída na fatura) |
| 22/10 | POSTO IPIRANGA | 210,00 | Novo, sem sugestão (o nome não lembra "Combustível") |
| 23/10 | IOF COMPRA INTERNACIONAL | 3,12 | Novo, sem sugestão |
| 29/10 | FARMACIA PANVEL | 35,00 | Dia do fechamento: vai para a fatura SEGUINTE (vence 06/12) |

## Resultado esperado: Caixa (CSV)

| Data | No arquivo | Valor | O que a importação faz |
| --- | --- | --- | --- |
| 01/10 | SALDO ANTERIOR | — | Ignorado (linha de saldo, sem valor) |
| 08/10 | TED RECEBIDA SICREDI ANA TESTE | +500,00 | A outra ponta da transferência do Sicredi: uma transferência só |
| 11/10 | PIX ENVIADO MARIA DIARISTA | −150,00 | Novo, sem sugestão |
| 19/10 | COMPRA CARTAO DEBITO PET SHOP AMIGO | −87,35 | Novo, sem sugestão |

CSV não tem o código único do banco: importar de novo deve reconhecer pela
data, valor e descrição.

`formato-nubank-cartao.csv` só confere a leitura: 1.234,56 (não 123.456),
a data 2026-10-05, o título com vírgula entre aspas e o estorno negativo.
