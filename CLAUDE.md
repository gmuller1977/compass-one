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

**O Radar é acompanhamento em tempo real: só realizado.** O saldo inicial é o
saldo real com que o mês abriu, entradas e saídas são as que aconteceram, o
saldo atual é o que está no banco hoje — e o mês seguinte abre exatamente com
ele. Nenhuma projeção entra ali, nem fixa em aberto, nem fatura, nem variável
planejada. Decidido em 07/09/2026.

Antes disso o Radar projetava, e a consequência era esta: setembro fechava com
621,04 e outubro abria com 1,04. Os dois números estavam certos e respondiam
perguntas diferentes, mas a tela não é o lugar dessa pergunta. **A visão de
previsão é assunto do Planejamento.**

O maquinário de projeção vive em [`saldoConta.ts`](src/utils/saldoConta.ts):
`saldoContaNoFim`, `projecaoDaConta`, `projecaoDoMes`.

**O cartão "Saldo atual" do Radar usa esse maquinário como REFERÊNCIA, e isso
não reabre a regra acima.** O número grande continua sendo o saldo de hoje; o
previsto entra embaixo, como "Saldo final previsto", para a barra ter contra o
que medir — do mesmo jeito que Receitas e Despesas se medem contra o planejado.

Ele sai de `saldoTotalNoFim(ano, mes, deps, { comoAbertura: true })`, e é por
construção a soma dos saldos finais previstos das contas de banco e do dinheiro,
porque `projecaoDoMes` é a soma de `projecaoDaConta`. O `comoAbertura` é o que
faz o mês corrente projetar até o dia 31 — sem ele o previsto sairia igual ao
atual e a barra marcaria 100% sempre.

**O que tem de bater entre as contas e o Radar é o saldo inicial e o final —
não o movimento.** Dentro do mês a pergunta é outra: quanto foi realizado
contra o que estava planejado. Decidido em 08/09/2026, depois de uma rodada
inteira tentando fazer o total de Despesas igualar a saída da conta.

Isso é o que decide o destino da **transferência entre contas próprias**: ela
fica **fora do realizado**, filtrada na origem por `ehTransferencia` dentro do
`realizadoMes`. Não é receita nem despesa — o dinheiro só trocou de conta — e
por isso não existe linha nem grupo para ela em tela nenhuma. O que ela move
continua no saldo das contas, que é onde precisa aparecer.

Tentativa descartada, para não repetir: dar a ela o grupo "Finanças" com a linha
marcada como informativa. Fazia o total de Despesas igualar a saída da conta,
mas ao custo de listar como categoria uma coisa que não é despesa.

**Ainda assim, todo realizado que não é transferência tem de estar em algum
grupo.** A soma dos grupos de Despesas ficava abaixo da saída das contas —
12.008,11 contra 12.706,83 num mês real. Os grupos eram montados só a
partir do cadastro de categorias, então todo realizado sem cadastro vivo não
entrava em grupo nenhum e sumia do total: **"Transferência"**, que é uma string
literal escrita por `lancar()` e nunca foi uma categoria, e qualquer categoria
**excluída ou desativada** com movimento no mês.

Hoje o `extraCats` de [`evolucaoCalcs.ts`](src/components/acompanhamento/evolucaoCalcs.ts)
joga esse dinheiro em **"Outras"**, e o Radar sempre inclui `__sem_grupo__` na
lista de grupos. O grupo fica vazio e não é renderizado quando não há nada nesse
caso. A regra: **linha do plano** só aparece se a categoria existir e estiver
ativa (senão uma exclusão ressuscita); **dinheiro que se moveu** aparece sempre,
nem que seja em "Outras".

Consequência aceita: a saída da conta de origem fica **maior** que o total de
Despesas, pelo valor transferido. É correto — o dinheiro saiu de lá e entrou na
outra conta —, e o saldo das duas contas mostra isso.

A fatura continua fora: ela entra pelo lançamento do cartão, não pela categoria
homônima.

**Fixa confirmada conta mesmo com a categoria desativada, e o valor sai de
`valorFixaNoMes`.** Eram duas divergências no mesmo laço de
[`realizadoMes.ts`](src/utils/realizadoMes.ts):

