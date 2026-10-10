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

## Congelado

**Lançamentos (banco e dinheiro) e Radar Financeiro estão fechados desde
10/09/2026.** Só entra correção de bug comprovado; funcionalidade nova e
mudança de design, não.

O motivo não é burocrático. As três telas passaram por uma rodada longa de
acerto de cálculo — conciliação na abertura do mês, fixa vencida, variável por
categoria, cenário de previsão — e hoje concordam entre si **por construção**,
porque compartilham as funções de [`saldoConta.ts`](src/utils/saldoConta.ts) e
[`realizadoMes.ts`](src/utils/realizadoMes.ts). Cada regra abaixo tem o número
medido que a motivou; mexer ali sem reler arrisca reabrir divergência que
custou um dia inteiro para fechar.

Antes de tocar em cálculo dessas telas: rodar as provas com
`npx jiti` e conferir que Lançamentos e Radar continuam dando o mesmo número
para o mesmo mês.

**Fora do congelamento**, por decisão do mesmo dia: Planejamento, Simulador (a
ser revisado em detalhe), a aba "Resumo mensal" — que vai virar um painel
dinâmico e por isso não teve o saldo por conta corrigido — e o mobile, que só
será atacado depois do web.

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

**Em Lançamentos, só HOJE tem cor própria**: o cabeçalho usa o azul-ESCURO dos
cartões do topo e da barra do rodapé (`#0f2878 → #1e40af`), e as **linhas de
hoje, abertas, ficam em azul-CLARO** (`#bfdbfe → #93c5fd`, `TEMA_LINHAS_HOJE`),
para se diferenciarem da barra. As linhas usam as cores escuras do tema dos
outros dias: texto 5,74, receita 5,05, despesa 5,56, rótulo 4,91 no `#93c5fd`.
No mesmo dia o cabeçalho passou pelo azul médio; os tons reforçados para ele
ficaram — rótulo 80%, saldo `#e2e8f0`, dia da semana 85%, botão "+" 60%, selos
HOJE e FIXA com fundo marinho —, e no escuro passam com mais folga (6,19 /
7,08 / 6,75 / 4,20). **Aberto, o dia passado ou futuro tem conteúdo BRANCO** — o cartão é
branco e só o cabeçalho pinta o cinza, como o acordeão do Radar. Os saldos
inicial e atual dos cartões do topo seguem a paleta do Radar: verde positivo,
vermelho negativo. Dias passados e
futuros usam o mesmo tema CINZA (`#e6ebf1 → #d8dfe8`), com texto escuro, o
mesmo esquema dos grupos do Radar. Decidido pelo Guilherme em 26/09/2026. Antes
eram três cores (passado azul médio, hoje escuro, futuro azul-claro); passado e
futuro agora se distinguem pela posição e pelos rótulos — "Saldo final" ×
"Saldo previsto". No cinza todos os tons do tema ficaram melhores que no
azul-claro de antes, e dois que reprovavam foram corrigidos junto: dia da
semana a 80% (4,85) e botão "+" a 60% (3,07). No **Planejamento** a distinção
temporal foi removida antes, de propósito: lá o que separa os meses é ter ou não
planejamento, não a posição no tempo.

**O assistente de planejamento tem dois nomes, de propósito.** A rota é uma só
(`/wizard-planejamento`), mas ela se chama **"Começar meu plano"** no fim do
Onboarding e **"Planejamento do Zero"** no menu. Na primeira vez não há nada
para refazer, e "do zero" ali soaria estranho; no menu, o nome precisa avisar
que a ação sobrescreve o ano. Não unificar.

Vale lembrar a divisão: o **Onboarding não cria plano** — ele cadastra contas,
cartões e categorias, e no fim manda para o wizard. O **wizard** preenche os
valores, mas replica o mesmo valor em todos os meses. Ajuste mês a mês só na
Grade — no modal que abre ao clicar num mês — e, para os próximos meses, pelo
Radar.

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

**O saldo final previsto do Radar mora numa barra no pé da tela, e abre a
memória de cálculo — a mesma de Lançamentos, consolidada.** Decidido pelo
Guilherme em 26/09/2026. Isso não reabre a regra acima: os cartões do topo
continuam sendo só o que aconteceu, e o previsto só aparece quando pedido.

Antes o previsto ficava no cartão "Saldo atual", como subtítulo e com uma barra
de percentual contra ele — um número sem explicação. Saiu de lá, e a barra de
percentual saiu junto: ela media o saldo de hoje contra o previsto, e sem o
previsto no cartão não havia o que medir.

A memória é **o mesmo componente** de Lançamentos (`MemoriaSaldo`, exportado de
`NleExtrato.tsx`), alimentado por `memoriaDoRadar` em
[`saldoConta.ts`](src/utils/saldoConta.ts). Ajuste feito numa tela vale na
outra. A função não faz conta própria: o realizado sai de `detalharMes` e o
previsto de `detalharPrevisto`, e as duas já fecham por construção. O
`fechamento` é o mesmo número que `saldoTotalNoFim` devolve — a `prova28` exige
igualdade exata, e que as linhas somem nele.

**A linha "Ajuste da conciliação" só existe no Radar.** Aqui o saldo informado
na conciliação vence em qualquer mês, inclusive no corrente
(`saldoFinalConta`). Quem digitou 5.150 do banco onde os lançamentos explicam
5.100 tem saldo atual de 5.150, e sem a linha a memória fecharia 50 abaixo do
total logo acima dela. Em Lançamentos a conciliação do mês exibido fica de fora
de propósito — ela aparece na caixa de conciliação —, então lá o campo nunca é
preenchido e a linha nunca aparece.

"Receitas recebidas" e "Despesas pagas" são **movimento de dinheiro** somado
nas contas, e uma transferência entre contas próprias entra nas duas — sai de
uma, entra na outra. O líquido é zero e o total fecha, mas as duas linhas
ficam maiores pelo valor transferido. É o mesmo que Lançamentos faz por conta,
onde a transferência de saída já conta como despesa paga.

**No otimista, a barra avisa quando a variável do mês passou do planejado.**
Pedido do Guilherme em 26/09/2026. O otimista trata o plano de variáveis como
um **envelope único**: quando o total gasto passa do total planejado, ele não
reserva mais nada, e todo gasto variável novo sai inteiro do saldo final — a
previsão perdeu a folga. Em setembro isso aconteceu por 25,65 (16.689,65 gastos
de 16.664,00), e a tela não dizia: o saldo final simplesmente ficou igual ao
atual. Nos outros cenários o gasto numa categoria que ainda tem sobra não mexe
no saldo final, porque ele já contava com aquele gasto.

O número vem de `memoriaDoRadar().excessoVariavel`, que é
`estouros − sobras` do motor — a entrada de `faltaVariavelDoMes`, antes do
corte do cenário, e não uma soma paralela na tela. Por isso ele fica positivo
exatamente quando o otimista zera a variável. As sobras são somadas **por
conta**, como o reservado: o motor monta as parcelas de todas as contas a cada
chamada, e somar o mês em cada uma multiplicaria pelo número de contas.

Só o **mês corrente**, e só **no otimista**. Mês fechado não tem mais o que
gastar; mês futuro tem outro envelope, cheio — a sobra não atravessa o mês.
O excesso é um fato do mês e vale o mesmo nos três cenários, mas só no otimista
ele zera a reserva.

**Tentativa descartada, para não repetir:** um bloco "Variável do mês" dentro da
memória, com sobras, estouro usado para abater e o que ainda falta gastar.
Construído e revertido no mesmo dia a pedido do Guilherme. O que o convenceu foi
a explicação do envelope único, e um aviso curto na barra carrega essa ideia
melhor que uma conta de três linhas.

**Os grupos do Radar têm fundo azul FIXO; a cor mora na barra e nos números.**
Pedido do Guilherme em 26/09/2026. Antes o fundo inteiro do cabeçalho mudava
com o percentual (azul-claro → azul-escuro → vermelho), e a barra era um traço
de 60×5px. Agora a barra tem 20px × 200px e fica na mesma linha, DEPOIS dos
números. Números (290px) e barra têm largura FIXA à direita: as barras ficam
alinhadas em todos os grupos, e empilhados eles formam um gráfico de barras.
A barra passou por três posições no mesmo dia — linha própria, entre o nome e
os números, e depois dos números — até ficar aqui, escolha do Guilherme. Realizado e percentual são maiores e pintados com a cor da barra.
Cada grupo é um acordeão, **fechado por padrão**: recolhida, a tela vira um
painel de barras.

Verde, amarelo e vermelho, com os cortes que o app já usava: receita ≥ 100% é
verde, ≥ 80% amarelo, abaixo disso vermelho; despesa acima de 100% é vermelho,
≥ 90% amarelo, abaixo verde. **A cor segue o percentual arredondado** — o que
está escrito. Com o exato, 89,53% aparecia como "90%" em verde, e 90% de
verdade é amarelo.

Medido no extremo mais claro do fundo, `#1e40af`: o número verde é o MESMO da
barra (`#4ade80`, 5,01:1), o amarelo é `#fde047` (6,62) sobre barra `#facc15`,
e o vermelho saturado reprova como texto (3,15), então o número usa o tom claro
`#fca5a5` (4,60).

**Barra e número têm EXATAMENTE a mesma cor**, decisão do Guilherme. A barra
fica sobre trilho escuro (`#0f172a` a 40%) e tem **borda branca de 2px**
contornando a barra inteira: o trilho escuro sozinho sumia no azul, e a borda
desenha os 100% para a parte vazia se ler como vazia. Medido: preenchimento
contra o trilho 6,92 / 9,14 / 6,35; borda contra o azul 8,72.

**Tentativa descartada:** trilho branco com preenchimento escuro
(`#16a34a` / `#c28a00` / `#dc2626`), que passava no contraste mas fazia número
e barra terem tons diferentes da mesma cor. Recusado — as cores têm de ser as
mesmas. Preço aceito da versão final: nos tons claros, verde e vermelho têm
quase o mesmo brilho (1,09); para daltonismo vermelho-verde as duas barras se
parecem, e o percentual escrito ao lado desempata.

**As categorias, abertas no acordeão, seguem o MESMO modelo, um degrau
menor, e com fundo BRANCO** (pedido do Guilherme): números em 14px (os do
grupo são 16), barra de 16px de espessura com os mesmos 200px e o mesmo recuo
à direita — as barras das categorias ficam exatamente embaixo da do grupo.

No branco os tons claros somem (o amarelo dá 1,2:1), então a categoria usa os
**tons escuros da mesma cor**: `#15803d` / `#a16207` / `#b91c1c`, trilho
`#e2e8f0` e borda `#64748b`, que desenha os 100% como a borda branca faz no
azul. Dentro de cada lugar, barra e número são a mesma cor. O vermelho é
`#b91c1c` e não `#dc2626`: o `#dc2626` tem o mesmo brilho do amarelo-mostarda
(1,02). Paleta e regra das faixas moram em
[`radarCores.ts`](src/components/acompanhamento/radarCores.ts) — um `.ts`, e
não o `AcShared.tsx`, porque constantes num arquivo de componente geram aviso
de fast refresh no lint.

O "Disponível / Estourou" saiu das colunas e foi para a linha de status embaixo
do nome, porque é o número que explica os cenários.

**Conta FIXA paga até o previsto é verde, com "✓ Pago" e sem "disponível".**
Decidido pelo Guilherme em 26/09/2026. Pela regra das faixas, 99–100% é amarelo,
e o Financiamento · Civic (1.149,72 de 1.150) aparecia como alerta depois de
pago. O "disponível R$ 0,28" também sai: o saldo previsto não conta mais nada
de fixa confirmada, e o número daria a entender que ainda vão sair 0,28. **Paga
ACIMA do previsto continua vermelha**, com o estouro — Plano de Saúde, 1.123,46
de 973, é 15% a mais. "Até o previsto" usa o percentual arredondado, o que está
escrito: Consórcio 460,94 de 460 aparece "100%" e fica verde. O cadastro é
achado pelo par (nome, variante); o nome sozinho só vale quando é único.

**No Radar, um tom de cada cor por fundo: um para o azul, outro para o
branco.** O Guilherme contou três vermelhos na mesma tela — cartão Despesas
(`#f87171`), barra de grupo (`#fca5a5`), barra de categoria (`#b91c1c`). Um só
é impossível: para passar 4,5:1 como texto no azul o vermelho precisa de
brilho acima de 0,44, e no branco abaixo de 0,18. Então tudo que está no azul
— cartões, grupos, barra do rodapé — usa `RADAR_COR_AZUL`, e o que está no
branco usa `RADAR_COR_BRANCO`. O cartão Despesas com `#f87171` dava 3,15 e
reprovava; o amarelo das barrinhas (`#fbbf24`) também era um segundo amarelo,
e foi junto. A barrinha dos cartões ganhou o desenho da barra de grupo — trilho
escuro, borda branca, 8px —, porque sobre o trilho claro o vermelho do grupo
ficava em 2,95. `barCorSobreAzul`, a segunda paleta de barra sobre azul, saiu.

**A regra de cor do Radar: VERDE = dentro do plano, VERMELHO = problema.**
Decidida pelo Guilherme em 26/09/2026, ao perguntar que cor deveria ter uma
despesa em exatos 100%: dentro do plano, então verde. O tom do verde diz se há
folga. Despesa até 89% verde-escuro, 90–100% verde-claro (no limite, mas
dentro), acima de 100% vermelho. Receita 100% ou mais verde-escuro, 80–99%
verde-claro, abaixo de 80% vermelho. O vermelho passou a ter um sentido só —
antes era também "é despesa"; quem diz o tipo é a seta ↑/↓ do grupo. Os
cortes não mudaram, só a cor de cada faixa; a regra mora em
[`radarCores.ts`](src/components/acompanhamento/radarCores.ts).

No fundo claro (grupo e categoria): `#14532d` / `#18713a` / `#7f1d1d`. Nos
cartões, azul-escuro: `#4ade80` / `#bbf7d0` / `#f87171` — os cartões acompanham,
e o amarelo saiu deles também. A separação pelo brilho entre os vizinhos "no
limite" e "estourou" é 1,65 no claro e 2,28 no escuro. O número dos cartões de
Receitas e Despesas continua pintado pelo TIPO (verde e vermelho) — só as
barras seguem a faixa.

**O Radar abre com a RESPOSTA do mês, e cada linha diz quanto resta.**
Pedido do Guilherme em 06/10/2026: "parece um monte de número, se não me traz
algo prático". Duas mudanças, validadas na prévia:

1. **Frase no topo** (`ResumoRadarFaixa`, texto em
   [`resumoRadar.ts`](src/utils/resumoRadar.ts)): "Ainda dá para gastar R$ X
   nas despesas variáveis até o dia 31 · R$ Y por dia · grupos que já passaram
   do plano". O X é o `sobra` de `ritmoDoMes` — o MESMO número do "Ritmo do
   mês" da Início, envelope único da variável. Passou: fundo de erro e "Cada
   gasto variável daqui até o fim do mês sai do saldo". Mês fechado diz como
   fechou; mês futuro não tem frase. Os grupos citados somam TODAS as linhas,
   fixa inclusive — concordam com o vermelho dos cabeçalhos logo abaixo.
2. **O número grande vira o que importa agora** (`destaqueRadar` em
   [`radarCores.ts`](src/components/acompanhamento/radarCores.ts)): despesa
   "resta R$ X" / "passou R$ X", fixa "✓ pago" / "a pagar R$ X", receita
   "falta R$ X" / "R$ X a mais". O "gastou X de Y" vai pequeno ao lado, e o
   **percentual saiu** — a barra já mostra a proporção; ele fica no `title`.
   Barras, cores e faixas não mudaram.

