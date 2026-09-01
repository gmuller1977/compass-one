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

### Sobre fundo claro, cuidado com o âmbar

O âmbar rotula estados no app — "A receber", "Pendente", "Faltou". Os dois tons
que existiam reprovavam como texto: `#f59e0b` dá 1,95:1 e `#d97706` dá 2,90:1
sobre o fundo do app. O token vale **`#b45309`** (4,6:1).

`#fbbf24` continua nas barras: elemento gráfico segue o limite de 3:1.

Fica pendente e não medido: `#16a34a` sobre branco dá **3,13:1** e reprova como
texto. São 77 usos, fora do recorte "fundo azul" desta rodada.

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

**Categoria fixa só conta quando confirmada.** Não presumir que débito
automático de mês passado aconteceu. Havia esse atalho — `automatica &&
mesPassado` — e ele fazia o Radar discordar da conciliação sobre o mesmo mês:
uma fixa de R$ 25,00 nunca marcada aparecia como paga num lado e não no outro,
e o saldo divergia do extrato. Débito automático falha, muda de valor e é
cancelado; presumir esconde isso. Decidido em 31/08/2026.

Consolidação vive no `DadosMes` de cada **conta**, mas a fixa é do **mês**.
Somar percorrendo as chaves do extrato conta a mesma fixa uma vez por conta —
com três contas, triplicava. Usar `resolverFixaDoMes` de
[`utils/fixasDoMes.ts`](src/utils/fixasDoMes.ts), que resolve o mês inteiro de
uma vez.

**Distinção temporal por cor** (passado / hoje / futuro) vale em **Lançamentos** e
no **Radar**. No **Planejamento** ela foi removida de propósito: lá o que separa
os meses é ter ou não planejamento, não a posição no tempo.

**O assistente de planejamento tem dois nomes, de propósito.** A rota é uma só
(`/wizard-planejamento`), mas ela se chama **"Começar meu plano"** no fim do
Onboarding e **"Planejamento do Zero"** no menu. Na primeira vez não há nada
para refazer, e "do zero" ali soaria estranho; no menu, o nome precisa avisar
que a ação sobrescreve o ano. Não unificar.

Vale lembrar a divisão: o **Onboarding não cria plano** — ele cadastra contas,
cartões e categorias, e no fim manda para o wizard. O **wizard** preenche os
valores, mas replica o mesmo valor em todos os meses. Ajuste mês a mês só na
Grade, Planilha ou Lista.

**`PageHeader` não vai na `QuickLaunch`**, que é a home do mobile. O componente
traz ícone, breadcrumb, título e subtítulo — vocabulário de tela interna. Numa
home ele viraria navegação para lugar nenhum. Decidido em 30/08/2026.

Antes de concluir que uma tela "não tem `PageHeader`", conferir os **componentes
filhos**: em Configuracoes, NovoLancamentoExtrato e RevisaoMensal o cabeçalho
vive num filho (`CfgPerfil`, `NleHeader`, `PlanRevisao`). Uma auditoria que olhou
só o arquivo da página contou as três como ausentes. A `FaturaCartao` também não
leva: ela é a aba "cartão" **dentro** do NovoLancamentoExtrato, e ganharia um
segundo cabeçalho empilhado.

**Despesas sobre fundo azul** aparecem em amarelo no Planejamento e em vermelho
claro em Lançamentos. As duas telas divergem por decisão de design, não por
descuido.

---

## Paleta

`cores.ts` nomeia **86%** das cores usadas no app. Antes de escrever um hex
literal, procurar o token — em especial os de estado (`infoFundo`/`infoTexto`,
`sucessoFundo`/`sucessoTexto`, `avisoFundo`, `erroFundo`), que já vêm com o par
fundo + texto medido.

Dois nomes existem justamente para evitar erro:

- `sucessoTexto` (`#15803d`), **não** `COR.verde` — o verde padrão dá 3,2:1
  sobre `sucessoFundo` e reprova.
- `barraVerde` / `barraVermelha` / `barraAmarela` — elemento gráfico vale 3:1.
  As três reprovam como texto; o nome deixa isso explícito.

As cores literais que ainda existem **não foram migradas de propósito**: são
1.184 substituições mecânicas num app visual, sem ganho para o usuário. Migrar
uma tela é bem-vindo quando ela for mexida por outro motivo; migração em massa,
não. Decidido em 30/08/2026.

**A `LandingPage` fica fora da paleta.** É design de marketing, com identidade
própria e 112 cores só dela. Não migrar, agora nem depois.

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
lugar errado. Use `acharPlanCat` de `evolucaoCalcs.ts`, não escreva de novo.

**Casar sempre contra o plano RESOLVIDO, nunca contra o cru.** Plano antigo guarda
a linha só com o nome; é o `resolverPlanCats` que atribui a variante por posição —
por isso a tela mostra `Financiamento · Casa` mesmo com `descricao` nula no banco.
Quem procura no plano cru encontra duas linhas chamadas "Financiamento", se recusa
a escolher (corretamente) e o valor some.

O sintoma é traiçoeiro: **o previsto aparece e o realizado não**, porque os dois
vêm de caminhos diferentes. E só quebra a variante cuja linha está nua — a irmã,
que tem `descricao` gravada, continua funcionando, o que faz o erro parecer
aleatório. Aconteceu em 31/08/2026 no Radar.

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