1. ele filtrava `c.fixa && c.ativa`, enquanto `movimentoDoMes` acha a fixa pelo
   id e não olha `ativa`. Desativar a categoria depois **não desfaz o
   pagamento** — a saída seguia no extrato e não virava linha nenhuma no Radar.
   Hoje ela conta e cai em "Outras", já que não há cadastro ativo para agrupá-la.
2. o valor vinha de `acharPlanCat` (nome + variante), e o da conta vinha de
   `valorFixaNoMes` (**id primeiro**, depois nome). Com plano antigo as duas
   achavam linhas diferentes. Agora só existe `valorFixaNoMes` — ela já casa
   contra o plano resolvido, então `Financiamento · Casa` continua certo.

**A fatura confirmada com valor ajustado ganha uma linha de reconciliação.**
As duas telas medem coisas diferentes de propósito: a despesa acontece na
**compra** (é assim que ela se compara ao plano), mas o que sai da conta é o
**pagamento**. Enquanto os dois batem, ninguém percebe. Quando a fatura é
confirmada com outro valor — juros, IOF, compra não lançada, arredondamento —,
`movimentoDoMes` debita o valor digitado e o Radar soma as compras, e a
diferença saía do banco sem aparecer em lugar nenhum. Foram 3 centavos num mês
real; no mês do juro seria a fatura inteira.

Hoje o `realizadoMes` acrescenta `Ajuste de fatura · <cartão>` com
`override − compras`, e a identidade fecha: compras + ajuste = o que foi pago =
o que `saldoConta` debita. A linha pode ser **negativa** (pagou menos que as
compras) — por isso `EvolucaoLinha` mostra realizado `!== 0` e não `> 0`, senão
o número sumia num travessão.

**O mês corrente tem dois saldos, e os dois estão certos** — isso vale em
**Lançamentos**, onde a cascata projeta dia a dia. "Quanto tenho hoje" é o
realizado, bate com o extrato do banco; "com quanto abre o mês que vem" já
desconta o que falta acontecer até o dia 31. É o `comoAbertura`. Sem a
distinção, ou o saldo do dia mente, ou o mês seguinte abre ignorando as contas
a pagar.

**Variável no mês corrente vale `max(0, planejado − realizado)`, por
categoria.** Plano de 1.000 em mercado com 200 gastos projeta os 800 que
faltam; com 1.200 gastos projeta 0, e vale o realizado que já está no extrato.
Decidido em 08/09/2026.

Antes o mês corrente não projetava variável nenhuma. O motivo era legítimo —
somar o planejado por cima dos lançamentos reais contaria o mesmo gasto duas
vezes —, mas a saída escolhida (não somar nada) deixava o saldo final previsto
otimista: escondia dinheiro que já se sabe que vai sair. A fórmula do
`max` sempre existiu no complemento da fatura; agora vale nos dois.

**O realizado soma extrato, dinheiro E fatura.** `tipoMovimento` na categoria é
a **intenção** de onde pagar — uma previsão de uso do cartão —, não uma trava.
Mercado planejado no banco e pago no cartão consumiu o mesmo plano. Decidido
pelo Guilherme em 08/09/2026.

Quem calcula é `faltaVariavelDoMes` em [`saldoConta.ts`](src/utils/saldoConta.ts),
e tanto a cascata de Lançamentos quanto a projeção do Radar chamam **essa**
função. O número dela é, por construção, o mesmo **"Disponível"** que o Radar
mostra na linha da categoria: mesmo mês, mesmos dois números. Mês futuro cai
nela também — sem lançamento, o realizado é 0 e sobra o plano inteiro.

Antes eram três contas para a mesma pergunta, e elas divergiam: o Radar somava
tudo por categoria, a projeção olhava só o extrato, e a fatura em aberto usava
um agregado (`planejado do cartão − total lançado na fatura`) que não sabia de
qual categoria veio cada compra. Plano de 1.000 com 200 no débito e 500 no
cartão dava **300** no Radar e reservava **800** no saldo previsto. Pior: os
mesmos 500 abatiam o orçamento do cartão sem abater o da própria categoria.

O rateio não muda o total, só o endereço:

- categoria de banco/dinheiro → a conta de débito dela;
- categoria de cartão → a conta que paga o cartão em aberto de vencimento mais
  cedo, enquanto aquela fatura não fechou. **Fechada, já confirmada, ou sem
  cartão nenhum, a sobra vira sobra de banco** — conta de débito da categoria
  (ou a preferida), no último dia do mês.

**Sobra do plano não atravessa o mês.** O plano é do mês e o mês é o limite:
gastar menos que o planejado é economia, não saldo acumulado — mês que vem tem
plano e limite próprios. Decidido pelo Guilherme em 08/09/2026, o que descartou
o modelo de transbordo (sobra de setembro entrando na fatura de outubro).

Foi esse mesmo princípio que resolveu o fechamento do cartão. Antes, a sobra de
categoria de cartão **sumia** da previsão no dia do fechamento: medido, 1.500
viravam 0 no dia 21 sem terem sido gastos. O fechamento é um fato sobre o
**cartão**, não sobre o plano — se aquele dinheiro ainda vai sair no mês, sai
por outro meio. Categoria de banco já era projetada até o último dia; agora as
duas se comportam igual.

Preço assumido: gasto que de fato vai para a fatura seguinte deixa os últimos
dias do mês subestimados. Antes ficavam superestimados. Errar para menos é o
lado certo de errar num app de finanças.

O realizado é do **MÊS**, não da conta — um gasto pago por outro banco também
consumiu o plano da categoria. Só a **sobra** se atribui a uma conta, e é isso
que mantém a soma por conta igual ao total.

**Fixa vencida e não confirmada é ATRASADA, não inexistente.** No mês corrente
ela conta na projeção, lançada em **hoje** em vez do dia vencido. Decidido em
09/09/2026.

A regra "fixa só conta quando confirmada" foi decidida em 31/08 para o
**realizado** — para o saldo do dia não mentir sobre o extrato. A cascata de
Lançamentos aplicava ela também à **projeção**, e aí uma conta vencida e não
paga sumia do fim do mês. `projecaoDaConta` nunca olhou dia nenhum, então o
Radar sempre a contou: as duas telas discordavam sobre o mesmo mês, medido em
645,00 num caso real. O mesmo valia para a fatura em aberto com vencimento já
passado, que era descartada da cascata.

Lançar em **hoje**, e não no dia vencido, é o que preserva o saldo dos dias
passados: `NleExtrato` desenha o saldo de dia passado com
`saldoIni + entradasConf − saidasConf`, só o que foi confirmado, então nada
ali se move.

**Mês fechado continua sem projetar nada.** Lá não se presume: a fixa de agosto
que ninguém confirmou não vira despesa em setembro nem em agosto.

**O saldo final previsto abre a memória de cálculo ao ser clicado.** Ela sai da
própria cascata: a mesma passagem que soma o saldo classifica cada parcela num
balde (`Memoria`, em [`NleShared.tsx`](src/components/novoLancamentoExtrato/NleShared.tsx)).
Uma segunda função para explicar o número acabaria discordando dele — foi o que
aconteceu em toda tela deste app onde havia dois caminhos para a mesma pergunta.
Linha zerada não aparece: quem só tem lançamento não lê sobre fatura estimada.

**Tentativa descartada, para não repetir:** desenhar `Gastos variáveis a
realizar` e `Fatura estimada` como linhas no dia, junto dos lançamentos.
Tecnicamente correto e recusado pelo Guilherme em 08/09/2026 — misturar
previsão com lançamento no mesmo lugar confunde, e a tela já está cheia. A
informação é a mesma; o lugar é que era errado.

O painel pinta **fundo próprio** (`#0f2878` / `#7f1d1d`) em vez de herdar o do
cartão. A caixa do mobile usa `COR.azulMedio` (`#2563eb`), mais claro que o
limite de `#1e40af`, e sobre ele o verde e o vermelho claro reprovariam.
Medido: branco 10,4:1 e 9,9:1; `#86efac` 4,8:1 e 7,1:1; `#fecaca` 4,6:1 e
6,8:1; label a 75% 5,1:1 e 6,1:1.

