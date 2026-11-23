// GERADO por scripts/empacotar-whatsapp.mjs a partir de fonte.ts. Não editar à mão.
// deno-lint-ignore-file
// @ts-nocheck
import { createClient } from "jsr:@supabase/supabase-js@2";
// src/utils/interpretarLancamento.ts
const semAcento$1 = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DESCARTAR = /* @__PURE__ */ new Set([
	"gastei",
	"paguei",
	"comprei",
	"recebi",
	"no",
	"na",
	"nos",
	"nas",
	"em",
	"de",
	"do",
	"da",
	"com",
	"pelo",
	"pela",
	"reais",
	"real",
	"r$",
	"rs",
	"hoje",
	"ontem",
	"cartao",
	"conta",
	"e",
	"o",
	"a",
	"um",
	"uma",
	"vezes"
]);
function lerValor(tok) {
	const t = tok.replace(/^r\$/, "");
	if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$|^\d+\.\d{1,2}$/.test(t)) return void 0;
	const n = /^\d+\.\d{1,2}$/.test(t) ? Number(t) : Number(t.replace(/\./g, "").replace(",", "."));
	return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : void 0;
}
function contem(texto, termo) {
	const t = semAcento$1(termo).trim();
	if (!t) return false;
	return new RegExp(`(^|\\s)${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(texto);
}
function interpretarLancamento(entrada, categorias, contas) {
	let texto = " " + semAcento$1(entrada).replace(/[!?;]/g, " ").replace(/\s+/g, " ").trim() + " ";
	const out = {
		diasAtras: 0,
		descricao: ""
	};
	if (contem(texto, "ontem")) out.diasAtras = 1;
	const parc = texto.match(/\s(\d{1,2})\s?x\s|\sem (\d{1,2}) vezes\s/);
	if (parc) {
		const n = Number(parc[1] ?? parc[2]);
		if (n >= 2 && n <= 48) out.parcelas = n;
		texto = texto.replace(parc[0], " ");
	}
	const tokens = texto.trim().split(" ");
	const iValor = tokens.findIndex((t) => lerValor(t) !== void 0);
	if (iValor >= 0) {
		out.valor = lerValor(tokens[iValor]);
		tokens.splice(iValor, 1);
	}
	texto = " " + tokens.join(" ") + " ";
	const ativas = categorias.filter((c) => c.ativa);
	const cat = ativas.filter((c) => contem(texto, c.nome) && (!c.descricao || contem(texto, c.descricao) || ativas.filter((o) => o.nome === c.nome).length === 1)).sort((a, b) => b.nome.length + (b.descricao && contem(texto, b.descricao) ? 100 : 0) - (a.nome.length + (a.descricao && contem(texto, a.descricao) ? 100 : 0)))[0];
	if (cat) {
		out.categoriaId = cat.id;
		texto = texto.replace(` ${semAcento$1(cat.nome)} `, " ");
		if (cat.descricao && contem(texto, cat.descricao)) texto = texto.replace(` ${semAcento$1(cat.descricao)} `, " ");
	}
	const conta = contas.find((c) => [
		c.apelido,
		c.nome,
		c.banco
	].some((n) => n && contem(texto, n)));
	if (conta) {
		out.contaId = conta.id;
		for (const n of [
			conta.apelido,
			conta.nome,
			conta.banco
		]) if (n) texto = texto.replace(` ${semAcento$1(n)} `, " ");
	}
	out.descricao = texto.trim().split(" ").filter((t) => t && !DESCARTAR.has(t)).join(" ");
	return out;
}
// src/utils/diasDaFatura.ts
/**
* Lançamento gravado num dia que o mês não tem.
*
* A fatura grava as parcelas de uma compra no DIA da compra, em cada mês
* seguinte. Compra no dia 29, 30 ou 31 punha a parcela no "dia 29" de
* fevereiro, ou no "dia 31" de um mês de 30 dias — e toda tela que percorre
* o mês do dia 1 ao último não a via: sumia da lista da fatura, do total, do
* Radar e do "já gastou" do Planejamento. Relatado pelo Guilherme em
* 21/10/2026: Academia · Gui (compra em 29/09) sem a parcela 5 de 12 na
* fatura de fevereiro de 2027.
*
* O lançamento passa para o último dia do mês: o dinheiro é o mesmo, só o
* endereço muda. Gravar novo usa `diaNoMes`; o que já está gravado é
* ajustado ao carregar (`ajustarDiasDoMes`) e volta ao banco na gravação.
*/
const diasNoMesDe = (ano, mes) => new Date(ano, mes + 1, 0).getDate();
/** O dia, cortado no último dia do mês (mes de 0 a 11). */
const diaNoMes = (dia, ano, mes) => Math.min(dia, diasNoMesDe(ano, mes));
// src/utils/lancamentoRapido.ts
/**
* Regras do lançamento rápido (Quick Launch, a home do mobile) que precisam
* concordar com a tela da fatura.
*
* Na fatura o sinal é o do CARTÃO, não o da categoria: `entrada` é compra e
* `saida` é estorno — ver `totalFatura` em saldoConta e `construirRealizadoMes`.
* O Quick Launch gravava a compra com o tipo da categoria (`saida`), e toda
* compra lançada por ali entrava como ESTORNO: abatia a fatura e o gasto da
* categoria em vez de somar.
*/
function tipoNaFatura(tipoDaCategoria) {
	return tipoDaCategoria === "saida" ? "entrada" : "saida";
}
/**
* Em que mês de fatura cai uma compra feita hoje. NO dia do fechamento ou
* depois ela vai para a fatura seguinte (23/10/2026, pedido do Guilherme:
* "se fecha dia 22, lançamento no dia 22 vai para a próxima fatura") — a
* mesma regra de `routeToNext` na FaturaCartao. Fechamento num dia que o mês
* não tem (31 em fevereiro) vale no último dia dele.
*/
function mesDaFaturaDaCompra(cartao, ano, mes, dia) {
	if (cartao.diaFechamento == null) return {
		ano,
		mes
	};
	if (dia < Math.min(cartao.diaFechamento, new Date(ano, mes + 1, 0).getDate())) return {
		ano,
		mes
	};
	return mes === 11 ? {
		ano: ano + 1,
		mes: 0
	} : {
		ano,
		mes: mes + 1
	};
}
/**
* O cartão com o fechamento DAQUELE mês. Na tela da fatura dá para mudar o
* fechamento de um mês só ("Fecha dia 20 *", `fechamentoOverride`, gravado
* no mês da fatura que recebe as compras do mês, `<cartão>-AAAA-MM`), e ela
* já usava esse dia para dizer "Fechada" e mandar a compra para a próxima.
* O Lançar do celular lia só o cadastro: em 20/11/2026 o Sicredi fechou no
* dia 20 por esse ajuste, a fatura aparecia fechada e o Lançar seguia
* oferecendo a fatura que já tinha fechado (relatado pelo Guilherme).
*/
function comFechamentoDoMes(cartao, faturas, ano, mes) {
	const f = faturas[`${cartao.id}-${ano}-${String(mes + 1).padStart(2, "0")}`]?.fechamentoOverride;
	return f != null && f > 0 ? {
		...cartao,
		diaFechamento: f
	} : cartao;
}
/**
* A compra no cartão, com parcelas, do jeito que a FaturaCartao grava: a
* parcela p vai para o mês de fatura da compra + (p − 1), com id
* `<base>-<p>`, `parcelas` e `parcelaAtual`; só a 1ª nasce consolidada.
* `valorParcela` é o valor de CADA parcela — no Brasil se informa "12× de
* R$ 179", não o total (ver o Simulador no CLAUDE.md).
*
* Devolve o objeto novo de faturas; só os meses tocados mudam de identidade,
* e é isso que a gravação por mês usa para saber o que mandar ao banco.
*/
function lancarNaFatura(faturas, p) {
	const n = Math.max(1, Math.floor(p.parcelas));
	const inicio = mesDaFaturaDaCompra(p.cartao, p.ano, p.mes, p.dia);
	const out = { ...faturas };
	for (let i = 1; i <= n; i++) {
		let m = inicio.mes + (i - 1), a = inicio.ano;
		while (m > 11) {
			m -= 12;
			a++;
		}
		const k = `${p.cartao.id}-${a}-${String(m + 1).padStart(2, "0")}`;
		const dm = out[k] ?? {
			lancamentos: {},
			faturaAtual: ""
		};
		const d = diaNoMes(p.dia, a, m);
		out[k] = {
			...dm,
			lancamentos: {
				...dm.lancamentos,
				[d]: [...dm.lancamentos[d] ?? [], {
					id: `${p.baseId}-${i}`,
					tipo: tipoNaFatura(p.tipoDaCategoria),
					descricao: p.descricao,
					categoria: p.categoria,
					...p.subCategoria ? { subCategoria: p.subCategoria } : {},
					valor: p.valores?.[i - 1] ?? p.valorParcela,
					formaPagamento: "credito",
					tipoLanc: "variavel",
					consolidado: i === 1,
					...n > 1 ? {
						parcelas: n,
						parcelaAtual: i
					} : {},
					diaCompra: p.dia,
					mesCompra: p.mes,
					anoCompra: p.ano
				}]
			}
		};
	}
	return out;
}
/**
* Divide o total da compra em N parcelas, ao centavo. Quando a divisão não
* fecha, a sobra dos centavos vai na PRIMEIRA (100 em 3× = 33,34 + 33,33 +
* 33,33), como as lojas fazem. A soma é sempre o total.
*/
function dividirParcelas(total, parcelas) {
	const n = Math.max(1, Math.floor(parcelas));
	const centavos = Math.round(total * 100);
	const demais = Math.floor(centavos / n);
	return [centavos - demais * (n - 1), ...Array(n - 1).fill(demais)].map((c) => c / 100);
}
/**
* Um lançamento no extrato de um banco ou da carteira — o mesmo objeto que o
* Quick Launch grava (e agora o Norte, ao confirmar). Devolve o mês novo.
*/
function lancarNoExtrato(dm, p) {
	return {
		...dm,
		lancamentos: {
			...dm.lancamentos,
			[p.dia]: [...dm.lancamentos[p.dia] ?? [], {
				id: p.id,
				tipo: p.tipo,
				descricao: p.descricao,
				categoria: p.categoria,
				...p.subCategoria ? { subCategoria: p.subCategoria } : {},
				valor: p.valor,
				formaPagamento: p.formaPagamento,
				tipoLanc: "variavel",
				consolidado: true
			}]
		}
	};
}
// src/utils/saldoDesde.ts
const doisDig = (n) => String(n).padStart(2, "0");
/** "18/10" — ou "1º/10" no primeiro dia. */
function diaDoSaldo(iso) {
	const [, m, d] = iso.split("-").map(Number);
	return `${d === 1 ? "1º" : doisDig(d)}/${doisDig(m)}`;
}
/**
* Se o lançamento NOVO no dia (ano, mes 0–11, dia) cai antes da data do saldo
* da conta, a frase que explica por que não pode; senão null. Conta sem data
* (as antigas, a carteira) nunca trava. Editar um lançamento que já existe
* também não passa por aqui.
*/
function lancamentoAntesDoSaldo(conta, ano, mes, dia) {
	const desde = conta?.saldoInicialDesde;
	if (!desde) return null;
	if (`${ano}-${doisDig(mes + 1)}-${doisDig(dia)}` >= desde) return null;
	const quando = diaDoSaldo(desde);
	return conta.tipo === "cartao" ? `A fatura deste cartão foi informada em ${quando}: as compras de antes já estão nela. Lance a partir de ${quando}.` : `O saldo desta conta é de ${quando}: o que aconteceu antes já está nele. Lance a partir de ${quando}.`;
}
// src/utils/autorDoLancamento.ts
function porId(m) {
	const out = /* @__PURE__ */ new Map();
	for (const [dia, itens] of Object.entries(m?.lancamentos ?? {})) {
		if (!Array.isArray(itens)) continue;
		for (const item of itens) if (item && item.id !== void 0) out.set(String(item.id), {
			dia,
			item
		});
	}
	return out;
}
/** Lançamento novo ganha o autor; editado mantém o que já tinha. */
function carimbarAutor(base, meu, eu) {
	const m = meu;
	if (!m?.lancamentos) return meu;
	const b = porId(base);
	let mudou = false;
	const lancamentos = {};
	for (const [dia, itens] of Object.entries(m.lancamentos)) {
		if (!Array.isArray(itens)) {
			lancamentos[dia] = itens;
			continue;
		}
		lancamentos[dia] = itens.map((item) => {
			if (!item || item.autor || item.id === void 0) return item;
			const antes = b.get(String(item.id));
			if (antes) {
				if (!antes.item.autor) return item;
				mudou = true;
				return {
					...item,
					autor: antes.item.autor
				};
			}
			mudou = true;
			return {
				...item,
				autor: eu
			};
		});
	}
	return mudou ? {
		...m,
		lancamentos
	} : meu;
}
// src/utils/nomeDaConta.ts
/**
* O nome que a pessoa reconhece numa lista de contas: o BANCO. O `nome` da
* conta bancária costuma ser o titular ("Guilherme"), e sozinho num seletor
* não diz de onde o dinheiro sai. Cartão usa o apelido ("Nubank Gold"), se
* houver. Quando dois itens dariam o mesmo rótulo (duas contas no Sicredi), o
* titular ou o apelido vai ao lado para desempatar.
*/
function nomeDaConta(c, contas = []) {
	const base = (x) => x.tipo === "cartao" ? x.apelido || x.banco || x.nome : x.banco || x.nome;
	const rotulo = base(c);
	if (!contas.some((x) => x.id !== c.id && base(x) === rotulo)) return rotulo;
	const extra = c.tipo === "cartao" ? c.nome : c.apelido || c.nome;
	return extra && extra !== rotulo ? `${rotulo} · ${extra}` : rotulo;
}
// src/utils/whatsapp.ts
/** O dia em São Paulo (o servidor roda em UTC). mes de 0 a 11. */
function hojeEmSaoPaulo(agora = /* @__PURE__ */ new Date()) {
	const p = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(agora).split("-").map(Number);
	return {
		ano: p[0],
		mes: p[1] - 1,
		dia: p[2]
	};
}
/** Só os dígitos. Grupo ("...-group") ou vazio não é número de pessoa. */
function normalizarTelefone(bruto) {
	if (typeof bruto !== "string" || /group|broadcast|newsletter/i.test(bruto)) return null;
	const d = bruto.replace(/\D/g, "");
	return d.length >= 10 && d.length <= 15 ? d : null;
}
const MIDIAS = [
	"audio",
	"image",
	"video",
	"document",
	"sticker"
];
const obj = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : null;
function lerEntrada(bruto) {
	const vazio = {
		telefone: null,
		messageId: null,
		texto: "",
		midia: false,
		ignorar: true
	};
	let p = obj(bruto);
	if (!p) return vazio;
	const corpo = obj(p.body);
	if (corpo && (corpo.entry || corpo.phone)) p = corpo;
	if (Array.isArray(p.entry)) {
		const entrada = obj(p.entry[0]);
		const mudanca = obj(Array.isArray(entrada?.changes) ? entrada.changes[0] : null);
		const value = obj(mudanca?.value);
		const m = obj(Array.isArray(value?.messages) ? value.messages[0] : null);
		if (!m) return vazio;
		const tipo = typeof m.type === "string" ? m.type : "";
		const texto = tipo === "text" && typeof obj(m.text)?.body === "string" ? obj(m.text).body : tipo === "button" && typeof obj(m.button)?.text === "string" ? obj(m.button).text : "";
		const telefone = normalizarTelefone(m.from);
		return {
			telefone,
			messageId: typeof m.id === "string" ? m.id : null,
			texto,
			midia: MIDIAS.includes(tipo),
			ignorar: !telefone
		};
	}
	const telefone = normalizarTelefone(p.phone);
	if (typeof p.type === "string" && p.type !== "ReceivedCallback") return {
		...vazio,
		telefone
	};
	if (!telefone || p.fromMe === true || p.isGroup === true || p.isNewsletter === true) return {
		...vazio,
		telefone
	};
	const texto = typeof obj(p.text)?.message === "string" ? obj(p.text).message : "";
	return {
		telefone,
		messageId: typeof p.messageId === "string" ? p.messageId : null,
		texto,
		midia: MIDIAS.some((k) => p[k]),
		ignorar: false
	};
}
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function classificar(texto) {
	const t = semAcento(texto).replace(/[.!?,;]+$/g, "").trim();
	const cod = t.match(/compass\s*(?:one\s*)?:?\s*(\d{6})(?!\d)/);
	if (cod) return {
		tipo: "codigo",
		codigo: cod[1]
	};
	if (/^(sim|s|ok|confirmar|confirmo|isso|pode lancar|pode)$/.test(t)) return { tipo: "sim" };
	if (/^(nao|n|cancelar|cancela|errado)$/.test(t)) return { tipo: "nao" };
	if (/^(sair|parar|desligar|stop)$/.test(t)) return { tipo: "sair" };
	if (/^(oi|ola|ajuda|menu|help|bom dia|boa tarde|boa noite|como funciona)$/.test(t)) return { tipo: "ajuda" };
	return { tipo: "texto" };
}
const brl = (v) => v.toLocaleString("pt-BR", {
	style: "currency",
	currency: "BRL"
});
const TEXTO_AJUDA = "Para lançar, mande o valor e a categoria, do jeito que estão no app:\n• 47 mercado\n• 32,90 farmácia ontem\n• 350 em 3x loja no nubank\n\nEu mostro o que entendi e só lanço depois do seu *SIM*.\nPara desligar o WhatsApp do Compass One, mande *SAIR*.";
const TEXTO_SEM_VINCULO = "Olá! Este WhatsApp ainda não está ligado a uma conta do Compass One.\nPara ligar, abra o app em Configurações > Perfil > Lançar pelo WhatsApp e toque em \"Ligar meu WhatsApp\".";
const TEXTO_SO_TEXTO = "Por enquanto eu entendo só mensagens de texto. Exemplo: 47 mercado";
const TEXTO_CODIGO_INVALIDO = "Esse código não vale mais. Gere um novo no app, em Configurações > Perfil > Lançar pelo WhatsApp.";
const textoLigado = (nome) => `Pronto${nome ? `, ${nome}` : ""}! Este WhatsApp está ligado ao seu Compass One.\n\n${TEXTO_AJUDA}`;
const TEXTO_DESLIGADO = "Pronto, este WhatsApp foi desligado do Compass One. Para ligar de novo, use o app em Configurações > Perfil > Lançar pelo WhatsApp.";
const TEXTO_NADA_PENDENTE = "Não há nenhum lançamento esperando confirmação. Para lançar, mande por exemplo: 47 mercado";
const TEXTO_CANCELADO = "Cancelado. Nada foi lançado.";
const nomeCat = (c) => c.descricao ? `${c.nome} · ${c.descricao}` : c.nome;
function quandoTexto(a, hoje) {
	if (a.ano === hoje.ano && a.mes === hoje.mes && a.dia === hoje.dia) return "hoje";
	const ontem = new Date(hoje.ano, hoje.mes, hoje.dia - 1);
	if (a.ano === ontem.getFullYear() && a.mes === ontem.getMonth() && a.dia === ontem.getDate()) return "ontem";
	return `em ${String(a.dia).padStart(2, "0")}/${String(a.mes + 1).padStart(2, "0")}`;
}
/**
* O `interpretarLancamento` devolve o resto da frase sem acento e sem as
* palavras de ligação ("pao leite"). A descrição gravada usa as palavras como
* a pessoa escreveu ("pão e leite"): fica cada palavra que sobrou, e a de
* ligação só entre duas que ficaram. "dinheiro"/"espécie" disseram onde, não o quê.
*/
function descricaoOriginal(texto, resto) {
	const sobra = resto.split(" ").filter(Boolean).filter((w) => w !== "dinheiro" && w !== "especie");
	const tokens = texto.replace(/[!?;]/g, " ").split(/\s+/).filter(Boolean);
	const fica = tokens.map((tok) => {
		const i = sobra.indexOf(semAcento(tok));
		if (i < 0) return false;
		sobra.splice(i, 1);
		return true;
	});
	const LIGA = /* @__PURE__ */ new Set([
		"e",
		"de",
		"do",
		"da",
		"dos",
		"das",
		"com",
		"pra",
		"para"
	]);
	return tokens.filter((tok, i) => fica[i] || LIGA.has(semAcento(tok)) && fica[i - 1] && fica[i + 1]).join(" ");
}
/**
* A frase vira uma proposta de lançamento, ou a explicação do que faltou.
* Nunca chuta: sem valor, sem categoria ou sem um cartão claro, pergunta.
*/
function lerLancamento(texto, dados) {
	const { categorias, hoje } = dados;
	const contas = dados.contas;
	const r = interpretarLancamento(texto, categorias, contas);
	const emDinheiro = /(^|\s)(dinheiro|especie)(\s|$)/.test(semAcento(texto));
	if (r.valor == null) return {
		ok: false,
		resposta: "Não encontrei o valor. Mande o valor e a categoria, por exemplo: 47 mercado"
	};
	const cat = categorias.find((c) => c.id === r.categoriaId);
	if (!cat) {
		const ativas = categorias.filter((c) => c.ativa);
		const exemplos = [...ativas.filter((c) => c.pinQuick), ...ativas.filter((c) => !c.pinQuick)].slice(0, 6).map(nomeCat).join(", ");
		return {
			ok: false,
			resposta: "Não encontrei a categoria. Escreva o nome como está no app, por exemplo: 47 mercado." + (exemplos ? `\nAlgumas das suas: ${exemplos}.` : "")
		};
	}
	const data = new Date(hoje.ano, hoje.mes, hoje.dia - r.diasAtras);
	const [ano, mes, dia] = [
		data.getFullYear(),
		data.getMonth(),
		data.getDate()
	];
	const parcelas = r.parcelas ?? 1;
	const cartoes = contas.filter((c) => c.tipo === "cartao");
	const bancos = contas.filter((c) => c.tipo === "corrente");
	const listaCartoes = () => cartoes.map((c) => nomeDaConta(c, contas)).join(", ");
	let conta;
	const dita = contas.find((c) => c.id === r.contaId);
	if (dita) {
		if (dita.tipo === "poupanca") return {
			ok: false,
			resposta: `${nomeDaConta(dita, contas)} é um investimento. Aplicação e resgate se lançam no app, em Investimentos.`
		};
		conta = dita;
	} else if (emDinheiro) conta = "dinheiro";
	else if (parcelas > 1 || cat.tipoMovimento === "cartao") {
		if (cartoes.length === 1) conta = cartoes[0];
		else if (cartoes.length === 0) {
			if (parcelas > 1) return {
				ok: false,
				resposta: "Compra parcelada entra num cartão, e não há cartão cadastrado no app."
			};
		} else return {
			ok: false,
			resposta: `Em qual cartão? Mande de novo com o nome dele, por exemplo: ${r.valor.toLocaleString("pt-BR")} ${cat.nome.toLowerCase()} ${nomeDaConta(cartoes[0], contas).toLowerCase()}.\nSeus cartões: ${listaCartoes()}.`
		};
	} else if (cat.tipoMovimento === "dinheiro") conta = "dinheiro";
	if (!conta) {
		conta = bancos.find((b) => b.id === cat.contaDebitoId) ?? bancos.find((b) => b.preferida) ?? bancos[0];
		if (!conta) return {
			ok: false,
			resposta: "Não há conta de banco cadastrada no app para este lançamento."
		};
	}
	const ehCartao = conta !== "dinheiro" && conta.tipo === "cartao";
	if (ehCartao && cat.tipo === "entrada") return {
		ok: false,
		resposta: "Recebimento não entra no cartão. Mande de novo sem o nome do cartão, ou com o nome do banco."
	};
	if (!ehCartao && parcelas > 1) return {
		ok: false,
		resposta: `Parcelado só no cartão. Mande de novo com o nome do cartão${cartoes.length ? ` (${listaCartoes()})` : ""}.`
	};
	if (conta !== "dinheiro") {
		const trava = lancamentoAntesDoSaldo(conta, ano, mes, dia);
		if (trava) return {
			ok: false,
			resposta: trava
		};
	}
	const descricao = descricaoOriginal(texto, r.descricao) || cat.nome;
	const formaPagamento = ehCartao ? "credito" : conta === "dinheiro" ? "dinheiro" : cat.formaPagamento === "pix" || cat.formaPagamento === "transferencia" ? cat.formaPagamento : "debito";
	const acao = {
		tipo: "lancar",
		destino: ehCartao ? "fatura" : "extrato",
		contaId: conta === "dinheiro" ? "dinheiro" : conta.id,
		ano,
		mes,
		dia,
		tipoCategoria: cat.tipo,
		categoria: cat.nome,
		...cat.descricao ? { subCategoria: cat.descricao } : {},
		descricao,
		total: r.valor,
		parcelas,
		formaPagamento,
		...ehCartao && conta.diaFechamento != null ? { diaFechamento: conta.diaFechamento } : {}
	};
	return {
		ok: true,
		acao,
		resposta: textoDaProposta(acao, contas, hoje)
	};
}
function textoDaProposta(a, contas, hoje) {
	const conta = contas.find((c) => c.id === a.contaId);
	const onde = a.contaId === "dinheiro" ? "em dinheiro" : conta ? `${a.destino === "fatura" ? "no cartão" : "no"} ${nomeDaConta(conta, contas)}` : "";
	let valor = `*${brl(a.total)}*`;
	if (a.parcelas > 1) {
		const v = dividirParcelas(a.total, a.parcelas);
		valor += v[0] === v[1] ? ` em ${a.parcelas}x de ${brl(v[1])}` : ` em ${a.parcelas}x (1ª de ${brl(v[0])} e ${a.parcelas - 1}x de ${brl(v[1])})`;
	}
	const verbo = a.tipoCategoria === "entrada" ? "Lançar o recebimento de" : "Lançar";
	const desc = a.descricao !== a.categoria ? ` (${a.descricao})` : "";
	return `${verbo} ${valor} em *${a.subCategoria ? `${a.categoria} · ${a.subCategoria}` : a.categoria}*${desc} ${onde}, ${quandoTexto(a, hoje)}?\nResponda *SIM* para lançar ou *NÃO* para cancelar.`;
}
/** A chave do mês no formato do app (`<conta>-AAAA-MM`, mes 0 a 11). */
const chaveDoMes = (contaId, ano, mes) => `${contaId}-${ano}-${String(mes + 1).padStart(2, "0")}`;
/**
* Os meses que a gravação pode tocar: o do extrato, ou, na fatura, do mês da
* compra (onde mora o fechamento do mês) até o da última parcela.
*/
function mesesDaAcao(a) {
	if (a.destino === "extrato") return [{
		contaId: a.contaId,
		ano: a.ano,
		mes: a.mes
	}];
	const out = [];
	for (let i = 0; i <= a.parcelas; i++) {
		const d = new Date(a.ano, a.mes + i, 1);
		out.push({
			contaId: a.contaId,
			ano: d.getFullYear(),
			mes: d.getMonth()
		});
	}
	return out;
}
/**
* Aplica a proposta confirmada sobre os meses lidos do banco (chave do app).
* Devolve SÓ os meses que mudaram, já com o autor (o login que ligou o
* WhatsApp), como o app carimba ao gravar.
*/
function aplicarLancamento(a, meses, p) {
	let novos;
	if (a.destino === "fatura") {
		const valores = dividirParcelas(a.total, a.parcelas);
		novos = lancarNaFatura(meses, {
			cartao: comFechamentoDoMes({
				id: a.contaId,
				diaFechamento: a.diaFechamento
			}, meses, a.ano, a.mes),
			ano: a.ano,
			mes: a.mes,
			dia: a.dia,
			tipoDaCategoria: a.tipoCategoria,
			categoria: a.categoria,
			subCategoria: a.subCategoria,
			descricao: a.descricao,
			valorParcela: valores[valores.length - 1],
			valores,
			parcelas: a.parcelas,
			baseId: p.baseId
		});
	} else {
		const k = chaveDoMes(a.contaId, a.ano, a.mes);
		const dm = meses[k] ?? {
			lancamentos: {},
			saldoBanco: ""
		};
		novos = {
			...meses,
			[k]: lancarNoExtrato(dm, {
				dia: a.dia,
				tipo: a.tipoCategoria,
				categoria: a.categoria,
				subCategoria: a.subCategoria,
				descricao: a.descricao,
				valor: a.total,
				id: p.baseId,
				formaPagamento: a.formaPagamento === "credito" ? "debito" : a.formaPagamento
			})
		};
	}
	const out = {};
	for (const k of Object.keys(novos)) if (novos[k] !== meses[k]) out[k] = carimbarAutor(meses[k], novos[k], p.autor);
	return out;
}
const textoLancado = (a) => `${a.tipoCategoria === "entrada" ? "Recebimento lançado" : "Lançado"}: ${brl(a.total)} em ${a.subCategoria ? `${a.categoria} · ${a.subCategoria}` : a.categoria}. Já aparece no app.`;
// supabase/functions/whatsapp/fonte.ts
const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), {
	status,
	headers: { "Content-Type": "application/json" }
});
Deno.serve(async (req) => {
	const segredo = Deno.env.get("WHATSAPP_SECRET");
	if (!segredo || req.headers.get("x-whatsapp-secret") !== segredo) return new Response("Não autorizado", { status: 401 });
	let bruto;
	try {
		bruto = await req.json();
	} catch {
		return json({ erro: "corpo inválido" }, 400);
	}
	const { telefone, messageId, texto, midia, ignorar } = lerEntrada(bruto);
	if (ignorar || !telefone) return json({
		telefone,
		resposta: null
	});
	const responder = (resposta) => json({
		telefone,
		resposta
	});
	const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
	if (messageId) {
		const { error } = await db.from("whatsapp_processadas").insert({ message_id: messageId });
		if (error?.code === "23505") return responder(null);
		if (Math.random() < .02) await db.from("whatsapp_processadas").delete().lt("criado_em", (/* @__PURE__ */ new Date(Date.now() - 6048e5)).toISOString());
	}
	if (!texto.trim()) return responder(midia ? TEXTO_SO_TEXTO : null);
	const cmd = classificar(texto);
	if (cmd.tipo === "codigo") {
		const { data: v } = await db.from("whatsapp_vinculos").select("user_id, codigo_expira").eq("codigo", cmd.codigo).maybeSingle();
		if (!v || !v.codigo_expira || new Date(v.codigo_expira) < /* @__PURE__ */ new Date()) return responder(TEXTO_CODIGO_INVALIDO);
		await db.from("whatsapp_vinculos").update({
			telefone: null,
			avisos: false
		}).eq("telefone", telefone).neq("user_id", v.user_id);
		await db.from("whatsapp_pendentes").delete().eq("telefone", telefone);
		const { error } = await db.from("whatsapp_vinculos").update({
			telefone,
			codigo: null,
			codigo_expira: null,
			vinculado_em: (/* @__PURE__ */ new Date()).toISOString(),
			atualizado_em: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("user_id", v.user_id);
		if (error) {
			console.error("vincular:", error.message);
			return responder("Não consegui ligar agora. Tente de novo em instantes.");
		}
		const { data: pref } = await db.from("user_preferences").select("perfil_apelido, perfil_nome").eq("user_id", v.user_id).maybeSingle();
		const nome = (pref?.perfil_apelido || (pref?.perfil_nome ?? "").split(" ")[0] || "").trim();
		return responder(textoLigado(nome || void 0));
	}
	const { data: vinculo } = await db.from("whatsapp_vinculos").select("user_id").eq("telefone", telefone).maybeSingle();
	if (!vinculo) return responder(TEXTO_SEM_VINCULO);
	const login = vinculo.user_id;
	if (cmd.tipo === "sair") {
		await db.from("whatsapp_pendentes").delete().eq("telefone", telefone);
		await db.from("whatsapp_vinculos").delete().eq("user_id", login);
		return responder(TEXTO_DESLIGADO);
	}
	if (cmd.tipo === "ajuda") return responder(TEXTO_AJUDA);
	if (cmd.tipo === "nao") {
		await db.from("whatsapp_pendentes").delete().eq("telefone", telefone);
		return responder(TEXTO_CANCELADO);
	}
	const { data: comp } = await db.from("compartilhamentos").select("dono_id").eq("membro_id", login).eq("status", "aceito").maybeSingle();
	const dono = comp?.dono_id ?? login;
	if (cmd.tipo === "sim") {
		const { data: pend } = await db.from("whatsapp_pendentes").select("acao, criado_em, user_id").eq("telefone", telefone).maybeSingle();
		await db.from("whatsapp_pendentes").delete().eq("telefone", telefone);
		if (!pend || pend.user_id !== login || Date.now() - new Date(pend.criado_em).getTime() > 9e5) return responder(TEXTO_NADA_PENDENTE);
		const acao = pend.acao;
		const tabela = acao.destino === "fatura" ? "fatura_data" : "extrato_data";
		const refs = mesesDaAcao(acao);
		const { data: linhas, error: errLer } = await db.from(tabela).select("conta_id, ano, mes, dados").eq("user_id", dono).eq("conta_id", acao.contaId).or(refs.map((r) => `and(ano.eq.${r.ano},mes.eq.${r.mes + 1})`).join(","));
		if (errLer) {
			console.error("ler meses:", errLer.message);
			return responder("Não consegui lançar agora. Tente de novo em instantes.");
		}
		const meses = {};
		for (const l of linhas ?? []) meses[chaveDoMes(l.conta_id, l.ano, l.mes - 1)] = l.dados;
		const novos = aplicarLancamento(acao, meses, {
			baseId: `w-${Date.now()}`,
			autor: login
		});
		const porChave = new Map(refs.map((r) => [chaveDoMes(r.contaId, r.ano, r.mes), r]));
		const rows = Object.entries(novos).map(([k, dados]) => {
			const r = porChave.get(k);
			return {
				user_id: dono,
				conta_id: r.contaId,
				ano: r.ano,
				mes: r.mes + 1,
				dados
			};
		});
		const { error } = await db.from(tabela).upsert(rows, { onConflict: "user_id,conta_id,ano,mes" });
		if (error) {
			console.error("gravar:", error.message);
			return responder("Não consegui lançar agora. Tente de novo em instantes.");
		}
		return responder(textoLancado(acao));
	}
	const [{ data: contasDb }, { data: catsDb }] = await Promise.all([db.from("contas").select("id, nome, banco, tipo, apelido, preferida, dia_fechamento, saldo_inicial_desde, ativo").eq("user_id", dono), db.from("categorias").select("id, nome, tipo, ativa, tipo_movimento, forma_pagamento, conta_debito_id, descricao, pin_quick").eq("user_id", dono)]);
	const leitura = lerLancamento(texto, {
		contas: (contasDb ?? []).filter((c) => c.ativo !== false).map((c) => ({
			id: c.id,
			nome: c.nome,
			banco: c.banco ?? "",
			tipo: c.tipo,
			apelido: c.apelido ?? void 0,
			preferida: !!c.preferida,
			diaFechamento: c.dia_fechamento ?? void 0,
			saldoInicialDesde: c.saldo_inicial_desde ?? void 0
		})),
		categorias: (catsDb ?? []).map((c) => ({
			id: c.id,
			nome: c.nome,
			tipo: c.tipo,
			ativa: !!c.ativa,
			tipoMovimento: c.tipo_movimento,
			formaPagamento: c.forma_pagamento ?? void 0,
			contaDebitoId: c.conta_debito_id ?? void 0,
			descricao: c.descricao ?? void 0,
			pinQuick: !!c.pin_quick
		})),
		hoje: hojeEmSaoPaulo()
	});
	if (!leitura.ok) return responder(leitura.resposta);
	await db.from("whatsapp_pendentes").upsert({
		telefone,
		user_id: login,
		acao: leitura.acao,
		criado_em: (/* @__PURE__ */ new Date()).toISOString()
	});
	return responder(leitura.resposta);
});