A `prova41` (21 invariantes) exige a sobra da frase igual à do Ritmo, fixa paga
no valor fora dos grupos que passaram, "já" só no mês corrente e nada em mês
futuro. O mobile (`AcMobileView`) não foi tocado.

**O cabeçalho do grupo não contradiz as categorias.** Mesmo dia: o grupo dizia
"usou tudo" ou "resta R$ 0,28" em cima de categorias "✓ pago". Hoje
`destaqueDoGrupo` conta a fixa paga pelo valor PAGO — a sobra de centavos dela
não vira "resta" nem abate o estouro de outra linha —, e grupo só de fixas
pagas é "✓ pago". "Usou tudo" fica para variável exatamente no plano. Uma regra
de "fixa paga" só, `ehFixaPaga`, para a linha e para o grupo. Barras, cores e
o "gastou X de Y" seguem com os totais de verdade.

**O plano se ajusta pelo Radar, e o Radar não fez conta nova por isso.**
Pedido do Guilherme em 06/10/2026: "se eu fiz um planejamento errado para uma
categoria, eu poderia estar ajustando o plano direto pelo radar". Cada
categoria aberta tem "✎ ajustar plano" (`AjustePlanoDialog`): novo valor
(aceita conta), "do próximo mês até dezembro" (marcado) ou "só o próximo", e
"detalhar em itens". Categoria com itens abre direto o `PlanItensEditor`.

**O mês corrente NÃO se mexe**, decidido no mesmo dia. O Radar existe para
mostrar que o mês saiu do plano; trazer o plano até o gasto apagaria o
"passou" e, virando hábito, o "Previsto × realizado" e a "Precisão do plano"
deixariam de mostrar onde o plano erra. O mês na tela é a REFERÊNCIA ("Outubro:
gastou X de Y") e o ajuste vale do mês seguinte a hoje — ou do próprio mês, se
ele for futuro (`mesAlvoDoAjuste` em [`ajustePlano.ts`](src/utils/ajustePlano.ts)).
Dezembro aponta para janeiro do ano seguinte; sem plano lá, a janela avisa.

**As parcelas já lançadas entram na conta** — pedido do Guilherme no mesmo
dia. A fatura grava as parcelas de uma compra parcelada nos meses seguintes,
então novembro já TEM a parcela 4 de 6 antes de começar: é dinheiro
comprometido. Por [`historicoDaCategoria.ts`](src/utils/historicoDaCategoria.ts),
as duas sobre `construirRealizadoMes`, sem soma própria:

- `mediaSemParcelas`: o gasto NORMAL — média dos meses fechados (janela do
  comparativo) sem os lançamentos com parcela. Com elas, a sugestão contaria a
  mesma compra duas vezes.
- `jaLancadoNosMeses`: o que já está lançado em cada mês do ajuste.

A janela lista "Já lançado nos próximos meses", aponta em vermelho o mês em que
o valor digitado fica **abaixo do já lançado**, e oferece "Média sem parcelas +
já lançado, mês a mês": cada mês com o seu valor (novembro com a parcela,
fevereiro sem), e nos meses com algo lançado o plano fica em ITENS — "Gasto
normal" e cada parcela —, para o Planejamento mostrar de onde veio o número.
Saiu o "Usar o que já gastei", que puxava para cobrir o estouro do mês.

**O ajuste vai até o FIM DO PLANO, atravessando o ano** — antes parava em
dezembro, e a parcela 6 de 6 de janeiro sumia; o alerta já ia até o fim do
plano, e as duas telas discordavam. Cada mês é gravado no plano do ano dele.
Parcela que cai depois do fim do plano, ou em ano ainda sem plano, aparece na
lista como aviso ("ainda não há plano para 2027") e não é gravada: o app não
cria plano de ano sozinho.

**"Mês a mês" sem média não zera nada** (`valorMesAMes`): SEM média (categoria
sem mês fechado), é "cobrir o já lançado" — sobe o plano só onde ele não cobre
o que está na fatura e deixa o resto. A primeira versão gravava a média
ausente como zero nos meses sem nada lançado. `prova48` (17 invariantes).

**Com média, só a PARCELA soma por cima dela.** O resto do já lançado é o
próprio gasto normal, só que adiantado: vale o maior entre a média e ele.
Corrigido em 08/10/2026 — antes era média + TUDO o que estava lançado, e a
mensalidade da academia lançada para novembro contava duas vezes (150 de média
+ 150 lançados = 300). O ajuste do Radar e a revisão do plano (abaixo) usam a
mesma função.

**Alerta: o já lançado passa do plano de um mês que ainda não começou.**
Pedido do Guilherme no mesmo dia: "se tenho compras futuras que ficam acima do
planejamento, deveria existir um mecanismo de alerta". `lancadoAcimaDoPlano`
em [`lancadoAcimaDoPlano.ts`](src/utils/lancadoAcimaDoPlano.ts): do mês
SEGUINTE a hoje até o fim do plano, as linhas de despesa de `totaisDoMes` com
realizado acima do previsto — o mesmo "passou" que o Radar daquele mês
mostraria. Nenhuma conta nova; o corrente fica com o Radar e o Ritmo.

**O alerta diz "precisa de revisão de planejamento", e "Revisar agora" abre
UMA tabela.** Pedido do Guilherme em 08/10/2026, no lugar de "já lançado acima
do plano dos próximos meses" e do ajuste uma categoria por vez:

- **Onde:** Início ("Pede sua atenção", entre "passou" e "mês negativo"),
  Radar no mês corrente (`RevisaoPlanoFaixa`, abaixo da frase) e
  Planejamento (a mesma faixa, no topo da Grade). A frase é uma só,
  `textoDaRevisao`: "Algumas categorias precisam de revisão de planejamento"
  ou, com uma, "Academia · Smart Fit precisa de revisão de planejamento", e o
  porquê embaixo.
- **A tabela** (`RevisaoPlanoDialog`): uma linha por categoria e mês —
  já lançado, plano atual e sugerido, editável (aceita conta), tudo marcado.
  Embaixo do sugerido, de onde ele veio ("média R$ 200 + parcela"). "Confirmar
  N meses" grava cada mês no plano do ano dele.
- **A sugestão** é a do "mês a mês" (`valorMesAMes`, acima) e nunca fica
  abaixo do já lançado: confirmar tudo faz o aviso sumir. Com parcela, o mês
  vai em itens ("Gasto normal" + "Bicicleta · 4 de 6"); valor digitado vai só
  como valor. Linha ambígua do plano antigo não é gravada e avisa.
- O mês corrente nunca entra — a regra do ajuste. Âmbar, não vermelho: é
  aviso sobre o que vem, não fato do mês.

Regras em [`revisaoDoPlano.ts`](src/utils/revisaoDoPlano.ts), sobre
`lancadoAcimaDoPlano` e `mediaSemParcelas` — nenhuma conta nova. A
`prova50` (11 invariantes) segue no alerta; a `prova54` (31) cobre a
revisão: a academia, a bicicleta atravessando para 2027, itens, valor
digitado, linha ambígua e o mesmo texto nas três telas.

O Planejamento continua sem mostrar realizado nas categorias: o que entra lá é
o AVISO, não o número gasto.

**A revisão só grava em categoria com cadastro EXATO e ativo** (nome +
variante, `cadastroPlanejavel`). Linha sem isso aparece na tabela com "!" e o
motivo — variante desativada, categoria que não existe, ou lançamento sem a
variante numa categoria que tem várias — e não é gravada. A primeira versão
caía para o nome sozinho (`cadastroDaLinha`) e, no primeiro uso, 08/10/2026,
gravou "Academia · Martin" e "· Gui" na Academia pura (um por cima do outro) e
"Alimentação · Gui" trocou o plano de novembro de Alimentação por 41,00. O
Radar não lê plano para essas linhas (`buildAllCats` exige cadastro ativo
exato), então gravar nunca faria o aviso sumir. `prova55` (14 invariantes).

**Na fatura, salvar a parcela 1 alinha categoria e variante de TODAS as
parcelas.** Antes só propagava quando categoria, descrição ou valor mudavam:
trocar só a variante deixava as parcelas 2..N sem ela, e esse dinheiro caía na
categoria sem variante (Academia de dezembro em diante). Descrição e valor
seguem indo só quando mudam — uma filha pode ter valor próprio. Correção de bug
em tela congelada, feita em 08/10/2026; salvar a mãe de novo conserta as
compras antigas.

**Não há alerta no momento de lançar a compra**, decidido pelo Guilherme em
06/10/2026 — não por Lançamentos estar congelado, mas pelo mesmo motivo de o
ajuste não mexer no mês corrente. Um aviso na hora do lançamento convida a
"corrigir" o plano ali, e o mês que mais aparece nessa hora é o atual: subir o
plano de outubro para caber a compra apagaria do Radar que outubro passou. E
ele não faz falta: a parcela 1 é realizado e já aparece no Radar e no Ritmo, e
as seguintes são pegas pelo alerta acima, que é recalculado assim que a compra
é salva. Não reabrir sem pedido explícito.

Isto só GRAVA no plano — `comValor` / `comItens`, as funções do Planejamento —,
e o Radar relê. A linha CRU é achada por [`linhaDoPlano.ts`](src/utils/linhaDoPlano.ts):
id do cadastro, depois o par (nome, variante), e o nome só se for único. Plano
antigo com duas linhas do mesmo nome sem variante é **'ambigua'**: a janela
explica e manda para o Planejamento, em vez de chutar uma das duas. O
Simulador usa a mesma busca. O botão vem por contexto
(`ajustePlanoContexto.ts`); o mobile (`AcMobileView`) não tem provedor e não
mostra. `prova47` (14 invariantes).

**Cada categoria do Radar diz se é FIXA ou VARIÁVEL**, num marcador ao
lado do nome — pedido do Guilherme em 06/10/2026, porque a memória do saldo
final divide por isso (fixas pagas e a pagar × variável a realizar). Vem do
cadastro; sem cadastro ("Outras", categoria excluída), sem marcador.

**Os cabeçalhos de grupo são CINZA (`#e6ebf1 → #d8dfe8`), com borda `#c3ccd8` e
texto escuro.** Empilhados, os escuros pesavam demais; passou no mesmo dia pelo
azul médio e pelo azul-claro de Lançamentos. O cinza é neutro e não puxa o tom
das cores. Ficou um pouco mais escuro que o primeiro (`#e2e8f0`) para se
destacar do branco das categorias (1,34 contra 1,23) — mais escuro que isso, os
dois verdes se confundiriam. Medido no `#d8dfe8`: 6,79 / 4,52 / 7,46; nome
`#1e3a8a` 7,71. Fontes: grupo 14px, categoria 12px.

**Os cartões do topo e o rodapé continuam no azul-escuro**, com `RADAR_COR_AZUL`:
`#86efac` / `#fde047` / `#f87171`. O vermelho é o da caixa Saídas de
Lançamentos, e é **EXCEÇÃO À REGRA DE CONTRASTE, decidida pelo Guilherme**: dá
3,15 como texto no cartão (18px, abaixo dos 18,7px de texto grande). Ele
escolheu sabendo — o `#fecaca`, que passa, lia como rosa. Não "consertar" sem
falar com ele. No rodapé negativo o fundo é vermelho e o número fica `#fecaca`
(5,74): `#f87171` ali daria 3,00. Resultado: dois vermelhos na tela, o mínimo
possível — um para o azul-escuro, outro para o claro. **Os números acima que
citam `#4ade80`, `#fca5a5` e o azul médio são de versões anteriores.**

**O TIPO do grupo é uma seta; a barra diz o STATUS.** O nome fica em branco,
16px, do tamanho dos números. Antes dele, a mesma seta dos cartões do topo:
**↑ verde** para receita, **↓ vermelha** para despesa — quem vê o grupo liga a
seta ao cartão "↑ Receitas" / "↓ Despesas". Pedido do Guilherme, depois de
ver o nome inteiro colorido em 20px: grande demais, e o vermelho do nome
competia com o vermelho da barra, que quer dizer "estourou". A seta é **desenhada**
(SVG 16×16, traço de 3px), e não o caractere "↑": o caractere é um traço fino
em quase toda fonte, e o negrito quase não o engrossa.
Os lançamentos, ao abrir uma categoria, continuam no painel claro de antes.

**"Atenção" é amarelo, não laranja.** Foi laranja por algumas horas, a pedido
— o âmbar antigo parecia laranja no azul, porque o azul realça o lado quente do
amarelo. Trocado no mesmo dia: laranja e vermelho têm quase o mesmo brilho
(1,22:1 entre as barras), e para quem tem daltonismo vermelho-verde "chegando
no limite" e "estourou" viravam a mesma barra. O amarelo se separa do vermelho
pelo brilho (1,81) e casa com o aviso do otimista na barra do rodapé.

**Tentativa descartada, para não repetir:** uma cópia da tela, `/radar-previsto`,
com um bloco "Como o mês termina" em acordeão — receitas previstas, fixas a
pagar, variável a realizar e fatura, cada uma abrindo grupo → categoria.
Construída e publicada em 26/09/2026, e abandonada no mesmo dia pelo
Guilherme: não chegou no modelo que ele queria. Na análise ficou um aprendizado
que vale para qualquer acordeão futuro: **o saldo atual não se abre por
categoria**. O realizado por categoria conta a compra no cartão quando ela
acontece; o saldo do banco só quando a fatura é paga. Abertas por categoria, as
linhas não somariam o saldo atual — ele só fecha aberto por conta.

Da cópia sobreviveram as funções: `detalharProjecaoDaConta` e `detalharPrevisto`
são o que alimenta a memória consolidada.

O número sai de `detalharPrevisto(ano, mes, deps, { comoAbertura: true })` — o
mesmo laço de `saldoTotalNoFim`, que virou o embrulho dela. O `comoAbertura` é o
que faz o mês corrente projetar até o dia 31: sem ele o previsto sairia igual ao
saldo atual.

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

**A fatura confirmada com valor ajustado NÃO gera linha de reconciliação.**
A despesa acontece na **compra** — é assim que ela se compara ao plano — e o
que sai da conta é o **pagamento**. Confirmar a fatura com outro valor (juros,
IOF, compra não lançada, arredondamento) separa os dois, e essa diferença fica
no **saldo**, não numa categoria.

**Tentativa descartada, para não repetir:** houve uma linha `Ajuste de fatura ·
<cartão>` valendo `override − compras`, criada em 08/09/2026 para fazer o total
de Despesas igualar a saída da conta. Ela nasceu de um objetivo que foi
abandonado no mesmo dia — o que tem de bater é o saldo inicial e o final, não o
movimento — e sobrou como ruído: 3 centavos listados como se fossem uma
despesa. Removida em 09/09/2026 a pedido do Guilherme.

Se um dia o juro do cartão precisar aparecer no Radar, o caminho é uma
**categoria de verdade**, lançada como qualquer outra, e não um valor sintético
derivado da diferença entre duas contas.

Do mesmo commit sobreviveu, por valer sozinho: `EvolucaoLinha` mostra realizado
`!== 0` e não `> 0`, senão um valor negativo — estorno maior que a compra —
sumia num travessão.

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

**A sobra de categoria de cartão nunca vai para a CARTEIRA, e isso é aceito.**
Revisto em 11/09/2026 num caso real: Reparo/Manutenção é categoria de cartão
com 1.500 planejados, e o prestador só aceita espécie. Sem fatura em aberto, o
fallback jogou os 1.500 na conta preferida — o Sicredi parecia 1.377,53 mais
apertado do que é, e a carteira, folgada. O **total do mês não muda**, e o
pagamento em si funciona: `tipoMovimento` é intenção, não trava, e o realizado
soma extrato, dinheiro e fatura.

