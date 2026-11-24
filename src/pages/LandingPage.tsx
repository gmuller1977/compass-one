import { useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogoCompass, NomeCompass } from '../components/LogoCompass'
import { tirarApresentacaoEstatica } from '../utils/apresentacaoEstatica'
import { PERGUNTAS_FREQUENTES } from '../utils/perguntasFrequentes'
import { hrefDoApp } from '../utils/site'
import { codigoRecebido } from '../utils/indicacaoLocal'

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
.lp { font-family: -apple-system, 'Inter', 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; overflow-x: hidden; overflow-x: clip; }
.lp * { box-sizing: border-box; }
.lp ::selection { background: #a5f3fc; color: #0b1460; }
.lp a:focus-visible, .lp summary:focus-visible { outline: 3px solid #22d3ee; outline-offset: 3px; border-radius: 10px; }
.lp h1, .lp h2, .lp h3 { text-wrap: balance; }
.lp p, .lp li { text-wrap: pretty; }
.lp a { color: inherit; }
.lp-sec { padding: 72px 16px; }
.lp-in { max-width: 1100px; margin: 0 auto; }
.lp-h2 { font-size: 28px; font-weight: 800; letter-spacing: -.6px; margin: 0 0 10px; line-height: 1.2; }
.lp-sub { font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 40px; max-width: 640px; }
.lp-centro { text-align: center; }
.lp-centro .lp-sub { margin-left: auto; margin-right: auto; }
.lp-btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 14px; padding: 15px 30px; font-size: 16px; font-weight: 700; text-decoration: none; transition: transform .2s, box-shadow .2s; }
.lp-btn:hover { transform: translateY(-2px); }
.lp-btn-branco { background: #fff; color: #0b1460 !important; box-shadow: 0 8px 28px rgba(0,0,0,.25), 0 0 18px rgba(34,211,238,.35); }
.lp-btn-vazado { color: #fff !important; border: 1.5px solid rgba(255,255,255,.45); font-weight: 600; }
.lp-btn-azul { background: var(--cx-azul); color: #fff !important; box-shadow: var(--cx-brilho); }

/* topo */
.lp-topo { background: var(--cx-azul); box-shadow: var(--cx-brilho-topo); color: #fff; padding: 0 16px 56px; position: relative; }
.lp-nav { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 18px 0; gap: 12px; }
.lp-marca { display: flex; align-items: center; gap: 10px; font-size: 20px; text-decoration: none; }
.lp-marca { min-height: 44px; }
.lp-entrar { color: #fff !important; text-decoration: none; font-weight: 600; font-size: 15px; border: 1.5px solid rgba(255,255,255,.4); border-radius: 12px; padding: 9px 18px; min-height: 44px; display: inline-flex; align-items: center; }
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
.lp-cen span { flex: 1; text-align: center; font-size: 11px; font-weight: 700; padding: 5px 0; border-radius: 99px; background: rgba(255,255,255,.14); }
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

/* simulador no celular do topo */
.lp-sim { padding: 18px; }
.lp-sim-campo { background: #fff; border-radius: 14px; padding: 10px 12px; font-size: 12px; color: #475569; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(30,58,138,.06); }
.lp-sim-campo b { display: block; font-size: 15px; color: #0f172a; }
.lp-veredito { border-radius: 16px; padding: 14px; background: var(--cx-azul); color: #fff; box-shadow: var(--cx-brilho); }
.lp-veredito-t { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 800; }
.lp-veredito-t i { color: #86efac; font-size: 22px; }
.lp-veredito p { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,.9); }
.lp-linha-saldo { margin-top: 10px; }

/* comparativo */
.lp-comp { display: grid; grid-template-columns: 1fr; gap: 16px; }
.lp-comp-col { border-radius: 22px; padding: 26px; }
.lp-comp-col h3 { margin: 0 0 16px; font-size: 20px; }
.lp-comp-col ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
.lp-comp-col li { display: flex; gap: 10px; font-size: 15px; line-height: 1.5; }
.lp-comp-col li i { font-size: 20px; flex-shrink: 0; }
.lp-comp-outros { background: #f1f5f9; color: #334155; }
.lp-comp-outros i { color: #64748b; }
.lp-comp-nos { background: var(--cx-azul); color: #fff; box-shadow: var(--cx-brilho); }
.lp-comp-nos i { color: #86efac; }
.lp-comp-rot { font-size: 12px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; margin-bottom: 6px; opacity: .8; }

/* como começar */
.lp-passo-n { width: 36px; height: 36px; border-radius: 50%; background: var(--cx-azul); box-shadow: var(--cx-bolinha); color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }

/* quadros de exemplo */
.lp-quadro { background: var(--cx-azul); box-shadow: var(--cx-brilho); border-radius: 24px; padding: 18px; color: #fff; }
.lp-quadro-t { font-size: 12px; color: rgba(255,255,255,.8); margin-bottom: 10px; }
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
.lp-meses { display: flex; gap: 6px; font-size: 11px; color: rgba(255,255,255,.8); margin-top: 6px; }
.lp-meses span { flex: 1; text-align: center; }
.lp-tabela { width: 100%; border-collapse: collapse; background: #fff; color: #0f172a; border-radius: 14px; overflow: hidden; font-size: 13px; }
.lp-tabela th, .lp-tabela td { padding: 10px 10px; text-align: left; border-bottom: 1px solid #eef2f8; }
.lp-tabela th { font-size: 11px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
.lp-tabela td.n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.lp-cabe { color: #15803d; font-weight: 800; }
.lp-nao { color: #b91c1c; font-weight: 800; }
.lp-melhor { font-size: 11px; font-weight: 800; background: #dcfce7; color: #14532d; border-radius: 99px; padding: 2px 8px; margin-left: 6px; }

/* bagagem */
.lp-extra-ic { width: 44px; height: 44px; border-radius: 50%; background: var(--cx-azul); box-shadow: var(--cx-bolinha); color: #fff; font-size: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* planos */
.lp-planos { display: grid; grid-template-columns: 1fr; gap: 14px; }
.lp-plano { border-radius: 20px; border: 1.5px solid #dbe4f3; background: #fff; padding: 22px; display: flex; flex-direction: column; }
.lp-plano.ativo { border: 2px solid #15803d; box-shadow: 0 10px 32px rgba(21,128,61,.14); }
.lp-plano-selo { align-self: flex-start; font-size: 11px; font-weight: 800; letter-spacing: .5px; border-radius: 99px; padding: 3px 10px; margin-bottom: 10px; background: #fef9c3; color: #713f12; }
.lp-plano.ativo .lp-plano-selo { background: #dcfce7; color: #14532d; }
.lp-plano h3 { margin: 0 0 4px; font-size: 18px; }
.lp-plano > p { margin: 0 0 14px; font-size: 14px; color: #475569; line-height: 1.5; }
.lp-plano ul { list-style: none; padding: 0; margin: 0 0 18px; display: grid; gap: 8px; flex: 1; align-content: start; }
.lp-plano li { font-size: 14px; color: #334155; display: flex; gap: 8px; line-height: 1.45; }
.lp-plano li i { color: #15803d; font-size: 17px; flex-shrink: 0; }
.lp-pacotes { border-radius: 20px; background: #fff; border: 1.5px solid #dbe4f3; padding: 22px; }
.lp-pacotes h3 { margin: 0 0 4px; font-size: 18px; }
.lp-pacotes > p { margin: 0 0 16px; font-size: 14px; color: #475569; line-height: 1.5; }
.lp-pacotes ol { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.lp-pacotes li { display: grid; grid-template-columns: 36px 1fr; gap: 12px; align-items: start; padding: 12px; border-radius: 14px; background: #f8faff; }
.lp-pacotes li i { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: #eff6ff; color: #1d4ed8; font-size: 19px; }
.lp-pacotes li b { display: block; font-size: 15px; color: #0f172a; }
.lp-pacotes li span { font-size: 14px; color: #475569; line-height: 1.5; }
.lp-pacotes small { display: block; margin-top: 14px; font-size: 13px; color: #475569; }

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

@media (min-width: 640px) {
  .lp-ctas { flex-direction: row; }
  .lp-comp { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 900px) {
  .lp-sec { padding: 96px 24px; }
  .lp-topo { padding: 0 24px 80px; }
  .lp-hero { grid-template-columns: 1.15fr .85fr; gap: 56px; padding-top: 40px; }
  .lp-hero h1 { font-size: 52px; }
  .lp-h2 { font-size: 36px; }
  .lp-planos { grid-template-columns: 1fr 1.25fr; align-items: stretch; }
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
          <div className="lp-card-t">Automáticos do mês</div>
          <div className="lp-lin">
            <span className="lp-bola ok"><i className="ti ti-check" /></span>
            <span>Salário<small>dia 05 · conferido</small></span>
            <span className="v" style={{ color: '#15803d' }}>+ R$ 5.200,00</span>
          </div>
          <div className="lp-lin">
            <span className="lp-bola" />
            <span>Aluguel<small>dia 10 · a conferir</small></span>
            <span className="v" style={{ color: '#c2410c' }}>− R$ 1.650,00</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CelularSimulador() {
  // Saldo dos próximos meses, sem e com a compra (fictício): nunca fica negativo.
  const sem = [3900, 4300, 4750, 5200, 5600, 6100]
  const com = [3540, 3580, 3670, 3760, 3800, 4300]
  const x = (i: number) => 8 + i * 48
  const y = (v: number) => 70 - ((v - 3000) / 3400) * 60
  const linha = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v).toFixed(1)}`).join(' ')
  return (
    <div className="lp-cel" role="img" aria-label="Exemplo do Posso comprar? no celular: uma geladeira de R$ 3.600 cabe em 10 vezes sem deixar o saldo negativo">
      <div className="lp-tela">
        <div className="lp-tela-topo">
          <div className="lp-ola">Posso comprar?</div>
          <div className="lp-status">Veja antes de decidir</div>
        </div>
        <div className="lp-sim">
          <div className="lp-sim-campo">O que você quer comprar<b>Geladeira · R$ 3.600,00</b></div>
          <div className="lp-sim-campo">Como a loja ofereceu<b>À vista, 10× ou 12×</b></div>
          <div className="lp-veredito">
            <div className="lp-veredito-t"><i className="ti ti-circle-check" />Cabe em 10× de R$ 360</div>
            <p>Seu saldo não fica negativo em nenhum mês até o fim do plano, e a meta de guardar R$ 500 por mês continua de pé.</p>
            <svg className="lp-linha-saldo" viewBox="0 0 256 76" width="100%" aria-hidden>
              <path d={linha(sem)} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" />
              <path d={linha(com)} fill="none" stroke="#67e8f9" strokeWidth="3" />
              {com.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#67e8f9" />)}
            </svg>
            <p style={{ marginTop: 2 }}>Tracejado: sem a compra · Azul: comprando</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuadroPrevisao() {
  const meses = ['out', 'nov', 'dez', 'jan', 'fev', 'mar']
  const vals = [3912, 2650, -480, 1200, 2300, 3100]
  // Uma escala só, com a linha do zero: o mês negativo DESCE abaixo dela
  // (antes era a menor barra para cima, e a tempestade parecia o mês mais fraco).
  const zero = 112, escala = 96 / 3912, larg = 34, passo = 48
  return (
    <div className="lp-quadro" role="img" aria-label="Exemplo da previsão: o saldo dos próximos meses, com dezembro abaixo de zero, em − R$ 480">
      <div className="lp-quadro-t">Com quanto cada mês vai terminar</div>
      <svg className="lp-prev" viewBox="0 0 300 172" aria-hidden>
        {vals.map((v, i) => {
          const x = 15 + i * passo, h = Math.abs(v) * escala
          const cor = v < 0 ? '#fca5a5' : i === 0 ? '#67e8f9' : 'rgba(255,255,255,.85)'
          return v < 0
            ? <rect key={i} x={x} y={zero} width={larg} height={h} rx="3" fill={cor} />
            : <rect key={i} x={x} y={zero - h} width={larg} height={h} rx="3" fill={cor} />
        })}
        <line x1="6" x2="294" y1={zero} y2={zero} stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x="294" y={zero - 6} textAnchor="end" className="lp-prev-rot">zero</text>
        <text x={15 + 2 * passo + larg / 2} y={zero + 480 * escala + 18} textAnchor="middle" className="lp-prev-neg">− R$ 480</text>
        {meses.map((m, i) => <text key={m} x={15 + i * passo + larg / 2} y="166" textAnchor="middle" className="lp-prev-rot">{m}</text>)}
      </svg>
      <div className="lp-caixa" style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-cloud-storm" style={{ color: '#fde047', fontSize: 18 }} />Dezembro termina em − R$ 480,00</div>
        <div style={{ fontSize: 12, marginTop: 4, color: 'rgba(255,255,255,.88)' }}>Você vê hoje, com dois meses para mudar o caminho.</div>
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

// Estrutura da página no modelo da do Organizze (27/10/2026, pedido do
// Guilherme: "use como modelo, todas as partes da página"), com o conteúdo
// e a identidade do Compass: menu, topo, destaque novo, destaque da previsão,
// passo a passo, guia em quatro passos, benefícios, grade de recursos, o
// comparativo (no lugar de depoimentos, que só entram quando forem reais),
// planos, perguntas e rodapé.
const CSS2 = `
.lp-menu { display: none; gap: 22px; font-size: 15px; font-weight: 600; }
.lp-menu a { color: rgba(255,255,255,.88) !important; text-decoration: none; }
.lp-menu a:hover { color: #fff !important; }
.lp-nav-acoes { display: flex; align-items: center; gap: 10px; }
.lp-comece { display: none; }
.lp-selo-novo { display: inline-flex; align-items: center; gap: 8px; border-radius: 99px; padding: 8px 14px 8px 8px; min-height: 44px; background: rgba(255,255,255,.12); border: 1px solid rgba(103,232,249,.5); font-size: 13px; font-weight: 600; margin-bottom: 18px; color: #fff; text-decoration: none; }
.lp-selo-novo b { background: #22d3ee; color: #0b1460; border-radius: 99px; padding: 2px 9px; font-size: 11px; letter-spacing: .5px; }

.lp-btn-claro { border: 1.5px solid #1d4ed8; color: #1d4ed8 !important; background: #fff; }

.lp-pp { display: grid; grid-template-columns: 1fr; gap: 18px; counter-reset: pp; }
.lp-pp-item { background: #fff; border-radius: 20px; border: 1.5px solid #dbe4f3; padding: 20px; display: grid; gap: 14px; align-content: start; }
.lp-pp-item h3 { margin: 0; font-size: 17px; display: flex; gap: 10px; align-items: center; }
.lp-pp-item p { margin: 0; font-size: 14px; color: #475569; line-height: 1.55; }
.lp-pp-mini { border-radius: 14px; background: #f2f5fc; padding: 12px; font-size: 12px; display: grid; gap: 6px; }
.lp-pp-mini div { background: #fff; border-radius: 10px; padding: 8px 10px; display: flex; justify-content: space-between; gap: 8px; }
.lp-faixa { margin-top: 36px; text-align: center; }
.lp-faixa p { font-size: 14px; color: #475569; margin: 0 0 12px; }
.lp-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.lp-chips span { border: 1.5px solid #dbe4f3; background: #fff; border-radius: 99px; padding: 7px 14px; font-size: 13px; font-weight: 600; color: #334155; }



.lp-rec { display: grid; grid-template-columns: 1fr; gap: 14px; }
.lp-rec-card { background: #fff; border: 1.5px solid #dbe4f3; border-radius: 18px; padding: 20px; }
.lp-rec-card { display: grid; grid-template-columns: 44px 1fr; gap: 0 14px; align-items: start; }
.lp-rec-card h3 { margin: 2px 0 4px; font-size: 16px; display: flex; align-items: center; gap: 8px; }
.lp-rec-card p { margin: 0; font-size: 14px; color: #475569; line-height: 1.55; }
.lp-rec-meio { display: flex; flex-direction: column; justify-content: center; }
.lp-rec-meio > p { margin: 12px 4px 0; font-size: 14px; color: #475569; line-height: 1.55; }

.lp-ajuda { max-width: 760px; margin: 22px auto 0; border-radius: 18px; background: #eff6ff; padding: 20px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; }
.lp-ajuda b { font-size: 16px; }
.lp-ajuda p { margin: 2px 0 0; font-size: 14px; color: #475569; }

.lp-dor { display: grid; grid-template-columns: 1fr; gap: 12px; max-width: 900px; margin: 0 auto; padding: 0; list-style: none; }
.lp-dor li { display: flex; gap: 12px; align-items: flex-start; background: #fff; border: 1.5px solid #dbe4f3; border-radius: 16px; padding: 16px 18px; font-size: 16px; color: #334155; line-height: 1.5; }
.lp-dor li i { color: #b45309; font-size: 22px; flex-shrink: 0; }
.lp-virada { max-width: 760px; margin: 36px auto 0; text-align: center; font-size: 22px; font-weight: 800; letter-spacing: -.4px; line-height: 1.35; color: #0f172a; }
.lp-virada em { font-style: normal; color: #1d4ed8; }

.lp-rodape2 { background: #0b1460; color: rgba(255,255,255,.85); padding: 40px 16px 28px; font-size: 14px; }
.lp-rodape2-in { max-width: 1100px; margin: 0 auto; display: grid; gap: 24px; }
.lp-rodape2 nav { display: flex; flex-wrap: wrap; gap: 0 22px; }
.lp-rodape2 a { color: rgba(255,255,255,.88) !important; text-decoration: none; }
.lp-rodape2 a:hover { text-decoration: underline; }
.lp-rodape2 .lp-btn-branco { color: #0b1460 !important; }
.lp-rodape2 .lp-btn-branco:hover { text-decoration: none; }
.lp-rodape2 nav a, .lp-rodape2-fim a { display: inline-flex; align-items: center; min-height: 44px; }
.lp-rodape2-fim { border-top: 1px solid rgba(255,255,255,.15); padding-top: 8px; display: flex; flex-wrap: wrap; gap: 10px 22px; justify-content: space-between; font-size: 13px; }

@media (min-width: 640px) {
  .lp-pp, .lp-dor { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 900px) {
  .lp-menu, .lp-comece { display: flex; }
  .lp-pp { grid-template-columns: repeat(3, 1fr); }
  .lp-rec { grid-template-columns: 1.15fr 1fr; }
  .lp-rec-meio { grid-row: span 3; }
  .lp-rodape2-in { grid-template-columns: auto 1fr auto; align-items: center; }
}
`

// O tema da viagem (29/10/2026, pedido do Guilherme: "como o Compass é uma
// bússola, quero uma landing page com formato de mapa, com fundo mostrando
// territórios e uma linha tracejada mostrando o caminho"). A página é uma
// viagem até o porto seguro, e cada parte é uma parada. A promessa é ver a
// tempestade antes e ter tempo de desviar, nunca uma viagem sem tempestade.
const CSS3 = `
.lp-topo { overflow: hidden; }
.lp-fundo-mapa { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.lp-nav, .lp-hero { position: relative; z-index: 1; }
.lp-mapa { position: relative; width: 100%; max-width: 560px; margin: 0 auto; aspect-ratio: 640 / 560; }
.lp-mapa svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.lp-rota-tracejada { stroke-dasharray: 10 9; animation: lp-andar 1.6s linear infinite; }
@keyframes lp-andar { to { stroke-dashoffset: -19; } }
@media (prefers-reduced-motion: reduce) { .lp-rota-tracejada { animation: none; } }
.lp-marco { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; font-size: 12px; font-weight: 700; color: #fff; white-space: nowrap; }
.lp-marco small { font-size: 11px; font-weight: 600; color: rgba(255,255,255,.8); }
.lp-marco-ic { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font-size: 24px; }
.lp-marco-ic.partida { width: 22px; height: 22px; background: #fff; box-shadow: 0 0 0 5px rgba(34,211,238,.35), 0 0 18px rgba(34,211,238,.6); }
.lp-marco-ic.tempestade { background: rgba(15,23,42,.55); border: 1.5px solid rgba(253,224,71,.6); color: #fde047; }
.lp-marco-ic.porto { width: 56px; height: 56px; font-size: 30px; background: #22d3ee; color: #0b1460; box-shadow: 0 0 0 6px rgba(34,211,238,.25), 0 0 28px rgba(34,211,238,.8); }
.lp-etiqueta { background: rgba(11,20,96,.88); border: 1px solid rgba(103,232,249,.35); border-radius: 8px; padding: 3px 8px; line-height: 1.35; }
.lp-marco.partida-l { align-items: flex-start;  flex-direction: row; transform: translate(-11px, -50%); }

.lp-sem-mapa { background: #f8faff; }
.lp-viagem { background-color: #eef4fb; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cg fill='none' stroke='%231d4ed8' stroke-opacity='.08' stroke-width='1.5'%3E%3Cpath d='M0 50 C60 20 130 90 260 40'/%3E%3Cpath d='M0 120 C80 90 170 160 260 115'/%3E%3Cpath d='M0 195 C70 170 160 230 260 190'/%3E%3C/g%3E%3C/svg%3E"); }
.lp-rota { list-style: none; padding: 0; margin: 0; position: relative; }
.lp-rota::before { content: ''; position: absolute; left: 19px; top: 24px; bottom: 60px; border-left: 3px dashed #3b82f6; }
.lp-parada { position: relative; padding-left: 56px; margin-bottom: 64px; }
.lp-parada:last-child { margin-bottom: 0; }
.lp-pino { position: absolute; left: 0; top: 0; width: 40px; height: 40px; border-radius: 50%; background: var(--cx-azul); box-shadow: var(--cx-bolinha); color: #fff; font-size: 21px; display: grid; place-items: center; }
.lp-parada.porto .lp-pino { background: #22d3ee; color: #0b1460; box-shadow: 0 0 0 6px rgba(34,211,238,.25), 0 0 22px rgba(34,211,238,.6); }
.lp-parada-in { display: grid; grid-template-columns: minmax(0, 1fr); gap: 28px; align-items: center; }
.lp-parada-in > * { min-width: 0; }
.lp-parada .lp-veredito p { font-size: 12px; line-height: 1.5; color: rgba(255,255,255,.9); margin: 6px 0 0; }
.lp-etapa { display: block; font-size: 12px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; color: #1d4ed8; margin: 12px 0 8px; }
.lp-parada h3 { font-size: 24px; letter-spacing: -.4px; margin: 0 0 12px; line-height: 1.25; }
.lp-parada p { font-size: 16px; color: #475569; line-height: 1.65; margin: 0; }
.lp-prev { display: block; width: 100%; height: auto; overflow: visible; }
.lp-prev-rot { font-size: 11px; fill: rgba(255,255,255,.8); }
.lp-prev-neg { font-size: 13px; font-weight: 800; fill: #fff; }
.lp-chegada { margin-top: 12px; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #0e7490; background: #ecfeff; border: 1.5px solid #a5f3fc; border-radius: 99px; padding: 6px 14px; }

.lp-fixo { position: sticky; bottom: 0; height: 0; z-index: 5; }
.lp-fixo a { position: absolute; left: 16px; right: 16px; bottom: calc(14px + env(safe-area-inset-bottom)); }
.lp-fixo .lp-btn-azul { box-shadow: 0 10px 30px rgba(11,20,96,.35), var(--cx-brilho); }

@media (min-width: 900px) {
  .lp-fixo { display: none; }
  .lp-hero { grid-template-columns: 1fr 1fr; }
  .lp-mapa { max-width: none; }
  .lp-parada { padding-left: 88px; margin-bottom: 88px; }
  .lp-rota::before { left: 27px; }
  .lp-pino { width: 56px; height: 56px; font-size: 27px; }
  .lp-parada-in { grid-template-columns: 1fr 1fr; gap: 56px; }
  .lp-parada h3 { font-size: 28px; }
}
`

/** Territórios no fundo do topo: só desenho, quase apagado. */
function FundoMapa() {
  return (
    <svg className="lp-fundo-mapa" viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g stroke="rgba(255,255,255,.05)" strokeWidth="1" strokeDasharray="2 8">
        {[120, 260, 400, 540, 680].map(y => <line key={y} x1="0" y1={y} x2="1440" y2={y} />)}
        {[160, 400, 640, 880, 1120, 1360].map(x => <line key={x} x1={x} y1="0" x2={x} y2="760" />)}
      </g>
      <g fill="rgba(255,255,255,.035)" stroke="rgba(165,243,252,.14)" strokeWidth="1.5">
        <path d="M0,0 L420,0 C400,60 330,90 260,110 C180,135 120,190 60,200 C30,205 10,190 0,180 Z" />
        <path d="M0,560 C80,520 170,540 230,600 C270,640 300,700 290,760 L0,760 Z" />
        <path d="M560,700 C600,660 680,665 700,710 C710,740 690,760 680,760 L560,760 Z" />
      </g>
      <g fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1">
        <path d="M0,40 L330,40 C300,80 230,100 170,120 C110,140 60,160 0,150" />
        <path d="M0,620 C70,590 150,605 200,650 C230,680 250,720 245,760" />
      </g>
    </svg>
  )
}

/** O mapa da viagem: territórios, a tempestade e o caminho tracejado que a
 *  contorna até o porto seguro. Os marcos são HTML, para usar os ícones. */
function MapaDaViagem() {
  const terras = [
    { d: 'M0,430 C60,400 120,410 170,440 C220,470 260,520 250,560 L0,560 Z', c: [110, 500] },
    { d: 'M150,170 C190,130 260,140 280,185 C300,230 250,270 200,262 C150,255 120,210 150,170 Z', c: [212, 202] },
    { d: 'M640,0 L640,230 C600,240 560,215 545,180 C530,145 500,120 470,95 C440,70 450,20 480,0 Z', c: [570, 100] },
    { d: 'M380,440 C400,420 440,425 445,450 C450,475 415,490 395,480 C375,470 365,455 380,440 Z', c: [410, 455] },
  ]
  const rota = 'M110,470 C170,450 200,420 215,380 C230,330 260,290 310,285 C370,280 380,330 430,320 C480,310 500,250 540,200 C555,182 565,165 578,150'
  return (
    <div className="lp-mapa" role="img" aria-label="Mapa de uma viagem: do ponto onde você está, o caminho tracejado contorna uma tempestade e chega ao porto seguro">
      <svg viewBox="0 0 640 560" aria-hidden>
        <g stroke="rgba(255,255,255,.08)" strokeWidth="1" strokeDasharray="2 6">
          {[80, 200, 320, 440].map(y => <line key={y} x1="0" y1={y} x2="640" y2={y} />)}
          {[80, 240, 400, 560].map(x => <line key={x} x1={x} y1="0" x2={x} y2="560" />)}
        </g>
        {terras.map(t => (
          <g key={t.d}>
            <path d={t.d} fill="rgba(255,255,255,.08)" stroke="rgba(165,243,252,.45)" strokeWidth="1.5" />
            <path d={t.d} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" transform={`translate(${t.c[0]} ${t.c[1]}) scale(.72) translate(${-t.c[0]} ${-t.c[1]})`} />
            <path d={t.d} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" transform={`translate(${t.c[0]} ${t.c[1]}) scale(.45) translate(${-t.c[0]} ${-t.c[1]})`} />
          </g>
        ))}
        {/* a tempestade */}
        <g opacity=".9">
          <circle cx="300" cy="375" r="62" fill="rgba(15,23,42,.35)" />
          <circle cx="300" cy="375" r="62" fill="none" stroke="rgba(253,224,71,.35)" strokeWidth="1.5" strokeDasharray="3 5" />
          <g stroke="rgba(165,243,252,.45)" strokeWidth="2" strokeLinecap="round">
            <line x1="276" y1="405" x2="270" y2="420" /><line x1="300" y1="410" x2="294" y2="425" /><line x1="324" y1="405" x2="318" y2="420" />
          </g>
        </g>
        {/* rosa dos ventos */}
        <g transform="translate(560 470)" opacity=".75">
          <circle r="34" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
          <path d="M0,-30 L6,-6 L0,0 L-6,-6 Z" fill="#fff" /><path d="M0,30 L6,6 L0,0 L-6,6 Z" fill="rgba(255,255,255,.45)" />
          <path d="M30,0 L6,6 L0,0 L6,-6 Z" fill="rgba(255,255,255,.45)" /><path d="M-30,0 L-6,6 L0,0 L-6,-6 Z" fill="rgba(255,255,255,.45)" />
          <text y="-38" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">N</text>
        </g>
        {/* o caminho */}
        <path d={rota} fill="none" stroke="rgba(34,211,238,.35)" strokeWidth="9" strokeLinecap="round" />
        <path d={rota} className="lp-rota-tracejada" fill="none" stroke="#67e8f9" strokeWidth="3.5" strokeLinecap="round" />
        {[[215, 380], [310, 285], [430, 320], [540, 200]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill="#0b1460" stroke="#67e8f9" strokeWidth="2.5" />)}
      </svg>
      <div className="lp-marco partida-l" style={{ left: `${110 / 6.4}%`, top: `${470 / 5.6}%` }}>
        <span className="lp-marco-ic partida" />
        <span className="lp-etiqueta" style={{ textAlign: 'left', marginTop: 14 }}>Você está aqui<br /><small>vivendo no limite</small></span>
      </div>
      <div className="lp-marco" style={{ left: `${300 / 6.4}%`, top: `${372 / 5.6}%` }}>
        <span className="lp-marco-ic tempestade"><i className="ti ti-cloud-storm" /></span>
        <small className="lp-etiqueta">tempestade à vista</small>
      </div>
      <div className="lp-marco" style={{ left: `${585 / 6.4}%`, top: `${150 / 5.6}%` }}>
        <span className="lp-marco-ic porto"><i className="ti ti-building-lighthouse" /></span>
        <span className="lp-etiqueta">Porto seguro</span>
      </div>
    </div>
  )
}

function QuadroPorto() {
  // Guardado acumulado no ano contra a meta (fictício): fica no rumo.
  const guardado = [8, 16, 24, 33, 41, 50, 58, 66, 75, 83, 92, 100]
  const meses = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  return (
    <div className="lp-quadro" role="img" aria-label="Exemplo da meta de economia: R$ 500 por mês, guardados mês a mês até chegar a R$ 6.000 em dezembro">
      <div className="lp-quadro-t">Meta de economia · R$ 500 por mês</div>
      <div className="lp-saldo" style={{ marginBottom: 4 }}>R$ 6.000,00</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginBottom: 14 }}>guardados até dezembro, se o plano se cumprir</div>
      <div className="lp-colunas">
        {guardado.map((h, i) => <div key={i} className={i === 11 ? 'atual' : undefined} style={{ height: `${h}%` }} />)}
      </div>
      <div className="lp-meses">{meses.map((m, i) => <span key={i}>{m}</span>)}</div>
    </div>
  )
}

const PARADAS = [
  {
    id: 'partida', icone: 'ti-map-pin', etapa: 'Parada 1 · Ponto de partida', titulo: 'Saiba exatamente onde você está',
    texto: 'Bancos, cartões e dinheiro num só lugar, com o saldo de hoje e as contas do mês. Salário e débito automático aparecem no dia certo: você confere com um toque.',
    visual: <CelularInicio />,
  },
  {
    id: 'rota', icone: 'ti-route', etapa: 'Parada 2 · A rota', titulo: 'Defina a rota do seu ano',
    texto: 'Um plano com quanto gastar em cada categoria e quanto guardar por mês. Quem escolhe o destino é você; o Compass desenha o caminho e mostra com quanto o ano termina.',
    visual: <QuadroPlano />,
  },
  {
    id: 'previsao', icone: 'ti-cloud-storm', etapa: 'Parada 3 · Previsão do tempo', titulo: 'Veja a tempestade antes de chegar nela',
    texto: 'Com o que você planejou e o que já está lançado, como parcelas e contas fixas, o Compass mostra com quanto cada um dos próximos meses vai terminar. O mês no vermelho aparece com tempo de mudar a rota.',
    visual: <QuadroPrevisao />,
  },
  {
    id: 'posso-comprar', icone: 'ti-compass', etapa: 'Parada 4 · Antes de mudar o rumo', titulo: 'Antes de comprar, consulte a bússola',
    texto: 'Digite o valor e as opções da loja. O Compass coloca a compra no seu plano, mês a mês, e mostra se ela tira você do caminho e qual forma de pagar pesa menos.',
    visual: <CelularSimulador />,
  },
  {
    id: 'diario', icone: 'ti-notebook', etapa: 'Parada 5 · Diário de bordo', titulo: 'Confira se o barco segue na rota',
    texto: 'Anote um gasto em segundos, no celular ou no computador. O Radar mostra, no meio do mês, quanto ainda resta em cada grupo, e o plano se ajusta para os próximos meses.',
    visual: <QuadroRadar />,
  },
  {
    id: 'porto', icone: 'ti-building-lighthouse', etapa: 'Destino · Porto seguro', titulo: 'Siga até o seu porto seguro',
    texto: 'O porto seguro é o dinheiro que sobra de propósito: a meta de economia que você escolhe e acompanha mês a mês. Um caminho mais tranquilo para você e para a sua família.',
    visual: <QuadroPorto />,
  },
]

// Só o que a viagem não mostrou: Posso comprar?, previsão, plano, Radar e os
// automáticos já têm parada própria (16/11/2026, revisão da página).
const RECURSOS = [
  { icone: 'ti-plus', titulo: 'Lançar rápido', texto: 'Débito ou crédito, parcelado em até 24×, na fatura certa.' },
  { icone: 'ti-users', titulo: 'Conta compartilhada', texto: 'As mesmas finanças para a família, cada um com o seu login.' },
  { icone: 'ti-devices', titulo: 'Celular e computador', texto: 'Instale no celular e entre com a digital.' },
]

const LINKS = [
  ['#viagem', 'A viagem'],
  ['#previsao', 'Previsão'],
  ['#posso-comprar', 'Posso comprar?'],
  ['#recursos', 'Recursos'],
  ['#perguntas', 'Dúvidas'],
]

export default function LandingPage() {
  const ano = new Date().getFullYear()
  // A versão pré-renderizada sai de cena no mesmo quadro em que esta entra.
  useLayoutEffect(() => { tirarApresentacaoEstatica() }, [])

  return (
    <div className="lp">
      <style>{CSS + CSS2 + CSS3}</style>

      <header className="lp-topo">
        <FundoMapa />
        <nav className="lp-nav" aria-label="Principal">
          <Link to="/" className="lp-marca" aria-label="Compass One, página inicial">
            <LogoCompass size={36} /><NomeCompass />
          </Link>
          <div className="lp-menu">
            {LINKS.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
          </div>
          <div className="lp-nav-acoes">
            <a href={hrefDoApp('/login', codigoRecebido())} className="lp-entrar">Entrar</a>
            <a href={hrefDoApp('/cadastro', codigoRecebido())} className="lp-btn lp-btn-branco lp-comece" style={{ padding: '10px 18px', fontSize: 15 }}>Criar conta grátis</a>
          </div>
        </nav>
        <div className="lp-hero">
          <div className="lp-hero-txt">
            <a href="#planos" className="lp-selo-novo"><b>GRÁTIS</b>Criado por um educador financeiro</a>
            <h1>Saiba hoje como o seu mês <em>vai fechar</em>.</h1>
            <p>
              O Compass One junta o seu salário, as suas contas fixas e as suas parcelas e mostra, em
              qualquer dia, com quanto você termina o mês. Sem surpresa na fatura, sem susto no dia 30.
            </p>
            <div className="lp-ctas">
              <a href={hrefDoApp('/cadastro', codigoRecebido())} className="lp-btn lp-btn-branco">Criar conta grátis <i className="ti ti-arrow-right" /></a>
              <a href={hrefDoApp('/login', codigoRecebido())} className="lp-btn lp-btn-vazado">Já tenho conta</a>
            </div>
            <ul className="lp-selos">
              <li><i className="ti ti-gift" />Sem mensalidade</li>
              <li><i className="ti ti-ad-off" />Sem anúncios</li>
              <li><i className="ti ti-lock" />Não pede a senha do banco</li>
            </ul>
          </div>
          <MapaDaViagem />
        </div>
      </header>

      <main>
        {/* Sem mapa: o problema, antes da ferramenta */}
        <section className="lp-sec lp-sem-mapa" id="no-limite" aria-labelledby="t-dor">
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="t-dor">As contas estão em dia. Então por que nunca sobra?</h2>
              <p className="lp-sub">Todo mês parece uma travessia que termina no zero.</p>
            </div>
            <ul className="lp-dor">
              {[
                'O salário cai e, antes do fim do mês, já foi embora',
                'A fatura chega maior do que você imaginava',
                'Toda compra vem com a dúvida: será que dá?',
                'Você quer guardar, mas nunca sobra nada para guardar',
              ].map(t => <li key={t}><i className="ti ti-cloud-storm" />{t}</li>)}
            </ul>
            <p className="lp-virada">
              Não falta esforço. Falta enxergar o mês antes que ele acabe.
              <br /><em>Viver no limite não precisa ser o seu normal.</em>
            </p>
          </div>
        </section>

        {/* A viagem: uma parada por parte do app */}
        <section className="lp-sec lp-viagem" id="viagem" aria-labelledby="t-viagem">
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="t-viagem">A viagem até o seu porto seguro</h2>
              <p className="lp-sub">Cinco paradas até o destino. Em cada uma, o Compass mostra onde você está e para onde está indo.</p>
            </div>
            <ol className="lp-rota">
              {PARADAS.map(p => (
                <li key={p.id} id={p.id} className={`lp-parada${p.id === 'porto' ? ' porto' : ''}`}>
                  <span className="lp-pino" aria-hidden><i className={`ti ${p.icone}`} /></span>
                  <div className="lp-parada-in">
                    <div>
                      <span className="lp-etapa">{p.etapa}</span>
                      <h3>{p.titulo}</h3>
                      <p>{p.texto}</p>
                      {p.id === 'porto' && <span className="lp-chegada"><i className="ti ti-anchor" />Você escolhe o destino. O Compass mostra o caminho.</span>}
                    </div>
                    {p.visual}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* No lugar dos depoimentos: o comparativo */}
        <section className="lp-sec" aria-labelledby="t-dif">
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="t-dif">Sem mapa × com bússola</h2>
              <p className="lp-sub">Anotar gastos conta por onde você já passou. Para sair do limite, é preciso enxergar o caminho à frente.</p>
            </div>
            <div className="lp-comp">
              <div className="lp-comp-col lp-comp-outros">
                <div className="lp-comp-rot">Sem mapa</div>
                <h3>A tempestade aparece quando você já está nela</h3>
                <ul>
                  <li><i className="ti ti-history" />Você sabe quanto já gastou, não com quanto vai terminar</li>
                  <li><i className="ti ti-alert-triangle" />O aperto aparece quando o mês já acabou</li>
                  <li><i className="ti ti-help" />Comprar ou esperar? Decide no escuro</li>
                  <li><i className="ti ti-coin-off" />Guardar fica para quando sobrar, e não sobra</li>
                </ul>
              </div>
              <div className="lp-comp-col lp-comp-nos">
                <div className="lp-comp-rot">Com o Compass One</div>
                <h3>Você vê o caminho antes</h3>
                <ul>
                  <li><i className="ti ti-circle-check" />Com quanto cada um dos próximos meses vai terminar, pelo seu plano</li>
                  <li><i className="ti ti-circle-check" />O mês no vermelho aparece meses antes, com tempo de mudar a rota</li>
                  <li><i className="ti ti-circle-check" />Se a compra cabe no plano, antes de você comprar</li>
                  <li><i className="ti ti-circle-check" />Guardar vira meta do mês, decidida no começo</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Como começar */}
        <section className="lp-sec" id="como-funciona" aria-labelledby="t-pp" style={{ background: '#f8faff' }}>
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="t-pp">Prepare a viagem em três passos</h2>
              <p className="lp-sub">Sem planilha e sem precisar entender de finanças. Tudo pode ser aproximado e ajustado depois.</p>
            </div>
            <ol className="lp-pp" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="lp-pp-item">
                <h3><span className="lp-passo-n" style={{ margin: 0 }}>1</span>Conte um pouco sobre você</h3>
                <p>Bancos e saldos, quanto recebe, cartões e as contas que paga todo mês. Uma pergunta por tela.</p>
                <div className="lp-pp-mini"><div><span>Quanto você recebe?</span><b>R$ 5.200</b></div><div><span>Aluguel · dia 10</span><b>R$ 1.650</b></div></div>
              </li>
              <li className="lp-pp-item">
                <h3><span className="lp-passo-n" style={{ margin: 0 }}>2</span>Receba a primeira rota</h3>
                <p>O Compass monta um plano de 12 meses com o que você contou e mostra quanto sobra por mês.</p>
                <div className="lp-pp-mini"><div><span>Plano de nov a out</span><b>12 meses</b></div><div><span>Sobra por mês</span><b style={{ color: '#15803d' }}>R$ 640</b></div></div>
              </li>
              <li className="lp-pp-item">
                <h3><span className="lp-passo-n" style={{ margin: 0 }}>3</span>Navegue com a bússola</h3>
                <p>Anote os gastos, confira os saldos e, antes de comprar, pergunte ao simulador.</p>
                <div className="lp-pp-mini"><div><span>Geladeira em 10×</span><b style={{ color: '#15803d' }}>cabe</b></div><div><span>Meta de R$ 500</span><b style={{ color: '#15803d' }}>de pé</b></div></div>
              </li>
            </ol>
            <div className="lp-faixa">
              <p>Funciona com o seu banco, qualquer que seja, e com o dinheiro da carteira:</p>
              <div className="lp-chips">
                {['Nubank', 'Itaú', 'Bradesco', 'Caixa', 'Banco do Brasil', 'Inter', 'Santander', 'Sicredi', 'Sicoob', 'C6', 'Mercado Pago', 'PicPay', 'Dinheiro'].map(b => <span key={b}>{b}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* Recursos */}
        <section className="lp-sec" id="recursos" aria-labelledby="t-rec">
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="t-rec">O que mais vai na bagagem</h2>
              <p className="lp-sub">Para comparar as formas de pagar, lançar em segundos e dividir as contas com a família.</p>
            </div>
            <div className="lp-rec">
              <div className="lp-rec-meio">
                <QuadroSimulador />
                <p>Diga o que a loja ofereceu e veja qual forma de pagar pesa menos no seu plano.</p>
              </div>
              {RECURSOS.map(r => <Recurso key={r.titulo} {...r} />)}
            </div>
          </div>
        </section>

        {/* Planos */}
        <section className="lp-sec" id="planos" aria-labelledby="t-planos" style={{ background: '#f8faff' }}>
          <div className="lp-in">
            <div className="lp-centro">
              <h2 className="lp-h2" id="t-planos">Como posso te ajudar</h2>
              <p className="lp-sub">O app é grátis para sempre. Se quiser ajuda, você escolhe o quanto, em pacotes. Sem mensalidade.</p>
            </div>
            <div className="lp-planos">
              <div className="lp-plano ativo">
                <span className="lp-plano-selo">GRÁTIS</span>
                <h3>App Compass One</h3>
                <p>Acesso completo, sem limite de uso, sem anúncios e sem cartão de crédito.</p>
                <ul>
                  {['Previsão de como o mês vai fechar', 'Posso comprar? antes de decidir', 'Planejamento anual e meta de economia', 'Conta compartilhada com a família'].map(t => <li key={t}><i className="ti ti-circle-check" />{t}</li>)}
                </ul>
                <a href={hrefDoApp('/cadastro', codigoRecebido())} className="lp-btn lp-btn-azul">Criar conta grátis</a>
              </div>
              {/* Os pacotes numa faixa só, como opção (eram três colunas sem preço
                  nem botão, que liam como uma pegadinha no "grátis"). */}
              <div className="lp-pacotes">
                <h3>Quer ajuda de um educador financeiro?</h3>
                <p>É opcional. Se quiser, você escolhe o quanto de ajuda, em pacotes, sem mensalidade:</p>
                <ol>
                  {[
                    { icone: 'ti-player-play', nome: 'Curso em vídeo', texto: 'Aulas gravadas para montar o seu plano e usar o app no seu ritmo.' },
                    { icone: 'ti-messages', nome: 'Grupo de acompanhamento', texto: 'O curso e um grupo para tirar dúvidas com o educador.' },
                    { icone: 'ti-user-check', nome: 'Acompanhamento individual', texto: 'Encontros só seus com o educador para colocar a vida financeira em ordem.' },
                  ].map(p => <li key={p.nome}><i className={`ti ${p.icone}`} aria-hidden /><div><b>{p.nome}</b><span>{p.texto}</span></div></li>)}
                </ol>
                <small>Pacotes sob consulta. O app continua grátis, com ou sem eles.</small>
              </div>
            </div>
          </div>
        </section>

        {/* Perguntas frequentes */}
        <section className="lp-sec" id="perguntas" aria-labelledby="t-faq">
          <div className="lp-in">
            <div className="lp-centro"><h2 className="lp-h2" id="t-faq" style={{ marginBottom: 32 }}>Perguntas frequentes</h2></div>
            <div className="lp-faq">
              {PERGUNTAS_FREQUENTES.map(p => (
                <details key={p.pergunta}><summary>{p.pergunta}</summary><p>{p.resposta}</p></details>
              ))}
            </div>
            <div className="lp-ajuda">
              <div><b>Ainda com dúvidas?</b><p>Escreva para o nosso suporte.</p></div>
              <a href="mailto:suporte@compass-one.com.br" className="lp-btn lp-btn-claro" style={{ padding: '11px 20px', fontSize: 15 }}>Falar com o suporte</a>
            </div>
          </div>
        </section>

        {/* No celular, o cadastro fica à mão depois do topo e sai antes da chamada final, que já tem o botão (some no computador). */}
        <div className="lp-fixo">
          <a href={hrefDoApp('/cadastro', codigoRecebido())} className="lp-btn lp-btn-azul">Criar conta grátis <i className="ti ti-arrow-right" /></a>
        </div>

        {/* Chamada final */}
        <section className="lp-sec lp-fim" aria-labelledby="t-fim" style={{ position: 'relative', overflow: 'hidden' }}>
          <FundoMapa />
          <div className="lp-in lp-centro" style={{ position: 'relative' }}>
            <span className="lp-marco-ic porto" style={{ margin: '0 auto 20px' }} aria-hidden><i className="ti ti-building-lighthouse" /></span>
            <h2 className="lp-h2" id="t-fim">Comece hoje e descubra como o seu mês vai fechar</h2>
            <p className="lp-sub">Crie a sua conta grátis e veja com quanto termina cada um dos próximos meses.</p>
            <a href={hrefDoApp('/cadastro', codigoRecebido())} className="lp-btn lp-btn-branco">Criar conta grátis <i className="ti ti-arrow-right" /></a>
            <ul className="lp-selos" style={{ justifyContent: 'center', marginTop: 22 }}>
              <li><i className="ti ti-gift" />Sem mensalidade</li>
              <li><i className="ti ti-ad-off" />Sem anúncios</li>
              <li><i className="ti ti-lock" />Não pede a senha do banco</li>
            </ul>
          </div>
        </section>

      </main>

      <footer className="lp-rodape2">
        <div className="lp-rodape2-in">
          <Link to="/" className="lp-marca" aria-label="Compass One"><LogoCompass size={30} /><NomeCompass /></Link>
          <nav aria-label="Rodapé">
            {LINKS.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
            <a href="#planos">Como posso te ajudar</a>
          </nav>
          <a href={hrefDoApp('/cadastro', codigoRecebido())} className="lp-btn lp-btn-branco" style={{ padding: '10px 18px', fontSize: 15 }}>Criar conta grátis</a>
        </div>
        <div className="lp-rodape2-in lp-rodape2-fim" style={{ marginTop: 24 }}>
          <span>© {ano} Compass One · A bússola do seu dinheiro.</span>
          <span style={{ display: 'flex', gap: 18 }}>
            <Link to="/privacidade">Política de privacidade</Link>
            <Link to="/termos">Termos de uso</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

function Recurso({ icone, titulo, texto }: { icone: string; titulo: string; texto: string }) {
  return (
    <div className="lp-rec-card">
      <span className="lp-extra-ic" aria-hidden><i className={`ti ${icone}`} /></span>
      <div><h3>{titulo}</h3><p>{texto}</p></div>
    </div>
  )
}
