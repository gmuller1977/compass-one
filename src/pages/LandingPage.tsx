import { useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogoCompass, NomeCompass } from '../components/LogoCompass'
import { tirarApresentacaoEstatica } from '../utils/apresentacaoEstatica'
import { PERGUNTAS_FREQUENTES } from '../utils/perguntasFrequentes'

/**
 * A página de apresentação (27/10/2026, pedido do Guilherme: "revisar para
 * as funcionalidades e ficar adequada para o Google"). Ela é desenhada SÓ com
 * CSS (media queries), sem medir a tela em JavaScript, porque o build a
 * pré-renderiza em HTML (scripts/prerender.mjs): o Google e quem abre sem
 * JavaScript leem o mesmo texto, no celular e no computador. As telas de
 * exemplo são desenhos em HTML com números fictícios, nunca dado de alguém.
 * Fora da paleta do app (decidido em 30/08/2026), mas no azul neon da marca.
 */

const CSS = `
.lp { font-family: -apple-system, 'Inter', 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; overflow-x: hidden; }
.lp * { box-sizing: border-box; }
.lp a { color: inherit; }
.lp-sec { padding: 72px 16px; }
.lp-in { max-width: 1100px; margin: 0 auto; }
.lp-h2 { font-size: 28px; font-weight: 800; letter-spacing: -.6px; margin: 0 0 10px; line-height: 1.2; }
.lp-sub { font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 40px; max-width: 640px; }
.lp-centro { text-align: center; }
.lp-centro .lp-sub { margin-left: auto; margin-right: auto; }
.lp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 14px; padding: 15px 30px; font-size: 16px; font-weight: 700; text-decoration: none; transition: transform .2s, box-shadow .2s; }
.lp-btn:hover { transform: translateY(-2px); }
.lp-btn-branco { background: #fff; color: #0b1460 !important; box-shadow: 0 8px 28px rgba(0,0,0,.25), 0 0 18px rgba(34,211,238,.35); }
.lp-btn-vazado { color: #fff !important; border: 1.5px solid rgba(255,255,255,.45); font-weight: 600; }
.lp-btn-azul { background: var(--cx-azul); color: #fff !important; box-shadow: var(--cx-brilho); }

/* topo */
.lp-topo { background: var(--cx-azul); box-shadow: var(--cx-brilho-topo); color: #fff; padding: 0 16px 56px; position: relative; }
.lp-nav { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 18px 0; gap: 12px; }
.lp-marca { display: flex; align-items: center; gap: 10px; font-size: 20px; text-decoration: none; }
.lp-entrar { color: #fff !important; text-decoration: none; font-weight: 600; font-size: 15px; border: 1.5px solid rgba(255,255,255,.4); border-radius: 12px; padding: 9px 18px; }
.lp-hero { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; padding-top: 24px; }
.lp-hero h1 { font-size: 36px; line-height: 1.1; letter-spacing: -1.4px; font-weight: 800; margin: 0 0 18px; }
.lp-hero h1 em { font-style: normal; color: #a5f3fc; text-shadow: 0 0 18px rgba(34,211,238,.55); }
.lp-hero-txt p { font-size: 17px; line-height: 1.6; color: rgba(255,255,255,.88); margin: 0 0 30px; max-width: 520px; }
.lp-ctas { display: flex; flex-direction: column; gap: 12px; margin-bottom: 26px; }
.lp-selos { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 14px; color: rgba(255,255,255,.88); padding: 0; margin: 0; list-style: none; }
.lp-selos li { display: flex; align-items: center; gap: 6px; }
.lp-selos i { color: #67e8f9; font-size: 18px; }

/* celular desenhado */
.lp-cel { width: 300px; max-width: 100%; margin: 0 auto; border-radius: 38px; padding: 10px; background: #0b1533; box-shadow: 0 30px 80px rgba(3,10,40,.55), 0 0 0 1px rgba(34,211,238,.35), 0 0 40px rgba(34,211,238,.25); }
.lp-tela { border-radius: 30px; overflow: hidden; background: #f2f5fc; color: #0f172a; text-align: left; }
.lp-tela-topo { background: var(--cx-azul); color: #fff; padding: 22px 18px 18px; }
.lp-ola { font-size: 18px; font-weight: 800; }
.lp-status { font-size: 12px; color: rgba(255,255,255,.85); display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.lp-ponto { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; }
.lp-rot { font-size: 11px; color: rgba(255,255,255,.8); margin-top: 16px; }
.lp-saldo { font-size: 30px; font-weight: 800; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.lp-caixa { margin-top: 12px; border-radius: 14px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.16); padding: 10px 12px; }
.lp-caixa-l { display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; color: rgba(255,255,255,.85); }
.lp-caixa-l b { font-size: 16px; color: #fff; font-variant-numeric: tabular-nums; }
.lp-cen { display: flex; gap: 5px; margin-top: 8px; }
.lp-cen span { flex: 1; text-align: center; font-size: 10px; font-weight: 700; padding: 5px 0; border-radius: 99px; background: rgba(255,255,255,.14); }
.lp-cen span:first-child { background: #fff; color: #0b1460; }
.lp-card { background: #fff; border-radius: 18px; margin: 10px; padding: 14px; box-shadow: 0 4px 16px rgba(30,58,138,.08); }
.lp-card-t { font-size: 14px; font-weight: 800; margin-bottom: 8px; }
.lp-lin { display: flex; align-items: center; gap: 10px; font-size: 12px; padding: 6px 0; }
.lp-lin + .lp-lin { border-top: 1px solid #eef2f8; }
.lp-ic { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.lp-lin small { color: #64748b; display: block; font-size: 11px; }
.lp-lin .v { margin-left: auto; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lp-pil { display: flex; gap: 6px; margin-top: 8px; }
.lp-pil span { font-size: 11px; font-weight: 700; border-radius: 99px; padding: 6px 12px; }
.lp-bola { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #94a3b8; flex-shrink: 0; }
.lp-bola.ok { background: #15803d; border-color: #15803d; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }

/* como começa */
.lp-passos { display: grid; grid-template-columns: 1fr; gap: 16px; counter-reset: passo; padding: 0; margin: 0; list-style: none; }
.lp-passo { border: 1.5px solid #dbe4f3; border-radius: 18px; padding: 22px; background: #fff; }
.lp-passo-n { width: 36px; height: 36px; border-radius: 50%; background: var(--cx-azul); box-shadow: var(--cx-bolinha); color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.lp-passo h3 { font-size: 17px; margin: 0 0 6px; }
.lp-passo p { font-size: 15px; color: #475569; line-height: 1.6; margin: 0; }

/* funcionalidades */
.lp-func { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: center; padding: 40px 0; }
.lp-func + .lp-func { border-top: 1px solid #e6ecf5; }
.lp-func-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; color: #1d4ed8; margin-bottom: 10px; }
.lp-func h3 { font-size: 24px; letter-spacing: -.4px; margin: 0 0 12px; line-height: 1.25; }
.lp-func p { font-size: 16px; color: #475569; line-height: 1.65; margin: 0 0 14px; }
.lp-lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.lp-lista li { display: flex; gap: 10px; font-size: 15px; color: #334155; line-height: 1.5; }
.lp-lista i { color: #15803d; font-size: 20px; flex-shrink: 0; }
.lp-quadro { background: var(--cx-azul); box-shadow: var(--cx-brilho); border-radius: 24px; padding: 18px; color: #fff; }
.lp-quadro-t { font-size: 12px; color: rgba(255,255,255,.8); margin-bottom: 10px; }
.lp-grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.lp-cat { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.16); border-radius: 14px; padding: 12px 6px; text-align: center; font-size: 12px; }
.lp-cat i { display: block; font-size: 22px; margin-bottom: 4px; color: #a5f3fc; }
.lp-forma { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.lp-forma div { background: #fff; color: #0f172a; border-radius: 14px; padding: 10px 12px; font-size: 12px; }
.lp-forma b { display: block; font-size: 14px; }
.lp-grupos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.lp-grupo { background: #fff; color: #0f172a; border-radius: 16px; padding: 12px; border: 2px solid #93c5fd; }
.lp-grupo.passou { border-color: #b91c1c; }
.lp-grupo-n { font-size: 12px; font-weight: 700; color: #334155; }
.lp-grupo-v { font-size: 18px; font-weight: 800; color: #1d4ed8; margin: 4px 0 6px; font-variant-numeric: tabular-nums; }
.lp-grupo.passou .lp-grupo-v { color: #b91c1c; }
.lp-trilho { height: 8px; border-radius: 99px; background: #e2e8f0; overflow: hidden; }
.lp-trilho span { display: block; height: 100%; border-radius: 99px; background: var(--cx-barra); }
.lp-grupo.passou .lp-trilho span { background: #b91c1c; }
.lp-grupo small { font-size: 11px; color: #64748b; display: block; margin-top: 5px; }
.lp-colunas { display: flex; align-items: flex-end; gap: 6px; height: 130px; padding: 0 2px; }
.lp-colunas div { flex: 1; border-radius: 6px 6px 2px 2px; background: rgba(255,255,255,.85); position: relative; }
.lp-colunas div.atual { background: #67e8f9; box-shadow: 0 0 12px rgba(34,211,238,.6); }
.lp-meses { display: flex; gap: 6px; font-size: 10px; color: rgba(255,255,255,.75); margin-top: 6px; }
.lp-meses span { flex: 1; text-align: center; }
.lp-tabela { width: 100%; border-collapse: collapse; background: #fff; color: #0f172a; border-radius: 14px; overflow: hidden; font-size: 13px; }
.lp-tabela th, .lp-tabela td { padding: 10px 10px; text-align: left; border-bottom: 1px solid #eef2f8; }
.lp-tabela th { font-size: 11px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
.lp-tabela td.n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.lp-cabe { color: #15803d; font-weight: 800; }
.lp-nao { color: #b91c1c; font-weight: 800; }
.lp-melhor { font-size: 10px; font-weight: 800; background: #dcfce7; color: #14532d; border-radius: 99px; padding: 2px 8px; margin-left: 6px; }

/* extras */
.lp-extras { display: grid; grid-template-columns: 1fr; gap: 14px; }
.lp-extra { border-radius: 18px; padding: 20px; background: #fff; border: 1.5px solid #dbe4f3; display: flex; gap: 14px; }
.lp-extra-ic { width: 44px; height: 44px; border-radius: 50%; background: var(--cx-azul); box-shadow: var(--cx-bolinha); color: #fff; font-size: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lp-extra h3 { font-size: 16px; margin: 0 0 4px; }
.lp-extra p { font-size: 14px; color: #475569; line-height: 1.55; margin: 0; }

/* planos */
.lp-planos { display: grid; grid-template-columns: 1fr; gap: 14px; }
.lp-plano { border-radius: 20px; border: 1.5px solid #dbe4f3; background: #fff; padding: 22px; display: flex; flex-direction: column; }
.lp-plano.ativo { border: 2px solid #15803d; box-shadow: 0 10px 32px rgba(21,128,61,.14); }
.lp-plano-selo { align-self: flex-start; font-size: 10px; font-weight: 800; letter-spacing: .5px; border-radius: 99px; padding: 3px 10px; margin-bottom: 10px; background: #fef9c3; color: #713f12; }
.lp-plano.ativo .lp-plano-selo { background: #dcfce7; color: #14532d; }
.lp-plano h3 { margin: 0 0 4px; font-size: 18px; }
.lp-plano > p { margin: 0 0 14px; font-size: 14px; color: #475569; line-height: 1.5; }
.lp-plano ul { list-style: none; padding: 0; margin: 0 0 18px; display: grid; gap: 8px; flex: 1; align-content: start; }
.lp-plano li { font-size: 14px; color: #334155; display: flex; gap: 8px; line-height: 1.45; }
.lp-plano li i { color: #15803d; font-size: 17px; flex-shrink: 0; }

/* perguntas */
.lp-faq { max-width: 760px; margin: 0 auto; display: grid; gap: 10px; }
.lp-faq details { border: 1.5px solid #dbe4f3; border-radius: 16px; background: #fff; padding: 0 18px; }
.lp-faq summary { cursor: pointer; list-style: none; padding: 16px 0; font-weight: 700; font-size: 16px; display: flex; justify-content: space-between; gap: 12px; }
.lp-faq summary::-webkit-details-marker { display: none; }
.lp-faq summary::after { content: '+'; color: #1d4ed8; font-size: 22px; line-height: 1; }
.lp-faq details[open] summary::after { content: '−'; }
.lp-faq details p { margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 1.65; }

.lp-fim { background: var(--cx-azul); color: #fff; text-align: center; box-shadow: var(--cx-brilho-topo); }
.lp-fim .lp-sub { color: rgba(255,255,255,.88); }
.lp-rodape { padding: 28px 16px; text-align: center; font-size: 13px; color: #475569; background: #f8faff; border-top: 1px solid #e2e8f0; }
.lp-rodape nav { display: flex; justify-content: center; gap: 18px; margin-top: 8px; flex-wrap: wrap; }

@media (min-width: 640px) {
  .lp-ctas { flex-direction: row; }
  .lp-passos, .lp-extras { grid-template-columns: repeat(2, 1fr); }
  .lp-planos { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 900px) {
  .lp-sec { padding: 96px 24px; }
  .lp-topo { padding: 0 24px 80px; }
  .lp-hero { grid-template-columns: 1.15fr .85fr; gap: 56px; padding-top: 40px; }
  .lp-hero h1 { font-size: 52px; }
  .lp-h2 { font-size: 36px; }
  .lp-passos { grid-template-columns: repeat(3, 1fr); }
  .lp-func { grid-template-columns: 1fr 1fr; gap: 56px; padding: 56px 0; }
  .lp-func.inv > :first-child { order: 2; }
  .lp-func h3 { font-size: 28px; }
  .lp-extras { grid-template-columns: repeat(3, 1fr); }
  .lp-planos { grid-template-columns: repeat(3, 1fr); }
}
`