Decidido deixar como está. O conserto de verdade não é mudar o fallback — é
poder dizer "este mês esta categoria sai em espécie" sem reescrever o cadastro,
e hoje esse conceito não existe: `contaDebitoId` só aponta para banco, e a
carteira só é alcançada por `tipoMovimento`. Quem precisa disso agora troca o
`tipoMovimento` da categoria para dinheiro.

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

**Toda categoria tem repetição: anual ou temporária.** Desenhado com o
Guilherme em 06–07/10/2026 para a fixa ("IPVA, IPTU, seguro são despesas
fixas mas acabam em x parcelas") e estendido a QUALQUER categoria, fixa ou
variável, em 08/10/2026. Regras em [`recorrencia.ts`](src/utils/recorrencia.ts);
coluna `recorrencia` em `categorias` (migração 013, rodada por ele ANTES do
código — o app grava categoria com todas as colunas).

- **Cadastro:** "Repetição: Anual | Temporária", em toda categoria.
- **Planejamento, ao digitar um valor** (só quando o valor mudou):
  - anual → o valor se repete SOZINHO do mês seguinte até dezembro, com o
    aviso "Repetido até dezembro". Fica de fora só o mês com OUTRO valor (o
    reajuste de julho) ou detalhado em itens (a parcela do Simulador) —
    gravar só o valor apagaria o detalhe sem ninguém ver. Para esses abre
    `RepetirValorDialog`, desmarcados: "Em julho o valor planejado é R$ 520.
    Trocar por R$ 350?". Mês vazio não é diferente. `separarDestinos`.
  - temporária → "Quantas parcelas?" ("3 parcelas · até maio"), e cada mês
    vira item "IPVA · 1 de 3". "Só [mês]" deixa só o digitado.
- **Assistente:** temporária ganha "Parcelas até [mês]" na linha da
  categoria, com os itens "1 de N".
- O resto não muda: Lançamentos, contas a vencer, previsão e Radar seguem o
  valor de cada mês do plano.

Consequência aceita: toda variável já cadastrada é anual (o padrão da coluna)
e passa a se repetir sozinha ao digitar. Quem não quer, marca temporária.

**O "Até quando?" saiu** a pedido do Guilherme em 08/10/2026 — era o fim da
anual (financiamento até mar/2029), que atravessava os anos com plano e zerava
os meses depois do fim no copiar ano e no assistente. A coluna
`recorrencia_fim` continua no banco, mas o app não lê nem grava: o que está
nela fica como estava.

Numerar a parcela do financiamento ("15 de 48") exigiria o mês da 1ª parcela no
cadastro — oferecido e não pedido. IPVA pelo final da placa: segunda etapa, se
fizer falta (o perfil não tem estado, e o calendário muda por UF e por ano).
`prova51` (5 invariantes) e `prova53` (8).

**Itens dentro do valor do plano: Mercado = Supermercado 800 + Feira 300.**
Pedido do Guilherme em 06/10/2026, sobre modelo validado: ele somava por fora
e não queria criar categoria. **Variante não serve para isso** — cada
variante é uma categoria (cadastro, linha própria no Radar, escolha a cada
lançamento). (Desde 09/10/2026 há a categoria MÃE: variantes variáveis de uma
categoria cadastrada também sem variante somam nela — ver "Categorias e
variantes".)

A regra: **`v[mes]` continua sendo a verdade; `itens` é o detalhe dele.**
Nenhum leitor do plano sabe que os itens existem, e por isso nenhum número do
app se move. Tudo em [`itensPlano.ts`](src/utils/itensPlano.ts):

- `comItens` grava itens e `v` = soma; `null` tira o detalhe e mantém o total.
- `comValor` grava só o valor e tira os itens daquele mês.
- `itensDoMes` só devolve itens que ainda somam `v`. É a rede de segurança
  para quem grava `v` sem saber dos itens — o ajuste do alerta de desvio em
  Lançamentos, a fatura em Configurações, o Simulador. Não mexer neles por
  isso (Lançamentos está congelado): a célula mostra o valor novo, sem detalhe.
- `mergeCats` leva os itens junto; copiar mês e copiar ano levam o detalhe;
  reajuste % escala cada item.
- Célula com itens (`PlanCelulaEditavel`) abre o editor em vez de deixar
  digitar por cima. "detalhar em itens" / Ctrl+Enter abre o editor começando
  pela conta digitada (`partesDaConta`). O editor é `PlanItensEditor`, aberto
  por contexto (`itensContexto.ts`) e desenhado uma vez em `Planejamento.tsx`.
- `ItemPlano.simulacaoId` já existe e o editor mostra o item travado — é a
  próxima etapa: o Simulador integrar como item, somando, e desfazer tirando
  só os itens dele.

`prova45` (17 invariantes).

**A Grade mostra os doze meses numa linha, com setas.** Pedido do Guilherme
em 06/10/2026: na grade de 4 × 3 "alguns meses ficam escondidos" — os de baixo
caíam fora da tela. `PlanFaixaMeses`: 4 cartões por vez (3 no tablet, 2 no
celular), seta anda UM mês, scroll nativo com snap (arrastar no celular, ← →
no teclado com o foco na faixa). Abre com o mês corrente visível — nos quatro
últimos do ano, a faixa encosta em dezembro e ele não é o primeiro. A fileira
Jan–Dez em cima pula direto e marca os meses na tela; o corrente vai
sublinhado. Os cartões (`PlanCardMes`) não mudaram.

**O Planejamento é UMA tela, e tem UMA fonte para cada número.** Os cartões da
Grade e o modal que abre ao clicar num mês —
leem saldo inicial, saldo final e os totais do mês do mesmo objeto,
`plan.previsto`. Grupo se soma com `agrupar` e `somaDoGrupo` de
[`types.ts`](src/components/planejamento/types.ts), e não há segunda cópia.

**Em 06/10/2026 o Planejamento virou uma tela só**, pedido do Guilherme, depois
que a Grade passou a mostrar os doze meses numa linha:

- **A Lista e o Painel saíram.** Editavam as mesmas categorias, mês a mês,
  que o modal edita, com a mesma célula.
- **O modal do mês mostra 3 meses** (`PlanModalMeses`): a partir do clicado (2
  no tablet, 1 no celular), setas de um mês, e **"Ano inteiro"** troca a janela
  pelos doze dentro dele — para não perder a visão do ano, que era a força do
  Painel. O desenho é o do modal de um mês de antes, **limpo**: categorias
  agrupadas com o valor editável e, no pé, a faixa azul com Receitas, Despesas
  e Resultado de cada mês, presa ao rolar (o que muda enquanto se edita).
  Houve uma versão com o Painel inteiro dentro do modal (saldo inicial e final
  e o resumo em faixas azuis no topo), recusada pelo Guilherme no mesmo dia:
  saldo inicial e final já estão no CARTÃO logo atrás, e repeti-los era ruído.
  Não repetir — mas o rodapé de Receitas/Despesas/Resultado fica, ele pediu de
  volta.
- **O nome da categoria no modal abre o ajuste do Radar**
  (`AjustePlanoRadar`, pelo `AjustePlanoContexto`): já lançado nos próximos
  meses, média sem parcelas, "mês a mês". Referência: o primeiro mês do modal;
  vale do mês seguinte a hoje em diante, como no Radar. A célula continua
  editando qualquer mês — é ali que se planeja; o nome é o atalho para corrigir
  daqui para frente.
- O menu lateral perdeu os subitens Grade/Painel/Lista. `?modo=painel`,
  `?modo=lista` e `?modo=planilha` caem na Grade.
- **Mês fechado mostra "Fechou em" no cartão**, logo abaixo do saldo final
  previsto, com "▲ R$ X acima" ou "▼ R$ X abaixo" do previsto. É o
  fechamento real (`saldoFinalReal`, bancos e dinheiro — o mesmo número que
  abre o mês seguinte e que o Radar mostra), ao LADO do previsto, nunca no
  lugar dele: a regra de não misturar realizado no plano continua. Como o mês
  parte do saldo real, a diferença é só o que aconteceu dentro dele.

**A Planilha foi removida em 10/09/2026**, substituída pelo Painel: mostravam
a mesma coisa, e ela carregava cópias próprias do agrupamento e da soma de
grupo. Link antigo com `?modo=planilha` cai na Grade, que é o padrão — não
quebra favorito nem histórico.

O modal do card também somava os totais do mês por conta própria, com um
filtro próprio de `hasFaturaCat`. Dava o mesmo número, mas por duas contas que
concordavam: ele nem recebia o `previsto`. Hoje recebe.

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

**Ano FUTURO abre com o saldo final PREVISTO de dezembro do ano anterior**,
nunca com o real. Relatado pelo Guilherme em 08/10/2026: planejou 2027 e
janeiro abria com o saldo de hoje no banco. O ano futuro tinha `ancoraMes =
-1`, e no `calcSaldos` o `fechado(-1)` dava verdadeiro — janeiro ancorava
num dezembro que ainda não fechou. Hoje ano futuro é `-2` (nada fechado) e o
`saldoInicialJan` é o `saldoFinal[11]` do ano anterior, em cadeia (2028 abre
com o dezembro previsto de 2027). Ano corrente e passados não mudaram.

A passagem do ano saiu do hook para
[`previstoDoAno.ts`](src/components/planejamento/previstoDoAno.ts): o
`usePlanejamento` monta a tela com essas funções, e o dezembro que abre o ano
seguinte sai delas também — uma passagem só. `prova52` (12 invariantes, com
controles: mais despesa em dez/2026 ou mais gasto real em junho movem janeiro
de 2027 pelo mesmo valor).

Consequências na marcação: `finalReal` é sempre falso, e Receitas, Despesas e
Resultado deixaram de carregar a marca de real nas quatro telas. Fica uma regra
só, sem exceção: **itálico = previsto, em pé = real, e só o saldo inicial chega
a ser real.**

**A regra vale também na faixa anual da Grade.** Ela cobre a **janela que se
sustenta**, não o ano inteiro: somar de janeiro por cima de meses ancorados dava
quatro números que não batiam — 17.000 contra 1.000 num cenário medido.

A janela começa no **último mês que abre com saldo real**. Dali para a frente
nada é reancorado, então si[i+1] === sf[i] e a soma telescopa. Sem âncora
nenhuma, ela é o ano inteiro e os rótulos ficam como sempre foram; com âncora,
eles dizem de onde a faixa parte ("Saldo inicial Set/2026", "Receitas Set–Dez").

Quem calcula é `janelaQueFecha` em
[`types.ts`](src/components/planejamento/types.ts). Uma janela de um mês só — ano
inteiro fechado — não vira "Dez–Dez".

**Tentativa descartada, para não repetir:** marcar "Receitas real" / "Despesas
previsto" no card da Grade, mantendo a troca pelo realizado. Rejeitada no mesmo
dia — o problema não era a falta de rótulo, era a tela de planejamento mostrar
realizado onde deveria mostrar plano.

**O horizonte do plano vale nas TRÊS abas do Simulador, não só na Compra.**
"Posso comprar?" sempre respeitou — `parcelasQueOPlanoCobre` desabilita as
parcelas que passam do fim do plano e explica por quê, com link para planejar o
ano seguinte. **"Quitar dívida" e "Meta de poupança" não respeitavam**:
`simularDivida` e `simularMeta` iteram até `meses < 600` — cinquenta anos — sem
nunca olhar `fimDoPlanejamento`. Corrigido em 13/09/2026.

O dano não era a conta da dívida, que é aritmética honesta sobre saldo, parcela
e taxa. Era o `incluirNoPlanejamento`: o laço gravava de `mesAtual` até
dezembro e **calava**. Uma dívida de 24 parcelas começando em setembro gravava
quatro meses e descartava vinte, sem nada na tela — numa tela cujo trabalho é
avisar que o dinheiro vai faltar, 83% da obrigação sumia em silêncio.

Hoje `mesesQueOPlanoCobre` em
[`simulacaoCompra.ts`](src/utils/simulacaoCompra.ts) dá o teto — é o mesmo de
`parcelasQueOPlanoCobre`, sem o deslocamento do cartão, porque parcela de
dívida e depósito de meta saem direto da conta. O resultado continua mostrando
os 24 meses verdadeiros; o que muda é que a tela **diz** quantos cabem, e a
gravação para ali.

A simulação em si não é cortada de propósito: "com essa parcela leva 24 meses"
é exatamente o que o usuário precisa saber, e é aritmética da dívida, não
projeção do plano. Cortar o número esconderia a dívida para proteger o plano.

**"Posso comprar?" compara formas de pagamento, não escolhe uma.** A tela
perguntava "em quantas vezes?" e o usuário escolhia. Mas ninguém chega na loja
com a parcela decidida — chega com as opções que o vendedor ofereceu, e a
dúvida é qual escolher. Implementado em 13/09/2026.

**O juro é SAÍDA, não entrada.** No Brasil ninguém informa a taxa: informa a
parcela, "12× de R$ 179". Pedir a taxa obrigaria o usuário a fazer de cabeça
exatamente a conta que ele veio pedir ajuda para fazer. Ele digita parcela e
quantidade; total e juro embutido saem disso.

**E o juro embutido só existe contra o preço à vista.** Sem linha de
`parcelas === 1` não há âncora, e a coluna vale `null` — travessão na tela.
Inventar uma taxa de referência afirmaria um fundamento que não existe. É a
mesma recusa do "≈" que derrubou a extensão do plano por cópia do último ano.

**A recomendada é a mais barata ENTRE AS QUE CABEM, não a mais barata.** É o
ponto inteiro da tela: à vista costuma ser a mais barata e a que mais aperta.
Recomendar por preço sozinho mandaria a pessoa para o mês que a quebra. Empate
no total desempata pelo maior saldo no pior mês.

Por isso a coluna **Cabe** existe: as outras são custo, e uma tabela só de
custo responde a pergunta errada.

**Linha que excede o horizonte não some — aparece em cinza**, com "fora do
plano" e o link para planejar mais meses. Sumir repetiria o truncamento
silencioso que a Dívida tinha.

**O motor foi partido em dois, e a prova tranca a equivalência.**
`serieBaseDoPlano` calcula a projeção sem compra — a parte cara — e
`simularCompraSobre` julga uma opção em cima dela. `simularCompra` virou um
atalho que chama as duas, com a assinatura pública intacta. O módulo sempre
prometeu que "a série é calculada UMA vez e o resto é aritmética sobre ela",
mas a promessa valia só dentro de uma chamada: comparar seis formas custava
seis projeções do plano inteiro. `prova27` exige que as duas devolvam
resultado idêntico para a mesma entrada.

**Trocar o valor da compra re-semeia só as linhas automáticas.** O que o
usuário digitou fica marcado como `manual` e sobrevive — o que o vendedor
disse é dado real e não pode ser sobrescrito por um palpite de divisão igual.
Apagar o campo também marca manual: quem apagou quis apagar.

**O botão "simular" e o seletor de parcelas saíram.** A tabela calcula ao vivo
e o gesto de escolher é o clique na linha, que abre o fluxo mês a mês embaixo.
Enter abre a recomendada, porque Enter precisa de um alvo e a recomendada é a
resposta que a tela já deu.

Fora do escopo desta rodada, e independentes: valor MENSAL como entrada (o
caso da assinatura de academia, que faz a mesma pergunta da compra com o dado
invertido), persistir a tabela na simulação salva, e custo de oportunidade.

**PENDENTE — unificar as três abas numa só.** Levantado pelo Guilherme em
13/09/2026: *"para mim é a mesma coisa"*. E é: as três perguntam **isso cabe no
meu fluxo até o fim do plano?**. O que muda é só qual dado está na mão.

| Aba | Você sabe | Quer saber |
|---|---|---|
| Posso comprar? | o **total** | cabe? |
| Quitar dívida | saldo + **parcela** | quando acaba, quanto de juro |
| Meta de poupança | objetivo + **quanto guarda** | quando chego |

As três são um compromisso mensal de N meses contra a projeção. A evidência de
que a separação é artificial: a aba Compra tem o motor bom — série base,
veredito, pior mês, adiar, esticar, teto do plano — e as outras duas têm um
`while (meses < 600)` que precisou de remendo em 13/09. Duas filosofias no
mesmo menu, e a boa serve um terço dos casos.

Unificar cai bem também no caso da assinatura de academia, que hoje não cabe
em aba nenhuma. **Mas é reescrita de tela**, não ajuste: são 750 linhas com
três formulários, três gráficos e três conjuntos de cards. Desenhar antes de
fazer, como no Modo Descoberta.

**A integração no planejamento: o Simulador entra como ITEM de uma categoria.**
Feito em 06/10/2026, sobre os itens do plano — nas três abas. "Posso comprar?"
ganhou "Vou comprar — incluir no planejamento"; Dívida e Meta trocaram o
"Incluir" antigo pelo mesmo caminho. Regras em
[`simuladorNoPlano.ts`](src/utils/simuladorNoPlano.ts), janela em
`IncluirNoPlano.tsx`:

1. Escolher uma categoria de despesa EXISTENTE e ativa (sem as do cartão e sem
   a transferência). O que foi comprado vai na **descrição do item**, nunca na
   `descricao` do `PlanoCat`, que é a VARIANTE — "Bicicleta" ali criaria
   `Lazer · Bicicleta` como categoria separada.
2. **Somar, nunca substituir**: o que já estava planejado no mês vira o primeiro
   item (id `base-…`) e a parcela entra ao lado, "Bicicleta · 1 de 6".
3. **Desfazer é subtrair** (`desfazerNoPlano`): o mês perde exatamente o que a
   simulação somou; se só sobrar o item `base-`, o detalhe some e fica o total.
   Funciona mesmo se alguém mexeu no valor depois — subtrai e tira o detalhe.

**Não há registro à parte.** "No seu planejamento", no topo do Simulador, é lido
dos itens com `simulacaoId` (`integracoesNoPlano`); a coluna `simulacoes` não
mudou. Dívida/meta já salva empresta o id da linha, e o Desfazer desmarca o
`integrado_planejamento` dela.

Parcelas da compra caem no mês da COMPRA em diante, sem o deslocamento do
cartão: o plano da categoria é consumido na compra, pela regra do realizado; o
mês em que a fatura vence é assunto da previsão. Atravessa a virada do ano; mês
de ano sem plano fica de fora e a janela avisa antes.

Ferramentas do plano não espalham a compra: "copiar mês/ano" leva só os itens
próprios (`paraCopiar`) e o reajuste % não toca item do Simulador
(`reajustarItens`). `prova46` (22 invariantes).

Fica sem tratamento: linhas criadas pelo "Incluir" ANTIGO (nome da dívida, sem
categoria, `t: 'Outros'`) continuam no plano de quem usou — somam no total do
Planejamento e não aparecem no Radar nem em "No seu planejamento".

Categoria que ainda não existe ficou fora por decisão do Guilherme; quando
chegar, `montarCategoria` do Modo Descoberta já cria a partir de um campo só.

**No Simulador o azul é o CARD do formulário, e os campos dentro dele é que
são brancos.** A página segue clara. Decidido pelo Guilherme em 13/09/2026,
depois de eu inverter duas vezes: primeiro pintei a página, depois o contêiner.

O card azul é um estilo À PARTE (`cardAzul`), e não o `card` compartilhado —
aquele também veste a Resposta, o estado sem plano e a caixa de aviso, três
blocos escritos para fundo claro. Pintar o compartilhado quebraria os três de
uma vez, e o `tsc` não acusaria nada.

A aba Compra é a única que usa a largura toda — 1180px, contra 720 das outras
duas.

**As abas são pílulas, como o seletor de visão do Planejamento** — e a pílula
resolve o contraste sozinha: ela carrega o próprio fundo claro, então o texto
não é medido contra o azul do quadro. Foi isso que devolveu a cor por aba, que
em texto direto sobre azul teria de virar tom pastel.

Uma diferença do Planejamento, de propósito: lá a pílula inativa usa
`COR.textoSuave` sobre `#f1f5f9`, que dá **4,34:1 e reprova**. No Simulador é
`#475569`, 6,92:1. Ativas: azul sobre `#eff6ff` 5,68:1, vermelho `#b91c1c`
sobre `#fef2f2` 5,91:1, verde `#15803d` sobre `#f0fdf4` 4,79:1.

Fica anotado que o Planejamento tem o mesmo par reprovando, e não foi tocado
nesta rodada.

A largura tem motivo: a Compra tem uma tabela de seis colunas **mais** o fluxo
mês a mês, e os dois lado a lado é o que faz a comparação valer — editar uma
parcela e ver o mês reagir sem sair do lugar. A resposta fica `sticky` à
direita. Dívida e Meta seguem em 720 porque são formulário de uma coluna, e
esticar só afastaria o rótulo do campo.

As duas colunas existem **desde o começo**, com um convite no lugar da
resposta. Aparecer só depois do primeiro clique faria a tabela encolher e
refluir no meio do uso.

**O gradiente termina em `#1e40af`, e isso não é escolha estética.** A regra
diz que nenhum fundo azul que carregue valor colorido pode ser mais claro que
`#1e40af`, e a aba ativa é colorida por tipo. Medido sobre `#1a56db`: o verde
da Meta dá **4,40:1** e o vermelho da Dívida **4,27:1** — os dois reprovam.
Sobre `#1e40af` dão 6,21:1 e 6,03:1.

Por isso a aba ativa usa a paleta de fundo ESCURO — `#fff`, `#fecaca`,
`#86efac` — e não `COR.azul` / `COR.vermelho` / `COR.verde`, que sumiriam ou
reprovariam. Inativa em `rgba(255,255,255,.85)`, 4,92:1.

O conteúdo todo vive em caixas brancas com texto escuro, então `card`,
`inputSt` e `labelSt` não foram tocados: o azul é só o palco.

**O Simulador parte do saldo PREVISTO do mês corrente, não do saldo de hoje.**
A série de `serieBase` chamava `saldoTotalNoFim` sem `comoAbertura`, e para o mês
corrente isso devolve o realizado. O primeiro ponto ignorava tudo que ainda
falta pagar no mês — e é ali que cai a primeira parcela. Medido: 4.800 contra
4.000, com uma conta de 800 em aberto. Corrigido em 10/09/2026.

Do segundo mês em diante a opção não muda nada: mês futuro projeta dos dois
jeitos. O defeito valia num mês e não nos outros, que é o pior formato para uma
tela cujo trabalho é avisar que o dinheiro vai faltar.

**Quatro telas respondem "com quanto termino o mês", e é de propósito:**

| Tela | Pergunta | Fonte |
|---|---|---|
| Lançamentos | com quanto ESTA conta termina | `cascataDoMes` |
| Radar | com quanto TUDO termina | `saldoTotalNoFim({comoAbertura:true})` |
| Planejamento | se o plano se cumprir | `calcSaldos` |
| Simulador | e se eu comprar em 6× | `serieBase` + parcelas |

**A tela Início não calcula número nenhum: lê as funções do Radar.** Feito em
26/09/2026 (fase 0 dos indicadores). Ela somava só o extrato — sem fixa, sem
compra no cartão, sem a carteira, com transferência entre contas contada como
receita e despesa —, e o saldo partia do saldo de **cadastro** da conta,
ignorando todo mês anterior e toda conciliação. Na `prova31`, o mesmo
setembro dava receitas 700 / despesas 1.060 / saldo 1.140 na Início, contra
5.300 / 2.390 / 5.640 no Radar.

Hoje: saldo = `saldoBancosEDinheiro` (o "Saldo atual" do Radar); receitas,
despesas e planejado = `totaisDoMes` de
[`evolucaoCalcs.ts`](src/components/acompanhamento/evolucaoCalcs.ts), extraída
do Radar sem mover um bit — a prova compara com o cálculo inline antigo por
`===`. "Maiores despesas" sai das `linhas` da mesma passagem, por (nome,
variante). Indicador novo na Início parte daqui, nunca de uma soma própria.

**Fase 1 dos indicadores: três números que já existiam, e nenhuma conta nova.**
Só no mês corrente — mês fechado já tem o número final, que é o próprio saldo.

- **Saldo final previsto**: quarto cartão, `memoriaDoRadar().fechamento`, no
  cenário escolhido. Clicado, abre a MESMA `MemoriaSaldo` do Radar, com os
  botões de cenário.
- **Falta receber**: subtítulo do cartão de Receitas, `entradasPrevistas +
  receitasAReceber` da mesma memória — as duas linhas de receita prevista.
- **Pior mês à frente**: faixa vermelha que só aparece quando algum mês até o
  fim do plano fica negativo. Sai de `serieBaseDoPlano`, a série do Simulador,
  por `piorMesDaSerie` em [`simulacaoCompra.ts`](src/utils/simulacaoCompra.ts).
  Diz o PRIMEIRO mês negativo — onde agir — e o pior, quando é outro.

A `prova32` exige que o cartão e o primeiro ponto da série sejam o mesmo número
(`===`, e `=== saldoTotalNoFim`), nos três cenários, e tem controle negativo:
sem o gasto que afunda novembro, a faixa não aparece.

Os saldos dos cartões passaram a verde/vermelho (`RADAR_COR_AZUL`), como no
Radar e em Lançamentos.

**O gráfico "Evolução do saldo" emenda três funções, e não faz conta.** Pedido
do Guilherme em 26/09/2026: comparar os meses passados com a projeção. Linha
cheia no passado, tracejada do mês corrente em diante, com "hoje" marcado e a
linha do zero em vermelho.

| trecho | fonte | é o mesmo número que |
|---|---|---|
| meses passados | `saldoBancosEDinheiro` — fechamento real | o saldo inicial do mês seguinte no Radar |
| mês corrente | `saldoTotalNoFim({comoAbertura})` | o cartão "Saldo final previsto" |
| meses futuros | `serieBaseDoPlano` | o aviso de pior mês e o Simulador |

Quem monta é `evolucaoDoSaldo` em [`evolucaoSaldo.ts`](src/utils/evolucaoSaldo.ts).
O passado começa no **primeiro mês com registro**, até seis meses atrás: antes
dele o saldo é só o de cadastro repetido, e uma linha reta ali leria como
"nada mudou" quando a verdade é "não havia app". Sem plano, o gráfico mostra o
passado e o previsto do mês corrente, e diz que a previsão segue com um plano.
A `prova33` confere as três emendas por `===` nos três cenários.

O `ResponsiveContainer` do recharts não desenha fora do navegador — a
renderização estática sai vazia. Para ver o gráfico sem login, empacotar o
componente com `rolldown` numa pasta ignorada e servir com `vite preview`.

**"Contas dos próximos 7 dias" são as linhas da memória de cálculo, filtradas
pelo vencimento.** Feito em 26/09/2026. Não há contagem própria: a lista sai de
`detalharPrevisto` — "Despesas fixas a pagar" e "Fatura do cartão", as mesmas
que o saldo final previsto desconta —, por `contasAVencer` em
[`contasAVencer.ts`](src/utils/contasAVencer.ts). Herda todas as regras de lá
sem repetir nenhuma: confirmada não entra, sem plano não entra, inativa não
entra, fatura só com valor lançado e sem pagamento confirmado.

Para isso as linhas de fixa e fatura do motor ganharam `id` e `dia` —
informativos, nenhum total os lê; a `prova28` segue com 534 invariantes contra
a versão anterior. O dia é a regra de Lançamentos (dia movido no mês → dia útil
se automático → cadastro), que saiu de `NleShared` para
[`diaDaFixa.ts`](src/utils/diaDaFixa.ts); `NleShared` reexporta, e Lançamentos
não mudou de import.

A janela pode atravessar o mês (28/09 a 04/10), então o detalhe é pedido até o
mês do último dia. **Vencida no mês corrente e não paga aparece primeiro, como
atrasada** — é a regra "fixa vencida é atrasada, não inexistente". A `prova34`
cobre atrasada, dia útil caindo fora da janela, dia movido, confirmada, inativa,
sem plano, fatura paga e fatura em aberto, e tem controle negativo: tudo pago,
lista vazia.

**A Início mostra meses FUTUROS, até o fim do plano.** Pedido do Guilherme em
27/09/2026: "e se eu quiser olhar o próximo mês? já me preparar para o
futuro?". Sem plano, o seletor para no mês corrente, como antes.

Num mês futuro a tela é só previsão: um aviso diz isso e oferece "Voltar para
hoje"; a bússola, "Maiores despesas" e "Últimas movimentações" somem, porque
julgam o que aconteceu. Ficam quatro cartões, a memória de cálculo do mês, a
lista de contas do mês inteiro, o aviso de pior mês e o gráfico, com o mês
escolhido marcado por um anel.

Os quatro números saem de `previsaoDoMes` em
[`previsaoDoMes.ts`](src/utils/previsaoDoMes.ts), sem conta nova:

| cartão | fonte |
|---|---|
| Saldo inicial previsto | `saldoTotalNoFim(mês anterior, comoAbertura)` — o final previsto do anterior |
| Receitas / Despesas previstas | o já lançado no mês + as linhas previstas **daquele mês** de `detalharPrevisto` |
| Saldo final previsto | `detalharPrevisto(mês).valor` — o ponto do gráfico |

E fecha: **inicial + receitas − despesas = final**. A memória é a mesma
`MemoriaSaldo`, com as linhas só do mês; a do Radar, num mês futuro,
acumularia tudo desde hoje. Ela ganhou `rotuloAbertura`, opcional: na Início
futura a primeira linha diz "Saldo inicial previsto"; sem ele, Lançamentos e
Radar ficam como estavam.

**Receitas e despesas previstas NÃO são os totais do Planejamento**, e o
cartão diz isso ("nas contas · plano R$ X"). São o dinheiro previsto entrando
e saindo das contas: a compra no cartão sai no mês em que a fatura vence, e o
que já foi gasto conta — a compra de setembro que vence em outubro abate a
variável de outubro, pela regra do realizado.

A lista do mês é `contasDoMes`, a mesma passagem de `contasAVencer` com a
janela do mês inteiro e sem atrasadas. A `prova35` (97 invariantes) exige,
por mês e cenário: a identidade dos quatro números, que as linhas da memória
fechem no final, final `===` `saldoTotalNoFim` e `===` o ponto do gráfico,
inicial `===` final do mês anterior, a lista somando as fixas a pagar e a
fatura da memória, e — no mês corrente — `previsaoDoMes` igual à
`memoriaDoRadar` campo a campo.

**Com plano no mês, "Maiores despesas" vira "Categorias estouradas".** Feito
em 27/09/2026. As três categorias de despesa que mais passaram do plano, em
reais. As linhas são as de `totaisDoMes` — as mesmas do Radar, por (nome,
variante) — e o excesso é o **"Estourou" da linha de categoria do Radar**:
realizado − previsto, sempre que passa. Por isso a compra no cartão conta, e
100,40 de 100 entra (estourou 0,40), mesmo o percentual arredondado dizendo
100%. Quem calcula é `categoriasEstouradas` em
[`categoriasEstouradas.ts`](src/utils/categoriasEstouradas.ts).

**Gasto sem plano entra, marcado "fora do plano"** — o Radar também diz
"Estourou" nele, e categoria inativa com gasto cai em "Outras" como lá.

A barra mostra o TAMANHO do estouro — plano em cinza, excesso em vermelho, na
escala do realizado. Uma barra de percentual ficaria cheia em todas.

Quando nada estourou, o quadro diz isso e mostra as **mais perto do limite**
(`maisPertoDoLimite`), nas cores claras do Radar. **Conta fixa fica fora** dessa
lista: paga em 100% ela é "✓ Pago" no Radar, não "no limite". Sem plano no mês,
volta "Maiores despesas", que já soma por (nome, variante) desde a fase 0.

A `prova36` confere, contra a linha como o Radar a monta (`buildAllCats` +
`pickReal`), que o excesso é o mesmo número; que a compra no cartão conta;
que variantes não se somam; que fixa paga no valor não estoura; e tem controle
negativo: sem estouro, lista vazia.

**"Ritmo do mês": quanto da variável foi gasto contra quanto do mês passou.**
Feito em 27/09/2026, só no mês corrente e com plano. Avisa ANTES de estourar;
"Categorias estouradas" mostra o que já passou. Quem calcula é `ritmoDoMes` em
[`ritmoDoMes.ts`](src/utils/ritmoDoMes.ts), sobre as linhas de `totaisDoMes`.

- **Só a variável.** Conta fixa cai inteira no dia dela; contá-la faria o mês
  parecer adiantado no dia do aluguel e atrasado no resto. Fixa é o que o
  cadastro diz (`cadastroDaLinha`, a busca do Radar, agora em `evolucaoCalcs`).
  Gasto sem plano entra no gasto.
- **O que sobra é no TOTAL** — planejado − gasto da variável inteira, dividido
  pelos dias que faltam contando hoje. É o envelope único, não a soma dos
  "Disponível" por categoria, que ignora quem estourou.
- **Estados:** passou (gasto acima do planejado no total), acelerado (dentro,
  mas mais de 10 pontos à frente do mês) e no ritmo. Os 10 pontos são folga
  para a vida real: um mês não se gasta em linha reta. Cores da paleta clara
  do Radar: verde, verde-claro e vermelho — dentro do plano é verde.

Duas barras na mesma escala, mês e gasto, uma embaixo da outra: a comparação é
o desenho. Passou por pouco (100,15%) mostra uma casa decimal, para não
aparecer "100%" ao lado de "Passou do plano". A `prova37` confere planejado e
gasto contra as linhas do Radar sem as fixas, a fronteira dos 10 pontos, o
último dia, o estouro compensado no total e o controle negativo (sem variável
planejada, sem quadro).

**A Início enxuta: a resposta, o que pede atenção, um gráfico e a porta para
Análises.** Decidido pelo Guilherme em 06/10/2026, sobre um modelo em HTML:
"o início está uma tela cheia de número, e falando de forma comercial isso
não vende". **Substitui a ordem em oito blocos descrita logo abaixo**, que fica
como histórico.

1. **Hero** — "Outubro termina com R$ X" (fechado: "terminou"; futuro: "deve
   terminar") e a folga da variável: "Ainda dá para gastar R$ Y · até o dia 31
   · R$ Z por dia" — o `sobra` de `ritmoDoMes`, o mesmo da frase do Radar.
   Passou: quanto passou, em `#fecaca`. Apoio: só "Hoje no banco"; "ainda
   saem / entram" moram no "como cheguei nesse número". Status no mês
   corrente fala com a pessoa — "Você está dentro do plano", e NÃO "no azul":
   ele mede despesa contra plano, não saldo, e "no azul" contradiria um saldo
   previsto negativo logo abaixo.
2. **Pede sua atenção** — no máximo 3 avisos, uma frase e um botão, por
   `avisosDoMes` em [`avisosDoMes.ts`](src/utils/avisosDoMes.ts): contas a
   vencer → grupo que passou do plano (`gruposQuePassaram`, o total do
   cabeçalho do Radar) → primeiro mês negativo À FRENTE → ritmo acelerado. O
   "passou" do ritmo não vira aviso: o hero já diz. Sem nenhum, "Tudo em dia ✓".
   "Ver contas" abre a lista ali mesmo. `prova43` (10 invariantes).
3. **Um gráfico só** — "Para onde o seu saldo está indo".
4. **"Quer ver em detalhe?"** — quatro botões para `/analises#âncora`.

Saíram para **Análises** (`/analises`, menu "Todo mês"), sem reescrever
nada: o mês até agora (Ritmo, Estouradas ou Maiores despesas), Mês a mês com
"Por categoria", Precisão do plano, Últimas movimentações, Metas e dívidas, e
o Aurix. Sempre o mês de HOJE. Os três cartões (saldo, receitas, despesas)
saíram de vez: o Radar já os mostra. As duas telas leem o mês pela mesma
passagem, `useMesDaInicio`.

**A Início tem uma ordem, e o topo é a resposta.** Briefing "Hierarquia e
comparativo na tela Início", onda 1, validada pelo Guilherme em 27/09/2026:

1. **Hero** (`components/inicio/HeroSaldo`) — absorve a bússola e o cartão
   "Saldo final previsto". Linha de status (ponto + frase, o MESMO
   `compassStatus` de antes), o saldo previsto em 54px, e o apoio
   "hoje · ainda saem · ainda entram · como cheguei nesse número". O link abre
   a `MemoriaSaldo` colada embaixo. Sparkline de fundo = a série do gráfico.
2. **Três cartões, sempre três** — a tela não muda de largura entre meses.
3. **Ritmo do mês**, largura total: as duas barras alinhadas são o desenho.
4. **Contas a vencer | Passou do plano**, lado a lado.
5. (onda 3: comparativo previsto × realizado)
6. **Evolução do saldo.**
7. **Metas e dívidas | Últimas movimentações.**
8. **Aurix**, faixa de uma linha no fim: gamificação não pode pesar o mesmo
   que uma conta vencida.

**"Ainda saem" é a soma das linhas de saída da memória**, por
`saidasPrevistasDaMemoria` em [`previsaoDoMes.ts`](src/utils/previsaoDoMes.ts)
— e "ainda entram" por `entradasPrevistasDaMemoria`. A previsão do mês futuro
usa as mesmas duas. Por isso: **hoje + ainda entram − ainda saem = previsto**,
e abrir o cálculo mostra linhas que somam o valor de cima.

Fora do briefing, decidido na validação: mês FECHADO mostra "Saldo em 31 de
agosto" com o verbo no passado ("fechou no azul") e "abriu com"; o primeiro
cartão vira "Saldo inicial", para não repetir o hero. Mês FUTURO não tem linha
de status — ela julga o que aconteceu — e o apoio é "abre com · saem · entram".
Saldo negativo no hero em `#fecaca` (4,6).

**Saíram, a pedido:** a "Dica contextual" (💡) — a mensagem do Ritmo já
orienta, e duas orientações competiam —, e, junto com a bússola, a linha
"🎯 Seu objetivo" com o botão "Usar simulador". O objetivo volta no passo
"destaque por objetivo" dos indicadores.

**O pior mês à frente virou ponto no gráfico** (onda 2, 29/09/2026). A faixa
vermelha saiu; o PRIMEIRO mês negativo e o PIOR, quando é outro, viram pontos
vermelhos rotulados com o valor em "Evolução do saldo", e o mês fica vermelho
no eixo. Os dois vêm de `piorMesDaSerie`, sem conta nova. O `aria-label` do
gráfico diz mês e valor — a informação não fica só na cor.

- O gráfico vai até o **fim do plano**, não 12 meses: senão um mês negativo
  além disso não teria onde ser marcado.
- A linha do zero ficou como era (tracejado `#b91c1c`): o `#fca5a5` do mockup
  dá 1,9 no branco, abaixo do 3:1 de gráfico.
- **No recharts 3 os pontos da linha ficam numa camada ACIMA dos
  `ReferenceDot`**, qualquer que seja a ordem no JSX. O ponto vazado cobria o
  marco; a linha não desenha ponto comum nos meses marcados.
- Marcos em meses vizinhos: o valor do primeiro vai à esquerda do ponto, para
  os rótulos não se atropelarem no celular. Marco no último mês abre margem à
  direita. Valor sem centavos, como no mockup; o exato está no tooltip.
- Saiu junto o botão "Ver o plano →" da faixa.

**Comparativo previsto × realizado, mês a mês** (onda 3, 29/09/2026). Barras
agrupadas — receita e despesa por mês, ancoradas no zero —, com o previsto
num traço, e o "Sobrou / Faltou" de cada mês embaixo. Barra e não linha: a
pergunta é DENTRO do mês (ganhei mais do que gastei?); tendência é o gráfico
de saldo. Fica entre "O que pede ação" e "Evolução do saldo".

- `comparativoMensal` em [`comparativoMensal.ts`](src/utils/comparativoMensal.ts)
  não soma nada: por mês, as MESMAS `construirRealizadoMes` + `totaisDoMes` do
  bloco do mês da Início. O plano é resolvido **por mês** (a janela atravessa
  o ano), e a janela começa no primeiro registro (`primeiroMesComRegistro`,
  agora exportada de `evolucaoSaldo.ts`, a mesma do gráfico de saldo).
- Cores no branco: `#15803d` (5,02) e `#b91c1c` (6,47). **Nunca**
  `COR.barraVerde` / `barraVermelha` no branco: 1,74 e 2,77 — são tons do
  azul-escuro, e o aviso agora está em `cores.ts`.
- O traço do previsto é `#0f172a` com anel branco: nenhum tom escuro passa 3:1
  sobre o vermelho (2,76); o anel resolve e as pontas caem no branco (17,85).
- Aparece com **dois meses ou mais** de histórico e **não em mês futuro**; a
  janela é sempre "até hoje", qualquer que seja o mês exibido. No celular o
  resultado sai sem "R$" (a coluna tem ~45px); tooltip e `aria-label` da
  coluna trazem o valor completo.
- A `prova38` exige o mês corrente `===` ao cálculo da Início, cada mês com o
  plano do seu ano (controle: mudar só 2025 muda só os meses de 2025), a
  janela nunca antes do primeiro registro, e lista vazia sem registro.

**Precisão do plano: dá para confiar no próprio plano?** (onda 4, 03/10/2026).
Cartão na Início, depois do comparativo: em média quanto as despesas (e as
receitas) fecharam acima ou abaixo do plano nos meses FECHADOS, a tendência,
e as três categorias que mais erram em reais.

- `precisaoDoPlano` em [`precisaoDoPlano.ts`](src/utils/precisaoDoPlano.ts) só
  agrega o comparativo: `MesComparado` ganhou `linhasSaida` / `linhasEntrada`,
  da MESMA passagem que soma os totais. Nenhum realizado é recalculado.
- Só meses fechados; mínimo de 3, senão `null` e o cartão some. Titular =
  `(Σ real − Σ prev) / Σ prev`; categoria = média(real) − média(prev),
  **ordenada em reais** (como as Estouradas). Sistemático = contagem ("estourou
  em 5 de 6"), não desvio-padrão. Categoria conta só nos meses em que tem
  plano; sem plano fica fora.
- Tendência (4 meses ou mais): metade antiga contra a recente, pelo TAMANHO do
  erro — de −12% para +5% é melhorar; limiar de 1 ponto; ímpar deixa o mês do
  meio de fora. `receitasPerc` é `null` sem receita planejada.
- Barra divergente com centro em "plano certo": `#b91c1c` gastou mais, `#1a56db`
  gastou menos. **Sem verde para gastou menos** — abaixo do plano também é erro
  de planejamento. Erro < 3% vira elogio e a lista some. O rodapé "mexeria R$ X"
  é a soma COM SINAL dos desvios listados.
- Janela: a mesma do comparativo (6 meses com o corrente, até 5 fechados).
- `prova39` (20 invariantes): parcial nunca entra (controle), 2 meses = null,
  titular à mão, ordenação em reais, categoria que falta em meses, sem plano
  fora, tendência nos limites, e plano perfeito → 0% e lista vazia.

Próximo passo registrado no briefing, não feito: levar o mesmo cartão para a
**Revisão Mensal**, onde ver que uma categoria erra todo mês muda a decisão de
"justificar o desvio" para "corrigir o plano". Casar pela `cadastroDaLinha`.

**"Por categoria": planejado × realizado de cada categoria, mês a mês.**
Pedido do Guilherme em 06/10/2026 — o que faltava era ver a MESMA categoria ao
longo dos meses. É uma aba do quadro "Receitas e despesas contra o plano"
(Total | Por categoria), e não uma tela nova: a janela é a mesma.

- `categoriasMesAMes` em [`categoriasMesAMes.ts`](src/utils/categoriasMesAMes.ts)
  não soma nada: as células são as `linhasSaida` / `linhasEntrada` de cada
  `MesComparado`, as linhas do Radar daquele mês. Grupo = soma das categorias.
- Ordem do Radar: grupos alfabéticos, "Outras" no fim; a categoria fica no
  grupo do mês mais recente. Linha sem plano e sem gasto na janela inteira some.
- Célula: realizado em destaque, "de X" embaixo, cor da faixa do Radar no
  claro; estouro com fundo `#fef2f2`. Fixa paga com ✓ (`ehFixaPaga`); grupo só
  com ✓ quando todas as linhas com valor são fixas pagas. Mês em curso neutro,
  salvo despesa que já passou.
- Média: as regras da Precisão do plano — só fechados, só meses com plano,
  mínimo 3. A `prova42` (33 invariantes) exige o mesmo desvio e a mesma
  contagem que `precisaoDoPlano`, grupo === soma das categorias e total do mês
  === despesas do comparativo.
- Celular: rola para o lado com o nome preso. O título "Despesas/Receitas" é
  sticky no TEXTO, não na célula — célula com colSpan rola inteira.

**Um mês ABRE com o fechamento do anterior, e é uma função só.**
`saldoRealizadoConta` responde isso para banco e para dinheiro, e as duas telas
chamam ela: o Radar por `detalharMes` / `saldoBancosEDinheiro`, Lançamentos por
`aberturaDe`. Resolvido em 10/09/2026.

Antes Lançamentos tinha o `acumuladoAte`, que partia do saldo de **cadastro** da
conta e reacumulava tudo desde então, sem nunca ler o saldo informado na
conciliação. Com uma conciliação de diferença as duas telas mostravam a mesma
conta com números diferentes — 4.300 num cenário medido — e o saldo final
previsto saía torto pelo mesmo tanto, para mais ou para menos conforme o que
tinha faltado lançar.

**A conciliação do mês EXIBIDO fica de fora, de propósito.** A caixa mostra
"informado − calculado"; se o calculado virasse o informado, a diferença daria
zero para sempre e a caixa viraria enfeite. Mês passado já foi conferido com o
banco, então lá o informado vence e não há o que investigar. É a distinção que
`saldoFinalConta` já fazia.

O **dinheiro** não tem esse caminho: o saldo informado da carteira não entra na
base em tela nenhuma. As duas concordam, então não é divergência — é uma
lacuna, e das duas pontas.

**Mas a carteira TEM fixa, e ignorar isso custou 663,00.** `saldoFinalDinheiro`
somava apenas `dm.lancamentos`, enquanto o banco passa por `movimentoDoMes`, que
tem o laço de `fixasConsolidadas`. Uma receita fixa marcada como recebida em
espécie entrava na cascata de Lançamentos e **não** entrava no Radar: a mesma
carteira valia 1.938,00 numa tela e 1.275,00 na outra, e o saldo final previsto
do Radar herdava o erro inteiro. Corrigido em 11/09/2026 — as duas funções
passam pelo mesmo `movimentoDoMes`.

O comentário que sustentava o atalho dizia que "o dinheiro não tem fixa nem
fatura". Nunca foi verdade: `cascataDoMes` monta a lista de fixas da carteira
com `tipoMovimento === 'dinheiro'`, e elas se confirmam como qualquer outra.
`movimentoRealDoMes` tinha a mesma suposição, então a linha do dinheiro em
`detalharMes` também mostrava só parte das entradas.

A assinatura para reconhecer isso de novo: **o saldo inicial do Radar bate com a
soma das contas e o saldo atual não**. O inicial usa a mesma função, então
quando ele bate e o outro não, a diferença nasceu DENTRO do mês — e o suspeito é
sempre uma parcela que uma das duas telas conta e a outra não.

**A terceira cópia da regra "inativar não desfaz o pagamento" estava no
Lançamentos, e custou os mesmos 663,00.** A regra foi escrita em 31/08 e
aplicada ao `realizadoMes`; `movimentoDoMes` já achava a fixa pelo id e nunca
olhou `ativa`. Mas as duas listas de fixa de `NovoLancamentoExtrato`
— `fixasCategoria`, do mês exibido, e `fcMes`, dentro da cascata — abriam com
`if (!c.fixa || !c.ativa) return false`, e **descartavam a fixa inativa antes de
chegar na linha que pergunta se ela foi confirmada**, três linhas abaixo.

O efeito, relatado pelo Guilherme em 12/09/2026: inativar a Fitway em
Configurações fez o recebimento de 663,00 — já confirmado — sumir do
Lançamentos e mudar o saldo final, enquanto o Radar seguia contando. As duas
telas voltaram a divergir pelo mesmo valor da véspera, pela mesma categoria.

Hoje o teste de confirmação vem **antes** do de `ativa` nas duas listas:
inativar diz "não me cobre mais", nunca "isso nunca aconteceu".

O que continua certo é `projecaoDaConta` pular categoria inativa (`if
(!cat.ativa) continue`): ali a pergunta é o que ainda VAI acontecer, e é
exatamente isso que inativar cancela.

Menor, também aberta: Lançamentos decide a conta da fixa por
`contaDaFixaNoMes` (respeita a troca do mês) e a projeção por
`contaDaCategoria` (só o cadastro). Muda o endereço, não o total.

**Fixa SEM PLANO e que ninguém tocou não aparece como prevista.** Pedido do
Guilherme em 15/09/2026. `valorFixaNoMes` devolve 0 quando a categoria não tem
linha no plano — e devolve 0 para **todas** quando o ano inteiro não foi
planejado. A tela desenhava cada uma como uma linha com checkbox, selo
"previsto" e `R$ 0,00`: um compromisso que o plano não conhece, cobrando ação
que não existe. Num ano ainda não planejado, o mês abria com a lista inteira
assim.

São três condições, e as duas últimas são o que impede de apagar linha viva:

- **confirmada** fica sempre. É a mesma regra que já vale para `ativa` —
  despalnejar diz "não me cobre mais", nunca "isso nunca aconteceu".
- **com valor digitado** (`fixasValorOverride`) fica. Clicar na linha e digitar
  o valor real é o gesto que precede marcar o checkbox; sumir com ela no meio
  apagaria o que a pessoa acabou de escrever.

**Não move número, e é isso que a torna admissível na tela congelada.** Os
totais do mês só somam fixa consolidada, e na cascata a não confirmada entra
valendo `f.valor`, que é 0. O que muda junto, de propósito: o mês abre menos
dias sozinho, porque `comPrevisto` deixa de apontar para dias sem nada a fazer.

A regra vive em `semPlanoEIntocada` e é chamada pelas **duas** listas —
`fixasCategoria`, do mês exibido, e `fcMes`, de dentro da cascata. Uma cópia só:
foi a divergência entre essas duas que custou 663,00 duas vezes, e as duas vezes
o sintoma foi uma parcela que uma tela contava e a outra não.

Consequência aceita: fixa sem plano deixa de ter linha para ser marcada como
paga. Quem precisa pagar uma fixa que o plano não prevê ou põe o valor no plano,
ou lança como qualquer outro lançamento.

**O cenário da previsão é escolha do usuário: pessimista, moderado ou
otimista.** A pergunta é uma só — quando uma categoria estoura o planejado, o
app assume que você compensa em outra? Decidido pelo Guilherme em 10/09/2026.

O que muda é o **nível em que a sobra é cortada no zero**:

| Cenário | Corta em | Assume que |
|---|---|---|
| Pessimista | categoria | você gasta todo o resto do planejado |
| Moderado | grupo | você compensa dentro do grupo |
| Otimista | total | você compensa em qualquer categoria |

Medido num mês de quatro categorias: reserva de 750, 450 e 270 — saldo final
de 1.770, 2.070 e 2.250 sobre a mesma conta. E vale a identidade:
**pessimista − otimista = o estouro total do mês**, porque somar só as sobras
positivas é o mesmo que descartar os negativos.

**O nível NÃO é o mesmo nos dois lados**, e isso não é descuido. Reduzir a
saída e reduzir a entrada empurram o saldo para lados opostos, então
"pessimista" maximiza a saída (corta por categoria) e minimiza a entrada (corta
no total); "otimista" faz o contrário. Sem isso o nome mentiria em metade do
cálculo. Quem decide é `nivelDoCenario` em
[`saldoConta.ts`](src/utils/saldoConta.ts).

**A unidade do corte é do MÊS, não da conta.** "Otimista compensa no total"
precisa valer entre contas também — e não valia. `faltaVariavelDoMes` recebe uma
conta e montava as parcelas só dela, então o corte no zero acontecia dentro de
cada conta e dentro de cada balde. Um estouro no Sicredi não pagava a sobra da
Caixa, e uma sobra de categoria de cartão não era paga por estouro nenhum de
banco. Consequência medida numa fixture de duas contas: **otimista devolvia
exatamente o mesmo número que pessimista** — 400 reservados onde o líquido do
mês era 0. Corrigido em 11/09/2026.

Banco e cartão entram na mesma unidade porque o balde diz por onde o dinheiro
sai, não em que nível a sobra é cortada. Entrada continua separada: é o outro
lado do razão e leva o nível oposto.

O corte agora é feito no mês e o que sobrou volta para as parcelas em
**proporção à sobra positiva de cada uma**. É a única atribuição que preserva o
invariante da função — `projecaoDoMes` é a soma de `projecaoDaConta` —, e é a
mesma ideia de sempre: o rateio não muda o total, só o endereço. No nível
`categoria` a unidade tem uma parcela só e o fator é 1, então **pessimista não
mudou em nada**.

Este é o primeiro lugar do app que **divide** dinheiro. A deriva é de ponto
flutuante e a prova confere a soma: Radar igual à soma das contas nos três
cenários, com tolerância de 1e-6.

**Pessimista é o padrão** — é o comportamento que já estava no ar, e errar para
menos é o lado certo de errar num app de finanças. `Deps.cenarioPrevisao` é
opcional justamente para que a ausência signifique isso.

Vive em `user_preferences.cenario_previsao` (text, default `'pessimista'`).
Aparece em quatro lugares: card próprio em Preferências **com o exemplo que o
explica**, nome do cenário na barra do saldo final previsto, os três botões
dentro da memória de cálculo — onde o efeito é visível na hora —, e o nome no
cartão do Radar.

O exemplo em Preferências é escolhido a dedo: o Vestuário estoura 180 e **não
há sobra no grupo dele**, que é o único formato em que moderado e otimista dão
números diferentes. Um exemplo sem esse caso ensina errado.

**Projeção é do MÊS e da CONTA ao mesmo tempo, e a soma tem de fechar.**
`projecaoDaConta` atribui cada coisa a uma conta só — conta de débito da
categoria, conta de pagamento do cartão, preferida quando não há nenhuma — e
`projecaoDoMes` é a soma dela. Nunca o contrário: enquanto os dois eram
calculados em separado, discordavam. O complemento da fatura é a única exceção,
porque o plano não diz em qual cartão o gasto cai; ele entra uma vez, na conta
que paga o cartão de vencimento mais cedo.

**O previsto se abre em partes, e as partes saem da MESMA passagem que soma o
total.** `detalharProjecaoDaConta` devolve o total e, ao lado, as linhas que o
formam; `projecaoDaConta` virou só a soma dela, com a assinatura intacta.
Feito em 26/09/2026 para o bloco de previsto do Radar — é o mesmo desenho da
memória de cálculo de Lançamentos, que só convence porque não há uma segunda
função para discordar do número.

São **quatro** partes, não duas: fixa a pagar, variável a realizar, fatura do
cartão e entradas previstas. A fatura não é fixa nem variável — é o que já foi
comprado e ainda não foi pago.

**A linha da variável carrega o valor DEPOIS do rateio (`alocado`), nunca o
`falta` cru.** É a armadilha desta parte. O corte no zero acontece no nível do
mês e redistribui a sobra em proporção, então a mesma categoria contribui
valores diferentes em cada cenário. Medido na `prova28`: variável de saída de
1.100 no pessimista e 900 no otimista — Mercado 800 → 654,55, Lazer 300 →
245,45, atravessando Sicredi e Caixa. Mostrar o cru poria 1.100 de linhas
embaixo de um total de 900, e o erro mudaria de tamanho conforme o cenário.

Os totais continuam calculados pelo mesmo código de antes, e as listas são
coletadas ao lado — `somar()` de `faltaVariavelDoMes` não foi tocado. Assim a
extração não pode mover número. A `prova28` roda a mesma fixture na versão
anterior e na nova e exige API pública idêntica, e depois que a soma do
detalhe feche com o total por conta, mês e cenário.

Ela tem um **controle negativo**, e ele não é enfeite: exige que pessimista e
otimista DIVIRJAM na fixture. Na primeira rodada eles deram 2.100 os dois, e a
parte B passava sem ter testado o rateio — a fixture não tinha estouro
compensável. Sem o controle, a prova teria sido reportada como ok.

**Gasto variável sem categoria ativa também é estouro do envelope.**
Corrigido em 05/10/2026, numa revisão do otimista pedida pelo Guilherme.
`faltaVariavelDoMes` só olhava categorias ATIVAS, e o gasto do mês numa
categoria desativada ou excluída — o que o Radar mostra em "Outras" e o Ritmo
do mês conta — não comia sobra nenhuma. Medido: 250 gastos numa categoria
desativada, e o otimista seguia reservando 200 enquanto o Ritmo dizia "Passou
do plano". Duas telas respondendo diferente se a variável estourou.

Acontece de verdade: desativar só é bloqueado com plano nos meses SEGUINTES
(`bloqueadoPorPlanejamento`), não no corrente — quem cancela a academia no meio
do mês zera o resto do ano e desativa, com o gasto do mês já lançado.

Hoje esse gasto entra como parcela de estouro (falta negativa, sem plano), com
as mesmas exclusões do Radar e do Ritmo: transferência, categoria homônima do
cartão e conta FIXA, ativa ou não. Grupo do cadastro se ativo, senão "Outras".
O pessimista não muda (estouro isolado reserva zero); o moderado só muda se o
grupo tiver sobra. O aviso de excesso do otimista passa a contar esse gasto.

A `prova40` exige, no mês corrente, **reserva do otimista === sobra do Ritmo**
e aviso === gasto − planejado do Ritmo, nos casos de categoria desativada,
excluída e variante desativada; e, contra a versão anterior, pessimista igual
em tudo e os três cenários iguais quando não há gasto fora de categoria ativa.
A `prova28` segue com 534.

**Em aberto, decisão do Guilherme:** conta FIXA paga acima do previsto (Plano
de Saúde 1.123 de 973) não entra no envelope e não reduz a reserva da variável
no otimista. "Compensa em qualquer categoria" sugeriria incluir; hoje o
envelope é só da variável.

**Na FATURA, o sinal é invertido.** Compra no cartão é gravada como
`tipo: 'entrada'` — entra na fatura como dívida — e `tipo: 'saida'` é
**estorno**, que abate da categoria (`realizadoMes`, laço da fatura). Foi o que
derrubou a primeira fixture da `prova28`: a compra de 600 gravada como
`'saida'` virou um estorno, e o estouro de 200 virou uma sobra de 1.000.

**A fatura do cartão tem dono, como a categoria tem conta de débito.** Ela
aparece na conta de pagamento do cartão — débito automático, boleto ou PIX,
tanto faz —, e na preferida quando o cartão não tem conta definida. Nunca em
todas: enquanto flutuava, cada banco projetava a fatura de todos os cartões.
Só existem essas três formas de pagar fatura; transferência foi removida do
tipo em 06/09/2026.

**O MODO DESCOBERTA existe porque o público-alvo não consegue responder ao
wizard.** Quem chega sem saber quanto ganha nem quanto gasta não tem como
preencher "quanto você planeja gastar em mercado?" — e o app inteiro dependia
dessa resposta. Antes dele o usuário tinha duas saídas: inventar números, ou
sair pela porta que o próprio texto chamava de adiamento. Implementado em
11–12/09/2026.

A fase é **DERIVADA, nunca guardada**: "estar descobrindo" é exatamente
"terminou o onboarding e não tem plano em ano nenhum", e as duas coisas o app
já sabe. Um campo no banco criaria um terceiro estado capaz de discordar dos
outros dois — alguém com plano marcado como "descobrindo", ou o contrário.
Quem mede é `medirDescoberta` em [`utils/descoberta.ts`](src/utils/descoberta.ts),
e o horizonte do plano sai de `fimDoPlanejamento`, a mesma função que o
Simulador usa.

O ciclo tem duas metades, e a segunda é o que o torna honesto:

| Enquanto observa | Quando o mês fecha |
|---|---|
| faixa com progresso no Planejamento | o convite substitui o contador |
| cartão do mês diz "Descobrindo" | a proposta abre sozinha, uma vez |
| Simulador diz a DATA em que vai servir | os valores viram plano ao aceitar |

**`mesBase` não é o mês anterior, é o mês fechado mais recente COM registro**,
até um ano atrás. Quem registrou em setembro, não abriu o app em outubro e
voltou em novembro continua tendo setembro como base; olhar só para o mês
anterior deixaria essa pessoa observando para sempre.

**A proposta é o REALIZADO do mês-base, categoria por categoria, pela mesma
`construirRealizadoMes` que alimenta o Radar.** Não é média de três meses — não
há três —, nem mediana, nem projeção: é o que aconteceu. Uma segunda contagem
"para a proposta" acabaria discordando da tela que mostra o mês, e o usuário
veria 300 no Radar e 280 na proposta do mesmo mercado. O plano preenche do mês
CORRENTE até dezembro e deixa zero antes: preencher janeiro a agosto com o
gasto de setembro inventaria um passado que não houve.

**Categoria se descobre, não se escolhe antes.** Uma categoria tem doze campos
e o usuário digita UM — o nome. Tipo, movimento e conta saem do formulário em
que ele já está; ícone, cor e grupo saem do casamento com `CATEGORIAS_PADRAO`.
`fixa` sai **sempre falso**: não se sabe se algo se repete a partir de um gasto
só. A regra e a prova vivem em [`utils/novaCategoria.ts`](src/utils/novaCategoria.ts).

O grupo é a única pergunta extra, e só quando o nome não casa com nenhuma
sugestão — sem ela um mês inteiro de categorias descobertas cairia num balde
só, e é justo nesse mês que o usuário olha o Radar pela primeira vez.

**O gatilho de criar categoria vive FORA do dropdown**, numa pílula ao lado do
rótulo. Dentro da lista ele só aparece para quem já a abriu, e quem não encontra
a categoria costuma fechar antes de chegar ao fim.

**Tentativa descartada, para não repetir:** esconder a opção fora da fase de
descoberta. Quem percebe uma categoria faltando no meio de um lançamento tem o
mesmo problema com ou sem plano.

**O modal aparece UMA vez e o "visto" mora no `localStorage`**, por usuário. É
conveniência de leitura de um navegador, não estado do app: reaparecer noutro
aparelho custa um clique, uma coluna no banco custaria migração e mais um
estado para discordar dos outros. Um modal que volta a cada visita vira
obstáculo, e a tela por trás dele se explica sozinha.

**A faixa anual da Grade some durante a descoberta.** Ela é a SAÍDA de um plano
— sem plano são quatro R$ 0,00 em destaque logo abaixo de um texto que acabou
de explicar que ainda estamos medindo, e quatro zeros grandes não leem como
"ainda não tem", leem como "está quebrado". A barra de ferramentas fica: ela é
ENTRADA, e é a porta de quem já sabe os próprios números.

**Só o mês OBSERVADO troca de texto na Grade.** Os outros onze seguem sem plano
de verdade; trocar os doze daria a impressão de que o ano inteiro está em
observação.

**O Onboarding termina em duas portas de mesmo peso**, e nenhuma é o plano B:
"Já sei meus números" leva ao wizard, "Ainda não faço ideia" leva a Lançamentos.
A pergunta que separa não é *quando*, é *você já sabe os seus números?*. A tela
"Tudo pronto!" só é alcançada pela segunda porta, então ela manda para
Lançamentos e diz o combinado — mandar para um painel vazio seria prometer uma
coisa e entregar outra.

**O que não dá para testar na própria conta.** `descoberta.ativa` exige nenhum
plano em ano nenhum, então quem já tem plano nunca vê nada disso. Validar exige
conta nova; e para ver o convite é preciso registrar num mês JÁ FECHADO, senão
não há `mesBase`.

---

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

## Mobile

**O celular não calcula número nenhum: lê as funções do web.** Fase 1 do
plano "celular como Bússola Financeira", liberada pelo Guilherme em
10/10/2026 (antes o mobile só seria atacado depois do web). Havia três contas
próprias, e as três discordavam do Radar:

- **Quick Launch**, saldo da conta: `calcSaldoBanco` somava só os lançamentos
  até hoje — sem fixa confirmada, sem pagamento de fatura. Medido na `prova58`:
  1.920 contra 920 do Radar com um aluguel de 1.000 confirmado. Hoje é
  `saldoRealizadoConta`. O "disponível" de cada categoria são as linhas de
  `totaisDoMes`, por (nome, variante), cartão incluído.
- **CompassCard** (a bússola da home, removida na Fase 3): somava entradas − saídas do extrato,
  com transferência como gasto e sem cartão. Hoje a frase é a do topo do Radar
  (`resumoDoMes`) e o status é o estado do `ritmoDoMes`.
- **Radar do celular** (`AcMobileView`): "Quanto tenho" era receitas − despesas
  do mês e o "Saldo previsto fim do mês" era receitas − despesas planejadas,
  sem o saldo com que o mês abriu. Hoje recebe `saldoAtual` e
  `memoria.fechamento` do `RadarFinanceiro`, e mostra a `ResumoRadarFaixa`.

**Compra no cartão pelo Quick Launch entrava como ESTORNO.** Gravava o tipo
da categoria (`saida`), e na fatura `saida` é estorno: cada compra abatia a
fatura e o gasto. O mesmo na aba "Resumo mensal" de Lançamentos
(`lancarConsolidado`). Corrigido com `tipoNaFatura` em
[`lancamentoRapido.ts`](src/utils/lancamentoRapido.ts), que também manda a
compra depois do fechamento para a fatura seguinte, como a FaturaCartao.
**Compras antigas gravadas assim continuam no banco como estorno**:
identificáveis por `id` `v-<número>` sem sufixo e `tipo: 'saida'` na
`fatura_data`. Corrigir exige SQL revisado pelo Guilherme.

**A gravação é por mês.** O `AppContext` guarda o objeto de cada mês como está
no banco e grava só os meses com identidade diferente (`mesesAlterados`, em
[`gravacaoPorMes.ts`](src/utils/gravacaoPorMes.ts)) — antes cada lançamento
regravava o histórico inteiro. Por tabela, uma fila: duas gravações do mesmo
mês nunca correm juntas. Falha não marca nada como gravado; tenta de novo em
5 s, 10 s... até 1 min, e na hora em que a conexão volta. Fechar a aba com
mês não gravado pede confirmação.

**Ao voltar para o app depois de 30 s fora, ele relê do banco** contas,
categorias, extratos, faturas e plano (`recarregarDoBanco`) — é o que impede a
aba velha do computador de gravar por cima do lançamento do celular. Não relê
com gravação pendente. Limite conhecido: duas janelas VISÍVEIS lado a lado não
disparam a releitura.

**O `IndicadorGravacao` diz se salvou**: "✓ Salvo", "Salvando…" (só depois de
meio segundo), erro e sem internet. Antes o erro ia só para o console.

`prova58` (15 invariantes): Quick Launch = Radar com controle negativo do
cálculo antigo, compra soma e o tipo antigo abate (controle), fechamento do
cartão e a virada do ano, e um lançamento grava um mês só.

**Fase 2: lançar em 5 segundos** (10/10/2026). Tudo pelo Quick Launch, sem
precisar da tela completa de Lançamentos:

- **Data**: Hoje / Ontem / outro dia (nunca futuro), por `dataDoLancamento`.
- **Parcelas no cartão**: `lancarNaFatura` grava como a FaturaCartao (id
  `<base>-<p>`, `parcelas`, `parcelaAtual`, só a 1ª consolidada, a partir do
  mês de fatura da compra). O valor digitado é o da PARCELA ("3× de R$ 179").
- **Variante**: o lançamento guarda `subCategoria` — a categoria é escolhida
  por id, não pelo nome.
- **"Último: R$ X"**: o lançamento mais recente da categoria, banco ou fatura.
- **Contas a pagar** (`ContasAPagarRapido`): a lista da Início
  (`contasAVencer`) com "Pagar" — grava `fixasConsolidadas` e, se o valor
  mudou, `fixasValorOverride`, na conta onde a fixa aparece
  (`contaDoPagamento`, em [`pagarConta.ts`](src/utils/pagarConta.ts)). A conta
  pode ser trocada, como o "Pagar de qual conta?" de Lançamentos.
- **Texto e voz** (`EntradaPorTexto`): "47 mercado nubank", "32,90 farmácia
  ontem", "350 em 3x no roxinho". `interpretarLancamento` roda no aparelho,
  sem IA nem custo, e só PREENCHE — a pessoa confirma. Variante só casa se
  for dita ou se for a única com o nome. Voz pelo reconhecimento do navegador.
- **Instalável**: `manifest.webmanifest`, ícones `icone-*.png` e `sw.js`, que
  guarda só o esqueleto do app (HTML, JS, CSS) — nada do Supabase.
- **Sem internet**: mês não gravado fica no `localStorage` do aparelho
  (`pendentesLocais.ts`) e volta na próxima abertura; o carregamento que
  falhou sem sinal tenta de novo quando a conexão volta. Se o mesmo mês mudar
  em outro aparelho antes, a cópia local vence — aceito. Abrir o app sem
  sinal ainda não mostra os dados (eles não ficam em cache).

`prova59` (26 invariantes).

**Lembrete diário fica para depois**: notificação com o app fechado exige
push (chaves VAPID + um envio agendado no servidor).

**Fase 3: a Bússola** (10/10/2026). A "/" do celular deixou de ser o Quick
Launch e virou a tela que responde as quatro perguntas do dia
([`Bussola.tsx`](src/pages/Bussola.tsx)):

1. Quanto ainda posso gastar? — a folga do `HeroSaldo` (`ritmoDoMes`).
2. Vou fechar no azul? — o número grande, `memoriaDoRadar().fechamento`,
   com "como cheguei nesse número" abrindo a `MemoriaSaldo`.
3. O que vence e tenho saldo? — `ContasAPagarRapido` com "Pagar", e a linha
   "R$ X a pagar e R$ Y hoje no banco: faltam R$ Z".
4. Onde estou saindo do plano? — o `EstouradasCard` da Início.

Tudo por [`bussolaDoMes`](src/utils/bussolaDoMes.ts), que só chama as
funções da Início do computador. Avisos ali são só os que nenhum quadro
responde (mês negativo à frente, parcela acima do plano): contas, "passou" e
ritmo têm quadro próprio. A frase do status (`STATUS_HERO`, `statusDoMes`)
saiu da Dashboard para [`statusHero.ts`](src/components/inicio/statusHero.ts),
e as duas telas a usam.

- **Rotas só do celular**: `/lancar` (o Quick Launch, sem o CompassCard e sem
  a lista de contas, que foram para a Bússola) e `/posso-comprar`. No
  computador elas redirecionam para Lançamentos e para o Simulador.
- **Barra de baixo**: Início · Radar · **+** (`/lancar`) · Posso comprar? ·
  Mais. "Mais" abre Planejamento, Lançamentos completos, Análises, Simulador e
  Configurações. Decisão do plano mobile: Plano e Config são de sentar e
  pensar, mais do computador.
- **Posso comprar?** ([`PossoComprar.tsx`](src/pages/PossoComprar.tsx)): valor,
  parcelas e como paga; a conta é `simularCompra` e a resposta é o MESMO
  `Resposta` da aba Compra do Simulador (agora exportado). Comparar formas de
  pagamento e incluir no plano continuam no Simulador.
- **Radar do celular**: cada linha mostra o `destaqueRadar` ("resta R$ X",
  "passou R$ Y", "✓ pago", "a pagar") e o grupo o `destaqueDoGrupo`, como no
  computador; "Ajustar plano" na linha aberta (o mesmo `AjustePlanoRadar`);
  a faixa de revisão do plano; e o saldo previsto abre a memória de cálculo.
  **O realizado da linha agora inclui dinheiro** (`cd.total`): antes era banco
  + cartão, e gasto em espécie sumia no celular.
- **Simulador, resposta no card azul**: os quadradinhos do mês a mês tinham
  fundo branco com texto branco, e o placar "Sem a compra · Comprando ·
  Diferença" usava tons de fundo claro. Agora tudo na paleta de fundo escuro
  (`#fecaca` para negativo), e no celular o placar cabe em 375 px.
- Atalhos do PWA: Lançar (`/lancar`), Posso comprar?, Radar.

`prova60` (18 invariantes): cada resposta da Bússola = a função da Início,
avisos sem repetição (com controle da lista completa), `statusDoMes` = a
regra antiga da Dashboard em 64 combinações, e o dinheiro no realizado.

**Abrir sem internet** (10/10/2026). A cada carregamento, e a cada gravação
confirmada, o `AppContext` guarda no IndexedDB as linhas do banco, no mesmo
formato da consulta ([`copiaLocal.ts`](src/utils/copiaLocal.ts)); extrato e
fatura pelos meses que o BANCO confirmou (`noBanco`), nunca os pendentes.
Sem internet (ou depois da 4ª tentativa) o `loadData` abre com essa cópia na
hora, somando os pendentes do `localStorage`, e o `IndicadorGravacao` diz
"Sem internet · dados de 10/10 às 14:32".

- **Na cópia só se gravam lançamentos** (extrato e fatura, por mês).
  Contas, categorias, plano e preferências NÃO: `saveContas` e companhia
  regravam a lista inteira e apagam o que não está nela — a partir de uma
  cópia velha, apagariam no banco a conta criada em outro aparelho.
- **Volta ao banco sem tirar a tela** (`sairDoModoAparelho`): no evento
  "online", ao voltar para o app e a cada 30 s. Lê em segundo plano, espera
  as gravações em curso e troca; sem mesclar as contas da memória (são as da
  cópia).
- Sair da conta apaga as cópias.

`prova61` (14 invariantes, no Chromium, com o AppContext de verdade e um
Supabase de mentira): abre sem internet em menos de 5 s com a cópia, lança
offline, e ao voltar a conta criada em outro aparelho continua no banco, o
lançamento chega e a preferência mudada na cópia não foi gravada.

**Lembrete das 21h** (pronto, desligado até a configuração). Função
[`lembrete-diario`](supabase/functions/lembrete-diario/index.ts), regras em
`regras.ts`: conta vencendo amanhã ("Amanhã vence: Aluguel · R$ 2.200,00")
vem primeiro; sem lançamento hoje, "Lançou seus gastos de hoje?" (abre
`/lancar`); tudo em dia, nada. Uma notificação por aparelho por dia. O
servidor não refaz a conta do saldo: o app grava em `push_inscricoes` a lista
`contasAVencer` a cada mudança, em qualquer aparelho (`SincronizarLembrete`,
no `AppShell`). O convite fica na Bússola (`LembreteDiarioCard`), só com
`VITE_VAPID_PUBLIC_KEY` configurada; no iPhone fora do app instalado, explica
que precisa instalar. Passos de configuração no cabeçalho do `index.ts` e na
migração `014_lembretes_e_uso.sql`.

**Medição de uso** (`uso_lancamentos`, migração 014): a cada gravação, quantos
lançamentos NOVOS (ids que o banco não tinha, `lancamentosNovos`) e de qual
aparelho. Falha nunca atrapalha a gravação. Consultas:

```sql
-- % de lançamentos pelo celular, por semana
select date_trunc('week', dia) semana,
  round(100.0 * sum(quantidade) filter (where dispositivo = 'celular') / sum(quantidade), 1) pct_celular
from uso_lancamentos group by 1 order by 1;
-- dias com lançamento por semana, por usuário
select user_id, date_trunc('week', dia) semana, count(distinct dia) dias
from uso_lancamentos group by 1, 2 order by 2, 1;
```

`prova62` (18 invariantes): dia em São Paulo com o servidor em UTC (e a
virada do ano), "lançou hoje" com a compra no cartão na fatura seguinte, as
quatro mensagens, e a contagem de lançamentos novos.


**Redesenho do celular no padrão dos apps de banco** (10/10/2026). Pedido do
Guilherme: "frio, letras pequenas, muito texto". Só desenho; nenhum número
mudou (`prova58`–`60` seguem verdes).

- **Kit** em [`components/mobile/ui.tsx`](src/components/mobile/ui.tsx)
  (`Cartao`, `TituloCartao`, `Linha`, `Atalho`, `Pilula`) e
  [`estilo.ts`](src/components/mobile/estilo.ts) (medidas `M` e o olho
  `useValoresOcultos`). Letra: corpo 15, título 17, legenda 13; **nada abaixo
  de 12 no celular**. Toque de 44 px. Fundo `#f2f5fc`, cartões brancos com
  sombra azulada e cantos de 20, ícone da categoria num círculo com a cor dela.
- **Topo azul** `#0f2878 → #1e40af` (a regra do `#1e40af`), com um número só:
  na Bússola "Ainda dá para gastar"; no Radar "Quanto tenho hoje".
- **Bússola**: olho que esconde os valores (preferência do aparelho, em
  localStorage), atalhos redondos (Lançar · Pagar contas · Posso comprar? ·
  Radar), avisos em uma linha com botão, "Contas da semana" com a etiqueta
  "✓ saldo cobre" / "faltam R$ X" no lugar da frase, e "Passou do plano" em
  lista. O cartão grande "Posso comprar?" virou atalho.
- **Lançar**: saiu a faixa "Despesas hoje · Mês · Dia" (9 px); o gasto do dia
  virou uma linha no topo. Grade com ícone em círculo e nome em 14.
- **Radar**: saíram marca, seletor de ano (as setas do mês viram o ano) e a
  faixa "Quanto tenho"; a linha põe nome e destaque juntos e o "gastou X de Y"
  embaixo, inteiro. **Bug corrigido junto**: o conteúdo era flex em coluna e os
  cartões (overflow hidden) encolhiam até caber na tela, cortando as linhas;
  agora é grade.
- **Barra de baixo**: rótulos 12 px, "Posso comprar?" virou "Comprar?" para
  caber, "+" de 58 px.

**O Norte virou tela própria (`/norte`) e passou a saber os números do app**
(10/10/2026, pedido do Guilherme: "temos que melhorar muito o agente"; o
WhatsApp foi descartado por ele). Antes o contexto que ia para o Gemini era
montado no `NorthAgent` com contas próprias, e todas discordavam do app: o
saldo era o de CADASTRO da conta, as despesas eram só o extrato (sem cartão,
sem dinheiro, sem fixa, com transferência como gasto) e o plano vinha sem
realizado.

- **Contexto**: [`contextoNorte.ts`](src/utils/contextoNorte.ts).
  `dadosDoNorte` chama `bussolaDoMes`, `construirRealizadoMes` +
  `totaisDoMes`, `saldoRealizadoConta` e `comparativoMensal`;
  `contextoNorte` só escreve em texto, sem soma nova. O prompt
  (`SYSTEM_NORTE`) proíbe o Gemini de calcular: ele cita os números prontos.
- **Botões**: o Norte termina a resposta com `[[radar]]`, `[[lancar]]`… e a
  tela desenha "Ver no Radar" (`separarAcoes`, lista fechada `ACOES_NORTE`).
- **Tela** ([`Norte.tsx`](src/pages/Norte.tsx)): abre com o resumo do dia
  calculado no aparelho (sem IA), perguntas prontas conforme a situação
  (`sugestoesDoNorte`), voz, e a conversa guardada no localStorage por
  usuário (últimas 40). Lógica em `components/norte/useNorte.ts`.
- **Onde**: na barra de baixo no lugar de "Comprar?" (escolha do Guilherme);
  "Posso comprar?" ficou no atalho da Início e no "Mais". No computador, o
  cartão do Norte na Sidebar abre a mesma tela. O botão flutuante 🧭 e o
  painel (`NorthAgent`, `NorthPanel`, `NorthMessage`) saíram.
- `prova63` (23 invariantes), com controle negativo da conta antiga.

**Fase B: o Norte faz, a pessoa confirma** (10/10/2026). Lançar, marcar
conta como paga e simular compra. O Norte escreve um pedido no fim da
resposta (`[[fazer:lancar valor=… categoria=<id> conta=<id> …]]`), a tela
mostra um cartão com o que vai acontecer, e **só o toque em "Confirmar"
grava**. Regras em [`acoesNorte.ts`](src/utils/acoesNorte.ts):

- **Pedido no texto, não function calling**, de propósito: a função
  `north-chat` não mudou (nada a publicar no Supabase) e a validação fica no
  aparelho, contra o cadastro. Id inexistente, categoria desativada, valor
  inválido, data no futuro, parcelado fora do cartão ou conta fora da lista
  de contas a pagar: recusa, e o cartão diz por quê. Nunca chuta.
- **Grava pelos caminhos das telas**: lançamento por `lancarNoExtrato`
  (extraído do Quick Launch, que passou a usá-lo) e `lancarNaFatura`;
  pagamento por `contaDoPagamento` + `confirmarPagamento`, o "Pagar" da
  Bússola. Simular é a MESMA `simularCompra` e a mesma `Resposta` da tela
  Posso comprar — o Gemini não diz se cabe.
- O estado do pedido ("✓ Lançado", "Cancelado") fica na conversa guardada:
  recarregar não oferece o mesmo pedido de novo, e o Gemini recebe no
  histórico se a pessoa confirmou ou cancelou.
- `prova64` (23 invariantes): leitura e recusas, e que o lançado aparece no
  Radar e na folga e a conta paga sai das contas a pagar.

**Fase C: o Norte puxa conversa** (10/10/2026). Ao abrir, sem pergunta e sem
IA, ele diz o que importa hoje ([`norteProativo.ts`](src/utils/norteProativo.ts),
`conversaDoDia`, tudo da `bussolaDoMes`): conta atrasada, que vence hoje ou
amanhã (com "Marcar como paga", o mesmo cartão de confirmação da Fase B),
o resto da semana, saldo que não cobre as contas, variável que passou ou está
acelerada, a categoria mais estourada, mês negativo à frente e, a partir das
18h, "ainda não vi gastos de hoje" (`lancouHoje`, a regra do lembrete das
21h, com a data da COMPRA na fatura).

- **Selo** no ícone do Norte na barra de baixo: quantos itens IMPORTANTES de
  hoje ainda não foram vistos (`useSeloNorte`). Abrir a tela marca como visto
  (localStorage por usuário e por dia); item importante novo acende de novo.
  A Bússola da barra é guardada por identidade dos dados (`bussolaDeHoje`),
  para não refazer a série a cada troca de tela.
- **Aviso de versão nova** (`AvisoNovaVersao`, no `AppShell`): o app aberto
  não recarregava depois de uma publicação, e o Norte seguiu dizendo "não
  consigo lançar" horas depois da Fase B. Ao voltar para o app e a cada 5 min
  ele compara o script do `index.html` publicado com o que está rodando.
- `prova65` (28 invariantes).
**Conta compartilhada** (10/10/2026, pedido do Guilherme: "duas ou mais
pessoas acessarem a mesma conta"). Cada pessoa tem o próprio login; as
finanças continuam gravadas com o `user_id` do DONO, e quem aceita o convite
lê e grava essas linhas. Migração `015_compartilhamento.sql` (só cria; as
políticas novas SOMAM às antigas). Sem ela o app segue igual e o Perfil diz
que falta ativar.

- **No contexto**: `userIdRef` é o dono das finanças (o `user_id` das
  consultas); `authIdRef` é quem fez login. `resolverDono` decide na entrada
  (último dono lembrado no aparelho quando não há rede). Nome (`perfil`) é de
  cada pessoa — o do membro vai na linha dele de `user_preferences`; o resto
  das preferências é do dono. Aurix, Norte e simulações salvas seguem por
  pessoa. Membro não usa "limpar dados".
- **Convite**: Perfil → "Compartilhar finanças" (`CfgCompartilhar`), por
  e-mail. Ao entrar com o e-mail convidado aparece `ConviteCompartilhamento`
  (inclusive por cima do Onboarding). Aceitar é a função `aceitar_convite`,
  que exige e-mail CONFIRMADO; o dono não pode pôr ninguém sem aceite (não há
  UPDATE para ele). Uma conta compartilhada por pessoa.
- **Gravar sem apagar o que o outro lançou**: o mês (extrato e fatura) é
  mesclado em três vias na gravação (`mesclarMes.ts`: base = o que este
  aparelho leu, meu, deles = o banco agora). Lançamento por id: o que eu
  apaguei sai, o que eles incluíram fica; mesmo campo nos dois, vale quem
  grava. O mesclado volta para a tela (`trazerMesclados`). Contas e
  categorias só apagam ids que ESTE aparelho viu no banco
  (`contasNoBancoRef`) — antes apagavam tudo o que não estava na lista local.
  Isso também resolve o conflito entre aparelhos da mesma pessoa.
- **Quem mexe em qual lançamento** (regra do Guilherme, mesmo dia): todos
  veem tudo; o ADMINISTRADOR (o dono) edita e exclui qualquer lançamento; os
  outros, só os próprios. Cada lançamento guarda `autor` (id do login),
  carimbado na gravação (`carimbarAutor`, em
  [`autorDoLancamento.ts`](src/utils/autorDoLancamento.ts)) — nenhuma tela
  precisa saber. Sem autor = de antes do compartilhamento = do dono. Membro
  que altera, apaga ou muda de dia o lançamento de outro: a gravação devolve
  o original (`respeitarAutoria`) e `AvisoPermissao` explica. O banco confere
  de novo pelo gatilho da migração `016_autoria_lancamentos.sql` (rodar
  depois da 015). Conta paga (`fixasConsolidadas`) não é lançamento: membro
  pode marcar. As telas de edição ainda não mostram cadeado: o membro tenta,
  e a mudança volta com o aviso.
- **Cadastro é só do administrador** (escolha do Guilherme, mesmo dia):
  contas, categorias, plano e as preferências da conta (cenário, alertas,
  saldo inicial do dinheiro). No `AppContext`, `setContas`, `setCategorias`,
  `setPlanos` e o saldo do dinheiro do membro não mudam nada e disparam
  `compass-permissao` com `detail: 'cadastro'` (o `AvisoPermissao` explica);
  os `save*` desses dados nem rodam para membro. Preferência como o cenário
  muda só na tela do membro, sem gravar na linha do dono. Configurações e
  Planejamento mostram `AvisoSoAdministrador`. O banco confere pela migração
  `017_cadastro_so_administrador.sql`: as quatro políticas `_compartilhado`
  de cadastro viram só leitura (rodar depois da 016). Consequência aceita:
  o membro não cria categoria no meio de um lançamento nem escolhe os
  atalhos do Lançar (`pinQuick` é da categoria).
- Conta compartilhada relê do banco a cada minuto com a tela visível.
- Plano (`planejamento_data`): só o administrador grava, então não há mais
  duas pessoas editando o plano ao mesmo tempo; dois aparelhos do próprio
  administrador ainda gravam o ano inteiro, e vale o último.
- `prova66a` (11, a mescla), `prova67a` (10, autoria), `prova67-banco.sql`
  (18, RLS e gatilho num Postgres 16 de verdade), `prova68-banco.sql` (17,
  cadastro só leitura para o membro, com controle sem a 017: 11 falham) e
  `prova66b` (26, no navegador com o AppContext de verdade: dois logins,
  mesmo mês, cadastro bloqueado ao membro, nome, sair).

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

- `parseConta(s)` → `number | null`. Soma e subtração de valores ("800+300",
  "1.234,56 + R$ 100"), cada parcela por `parseValor`; arredonda ao centavo.
  Sem operador é `parseValor` puro. Usado na célula do plano
  (`PlanCelulaEditavel`), que mostra "= R$ X" enquanto se digita — pedido do
  Guilherme em 06/10/2026, para parar de somar por fora. `prova44`.

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

**Categoria MÃE: as variantes variáveis somam nela.** Pedido do Guilherme em
09/10/2026: "posso fazer um planejamento por categoria jogando um valor total
que soma as variantes [...] o valor da variante será da categoria, mas posso
verificar o detalhamento". Regras em [`categoriaMae.ts`](src/utils/categoriaMae.ts).

- **Mãe** é a categoria cadastrada SEM variante e ativa ("Academia"). A regra é
  de cadastro, não de mês — senão a mesma compra mudaria de linha conforme o
  que mais foi gasto.
- Variante **variável** de uma mãe (inclusive desativada ou que nem existe
  mais) soma nela: o gasto vai para a chave da mãe e cada lançamento guarda a
  `variante`; o plano da variante, se houver, entra no da mãe, com o detalhe
  em itens ("Academia 100 · Martin 103").
- Variante **fixa** fica fora: tem valor, dia e conta próprios, e é o valor
  dela no plano que gera o lançamento previsto e a conta a vencer. Somada na
  mãe, ela ficaria sem valor individual — foi o ponto do Guilherme.
- **Sem mãe, nada muda**: Financiamento · Casa e · Civic seguem independentes.

Onde a regra vive, e por que só ali: a montagem do realizado
(`construirRealizadoMes`, `chaveDe`), a leitura do plano (`resolverPlanCats`
e `valorFixaNoMes` passam por `juntarNaMae`), o laço da variável em
`faltaVariavelDoMes` (filha não é parcela própria) e o gravador
(`mudarLinhaDoPlano` junta antes de gravar, e gravar numa filha grava na mãe).
Radar, previsão, Início, alertas e revisão leem desses quatro. O Planejamento
não lista as filhas variáveis (`dadosBaseDoPlano`) e lê a mãe somada. O Radar,
aberto numa mãe, mostra "Por variante" e a etiqueta em cada lançamento.

Junto, uma correção em `resolverRealKey`: linha sem variante não "pega" a
chave única de uma variante quando a categoria sem variante existe. Com a fixa
"Academia · Plano anual" paga sozinha no mês, a Academia mostrava os mesmos 80
e o grupo somava 160.

`prova57` (35 invariantes): plano antigo (com valor na linha da variante) e
plano juntado na mãe dão o MESMO saldo previsto nos três cenários. A `prova28`
segue com 534 contra a versão anterior.

Ainda não acompanham a regra (só a lista de escolha; os números ficam certos,
porque o valor soma na mãe ao ser lido): o assistente de planejamento e o
"Incluir no planejamento" do Simulador ainda oferecem as filhas; o Radar do
celular não tem a faixa "Por variante"; a Revisão Mensal lista a linha da filha
com zero até o plano ser regravado.

**O nome no cadastro tem autocomplete, e é gravado com a grafia da
existente.** Pedido do Guilherme em 08/10/2026: o campo era aberto. Ao digitar,
as categorias do tipo com uma palavra que começa com o digitado (sem acento e
sem caixa), as do grupo escolhido primeiro; escolher uma usa o nome EXATO e
avisa que será uma nova variante. Nome que não casa diz "✦ Nova categoria". Ao
salvar, "academia" vira "Academia" (`nomeCanonico`): o casamento por nome é
exato, e a grafia diferente virava outra categoria no plano e no Radar. Regras
em [`nomeCategoria.ts`](src/utils/nomeCategoria.ts), campo em
`NomeCategoriaCampo`. `prova56` (16 invariantes).

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

**A sessão cai depois de 30 minutos sem uso**, com aviso no último minuto
("Você ainda está aí?" · Continuar conectado / Sair agora). Decidido pelo
Guilherme em 26/09/2026: o Supabase renova a sessão sozinho, sem prazo, e quem
abrisse o navegador no mesmo computador dias depois entrava direto. Regra e
motivo em [`utils/inatividade.ts`](src/utils/inatividade.ts); o aviso é o
`AvisoInatividade`, montado no `AppShell`. Cobre o computador deixado aberto;
não protege contra sessão roubada — o limite no próprio Supabase faria isso, e
parece ser recurso de plano pago.

A última atividade mora no **localStorage**, para valer entre abas (usar uma
mantém as outras) e ao reabrir o navegador depois do prazo (abre deslogado).
O carimbo é apagado **sempre que não há sessão**, no `onAuthStateChange` —
senão um login novo herdaria o carimbo velho e sairia na hora.

A saída é o mesmo `sairDaConta` do menu, que **salva tudo antes** de
desconectar. O componente chama sempre a versão mais recente dele por uma
ref: uma versão presa no efeito de montagem salvaria dados velhos por cima
dos novos. A tela de login diz por que a pessoa saiu. A `prova29` tranca os
limites: 29:00 avisa com 60 s, 29:59 com 1 s, 30:00 sai.

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