**Receita variável entra pela MESMA fórmula.** Ficava de fora por medo de chutar
entrada, e o resultado era um saldo torto para baixo: o mês reservava o que
ainda falta gastar e ignorava o que ainda falta receber. Quem escreveu o plano
já disse que espera receber — não é chute do app. Decidido em 08/09/2026, ao
comparar com a planilha do Guilherme, onde a diferença dava 663,08 de "Clientes
a Receber" previstos e não recebidos.

Vale para as duas telas, pela mesma função. A receita cai na conta de depósito
da categoria (`contaDebitoId`, ou dinheiro), nunca num cartão.

**Como reconciliar com uma planilha externa.** A memória de Lançamentos é de UMA
conta; uma planilha costuma ser o consolidado. Comparar as duas direto acusa uma
diferença que é só o saldo das outras contas — foi o que aconteceu com os
1.269,72 de Caixa e dinheiro. O número comparável é o **Saldo final previsto do
Radar**, que soma bancos e dinheiro.

A outra diferença legítima é o clamp: a planilha faz `previsto − realizado` no
total, então categoria que estourou abate a que sobrou. O app calcula por
categoria e para no zero, por decisão registrada acima.

**O Planejamento não mistura realizado com projetado nas categorias.** Receitas
e Despesas de um mês são **sempre** a soma das categorias do plano, inclusive em
mês fechado. A realidade entra num ponto só: o **saldo inicial**, ancorado no
fechamento real do mês anterior quando ele é conhecido. Decidido pelo Guilherme
em 09/09/2026.

A identidade que a tela garante, mês a mês:

> saldo inicial + receitas planejadas − despesas planejadas = saldo final

Antes, `calcSaldos` trocava o plano pela âncora (`ancora.te` / `ancora.ts`) nos
meses fechados, e o saldo final desses meses era pinado no real. O resultado era
uma tela onde o total de Despesas discordava das categorias listadas logo abaixo
dele — no Painel os dois números ficavam um em cima do outro. Quem somava as
categorias concluía, com razão, que a conta não fechava.

**O fechamento real não se perde.** O de agosto aparece como o **saldo inicial de
setembro**, que é onde ele pertence: comparar "planejei fechar em X" com "abri
setembro em Y" é a leitura útil; sobrescrever o X pelo Y apagava a pergunta.

Consequências na marcação: `finalReal` é sempre falso, e Receitas, Despesas e
Resultado deixaram de carregar a marca de real nas quatro telas. Fica uma regra
só, sem exceção: **itálico = previsto, em pé = real, e só o saldo inicial chega
a ser real.**

Segue aberta a faixa anual da Grade: os quatro números dela (Saldo inicial Jan,
Receitas, Despesas, Saldo final Dez) **não fecham** quando existe âncora, porque
a cadeia é reancorada no meio. Medido: 17.000 contra 1.000 num cenário de teste.
Não decidido — as opções levantadas foram nomear a faixa, restringi-la aos meses
abertos, ou mostrar o ajuste ao real numa quinta caixa.

**Tentativa descartada, para não repetir:** marcar "Receitas real" / "Despesas
previsto" no card da Grade, mantendo a troca pelo realizado. Rejeitada no mesmo
dia — o problema não era a falta de rótulo, era a tela de planejamento mostrar
realizado onde deveria mostrar plano.

**Projeção é do MÊS e da CONTA ao mesmo tempo, e a soma tem de fechar.**
`projecaoDaConta` atribui cada coisa a uma conta só — conta de débito da
categoria, conta de pagamento do cartão, preferida quando não há nenhuma — e
`projecaoDoMes` é a soma dela. Nunca o contrário: enquanto os dois eram
calculados em separado, discordavam. O complemento da fatura é a única exceção,
porque o plano não diz em qual cartão o gasto cai; ele entra uma vez, na conta
que paga o cartão de vencimento mais cedo.

**A fatura do cartão tem dono, como a categoria tem conta de débito.** Ela
aparece na conta de pagamento do cartão — débito automático, boleto ou PIX,
tanto faz —, e na preferida quando o cartão não tem conta definida. Nunca em
todas: enquanto flutuava, cada banco projetava a fatura de todos os cartões.
Só existem essas três formas de pagar fatura; transferência foi removida do
tipo em 06/09/2026.

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