function CelularInicio() {
  return (
    <div className="lp-cel" role="img" aria-label="Exemplo da tela Início do Compass One no celular, com números fictícios">
      <div className="lp-tela">
        <div className="lp-tela-topo">
          <div className="lp-ola">Olá, Ana</div>
          <div className="lp-status"><span className="lp-ponto" />Você está dentro do plano</div>
          <div className="lp-rot">Saldo atual · bancos e dinheiro</div>
          <div className="lp-saldo">R$ 4.820,35</div>
          <div className="lp-caixa">
            <div className="lp-caixa-l">Saldo final previsto <b>R$ 3.912,10</b></div>
            <div className="lp-cen"><span>Pessimista</span><span>Moderado</span><span>Otimista</span></div>
          </div>
        </div>
        <div className="lp-card">
          <div className="lp-card-t">Confira seus saldos</div>
          <div className="lp-lin">
            <span className="lp-ic" style={{ background: '#dcfce7', color: '#15803d' }}><i className="ti ti-building-bank" /></span>
            <span>Banco do salário<small>No app: R$ 4.120,35</small></span>
          </div>
          <div className="lp-pil">
            <span style={{ background: '#1d4ed8', color: '#fff' }}>Confere</span>
            <span style={{ border: '1.5px solid #1d4ed8', color: '#1d4ed8' }}>Está diferente</span>
          </div>
        </div>
        <div className="lp-card">
          <div className="lp-card-t">Débito automático</div>
          <div className="lp-lin">
            <span className="lp-bola ok"><i className="ti ti-check" /></span>
            <span>Salário<small>dia 05</small></span>
            <span className="v" style={{ color: '#15803d' }}>+ R$ 5.200,00</span>
          </div>
          <div className="lp-lin">
            <span className="lp-bola" />
            <span>Aluguel<small>dia 10</small></span>
            <span className="v" style={{ color: '#c2410c' }}>− R$ 1.650,00</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuadroLancar() {
  const cats = [
    ['ti-shopping-cart', 'Mercado'], ['ti-gas-station', 'Combustível'], ['ti-tools-kitchen-2', 'Restaurante'],
    ['ti-pill', 'Farmácia'], ['ti-home', 'Casa'], ['ti-shirt', 'Vestuário'],
  ]
  return (
    <div className="lp-quadro" role="img" aria-label="Exemplo do Lançar: escolha a categoria e depois débito ou crédito">
      <div className="lp-quadro-t">Lançar · toque na categoria</div>
      <div className="lp-grade">
        {cats.map(([ic, nome]) => <div key={nome} className="lp-cat"><i className={`ti ${ic}`} />{nome}</div>)}
      </div>
      <div className="lp-forma">
        <div><b>Débito</b>Banco ou dinheiro · resta R$ 412,00</div>
        <div><b>Crédito</b>À vista ou até 24× · fatura de novembro</div>
      </div>
    </div>
  )
}

function QuadroRadar() {
  return (
    <div className="lp-quadro" role="img" aria-label="Exemplo do Radar: quanto resta em cada grupo de gastos">
      <div className="lp-quadro-t">Radar · outubro até agora</div>
      <div className="lp-grupos">
        <div className="lp-grupo"><div className="lp-grupo-n">Alimentação</div><div className="lp-grupo-v">resta R$ 380</div><div className="lp-trilho"><span style={{ width: '62%' }} /></div><small>gastou R$ 620 de R$ 1.000</small></div>
        <div className="lp-grupo"><div className="lp-grupo-n">Transporte</div><div className="lp-grupo-v">resta R$ 145</div><div className="lp-trilho"><span style={{ width: '71%' }} /></div><small>gastou R$ 355 de R$ 500</small></div>
        <div className="lp-grupo passou"><div className="lp-grupo-n">Lazer</div><div className="lp-grupo-v">passou R$ 90</div><div className="lp-trilho"><span style={{ width: '100%' }} /></div><small>gastou R$ 390 de R$ 300</small></div>
        <div className="lp-grupo"><div className="lp-grupo-n">Moradia</div><div className="lp-grupo-v">✓ pago</div><div className="lp-trilho"><span style={{ width: '100%' }} /></div><small>R$ 2.100 de R$ 2.100</small></div>
      </div>
    </div>
  )
}

function QuadroPlano() {
  const alturas = [52, 58, 55, 63, 60, 68, 66, 72, 70, 78, 84, 96]
  const meses = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  return (
    <div className="lp-quadro" role="img" aria-label="Exemplo do Planejamento: com quanto cada mês do ano termina">
      <div className="lp-quadro-t">Se o plano se cumprir, o ano termina com</div>
      <div className="lp-saldo" style={{ marginBottom: 14 }}>R$ 18.450,00</div>
      <div className="lp-colunas">
        {alturas.map((h, i) => <div key={i} className={i === 9 ? 'atual' : undefined} style={{ height: `${h}%` }} />)}
      </div>
      <div className="lp-meses">{meses.map((m, i) => <span key={i}>{m}</span>)}</div>
    </div>
  )
}

function QuadroSimulador() {
  return (
    <div className="lp-quadro" role="img" aria-label="Exemplo do Simulador: comparação entre pagar à vista e parcelado">
      <div className="lp-quadro-t">Posso comprar? · geladeira de R$ 3.600</div>
      <table className="lp-tabela">
        <thead><tr><th>Forma</th><th>Total</th><th>Cabe?</th></tr></thead>
        <tbody>
          <tr><td>À vista</td><td className="n">R$ 3.600</td><td className="lp-nao">aperta</td></tr>
          <tr><td>10× de R$ 360<span className="lp-melhor">melhor</span></td><td className="n">R$ 3.600</td><td className="lp-cabe">cabe</td></tr>
          <tr><td>12× de R$ 329</td><td className="n">R$ 3.948</td><td className="lp-cabe">cabe</td></tr>
        </tbody>
      </table>
    </div>
  )
}

const FUNCIONALIDADES = [
  {
    tag: 'Início', icone: 'ti-home',
    titulo: 'Tudo o que pede sua atenção, logo na primeira tela',
    texto: 'Ao abrir o app você vê quanto tem hoje nos bancos e no dinheiro e com quanto deve terminar o mês. O resto vem em ordem: o que conferir e o que pagar.',
    itens: [
      'Confira seus saldos: compare com o app do banco em um toque',
      'Salário e débito automático se marcam sozinhos no dia, e você só confere',
      'Contas da semana (PIX, boleto ou dinheiro) com o botão Pagar',
      'Resumo do mês: previsto e realizado lado a lado, com a sua meta de economia',
    ],
    quadro: <QuadroResumoInicio />,
  },
  {
    tag: 'Lançar', icone: 'ti-plus',
    titulo: 'Anote um gasto em segundos',
    texto: 'Toque na categoria, escolha débito ou crédito e digite o valor. O app já mostra quanto ainda resta para aquela categoria no mês.',
    itens: [
      'Compra parcelada no cartão, à vista ou em até 24×',
      'O app sabe em qual fatura a compra cai, pelo dia de fechamento',
      'Banco, cartão e dinheiro no mesmo lugar, com transferência entre contas',
    ],
    quadro: <QuadroLancar />,
  },
  {
    tag: 'Radar financeiro', icone: 'ti-radar-2',
    titulo: 'O mês em tempo real, grupo por grupo',
    texto: 'O Radar mostra o que já aconteceu no mês, contra o que você planejou: quanto ainda resta em cada grupo e onde o gasto passou do plano.',
    itens: [
      'Receitas e despesas do mês, com o saldo de hoje',
      'Cada grupo diz "resta", "passou" ou "pago", sem precisar fazer conta',
      'Ajuste o plano dos próximos meses direto da categoria',
    ],
    quadro: <QuadroRadar />,
  },
  {
    tag: 'Planejamento', icone: 'ti-calendar-stats',
    titulo: 'Um plano para o ano inteiro, no seu ritmo',
    texto: 'Defina quanto quer gastar em cada categoria e quanto quer guardar por mês. O app mostra com quanto cada mês termina se o plano se cumprir.',
    itens: [
      'Meta de economia mês a mês, com o rumo do ano',
      'Contas que se repetem todo mês ou em parcelas (IPVA, seguro, matrícula)',
      'Copiar o ano com atualização de valores e revisão anual, mês contra mês',
    ],
    quadro: <QuadroPlano />,
  },
  {
    tag: 'Simulador', icone: 'ti-shopping-cart',
    titulo: 'Posso comprar? Veja antes de decidir',
    texto: 'Digite o valor e as opções que a loja ofereceu. O simulador compara as formas de pagamento e mostra a mais barata entre as que cabem no seu fluxo até o fim do plano.',
    itens: [
      'Juro embutido calculado a partir da parcela, sem precisar saber a taxa',
      'Mostra se a sua meta de economia continua de pé com a compra',
      'Quitar uma dívida à vista: o melhor mês e quanto você economiza',
    ],
    quadro: <QuadroSimulador />,
  },
]

const EXTRAS = [
  { icone: 'ti-users', titulo: 'Conta compartilhada', texto: 'Convide quem divide as contas com você. Cada pessoa entra com o próprio login e vê as mesmas finanças.' },
  { icone: 'ti-fingerprint', titulo: 'Entrar com a digital', texto: 'No celular, a digital ou o rosto abrem o app. Sem uso por 30 minutos, a tela trava sozinha.' },
  { icone: 'ti-device-mobile', titulo: 'Celular e computador', texto: 'As mesmas informações nos dois. No celular, instale na tela inicial como um aplicativo.' },
  { icone: 'ti-chart-arrows-vertical', titulo: 'Três cenários de previsão', texto: 'Pessimista, moderado ou otimista: você escolhe como o saldo do fim do mês é calculado.' },
  { icone: 'ti-credit-card', titulo: 'Cartões e faturas', texto: 'Fechamento, vencimento e parcelas de cada cartão, com a fatura conferida contra a do banco.' },
  { icone: 'ti-lock', titulo: 'Sem senha do banco', texto: 'O Compass One não se conecta ao seu banco e nunca pede a senha dele. Seus dados ficam só na sua conta.' },
]

export default function LandingPage() {
  const ano = new Date().getFullYear()
  // A versão pré-renderizada sai de cena no mesmo quadro em que esta entra.
  useLayoutEffect(() => { tirarApresentacaoEstatica() }, [])

  return (
    <div className="lp">
      <style>{CSS}</style>

      <header className="lp-topo">
        <nav className="lp-nav" aria-label="Principal">
          <Link to="/" className="lp-marca" aria-label="Compass One, página inicial">
            <LogoCompass size={36} /><NomeCompass />
          </Link>
          <Link to="/login" className="lp-entrar">Entrar</Link>
        </nav>
        <div className="lp-hero">
          <div className="lp-hero-txt">
            <h1>Saiba hoje com quanto você <em>termina o mês</em>.</h1>
            <p>
              O Compass One é um app de finanças pessoais que junta bancos, cartões e dinheiro
              num lugar só, mostra o saldo previsto do fim do mês e ajuda a montar um plano para
              guardar mais. Você decide; o Compass mostra o caminho.
            </p>
            <div className="lp-ctas">
              <Link to="/cadastro" className="lp-btn lp-btn-branco">Começar grátis <i className="ti ti-arrow-right" /></Link>
              <Link to="/login" className="lp-btn lp-btn-vazado">Já tenho conta</Link>
            </div>
            <ul className="lp-selos">
              <li><i className="ti ti-gift" />Grátis</li>
              <li><i className="ti ti-ad-off" />Sem anúncios</li>
              <li><i className="ti ti-lock" />Não pede a senha do banco</li>
            </ul>
          </div>
          <CelularInicio />
        </div>
      </header>

      <main>
        <section className="lp-sec" style={{ background: '#f8faff' }} aria-labelledby="como-comeca">
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="como-comeca">Em poucos minutos você já tem um plano</h2>
              <p className="lp-sub">Sem planilha e sem precisar entender de finanças. Tudo pode ser aproximado e ajustado depois.</p>
            </div>
            <ol className="lp-passos">
              <li className="lp-passo"><div className="lp-passo-n">1</div><h3>Conte um pouco sobre você</h3><p>Bancos e saldos, quanto recebe, cartões e as contas que paga todo mês. Uma pergunta por tela.</p></li>
              <li className="lp-passo"><div className="lp-passo-n">2</div><h3>Receba um plano inicial</h3><p>O app monta um plano de 12 meses com o que você contou e mostra quanto sobra por mês.</p></li>
              <li className="lp-passo"><div className="lp-passo-n">3</div><h3>Acompanhe no dia a dia</h3><p>Anote os gastos, confira os saldos e veja no Radar se o mês está dentro do plano.</p></li>
            </ol>
          </div>
        </section>

        <section className="lp-sec" aria-labelledby="funcionalidades">
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="funcionalidades">O que o Compass One faz por você</h2>
              <p className="lp-sub">Controle de gastos, orçamento e planejamento financeiro no mesmo app.</p>
            </div>
            {FUNCIONALIDADES.map((f, i) => (
              <article key={f.tag} className={`lp-func${i % 2 ? ' inv' : ''}`}>
                <div>
                  <div className="lp-func-tag"><i className={`ti ${f.icone}`} />{f.tag}</div>
                  <h3>{f.titulo}</h3>
                  <p>{f.texto}</p>
                  <ul className="lp-lista">
                    {f.itens.map(t => <li key={t}><i className="ti ti-circle-check" />{t}</li>)}
                  </ul>
                </div>
                <div>{f.quadro}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-sec" style={{ background: '#f8faff' }} aria-labelledby="mais">
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="mais">Feito para o dia a dia de uma família</h2>
              <p className="lp-sub">Para quem quer sair do vermelho, se organizar ou começar uma reserva.</p>
            </div>
            <div className="lp-extras">
              {EXTRAS.map(e => (
                <div key={e.titulo} className="lp-extra">
                  <span className="lp-extra-ic"><i className={`ti ${e.icone}`} /></span>
                  <div><h3>{e.titulo}</h3><p>{e.texto}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" aria-labelledby="planos">
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="planos">Comece grátis</h2>
              <p className="lp-sub">Todas as funcionalidades estão liberadas no plano Grátis. Os outros planos chegam em breve.</p>
            </div>
            <div className="lp-planos">
              <div className="lp-plano ativo">
                <span className="lp-plano-selo">DISPONÍVEL</span>
                <h3>Grátis</h3>
                <p>Acesso completo, sem limite de uso e sem cartão de crédito.</p>
                <ul>
                  {['Contas, cartões e categorias sem limite', 'Início, Lançar, Radar e Planejamento', 'Simulador de compras e de dívidas', 'Meta de economia', 'Conta compartilhada com a família'].map(t => <li key={t}><i className="ti ti-circle-check" />{t}</li>)}
                </ul>
                <Link to="/cadastro" className="lp-btn lp-btn-azul">Começar grátis</Link>
              </div>
              <div className="lp-plano">
                <span className="lp-plano-selo">EM BREVE</span>
                <h3>Família</h3>
                <p>Finanças em conjunto, com orçamento por pessoa.</p>
                <ul>{['Vários perfis', 'Metas da família', 'Relatórios e exportação'].map(t => <li key={t}><i className="ti ti-circle-check" />{t}</li>)}</ul>
              </div>
              <div className="lp-plano">
                <span className="lp-plano-selo">EM BREVE</span>
                <h3>Negócio</h3>
                <p>Para MEI, autônomos e pequenos negócios.</p>
                <ul>{['Separa pessoal e negócio', 'Fluxo de caixa', 'Relatórios para o contador'].map(t => <li key={t}><i className="ti ti-circle-check" />{t}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" style={{ background: '#f8faff' }} aria-labelledby="perguntas">
          <div className="lp-in">
            <div className="lp-centro"><h2 className="lp-h2" id="perguntas" style={{ marginBottom: 32 }}>Perguntas frequentes</h2></div>
            <div className="lp-faq">
              {PERGUNTAS_FREQUENTES.map(p => (
                <details key={p.pergunta}><summary>{p.pergunta}</summary><p>{p.resposta}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec lp-fim" aria-labelledby="comecar">
          <div className="lp-in lp-centro">
            <h2 className="lp-h2" id="comecar">Sua vida financeira com rumo</h2>
            <p className="lp-sub">Crie sua conta grátis e veja hoje com quanto o seu mês termina.</p>
            <Link to="/cadastro" className="lp-btn lp-btn-branco">Começar grátis <i className="ti ti-arrow-right" /></Link>
          </div>
        </section>
      </main>

      <footer className="lp-rodape">
        <div>© {ano} Compass One · Finanças pessoais para brasileiros que querem ter o controle da própria vida financeira.</div>
        <nav aria-label="Rodapé">
          <Link to="/termos">Termos de uso</Link>
          <Link to="/privacidade">Privacidade</Link>
          <a href="mailto:suporte@compassone.app">Suporte</a>
        </nav>
      </footer>
    </div>
  )
}

/** Na seção da Início o celular já está no topo; aqui vai o Resumo do mês. */
function QuadroResumoInicio() {
  const barras: [string, number, number, string, string][] = [
    ['Receitas', 100, 96, 'R$ 6.200', 'R$ 5.950'],
    ['Despesas', 78, 64, 'R$ 4.800', 'R$ 3.940'],
  ]
  return (
    <div className="lp-quadro" role="img" aria-label="Exemplo do Resumo do mês: previsto e realizado de receitas e despesas">
      <div className="lp-quadro-t">Resumo do mês · outubro começou com R$ 2.510,00</div>
      {barras.map(([nome, prev, real, vp, vr]) => (
        <div key={nome} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{nome}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 76px', gap: 8, alignItems: 'center', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'rgba(255,255,255,.8)' }}>Previsto</span>
            <span style={{ height: 10, borderRadius: 99, border: '1.5px solid #fff', width: `${prev}%` }} />
            <b style={{ textAlign: 'right' }}>{vp}</b>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 76px', gap: 8, alignItems: 'center', fontSize: 11 }}>
            <span style={{ color: 'rgba(255,255,255,.8)' }}>Realizado</span>
            <span style={{ height: 10, borderRadius: 99, background: 'var(--cx-trilho)', width: `${prev}%`, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${(real / prev) * 100}%`, background: 'var(--cx-barra)' }} />
            </span>
            <b style={{ textAlign: 'right' }}>{vr}</b>
          </div>
        </div>
      ))}
      <div className="lp-caixa" style={{ marginTop: 4 }}>
        <div className="lp-caixa-l">Meta de economia do mês <b>R$ 800,00</b></div>
        <div style={{ fontSize: 12, marginTop: 6 }}>Você já guardou R$ 610,00 da meta</div>
        <div className="lp-trilho" style={{ marginTop: 6, background: '#fff' }}><span style={{ width: '76%' }} /></div>
      </div>
    </div>
  )
}
