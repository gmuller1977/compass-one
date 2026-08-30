# Compass One — regras do projeto

App de finanças pessoais em pt-BR. React + Vite + TypeScript, Supabase, deploy na Vercel.

Verificação antes de qualquer commit:

```bash
npx tsc -b && npx oxlint src && npx vite build
```

---

## Contraste sobre fundo azul (WCAG AA)

Mínimo **4.5:1** para texto. As cores da paleta padrão (`#16a34a`, `#dc2626`,
`#4ade80`, `#fbbf24`) **não** atendem sobre azul — foram medidas e reprovam.

### A regra que sustenta tudo

> **Nenhum fundo azul que carregue valor colorido ou label secundário
> pode ser mais claro que `#1e40af`.**

A segunda metade da frase importa. Onde há **só branco puro** — cabeçalho de
seção, navegação, botão, telas de login —, `#1a56db` (6,2:1) e `#2563eb`
(5,2:1) passam e devem ficar como estão. Escurecê-los repintaria a identidade
visual do app inteiro sem ganho nenhum de acessibilidade. O que não passa sobre
esses dois é label em opacidade reduzida: `rgba(255,255,255,0.75)` dá 4,4:1 e
3,6:1.

Com a regra, uma paleta única passa em todos os fundos escuros do app:

| Uso | Cor | Pior caso medido |
|---|---|---|
| Texto geral | `#ffffff` | 6,7:1 |
| Receitas / positivos | `#86efac` | 4,8:1 |
| Despesas / negativos | `#fecaca` | 4,6:1 |
| Destaque / alerta | `#fde047` | 5,1:1 |
| Labels secundários | `rgba(255,255,255,0.75)` | 5,1:1 |

Sobre **azul claro** (`#bfdbfe`, `#93c5fd`) a paleta inverte:

| Uso | Cor | Ratio |
|---|---|---|
| Texto geral | `#1e3a8a` | 5,7:1 |
| Receitas | `#14532d` | 5,1:1 |
| Despesas | `#7f1d1d` | 5,6:1 |
| Labels | `rgba(15,23,42,0.7)` | — |
| Branco | **nunca** | 1,4:1 |

Sobre **cinza** (tema "Sem Planejamento"): usar `#475569 → #334155`. Cinzas mais
claros não deixam a hierarquia de opacidade funcionar — em `#64748b`, mesmo
`rgba(255,255,255,0.75)` reprova.

Os tokens estão em [`src/utils/cores.ts`](src/utils/cores.ts), cada um com o
ratio medido ao lado.

### Como medir

**Em gradiente, o limite é o extremo mais claro, não a média.** Medir pela média
superestima e foi o erro do briefing original de auditoria — vários ratios lá
estavam inflados (branco sobre `#1e3a8a` é 10,4:1, não 15:1).

Barras, ícones e elementos puramente gráficos seguem o limite de 3:1, não 4,5:1.

### Antes de trocar uma cor

Medir primeiro. Várias combinações do app já passavam e não precisavam mudar —
trocá-las só custaria identidade visual. Mudança de cor sem ratio medido antes e
depois não entra.

---

## Decisões de produto registradas

**Conciliação** (saldo informado × saldo calculado) existe apenas no **extrato
bancário e no dinheiro**. Radar Financeiro e Resumo Mensal são telas de consulta,
não de edição — não levam conciliação. Decidido em 29/08/2026; não reabrir sem
pedido explícito.

**Distinção temporal por cor** (passado / hoje / futuro) vale em **Lançamentos** e
no **Radar**. No **Planejamento** ela foi removida de propósito: lá o que separa
os meses é ter ou não planejamento, não a posição no tempo.

**Despesas sobre fundo azul** aparecem em amarelo no Planejamento e em vermelho
claro em Lançamentos. As duas telas divergem por decisão de design, não por
descuido.

---

## Dinheiro

**Um único parser**, em [`src/utils/moeda.ts`](src/utils/moeda.ts):

- `parseValor(s)` → `number | null`. Campo vazio vale `0`; só texto inválido vale `null`.
- `parseBRL(s)` → `number`. Tolerante, para leitura de valor já salvo.

Nunca escrever `parseFloat(...) || 0` de novo. Havia 16 cópias disso, com três
comportamentos diferentes, e cada uma errava de um jeito: `1234.56` virava
`123456`, `12o0` virava `12`, `R$ 1.234,56` virava `0` e apagava a célula.

Onde o usuário digita e confirma, valor inválido **avisa e não grava**. Onde o
`onChange` roda a cada tecla, usar `parseBRL` — `null` no meio da digitação
travaria o campo na vírgula.

Exceção: `<input type="number">` entrega formato en-US e continua com
`parseFloat`. Aplicar `parseValor` ali leria `1.234` como milhar.

Cálculos ficam em `number`, não em centavos inteiros: a deriva medida na cascata
de 12 meses com 53 categorias é de R$ 1e-10, ~43 milhões de vezes abaixo do
centavo. Para perguntar se um valor é zero, usar `ehZero()` — comparar com `=== 0`
falha por resíduo de ponto flutuante. Se o app passar a **dividir** dinheiro
(rateio, parcela calculada a partir do total, câmbio), reavaliar.

---

## Categorias e variantes

Uma categoria é identificada pelo par **(nome, variante)** — `descricao` no
código. `Seguro·Civic` e `Seguro·March` são categorias distintas.

Chavear por `nome` puro soma as duas. Usar `catKey(nome, descricao)` de
[`evolucaoCalcs.ts`](src/components/acompanhamento/evolucaoCalcs.ts).

Ao casar uma categoria com a linha do plano: tentar o par exato primeiro; só cair
para o nome puro quando existir **uma única** linha com aquele nome (plano antigo,
de antes das variantes). Com duas, não há fallback — escolher uma somaria no
lugar errado.

---

## Supabase

O `.env` local aponta para o **mesmo projeto** da Vercel: **rodar em localhost
grava em produção**. Há mais de um usuário real na base.

Nunca executar SQL destrutivo direto. Apresentar o SQL para revisão antes de
qualquer `alter`, `drop` ou `delete`.

Segredos (chaves de API) vivem em `supabase secrets`, nunca em `VITE_*` — variável
`VITE_` vai embutida no bundle e fica legível em texto puro no `.js` publicado.

---

## Console

`console.error` e `console.warn` em caminhos de falha ficam — são o que grita
quando algo dá errado em produção.

`console.log` de diagnóstico vai atrás de `import.meta.env.DEV`: existe no
localhost e some do bundle publicado. Debug de investigação não fica para trás.
