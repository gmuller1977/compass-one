import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import { LogoCompass, NomeCompass } from '../components/LogoCompass'
import { tirarApresentacaoEstatica } from '../utils/apresentacaoEstatica'
import { PERGUNTAS_FREQUENTES } from '../utils/perguntasFrequentes'
import { hrefDoApp } from '../utils/site'
import { codigoRecebido } from '../utils/indicacaoLocal'

/**
 * Apresentação v2, "o voo" (16/11/2026, pedido do Guilherme: "elementos da
 * aviação: o ponto de partida é a decolagem, no início turbulência e nuvens,
 * aos poucos ganha altitude, passa os momentos ruins e fica acima das nuvens
 * numa viagem tranquila"). Prévia em /v2, fora do Google, enquanto a v1 segue
 * na "/". Rolar é subir: o céu clareia por faixa e o altímetro acompanha.
 * As telas de exemplo usam números fictícios, nunca dado de alguém.
 */

const CSS = `
.v2 { --noite: #0b1322; --noite2: #18233a; --nuvem: #4b566c; --subida: #1f4f96; --claro: #dcecfb; --claro2: #eaf4fe;
  --tinta: #0b2545; --tinta2: #3d5170; --ambar: #f5b942; --ambar-escuro: #9a5b00; --verde-escuro: #15803d; --verde-claro: #86efac;
  font-family: 'Barlow', -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--tinta); background: var(--noite);
  overflow-x: hidden; overflow-x: clip; -webkit-font-smoothing: antialiased; }
.v2 * { box-sizing: border-box; }
.v2 a { color: inherit; }
.v2 ::selection { background: var(--ambar); color: var(--noite); }
.v2 a:focus-visible, .v2 summary:focus-visible { outline: 3px solid var(--ambar); outline-offset: 3px; border-radius: 8px; }
.v2 h1, .v2 h2, .v2 h3 { text-wrap: balance; }
.v2 p, .v2 li { text-wrap: pretty; }
.v2-cond { font-family: 'Barlow Condensed', 'Barlow', sans-serif; }
.v2-in { max-width: 1140px; margin: 0 auto; padding: 0 20px; position: relative; }
.v2-sec { position: relative; padding: 96px 0; }
.v2-h2 { font-family: 'Barlow Condensed', 'Barlow', sans-serif; font-weight: 700; font-size: 40px; line-height: 1.02; letter-spacing: -.01em; margin: 0 0 14px; }
.v2-lead { font-size: 18px; line-height: 1.6; margin: 0; max-width: 620px; }
.v2-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 14px 26px;
  border-radius: 10px; font-weight: 700; font-size: 16px; text-decoration: none; transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s; }
.v2-btn:hover { transform: translateY(-2px); }
.v2-btn-claro { background: #fff; color: var(--noite) !important; box-shadow: 0 10px 24px rgba(0,0,0,.28); }
.v2-btn-linha { color: #fff !important; border: 1.5px solid rgba(255,255,255,.5); }
.v2-btn-escuro { background: var(--noite); color: #fff !important; box-shadow: 0 10px 24px rgba(11,19,34,.25); }
.v2-selos { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 15px; color: rgba(255,255,255,.85); }
.v2-selos li { display: flex; align-items: center; gap: 7px; }
.v2-selos i { color: var(--ambar); font-size: 18px; }

/* altímetro */
.v2-alt { position: fixed; right: 18px; top: 50%; transform: translateY(-50%); z-index: 20; width: 92px; padding: 14px 10px 12px;
  border-radius: 14px; background: rgba(7,13,24,.86); color: #fff; text-align: center; box-shadow: 0 12px 30px rgba(0,0,0,.3);
  backdrop-filter: blur(8px); display: none; }
.v2-alt small { display: block; font-size: 11px; font-weight: 700; letter-spacing: .12em; color: rgba(255,255,255,.75); }
.v2-alt b { display: block; font-family: 'Barlow Condensed', sans-serif; font-size: 26px; line-height: 1.1; margin-top: 6px; font-variant-numeric: tabular-nums; }
.v2-alt span { display: block; font-size: 12px; color: rgba(255,255,255,.75); }
.v2-fita { position: relative; height: 150px; width: 8px; margin: 12px auto 0; border-radius: 99px; background: rgba(255,255,255,.18); }
.v2-fita i { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 99px; background: var(--ambar); transition: height .2s linear; }
.v2-alt-cel { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 74px; color: #fff; line-height: 1.05; }
.v2-alt-cel small { font-size: 10px; font-weight: 700; letter-spacing: .1em; color: rgba(255,255,255,.75); }
.v2-alt-cel b { font-family: 'Barlow Condensed', sans-serif; font-size: 19px; font-variant-numeric: tabular-nums; }

/* pista */
.v2-pista { position: relative; background: linear-gradient(180deg, var(--noite) 0%, var(--noite2) 100%); color: #fff; padding: 0 0 210px; overflow: hidden; }
.v2-nav { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 0; }
.v2-marca { display: flex; align-items: center; gap: 10px; font-size: 20px; text-decoration: none; min-height: 44px; }
.v2-menu { display: none; gap: 26px; font-size: 15px; font-weight: 600; }
.v2-menu a { text-decoration: none; color: rgba(255,255,255,.85); }
.v2-menu a:hover { color: #fff; }
.v2-acoes { display: flex; gap: 10px; align-items: center; }
.v2-entrar { min-height: 44px; display: inline-flex; align-items: center; padding: 0 18px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,.45);
  text-decoration: none; font-weight: 600; font-size: 15px; color: #fff !important; }
.v2-acoes .v2-btn { display: none; min-height: 44px; padding: 0 18px; font-size: 15px; }
.v2-hero { display: grid; grid-template-columns: minmax(0, 1fr); gap: 44px; padding-top: 36px; align-items: center; position: relative; z-index: 2; }
.v2-hero h1 { font-family: 'Barlow Condensed', 'Barlow', sans-serif; font-weight: 700; font-size: 46px; line-height: .98; letter-spacing: -.01em; margin: 0 0 20px; }
.v2-hero h1 em { font-style: normal; color: var(--ambar); }
.v2-hero p { font-size: 18px; line-height: 1.6; color: rgba(255,255,255,.88); margin: 0 0 30px; max-width: 520px; }
.v2-ctas { display: flex; flex-direction: column; gap: 12px; margin-bottom: 26px; }
.v2-luzp { opacity: var(--o); animation: v2-luzp 2.6s ease-out infinite; }
.v2-luzp-halo { opacity: 0; animation: v2-luzp-halo 2.6s ease-out infinite; }
@keyframes v2-luzp { 0%, 14%, 100% { opacity: var(--o); fill: #f5b942; } 4% { opacity: 1; fill: #fff3cf; } }
@keyframes v2-luzp-halo { 0%, 16%, 100% { opacity: 0; } 4% { opacity: 1; } }
.v2-pista-svg { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 230px; z-index: 1; }

.v2-tempestade { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.v2-clarao { position: absolute; inset: 0; opacity: 0; animation: v2-clarao .95s ease-out forwards; }
.v2-raio { position: absolute; opacity: 0; filter: drop-shadow(0 0 14px rgba(170,200,255,.9)); animation: v2-raio .8s ease-out forwards; }
@keyframes v2-raio { 0% { opacity: 0; } 6% { opacity: 1; } 18% { opacity: .15; } 30% { opacity: .95; } 100% { opacity: 0; } }
@keyframes v2-clarao { 0% { opacity: 0; } 6% { opacity: 1; } 18% { opacity: .35; } 30% { opacity: .9; } 100% { opacity: 0; } }
@keyframes v2-suave { 0% { opacity: 0; } 15% { opacity: .8; } 100% { opacity: 0; } }

/* painel de partidas */
.v2-painel { background: #070d18; border-radius: 16px; padding: 18px 18px 14px; box-shadow: 0 24px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08); }
.v2-painel-t { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 12px; font-weight: 700; letter-spacing: .1em;
  color: rgba(255,255,255,.75); text-transform: uppercase; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,.12); }
.v2-painel-t i { color: var(--ambar); font-size: 18px; }
.v2-linha { display: grid; grid-template-columns: 1.1fr 1fr 1.15fr; gap: 10px; align-items: center; padding: 11px 6px; border-bottom: 1px solid rgba(255,255,255,.07);
  font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 600; letter-spacing: .02em; transform-origin: 50% 0;
  animation: v2-placa .7s cubic-bezier(.16,1,.3,1) both; }
.v2-linha:nth-child(3) { animation-delay: .12s; } .v2-linha:nth-child(4) { animation-delay: .24s; }
.v2-linha:nth-child(5) { animation-delay: .36s; } .v2-linha:nth-child(6) { animation-delay: .48s; }
.v2-linha .v { text-align: right; font-variant-numeric: tabular-nums; }
.v2-linha .s { display: flex; align-items: center; gap: 7px; justify-content: flex-end; font-size: 16px; text-transform: uppercase; letter-spacing: .08em; color: var(--verde-claro); }
.v2-linha .s::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.v2-linha.alerta { background: rgba(245,185,66,.1); border-radius: 8px; border-bottom-color: transparent; }
.v2-linha.alerta .s { color: var(--ambar); }
.v2-linha.alerta .s::before { display: none; }
.v2-cab { font-family: 'Barlow', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.6); animation: none; padding: 10px 6px 4px; border: 0; }
.v2-cab .s { font-size: 11px; color: inherit; } .v2-cab .s::before { display: none; }
.v2-linha .s, .v2-linha .v { white-space: nowrap; }
@media (max-width: 559px) {
  .v2-linha { grid-template-columns: minmax(0, 1fr) auto auto; gap: 14px; font-size: 18px; padding: 11px 4px; }
  .v2-linha .s { font-size: 13px; gap: 5px; letter-spacing: .05em; }
  .v2-linha.v2-cab, .v2-cab .s { font-size: 11px; }
}
.v2-painel small { display: block; margin-top: 12px; font-size: 12px; color: rgba(255,255,255,.65); }
@keyframes v2-placa { from { transform: rotateX(-75deg); } to { transform: rotateX(0); } }

.v2-hero-sub { font-size: 21px !important; font-weight: 600; color: #fff !important; margin-bottom: 14px !important; }

/* o app na primeira dobra */
.v2-app { margin: 0; position: relative; display: flex; flex-direction: column; align-items: center; }
.v2-app-pc { display: none; }
.v2-app-cel { width: min(300px, 78vw); padding: 10px; border-radius: 44px; background: #05080f;
  box-shadow: 0 30px 70px rgba(0,0,0,.55), inset 0 0 0 1.5px rgba(255,255,255,.14), 0 0 0 1px rgba(34,211,238,.25); position: relative; z-index: 2; }
.v2-app-cel img { display: block; width: 100%; height: auto; border-radius: 34px; }
.v2-app figcaption { margin-top: 14px; font-size: 13px; color: rgba(255,255,255,.65); text-align: center; }
@media (min-width: 960px) {
  .v2-app { display: block; min-height: 560px; }
  .v2-app-pc { display: block; position: absolute; right: -10px; top: 20px; width: 560px; padding: 10px 10px 14px; border-radius: 16px; background: #05080f;
    box-shadow: 0 30px 70px rgba(0,0,0,.5), inset 0 0 0 1.5px rgba(255,255,255,.12); }
  .v2-app-pc img { display: block; width: 100%; height: auto; border-radius: 8px; }
  .v2-app-pc::after { content: ''; position: absolute; left: 50%; bottom: -26px; transform: translateX(-50%); width: 180px; height: 26px;
    background: linear-gradient(180deg, #1c2333, #0b0f18); clip-path: polygon(14% 0, 86% 0, 100% 100%, 0 100%); }
  .v2-app-cel { position: absolute; left: -20px; top: 110px; width: 230px; padding: 8px; border-radius: 38px; }
  .v2-app-cel img { border-radius: 30px; }
  .v2-app figcaption { position: absolute; right: 0; top: 430px; width: 300px; text-align: right; }
}

/* turbulência */
.v2-turb { background: linear-gradient(180deg, var(--noite2) 0%, #303a50 45%, var(--nuvem) 100%); color: #fff; overflow: hidden; }
.v2-nuvens { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.v2-nuvens g { animation: v2-deriva 38s linear infinite alternate; }
.v2-nuvens g:nth-child(2) { animation-duration: 52s; animation-direction: alternate-reverse; }
@keyframes v2-deriva { to { transform: translateX(-60px); } }
.v2-turb .v2-lead { color: rgba(255,255,255,.85); }
.v2-alertas { list-style: none; padding: 0; margin: 40px 0 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0 48px; max-width: 980px; }
.v2-alertas li { display: flex; gap: 16px; align-items: center; padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,.18); font-size: 19px; font-weight: 500; line-height: 1.4; }
.v2-alertas i { flex-shrink: 0; font-size: 30px; color: var(--ambar); animation: v2-trem 2.6s ease-in-out infinite; }
.v2-alertas b { display: block; font-family: 'Barlow Condensed', sans-serif; font-size: 23px; font-weight: 700; letter-spacing: .01em; }
.v2-alerta-d { display: block; margin-top: 2px; font-size: 17px; font-weight: 400; color: rgba(255,255,255,.85); }
.v2-alertas li:nth-child(5) i { animation-delay: 2.2s; }
.v2-alertas li:nth-child(2) i { animation-delay: .5s; } .v2-alertas li:nth-child(3) i { animation-delay: 1.1s; } .v2-alertas li:nth-child(4) i { animation-delay: 1.7s; }
@keyframes v2-trem { 0%, 70%, 100% { transform: none; } 74% { transform: translate(-2px, 1px) rotate(-4deg); } 78% { transform: translate(2px, -1px) rotate(3deg); } 82% { transform: translate(-1px, 1px) rotate(-2deg); } 86% { transform: none; } }
.v2-virada { margin: 56px 0 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 30px; line-height: 1.12; max-width: 760px; }
.v2-virada span { display: block; margin-top: 10px; font-family: 'Barlow', sans-serif; font-weight: 500; font-size: 19px; line-height: 1.5; color: rgba(255,255,255,.85); }

/* subida */
.v2-turb { padding-bottom: 56px; }
.v2-subida { padding-top: 56px; }
.v2-subida { background: linear-gradient(180deg, var(--nuvem) 0%, #2e4d7a 22%, var(--subida) 60%, #1d4a8c 100%); color: #fff; padding-bottom: 40px; }
.v2-subida .v2-lead { color: rgba(255,255,255,.85); }
.v2-etapas { list-style: none; padding: 0; margin: 64px 0 0; position: relative; }
.v2-etapas::before { content: ''; position: absolute; left: 15px; top: 8px; bottom: 8px; width: 0; border-left: 2px dashed rgba(255,255,255,.45); }
.v2-etapa { position: relative; padding-left: 52px; margin-bottom: 80px; }
.v2-etapa:last-child { margin-bottom: 0; }
.v2-marco { position: absolute; left: 0; top: 0; width: 32px; height: 32px; border-radius: 50%; background: var(--noite); box-shadow: 0 0 0 2px var(--ambar);
  display: grid; place-items: center; color: var(--ambar); font-size: 17px; }
.v2-etapa-in { display: grid; grid-template-columns: minmax(0, 1fr); gap: 28px; align-items: center; }
.v2-altura { display: inline-flex; align-items: center; gap: 8px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 18px; letter-spacing: .02em; color: var(--ambar); margin: 0 0 12px; font-variant-numeric: tabular-nums; }
.v2-altura i { font-size: 18px; }
.v2-etapa h3 { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 32px; line-height: 1.05; margin: 0 0 10px; }
.v2-altura + p { margin-top: 0; }
.v2-etapa-in p { font-size: 17px; line-height: 1.65; color: rgba(255,255,255,.88); margin: 0; max-width: 520px; }

/* painéis claros (as telas de exemplo) */
.v2-tela { background: #f4f9ff; color: var(--tinta); border-radius: 18px; padding: 20px; box-shadow: 0 18px 44px rgba(7,13,24,.35); }
.v2-tela-t { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 13px; font-weight: 700; color: var(--tinta2); margin-bottom: 12px; }
.v2-tela-t span { font-weight: 500; font-size: 12px; }
.v2-grande { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 38px; line-height: 1; font-variant-numeric: tabular-nums; }
.v2-rot { font-size: 13px; color: var(--tinta2); }
.v2-lin { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid #dbe6f3; font-size: 15px; }
.v2-lin .v { margin-left: auto; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.v2-lin small { display: block; font-size: 13px; color: var(--tinta2); }
.v2-bola { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #94a3b8; flex-shrink: 0; display: grid; place-items: center; font-size: 13px; }
.v2-bola.ok { background: var(--verde-escuro); border-color: var(--verde-escuro); color: #fff; }
.v2-caixa { margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: #e3eefb; display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.v2-caixa b { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-variant-numeric: tabular-nums; }
.v2-graf { display: block; width: 100%; height: auto; overflow: visible; }
.v2-graf text { font-family: 'Barlow', sans-serif; font-size: 12px; fill: var(--tinta2); }
.v2-graf .neg { font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 700; fill: var(--ambar-escuro); }
.v2-aviso { margin-top: 12px; display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: #fdf3df; color: #5c3a00; font-size: 14px; line-height: 1.45; }
.v2-aviso i { color: var(--ambar-escuro); font-size: 20px; }
.v2-aviso b { display: block; color: #3d2600; }
.v2-tab { width: 100%; border-collapse: collapse; font-size: 15px; }
.v2-tab th { text-align: left; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--tinta2); padding: 6px 4px 8px; }
.v2-tab td { padding: 11px 4px; border-top: 1px solid #dbe6f3; font-variant-numeric: tabular-nums; }
.v2-tab tr.melhor td { background: #e3f6e9; }
.v2-tab td + td { white-space: nowrap; }
.v2-caixa b { text-align: right; }
@media (max-width: 559px) { .v2-tab { font-size: 14px; } .v2-tab th, .v2-tab td { padding-left: 3px; padding-right: 3px; } .v2-caixa b { font-size: 19px; } }
.v2-tab tr.melhor td:first-child { border-radius: 8px 0 0 8px; } .v2-tab tr.melhor td:last-child { border-radius: 0 8px 8px 0; }
.v2-cabe { color: #166534; font-weight: 700; } .v2-aperta { color: #b91c1c; font-weight: 700; }
.v2-grupos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.v2-grupo { border-radius: 10px; background: #e6eef9; padding: 12px; }
.v2-grupo.passou { background: #fbe7e7; }
.v2-grupo-n { font-size: 13px; font-weight: 600; color: var(--tinta2); }
.v2-grupo-v { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 700; color: var(--subida); margin: 2px 0 8px; }
.v2-grupo.passou .v2-grupo-v { color: #b91c1c; }
.v2-trilho { height: 8px; border-radius: 99px; background: #fff; overflow: hidden; }
.v2-trilho i { display: block; height: 100%; border-radius: 99px; background: var(--subida); }
.v2-grupo.passou .v2-trilho i { background: #b91c1c; }
.v2-grupo small { display: block; margin-top: 6px; font-size: 12px; color: var(--tinta2); }

/* o topo das nuvens */
.v2-topo-nuvens { display: block; width: 100%; height: 170px; background: linear-gradient(180deg, #1d4a8c 0%, #6f9fd6 55%, var(--claro) 100%); }

/* cruzeiro */
/* o sol que aparece ao sair das nuvens */
.v2-sol-ceu { position: absolute; top: -170px; right: -8%; width: min(980px, 140vw); aspect-ratio: 1; pointer-events: none;
  opacity: 0; transform: translateY(60px) scale(.85); transform-origin: 70% 22%;
  transition: opacity 1.8s ease, transform 2.6s cubic-bezier(.16,1,.3,1); }
.v2-sol-ceu.on { opacity: 1; transform: none; }
.v2-sol-ceu::before { content: ''; position: absolute; inset: 0;
  background: repeating-conic-gradient(from 0deg at 70% 22%, rgba(255,232,170,.42) 0deg 3.5deg, transparent 3.5deg 11deg);
  -webkit-mask: radial-gradient(circle at 70% 22%, #000 0, #000 12%, transparent 58%); mask: radial-gradient(circle at 70% 22%, #000 0, #000 12%, transparent 58%);
  animation: v2-girar 140s linear infinite; transform-origin: 70% 22%; }
.v2-sol-ceu::after { content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 70% 22%, #fffaf0 0, #fff3d1 3.5%, rgba(255,222,140,.55) 8%, rgba(255,222,140,.18) 20%, transparent 42%); }
@keyframes v2-girar { to { transform: rotate(360deg); } }
.v2-cruzeiro > .v2-in { z-index: 1; }
.v2-cruzeiro { background: linear-gradient(180deg, var(--claro) 0%, var(--claro2) 100%); padding-top: 40px; }
.v2-cruzeiro .v2-lead, .v2-claro .v2-lead { color: var(--tinta2); }
.v2-cruz-in { display: grid; grid-template-columns: minmax(0, 1fr); gap: 36px; align-items: center; }
.v2-destino { display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; padding: 10px 16px; border-radius: 99px; background: #fff; color: var(--tinta); font-weight: 600; font-size: 15px; box-shadow: 0 6px 16px rgba(11,37,69,.08); }
.v2-destino i { color: var(--ambar-escuro); font-size: 19px; }
.v2-comp { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; margin-top: 80px; }
.v2-comp > div { border-radius: 18px; padding: 28px; }
.v2-comp h3 { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 30px; line-height: 1.05; margin: 0 0 6px; }
.v2-comp-sub { margin: 0 0 20px; font-size: 17px; font-weight: 600; }
.v2-comp ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
.v2-comp li { display: flex; gap: 12px; font-size: 16px; line-height: 1.5; }
.v2-comp li i { font-size: 21px; flex-shrink: 0; }
.v2-janela { background: #fff; color: var(--tinta2); box-shadow: inset 0 0 0 1.5px #c9daf0; }
.v2-janela h3, .v2-janela .v2-comp-sub { color: var(--tinta); } .v2-janela li i { color: #64748b; }
.v2-instr { background: var(--noite); color: #fff; box-shadow: 0 18px 40px rgba(11,19,34,.25); }
.v2-instr .v2-comp-sub { color: var(--ambar); } .v2-instr li i { color: var(--verde-claro); }

/* checklist, bagagem, embarque, perguntas */
.v2-claro { background: var(--claro2); }
.v2-claro2 { background: #f4f9ff; }
.v2-check { list-style: none; padding: 8px 24px; margin: 40px 0 0; background: #fff; border-radius: 18px; box-shadow: 0 14px 34px rgba(11,37,69,.09); }
.v2-check li { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 14px 18px; padding: 22px 0; border-bottom: 1.5px solid #dbe6f3; align-items: start; }
.v2-check li:last-child { border-bottom: 0; }
.v2-check-box { width: 32px; height: 32px; border-radius: 8px; background: var(--noite); color: var(--ambar); display: grid; place-items: center; font-size: 20px; margin-top: 2px; }
.v2-check-n { display: block; font-family: 'Barlow Condensed', sans-serif; font-size: 25px; font-weight: 700; line-height: 1.1; color: var(--tinta); margin-bottom: 4px; }
.v2-check p { margin: 0; font-size: 16px; line-height: 1.55; color: var(--tinta2); }
.v2-check-mini { grid-column: 2; margin: 0; display: grid; gap: 4px; font-size: 14px; }
.v2-check-mini div { display: flex; justify-content: space-between; gap: 10px; padding: 6px 10px; border-radius: 8px; background: #eef5fd; }
.v2-check-mini dt { color: var(--tinta2); } .v2-check-mini dd { margin: 0; font-weight: 700; color: var(--tinta); }
.v2-bancos { margin-top: 40px; text-align: center; }
.v2-bancos p { margin: 0 0 12px; font-size: 15px; color: var(--tinta2); }
.v2-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.v2-chips span { border-radius: 99px; padding: 8px 14px; background: #fff; font-size: 14px; font-weight: 600; color: var(--tinta); box-shadow: inset 0 0 0 1.5px #c9daf0; }
.v2-bagagem { list-style: none; padding: 0; margin: 40px 0 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; border-top: 1.5px solid #c9daf0; }
.v2-bagagem li { display: grid; grid-template-columns: 48px 1fr; gap: 16px; padding: 22px 0; border-bottom: 1.5px solid #c9daf0; }
.v2-bagagem i { width: 48px; height: 48px; border-radius: 12px; background: var(--noite); color: var(--ambar); display: grid; place-items: center; font-size: 24px; }
.v2-bagagem h3 { margin: 2px 0 4px; font-family: 'Barlow Condensed', sans-serif; font-size: 23px; font-weight: 700; color: var(--tinta); }
.v2-bagagem p { margin: 0; font-size: 16px; color: var(--tinta2); line-height: 1.5; }

.v2-cartao { margin-top: 44px; display: grid; grid-template-columns: minmax(0, 1fr); border-radius: 20px; overflow: hidden; background: #fff; box-shadow: 0 22px 50px rgba(11,37,69,.14); }
.v2-cartao-main { padding: 26px; }
.v2-cartao-topo { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 16px; margin-bottom: 18px; border-bottom: 1.5px solid #dbe6f3; }
.v2-cartao-topo span { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--tinta2); }
.v2-cartao-topo i { font-size: 26px; color: var(--tinta); }
.v2-campos { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
.v2-campos div span { display: block; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--tinta2); }
.v2-campos div b { display: block; font-family: 'Barlow Condensed', sans-serif; font-size: 24px; line-height: 1.15; color: var(--tinta); }
.v2-incluso { list-style: none; padding: 0; margin: 22px 0 24px; display: grid; gap: 9px; }
.v2-incluso li { display: flex; gap: 10px; font-size: 16px; color: var(--tinta); }
.v2-incluso i { color: var(--verde-escuro); font-size: 19px; }
.v2-canhoto { position: relative; padding: 26px; background: var(--noite); color: #fff; display: flex; flex-direction: column; gap: 14px; }
.v2-canhoto::before { content: ''; position: absolute; left: 0; right: 0; top: -1px; border-top: 3px dashed #dbe6f3; }
.v2-canhoto ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; font-size: 15px; color: rgba(255,255,255,.88); }
.v2-canhoto li { display: flex; gap: 10px; align-items: center; }
.v2-canhoto li i { color: var(--ambar); font-size: 19px; }
.v2-portao { margin-top: auto; display: grid; gap: 14px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.16); }
.v2-portao span { display: block; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.7); }
.v2-portao b { display: block; font-family: 'Barlow Condensed', sans-serif; font-size: 22px; line-height: 1.15; color: #fff; overflow-wrap: anywhere; }
.v2-copiloto { margin-top: 18px; border-radius: 20px; background: #fff; padding: 26px; box-shadow: inset 0 0 0 1.5px #c9daf0; }
.v2-copiloto h3 { margin: 0 0 6px; font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 700; color: var(--tinta); }
.v2-copiloto > p { margin: 0 0 18px; font-size: 16px; color: var(--tinta2); line-height: 1.5; }
.v2-copiloto ol { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.v2-copiloto li { display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: start; }
.v2-copiloto li i { width: 40px; height: 40px; border-radius: 10px; background: #e3eefb; color: var(--subida); display: grid; place-items: center; font-size: 20px; }
.v2-copiloto li b { display: block; font-size: 16px; color: var(--tinta); }
.v2-copiloto li span { font-size: 15px; color: var(--tinta2); line-height: 1.5; }
.v2-copiloto small { display: block; margin-top: 16px; font-size: 14px; color: var(--tinta2); }

.v2-faq { max-width: 800px; margin: 36px auto 0; display: grid; gap: 10px; }
.v2-faq details { border-radius: 14px; background: #fff; padding: 0 20px; box-shadow: inset 0 0 0 1.5px #c9daf0; }
.v2-faq summary { cursor: pointer; list-style: none; min-height: 56px; padding: 16px 0; display: flex; justify-content: space-between; align-items: center; gap: 14px; font-weight: 700; font-size: 17px; color: var(--tinta); }
.v2-faq summary::-webkit-details-marker { display: none; }
.v2-faq summary::after { content: '+'; font-size: 24px; line-height: 1; color: var(--subida); }
.v2-faq details[open] summary::after { content: '−'; }
.v2-faq details p { margin: 0 0 18px; font-size: 16px; line-height: 1.65; color: var(--tinta2); }
.v2-suporte { max-width: 800px; margin: 20px auto 0; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; padding: 20px; border-radius: 14px; background: #e3eefb; }
.v2-suporte b { font-size: 17px; color: var(--tinta); } .v2-suporte p { margin: 2px 0 0; font-size: 15px; color: var(--tinta2); }

/* pôr do sol acima das nuvens */
.v2-fim { background: linear-gradient(180deg, #14214a 0%, #23356a 48%, #6b5a7e 74%, #d98a4e 100%); color: #fff; text-align: center; padding: 110px 0 230px; overflow: hidden; }
.v2-fim .v2-lead { color: rgba(255,255,255,.88); margin: 0 auto 30px; }
.v2-fim .v2-selos { justify-content: center; margin-top: 24px; }
.v2-fim-svg { position: absolute; left: 0; right: 0; bottom: -1px; width: 100%; height: 200px; }
.v2-sol { position: relative; z-index: 1; }

.v2-rodape { background: var(--noite); color: rgba(255,255,255,.85); padding: 36px 0 26px; font-size: 14px; }
.v2-rodape-in { display: grid; gap: 18px; }
.v2-rodape nav { display: flex; flex-wrap: wrap; gap: 0 22px; }
.v2-rodape nav a, .v2-rodape-fim a { display: inline-flex; align-items: center; min-height: 44px; text-decoration: none; color: rgba(255,255,255,.88); }
.v2-rodape nav a:hover, .v2-rodape-fim a:hover { text-decoration: underline; }
.v2-rodape-fim { display: flex; flex-wrap: wrap; gap: 6px 22px; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,.14); padding-top: 8px; margin-top: 8px; font-size: 13px; }

.v2-fixo { position: sticky; bottom: 0; height: 0; z-index: 15; }
.v2-fixo-in { position: absolute; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 8px;
  padding: 6px 6px 6px 8px; border-radius: 14px; background: rgba(7,13,24,.92); box-shadow: 0 12px 30px rgba(7,13,24,.4); }
.v2-fixo-in .v2-btn { flex: 1; min-height: 48px; padding: 0 16px; box-shadow: none; }

@media (min-width: 640px) {
  .v2-ctas { flex-direction: row; }
  .v2-comp { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .v2-copiloto ol { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (min-width: 960px) {
  .v2-sec { padding: 128px 0; }
  .v2-h2 { font-size: 56px; }
  .v2-menu, .v2-acoes .v2-btn { display: flex; }
  .v2-hero { grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 64px; padding-top: 56px; }
  .v2-hero h1 { font-size: 76px; }
  .v2-etapas::before { left: 19px; }
  .v2-etapa { padding-left: 76px; margin-bottom: 120px; }
  .v2-marco { width: 40px; height: 40px; font-size: 20px; }
  .v2-etapa-in { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 64px; }
  .v2-etapa h3 { font-size: 40px; }
  .v2-cruz-in { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 64px; }
  .v2-check li { grid-template-columns: 32px minmax(0, 1.4fr) minmax(0, 1fr); align-items: center; }
  .v2-check-mini { grid-column: 3; }
  .v2-alertas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .v2-bagagem { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; border-top: 0; }
  .v2-bagagem li { border-top: 1.5px solid #c9daf0; }
  .v2-cartao { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); }
  .v2-canhoto::before { left: -1px; right: auto; top: 0; bottom: 0; border-top: 0; border-left: 3px dashed #dbe6f3; }
  .v2-virada { font-size: 40px; }
  .v2-fixo { display: none; }
  .v2-fim { padding: 140px 0 260px; }
  .v2-rodape-in { grid-template-columns: auto 1fr auto; align-items: center; }
}
@media (min-width: 1240px) { .v2-alt { display: block; } }
@media (prefers-reduced-motion: reduce) {
  .v2-linha, .v2-alertas i, .v2-nuvens g, .v2-sol-ceu::before { animation: none !important; }
  .v2-luzp, .v2-luzp-halo { animation-duration: 4.5s; }
  .v2-raio, .v2-clarao { animation: v2-suave 1.1s ease-out forwards; }
  .v2-sol-ceu { opacity: 1; transform: none; transition: none; }
  .v2-btn, .v2-fita i, .v2-alt-cel { transition: none; }
}
`

/** Pista à noite em perspectiva: asfalto, faixa central e luzes até o horizonte. */
function Pista() {
  const N = 15
  const luzes = Array.from({ length: N }, (_, i) => i)
  // De perto (embaixo) para longe (horizonte): posição e tamanho encolhem.
  const ponto = (lado: -1 | 1, i: number) => {
    const t = i / (N - 1), y = 230 - t * 170, meia = 640 - t * 600
    return { x: 720 + lado * meia, y, r: 5 - t * 3.6 }
  }
  return (
    <svg className="v2-pista-svg" viewBox="0 0 1440 230" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="v2-asfalto" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2740" /><stop offset="1" stopColor="#0f1829" />
        </linearGradient>
        <radialGradient id="v2-halo">
          <stop offset="0" stopColor="#ffd77a" stopOpacity=".9" /><stop offset="1" stopColor="#f5b942" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="v2-horiz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(120,160,220,0)" /><stop offset="1" stopColor="rgba(120,160,220,.18)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1440" height="62" fill="url(#v2-horiz)" />
      <line x1="0" y1="60" x2="1440" y2="60" stroke="rgba(160,190,235,.25)" strokeWidth="1" />
      <path d="M80,230 L680,60 L760,60 L1360,230 Z" fill="url(#v2-asfalto)" />
      {Array.from({ length: 9 }, (_, i) => {
        const t0 = i / 9, t1 = t0 + .055
        const y0 = 230 - t0 * 170, y1 = 230 - t1 * 170
        const w0 = 7 - t0 * 6, w1 = 7 - t1 * 6
        return <path key={i} d={`M${720 - w0},${y0} L${720 - w1},${y1} L${720 + w1},${y1} L${720 + w0},${y0} Z`} fill="rgba(255,255,255,.75)" />
      })}
      {luzes.map(i => ([-1, 1] as const).map(l => {
        const p = ponto(l, i)
        // O pulso corre de perto até o horizonte, no sentido da decolagem.
        const atraso = { animationDelay: `${(i * .11).toFixed(2)}s` }
        return (
          <g key={`${i}${l}`}>
            <circle className="v2-luzp-halo" cx={p.x} cy={p.y} r={p.r * 3.4} fill="url(#v2-halo)" style={atraso} />
            <circle className="v2-luzp" cx={p.x} cy={p.y} r={p.r} fill="#f5b942" style={{ ...atraso, ['--o' as string]: (.75 - i * .03).toFixed(2) }} />
          </g>
        )
      }))}
    </svg>
  )
}

/** Sorteio fixo (a mesma nuvem a cada visita): lóbulos de tamanhos diferentes. */
function sorteio(semente: number) {
  let t = semente
  return () => { t = (t * 9301 + 49297) % 233280; return t / 233280 }
}

/** Uma linha de topo de nuvem, de x0 a x1, feita de arcos de raios variados. */
function cristas(x0: number, x1: number, base: number, amp: number, rMin: number, rMax: number, semente: number) {
  const r = sorteio(semente)
  let x = x0, y = base - r() * amp
  let d = `M${x0},${y.toFixed(1)}`
  while (x < x1) {
    const raio = rMin + r() * (rMax - rMin)
    const dx = Math.min(raio * 2 * (.62 + r() * .3), x1 + rMax - x)
    const ny = base - r() * amp
    x += dx
    d += ` A${raio.toFixed(1)},${(raio * (.8 + r() * .35)).toFixed(1)} 0 0 1 ${x.toFixed(1)},${ny.toFixed(1)}`
    y = ny
  }
  return { d, xFim: x, yFim: y }
}

/** Um banco de nuvens que cobre a largura toda até o pé do desenho. */
function banco(largura: number, altura: number, base: number, amp: number, rMin: number, rMax: number, semente: number) {
  const c = cristas(-80, largura + 80, base, amp, rMin, rMax, semente)
  return `${c.d} L${c.xFim.toFixed(1)},${altura} L-80,${altura} Z`
}

/** Um cúmulo solto: topo em lóbulos e base levemente achatada. */
function cumulo(x: number, y: number, largura: number, altura: number, semente: number) {
  const c = cristas(x, x + largura, y, altura * .45, altura * .28, altura * .55, semente)
  return `${c.d} Q${(x + largura / 2).toFixed(1)},${(y + altura * .32).toFixed(1)} ${x},${y} Z`
}

/** Nuvens de tempestade, em camadas que derivam devagar. */
function NuvensEscuras() {
  return (
    <svg className="v2-nuvens" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs><filter id="v2-nevoa" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="7" /></filter></defs>
      <g filter="url(#v2-nevoa)">
        <path d={cumulo(-60, 170, 520, 150, 11)} fill="rgba(255,255,255,.06)" />
        <path d={cumulo(980, 330, 560, 170, 23)} fill="rgba(255,255,255,.05)" />
        <path d={cumulo(420, 860, 760, 200, 31)} fill="rgba(255,255,255,.06)" />
      </g>
      <g filter="url(#v2-nevoa)">
        <path d={cumulo(760, 120, 420, 130, 47)} fill="rgba(7,13,24,.22)" />
        <path d={cumulo(60, 650, 560, 160, 53)} fill="rgba(7,13,24,.2)" />
        <path d={cumulo(1080, 780, 480, 150, 61)} fill="rgba(7,13,24,.2)" />
      </g>
    </svg>
  )
}

const FORMAS_RAIO = [
  { d: 'M52,0 L40,62 L58,70 L30,150 L48,156 L22,236 L40,240 L14,340 M30,150 L70,196 L62,226', w: 96, h: 340 },
  { d: 'M30,0 L44,58 L28,64 L50,132 L34,138 L56,208 L40,212 L58,270', w: 72, h: 270 },
  { d: 'M40,0 L54,70 L34,78 L58,160 L40,166 L66,250 M58,160 L20,214 L28,232', w: 84, h: 250 },
]
type Raio = { id: number; x: number; y: number; forma: number; espelho: boolean }

/** Relâmpagos: nascem perto do mouse quando ele se mexe sobre o céu da primeira dobra. */
function Relampagos() {
  const ref = useRef<HTMLDivElement>(null)
  const [raios, setRaios] = useState<Raio[]>([])
  useEffect(() => {
    const ceu = ref.current?.parentElement
    if (!ceu) return
    let ultimo = 0, seq = 0, px = -1, py = -1
    const timers: number[] = []
    const disparar = (cx: number, cy: number) => {
      const r = ceu.getBoundingClientRect()
      const x = cx - r.left, y = cy - r.top
      const id = ++seq
      const forma = Math.floor(Math.random() * FORMAS_RAIO.length)
      // O raio cai do alto do céu até perto do mouse, um pouco ao lado dele.
      const raio = { id, x: x + (Math.random() < .5 ? -1 : 1) * (30 + Math.random() * 50), y: Math.max(0, y - FORMAS_RAIO[forma].h * .85), forma, espelho: Math.random() < .5 }
      setRaios(rs => [...rs.slice(-2), raio])
      timers.push(window.setTimeout(() => setRaios(rs => rs.filter(q => q.id !== id)), 1200))
    }
    const mover = (e: PointerEvent) => {
      const agora = performance.now()
      const dist = px < 0 ? 0 : Math.hypot(e.clientX - px, e.clientY - py)
      px = e.clientX; py = e.clientY
      if (e.pointerType === 'mouse' && (dist < 6 || agora - ultimo < 1100)) return
      if (e.pointerType !== 'mouse' && agora - ultimo < 1100) return
      ultimo = agora
      disparar(e.clientX, e.clientY)
    }
    const tocar = (e: PointerEvent) => { if (e.pointerType !== 'mouse' && performance.now() - ultimo > 700) { ultimo = performance.now(); disparar(e.clientX, e.clientY) } }
    ceu.addEventListener('pointermove', mover)
    ceu.addEventListener('pointerdown', tocar)
    return () => { ceu.removeEventListener('pointermove', mover); ceu.removeEventListener('pointerdown', tocar); timers.forEach(clearTimeout) }
  }, [])
  return (
    <div ref={ref} className="v2-tempestade" aria-hidden>
      {raios.map(r => {
        const f = FORMAS_RAIO[r.forma]
        return (
          <div key={r.id}>
            <div className="v2-clarao" style={{ background: `radial-gradient(circle 420px at ${r.x}px ${r.y + f.h * .5}px, rgba(190,210,255,.26), transparent 70%)` }} />
            <svg className="v2-raio" viewBox={`0 0 ${f.w} ${f.h}`} width={f.w} height={f.h}
              style={{ left: r.x - f.w / 2, top: r.y, transform: r.espelho ? 'scaleX(-1)' : undefined }}>
              <path d={f.d} fill="none" stroke="rgba(170,200,255,.75)" strokeWidth="7" strokeLinejoin="round" />
              <path d={f.d} fill="none" stroke="#f4f8ff" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        )
      })}
    </div>
  )
}

/** O sol acima das nuvens: aparece quando o voo chega lá. */
function SolAcimaDasNuvens() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { el?.classList.add('on'); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('on'); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className="v2-sol-ceu" aria-hidden />
}

/** A camada de nuvens vista de cima: onde a subida rompe para o céu claro. */
function TopoDasNuvens({ base, cor }: { base: string; cor: string }) {
  return (
    <svg className="v2-topo-nuvens" viewBox="0 0 1440 170" preserveAspectRatio="xMidYMax slice" aria-hidden style={{ background: base }}>
      <defs><filter id="v2-topo-suave"><feGaussianBlur stdDeviation="4" /></filter></defs>
      <path d={banco(1440, 170, 92, 34, 46, 92, 7)} fill="#a9cbef" filter="url(#v2-topo-suave)" />
      <path d={banco(1440, 170, 118, 30, 38, 78, 13)} fill="#c3dcf6" />
      <path d={banco(1440, 170, 142, 22, 30, 64, 29)} fill={cor} />
    </svg>
  )
}

/**
 * A primeira dobra mostra o app DE VERDADE (17/11/2026, pedido do Guilherme:
 * o quadro "Próximos meses" não existia no app). Capturas reais do
 * Planejamento, escolhido por ele ("é por onde tudo começa"), com a conta
 * fictícia "Ana Teste" (ambiente-teste). No celular, só o celular; no
 * computador, a tela do computador atrás e o celular na frente.
 */
function AppNaDobra() {
  const alt = 'Tela de Planejamento do Compass One: com quanto o ano termina se o plano se cumprir e com quanto cada mês termina'
  return (
    <figure className="v2-app" aria-label={alt}>
      <div className="v2-app-pc" aria-hidden><img src="/landing/plano-computador.webp" alt="" width={1600} height={1000} /></div>
      <div className="v2-app-cel"><img src="/landing/plano-celular.webp" alt={alt} width={585} height={1266} /></div>
      <figcaption>Tela real do app, com uma conta de exemplo.</figcaption>
    </figure>
  )
}

function TelaHoje() {
  return (
    <div className="v2-tela" role="img" aria-label="Exemplo da tela Início, com números fictícios: saldo de hoje, saldo final previsto e os automáticos do mês para conferir">
      <div className="v2-tela-t">Hoje · bancos e dinheiro <span>exemplo</span></div>
      <div className="v2-grande">R$ 4.820,35</div>
      <div className="v2-caixa"><span className="v2-rot">O mês termina com</span><b>R$ 3.912,10</b></div>
      <div style={{ marginTop: 14 }}>
        <div className="v2-lin"><span className="v2-bola ok"><i className="ti ti-check" /></span><span>Salário<small>dia 05 · conferido</small></span><span className="v" style={{ color: 'var(--verde-escuro)' }}>+ R$ 5.200,00</span></div>
        <div className="v2-lin"><span className="v2-bola" /><span>Aluguel<small>dia 10 · a conferir</small></span><span className="v">− R$ 1.650,00</span></div>
      </div>
    </div>
  )
}

function TelaPlanoDeVoo() {
  const v = [5.2, 6.1, 6.9, 8.0, 8.8, 9.9, 10.9, 12.0, 13.1, 14.6, 16.4, 18.45]
  const meses = 'JFMAMJJASOND'.split('')
  const x = (i: number) => 18 + i * 24, y = (n: number) => 130 - (n / 20) * 110
  const linha = v.map((n, i) => `${i ? 'L' : 'M'}${x(i)},${y(n).toFixed(1)}`).join(' ')
  return (
    <div className="v2-tela" role="img" aria-label="Exemplo do Planejamento, com números fictícios: se o plano se cumprir, o ano termina com R$ 18.450, subindo mês a mês">
      <div className="v2-tela-t">Se o plano se cumprir, o ano termina com <span>exemplo</span></div>
      <div className="v2-grande">R$ 18.450,00</div>
      <svg className="v2-graf" viewBox="0 0 300 150" style={{ marginTop: 10 }} aria-hidden>
        <path d={`${linha} L${x(11)},130 L${x(0)},130 Z`} fill="rgba(31,79,150,.12)" />
        <path d={linha} fill="none" stroke="#1f4f96" strokeWidth="3" strokeLinejoin="round" />
        <circle cx={x(9)} cy={y(v[9])} r="6" fill="#fff" stroke="#1f4f96" strokeWidth="3" />
        <text x={x(9)} y={y(v[9]) - 12} textAnchor="middle" style={{ fontWeight: 700, fill: '#0b2545' }}>hoje</text>
        {meses.map((m, i) => <text key={i} x={x(i)} y="146" textAnchor="middle">{m}</text>)}
      </svg>
    </div>
  )
}

function TelaRadarMeteorologico() {
  const meses = ['out', 'nov', 'dez', 'jan', 'fev', 'mar']
  const vals = [3912, 2650, -480, 1200, 2300, 3100]
  const zero = 108, k = 92 / 3912, larg = 32, passo = 46
  return (
    <div className="v2-tela" role="img" aria-label="Exemplo da previsão, com números fictícios: dezembro fica abaixo de zero, em menos R$ 480">
      <div className="v2-tela-t">Com quanto cada mês vai terminar <span>exemplo</span></div>
      <svg className="v2-graf" viewBox="0 0 300 170" aria-hidden>
        {vals.map((n, i) => {
          const xx = 16 + i * passo, h = Math.abs(n) * k
          return n < 0
            ? <rect key={i} x={xx} y={zero} width={larg} height={h} rx="3" fill="#b26b00" />
            : <rect key={i} x={xx} y={zero - h} width={larg} height={h} rx="3" fill={i === 0 ? '#0b2545' : '#1f4f96'} />
        })}
        <line x1="6" x2="294" y1={zero} y2={zero} stroke="#3d5170" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x="294" y={zero - 6} textAnchor="end">zero</text>
        <text x={16 + 2 * passo + larg / 2} y={zero + 480 * k + 20} textAnchor="middle" className="neg">− R$ 480</text>
        {meses.map((m, i) => <text key={m} x={16 + i * passo + larg / 2} y="164" textAnchor="middle">{m}</text>)}
      </svg>
      <div className="v2-aviso"><i className="ti ti-cloud-storm" /><div><b>Turbulência em dezembro</b>Você vê hoje, com dois meses para mudar a rota.</div></div>
    </div>
  )
}

function TelaPossoComprar() {
  return (
    <div className="v2-tela" role="img" aria-label="Exemplo do Posso comprar?, com números fictícios: uma geladeira de R$ 3.600 aperta à vista e cabe em 10 vezes de R$ 360">
      <div className="v2-tela-t">Posso comprar? · geladeira de R$ 3.600 <span>exemplo</span></div>
      <table className="v2-tab">
        <thead><tr><th>Como pagar</th><th>Total</th><th>No seu plano</th></tr></thead>
        <tbody>
          <tr><td>À vista</td><td>R$ 3.600</td><td className="v2-aperta">aperta</td></tr>
          <tr className="melhor"><td>10× de R$ 360</td><td>R$ 3.600</td><td className="v2-cabe">cabe · melhor</td></tr>
          <tr><td>12× de R$ 329</td><td>R$ 3.948</td><td className="v2-cabe">cabe</td></tr>
        </tbody>
      </table>
      <div className="v2-caixa"><span className="v2-rot">Meta de guardar R$ 500 por mês</span><b style={{ color: 'var(--verde-escuro)' }}>continua de pé</b></div>
    </div>
  )
}

function TelaDiario() {
  const grupos: [string, string, number, string, boolean][] = [
    ['Alimentação', 'resta R$ 380', 62, 'gastou R$ 620 de R$ 1.000', false],
    ['Transporte', 'resta R$ 145', 71, 'gastou R$ 355 de R$ 500', false],
    ['Lazer', 'passou R$ 90', 100, 'gastou R$ 390 de R$ 300', true],
    ['Moradia', '✓ pago', 100, 'R$ 2.100 de R$ 2.100', false],
  ]
  return (
    <div className="v2-tela" role="img" aria-label="Exemplo do Radar, com números fictícios: quanto resta em cada grupo de gastos no meio do mês">
      <div className="v2-tela-t">Radar · outubro até agora <span>exemplo</span></div>
      <div className="v2-grupos">
        {grupos.map(([n, d, w, s, p]) => (
          <div key={n} className={`v2-grupo${p ? ' passou' : ''}`}>
            <div className="v2-grupo-n">{n}</div><div className="v2-grupo-v">{d}</div>
            <div className="v2-trilho"><i style={{ width: `${w}%` }} /></div><small>{s}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function TelaCruzeiro() {
  const g = [8, 16, 24, 33, 41, 50, 58, 66, 75, 83, 92, 100]
  const meses = 'JFMAMJJASOND'.split('')
  return (
    <div className="v2-tela" style={{ background: '#fff', boxShadow: '0 18px 44px rgba(11,37,69,.14)' }} role="img" aria-label="Exemplo da meta de economia, com números fictícios: R$ 500 guardados por mês, R$ 6.000 até dezembro">
      <div className="v2-tela-t">Meta de economia · R$ 500 por mês <span>exemplo</span></div>
      <div className="v2-grande">R$ 6.000,00</div>
      <div className="v2-rot" style={{ marginTop: 4 }}>guardados até dezembro, se o plano se cumprir</div>
      <svg className="v2-graf" viewBox="0 0 300 130" style={{ marginTop: 14 }} aria-hidden>
        {g.map((h, i) => <rect key={i} x={6 + i * 24.5} y={110 - h} width="17" height={h} rx="3" fill={i === 11 ? '#0b2545' : '#7fa9dc'} />)}
        {meses.map((m, i) => <text key={i} x={14.5 + i * 24.5} y="126" textAnchor="middle">{m}</text>)}
      </svg>
    </div>
  )
}

const ETAPAS = [
  { alt: 3000, icone: 'ti-plane-departure', altura: '3.000 pés · decolagem', titulo: 'Saiba exatamente onde você está',
    texto: 'Bancos, cartões e dinheiro num só lugar, com o saldo de hoje e as contas do mês. Salário e débito automático aparecem no dia certo: você confere com um toque.', visual: <TelaHoje /> },
  { alt: 10000, icone: 'ti-route', altura: '10.000 pés · plano de voo', titulo: 'Defina a rota do seu ano',
    texto: 'Um plano com quanto gastar em cada categoria e quanto guardar por mês. Quem escolhe o destino é você; o Compass desenha a rota e mostra com quanto o ano termina.', visual: <TelaPlanoDeVoo /> },
  { alt: 18000, icone: 'ti-radar-2', altura: '18.000 pés · radar meteorológico', titulo: 'Veja a turbulência antes de entrar nela',
    texto: 'Com o que você planejou e o que já está lançado, como parcelas e contas fixas, o Compass mostra com quanto cada um dos próximos meses vai terminar. O mês no vermelho aparece com tempo de mudar a rota.', visual: <TelaRadarMeteorologico /> },
  { alt: 24000, icone: 'ti-compass', altura: '24.000 pés · antes de mudar a rota', titulo: 'Antes de comprar, consulte a bússola',
    texto: 'Digite o valor e as opções da loja. O Compass coloca a compra no seu plano, mês a mês, e mostra se ela tira você da rota e qual forma de pagar pesa menos.', visual: <TelaPossoComprar /> },
  { alt: 30000, icone: 'ti-notebook', altura: '30.000 pés · diário de bordo', titulo: 'Confira se segue na rota',
    texto: 'Anote um gasto em segundos, no celular ou no computador. O Radar mostra, no meio do mês, quanto ainda resta em cada grupo, e o plano se ajusta para os próximos meses.', visual: <TelaDiario /> },
]

const BAGAGEM = [
  { icone: 'ti-plus', titulo: 'Lançar rápido', texto: 'Débito ou crédito, parcelado em até 24×, na fatura certa.' },
  { icone: 'ti-users', titulo: 'Conta compartilhada', texto: 'As mesmas finanças para a família, cada um com o seu login.' },
  { icone: 'ti-devices', titulo: 'Celular e computador', texto: 'Instale no celular e entre com a digital.' },
]

const LINKS: [string, string][] = [['#turbulencia', 'O voo'], ['#instrumentos', 'Instrumentos'], ['#embarque', 'Embarque'], ['#perguntas', 'Dúvidas']]
const ALT_MAX = 35000

/** O altímetro: interpola a altitude entre os marcos [data-alt] da página. */
function useAltitude() {
  const [alt, setAlt] = useState(0)
  useEffect(() => {
    let marcos: { y: number; alt: number }[] = []
    let quadro = 0
    const medir = () => {
      marcos = [...document.querySelectorAll<HTMLElement>('[data-alt]')]
        .map(el => ({ y: el.getBoundingClientRect().top + window.scrollY, alt: Number(el.dataset.alt) }))
        .sort((a, b) => a.y - b.y)
      // O topo da página lê 0 pés: o primeiro marco fica onde o olho está ao abrir.
      if (marcos[0]) marcos[0].y = Math.max(marcos[0].y, window.innerHeight * .45)
    }
    const calcular = () => {
      quadro = 0
      const pos = window.scrollY + window.innerHeight * .45
      let v = 0
      if (marcos.length) {
        if (pos <= marcos[0].y) v = marcos[0].alt
        else if (pos >= marcos[marcos.length - 1].y) v = marcos[marcos.length - 1].alt
        else for (let i = 1; i < marcos.length; i++) {
          const a = marcos[i - 1], b = marcos[i]
          if (pos <= b.y) { v = a.alt + (b.alt - a.alt) * ((pos - a.y) / Math.max(1, b.y - a.y)); break }
        }
      }
      setAlt(Math.round(v / 100) * 100)
    }
    const agendar = () => { if (!quadro) quadro = requestAnimationFrame(calcular) }
    const tudo = () => { medir(); agendar() }
    tudo()
    const t = window.setTimeout(tudo, 600) // depois das fontes
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', tudo)
    return () => { window.clearTimeout(t); cancelAnimationFrame(quadro); window.removeEventListener('scroll', agendar); window.removeEventListener('resize', tudo) }
  }, [])
  return { alt }
}

export default function LandingPageV2() {
  const ano = new Date().getFullYear()
  const { alt } = useAltitude()
  const cadastro = hrefDoApp('/cadastro', codigoRecebido())
  const login = hrefDoApp('/login', codigoRecebido())
  const raiz = useRef<HTMLDivElement>(null)

  // O index.html traz a v1 pré-renderizada; aqui ela sai de cena.
  useLayoutEffect(() => { tirarApresentacaoEstatica() }, [])
  // Prévia: fora do Google enquanto a v1 é a página principal.
  useEffect(() => {
    const existente = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const meta = existente ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'robots' }))
    const antes = existente?.content
    meta.content = 'noindex, nofollow'
    const titulo = document.title
    document.title = 'Compass One · Planejamento e educação financeira'
    return () => {
      if (antes !== undefined) meta.content = antes
      else meta.remove()
      document.title = titulo
    }
  }, [])

  const altTexto = alt.toLocaleString('pt-BR')
  return (
    <div className="v2" ref={raiz}>
      <style>{CSS}</style>

      <div className="v2-alt" aria-hidden>
        <small>ALTITUDE</small><b>{altTexto}</b><span>pés</span>
        <div className="v2-fita"><i style={{ height: `${(alt / ALT_MAX) * 100}%` }} /></div>
      </div>

      <header className="v2-pista" data-alt="0">
        <Relampagos />
        <div className="v2-in">
          <nav className="v2-nav" aria-label="Principal">
            <Link to="/" className="v2-marca" aria-label="Compass One, página inicial"><LogoCompass size={34} /><NomeCompass /></Link>
            <div className="v2-menu">{LINKS.map(([h, t]) => <a key={h} href={h}>{t}</a>)}</div>
            <div className="v2-acoes">
              <a href={login} className="v2-entrar">Entrar</a>
              <a href={cadastro} className="v2-btn v2-btn-claro">Criar conta grátis</a>
            </div>
          </nav>
          <div className="v2-hero">
            <div>
              <h1>Prepare a <em>decolagem</em> da sua vida financeira.</h1>
              <p className="v2-hero-sub">Antes da decolagem sempre bate aquele frio na barriga: será que vai subir?</p>
              <p>
                Na vida financeira, a tempestade é a falta de controle e de planejamento. Contas, parcelas e imprevistos
                formam a tempestade. Com um planejamento financeiro, você decola sabendo por onde passar e onde ela
                termina. O Compass One é a bússola financeira criada por um educador financeiro para isso. Está na hora
                de mudar.
              </p>
              <div className="v2-ctas">
                <a href={cadastro} className="v2-btn v2-btn-claro">Criar conta grátis <i className="ti ti-arrow-right" /></a>
                <a href={login} className="v2-btn v2-btn-linha">Já tenho conta</a>
              </div>
              <ul className="v2-selos">
                <li><i className="ti ti-gift" />Sem mensalidade</li>
                <li><i className="ti ti-ad-off" />Sem anúncios</li>
                <li><i className="ti ti-lock" />Não pede a senha do banco</li>
                <li><i className="ti ti-school" />Criado por um educador financeiro</li>
              </ul>
            </div>
            <AppNaDobra />
          </div>
        </div>
        <Pista />
      </header>

      <main>
        <section className="v2-sec v2-turb" id="turbulencia" aria-labelledby="t-turb" data-alt="1200">
          <NuvensEscuras />
          <div className="v2-in">
            <h2 className="v2-h2" id="t-turb">Você já decolou. Mas o voo nunca fica tranquilo.</h2>
            <p className="v2-lead">Eu sei: você já se organiza por conta própria, anota o que entra e o que sai. Mesmo assim, a viagem é sempre turbulenta, o combustível acaba no meio do caminho e, quando você percebe, a conta já está no vermelho.</p>
            <ul className="v2-alertas">
              {[['ti-gas-station', 'Combustível no fim', 'O que você recebe some antes de o mês terminar.'],
                ['ti-cloud-storm', 'Turbulência inesperada', 'A fatura do cartão chega maior do que você imaginava.'],
                ['ti-help-circle', 'Voo sem instrumentos', 'Toda compra vem com a dúvida: será que dá?'],
                ['ti-pig-money', 'Sem reserva de combustível', 'Você quer guardar, mas o dinheiro nunca chega até lá.'],
                ['ti-route', 'Sem rota definida', 'Você não sabe se o próximo mês vai ser melhor ou pior que este.'],
              ].map(([ic, t, d]) => <li key={t}><i className={`ti ${ic}`} aria-hidden /><span><b>{t}</b><span className="v2-alerta-d">{d}</span></span></li>)}
            </ul>
            <p className="v2-virada">
              Chegou a hora de subir de nível.
              <span>Comece a pilotar sua vida financeira e contorne as turbulências. Conheça o Compass One.</span>
            </p>
          </div>
        </section>

        <section className="v2-sec v2-subida" id="instrumentos" aria-labelledby="t-subida">
          <div className="v2-in">
            <h2 className="v2-h2" id="t-subida">A subida, instrumento por instrumento</h2>
            <p className="v2-lead">Cada ferramenta do Compass mostra onde está o seu dinheiro hoje e para onde ele vai, para você decidir com antecedência.</p>
            <ol className="v2-etapas">
              {ETAPAS.map(e => (
                <li key={e.alt} className="v2-etapa" data-alt={e.alt}>
                  <span className="v2-marco" aria-hidden><i className={`ti ${e.icone}`} /></span>
                  <div className="v2-etapa-in">
                    <div>
                      <h3>{e.titulo}</h3>
                      <span className="v2-altura"><i className="ti ti-gauge" aria-hidden />{e.altura}</span>
                      <p>{e.texto}</p>
                    </div>
                    {e.visual}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <TopoDasNuvens base="linear-gradient(180deg, #1d4a8c 0%, #6f9fd6 60%, #c7e0f7 100%)" cor="#dcecfb" />

        <section className="v2-sec v2-cruzeiro" id="cruzeiro" aria-labelledby="t-cruz" data-alt="35000">
          <SolAcimaDasNuvens />
          <div className="v2-in">
            <div className="v2-cruz-in">
              <div>
                <h2 className="v2-h2" id="t-cruz">Acima das nuvens, o voo fica tranquilo</h2>
                <p className="v2-lead">
                  O destino é o dinheiro que sobra de propósito: a meta de economia que você escolhe e acompanha mês a mês.
                  Um caminho mais tranquilo para você e para a sua família.
                </p>
                <span className="v2-destino"><i className="ti ti-plane-inflight" />Você escolhe o destino. O Compass mostra a rota.</span>
              </div>
              <TelaCruzeiro />
            </div>

            <div className="v2-comp">
              <div className="v2-janela">
                <h3>Sem plano, olhando pela janela</h3>
                <p className="v2-comp-sub">A turbulência aparece quando você já está nela.</p>
                <ul>
                  <li><i className="ti ti-eye-off" />Você sabe quanto já gastou, não com quanto vai terminar</li>
                  <li><i className="ti ti-cloud-storm" />O aperto aparece quando o mês já acabou</li>
                  <li><i className="ti ti-help" />Comprar ou esperar? Decide no escuro</li>
                  <li><i className="ti ti-coin-off" />Guardar fica para quando sobrar, e não sobra</li>
                </ul>
              </div>
              <div className="v2-instr">
                <h3>Com planejamento, voando por instrumentos</h3>
                <p className="v2-comp-sub">Você vê a rota antes.</p>
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

        <section className="v2-sec v2-claro" id="comecar" aria-labelledby="t-check">
          <div className="v2-in">
            <h2 className="v2-h2" id="t-check">Checklist antes da decolagem</h2>
            <p className="v2-lead">Sem planilha e sem precisar entender de finanças. Tudo pode ser aproximado e ajustado depois.</p>
            <ol className="v2-check">
              {[
                { t: 'Conte um pouco sobre você', p: 'Bancos e saldos, quanto recebe, cartões e as contas que paga todo mês. Uma pergunta por tela.', a: ['Quanto você recebe?', 'R$ 5.200'], b: ['Aluguel · dia 10', 'R$ 1.650'] },
                { t: 'Receba o plano de voo', p: 'O Compass monta um plano de 12 meses com o que você contou e mostra quanto sobra por mês.', a: ['Plano de nov a out', '12 meses'], b: ['Sobra por mês', 'R$ 640'] },
                { t: 'Voe com os instrumentos', p: 'Anote os gastos, confira os saldos e, antes de comprar, pergunte ao simulador.', a: ['Geladeira em 10×', 'cabe'], b: ['Meta de R$ 500', 'de pé'] },
              ].map((c, i) => (
                <li key={c.t}>
                  <span className="v2-check-box" aria-hidden><i className="ti ti-check" /></span>
                  <div className="v2-check-txt"><span className="v2-check-n">{i + 1}. {c.t}</span><p>{c.p}</p></div>
                  <dl className="v2-check-mini"><div><dt>{c.a[0]}</dt><dd>{c.a[1]}</dd></div><div><dt>{c.b[0]}</dt><dd>{c.b[1]}</dd></div></dl>
                </li>
              ))}
            </ol>
            <div className="v2-bancos">
              <p>Funciona com o seu banco, qualquer que seja, e com o dinheiro da carteira:</p>
              <div className="v2-chips">
                {['Nubank', 'Itaú', 'Bradesco', 'Caixa', 'Banco do Brasil', 'Inter', 'Santander', 'Sicredi', 'Sicoob', 'C6', 'Mercado Pago', 'PicPay', 'Dinheiro'].map(b => <span key={b}>{b}</span>)}
              </div>
            </div>

            <h2 className="v2-h2" style={{ marginTop: 110 }} id="t-bag">Na bagagem de mão</h2>
            <p className="v2-lead">O que mais vai junto, para o dia a dia.</p>
            <ul className="v2-bagagem" aria-labelledby="t-bag">
              {BAGAGEM.map(b => <li key={b.titulo}><i className={`ti ${b.icone}`} aria-hidden /><div><h3>{b.titulo}</h3><p>{b.texto}</p></div></li>)}
            </ul>
          </div>
        </section>

        <section className="v2-sec v2-claro2" id="embarque" aria-labelledby="t-emb">
          <div className="v2-in">
            <h2 className="v2-h2" id="t-emb">O seu cartão de embarque</h2>
            <p className="v2-lead">O app de planejamento é grátis para sempre. Se quiser aprender com um educador financeiro, você escolhe o quanto, em pacotes. Sem mensalidade.</p>
            <div className="v2-cartao">
              <div className="v2-cartao-main">
                <div className="v2-cartao-topo"><span>Compass One · cartão de embarque</span><i className="ti ti-plane-departure" aria-hidden /></div>
                <div className="v2-campos">
                  <div><span>Passageiro</span><b>Você</b></div>
                  <div><span>Destino</span><b>Acima das nuvens</b></div>
                  <div><span>Classe</span><b>Acesso completo</b></div>
                  <div><span>Tarifa</span><b>R$ 0, para sempre</b></div>
                </div>
                <ul className="v2-incluso">
                  {['Previsão de como o mês vai fechar', 'Posso comprar? antes de decidir', 'Planejamento anual e meta de economia', 'Conta compartilhada com a família'].map(t => <li key={t}><i className="ti ti-circle-check" aria-hidden />{t}</li>)}
                </ul>
                <a href={cadastro} className="v2-btn v2-btn-escuro">Criar conta grátis <i className="ti ti-arrow-right" /></a>
              </div>
              <div className="v2-canhoto">
                <ul>
                  <li><i className="ti ti-ad-off" aria-hidden />Sem anúncios</li>
                  <li><i className="ti ti-credit-card-off" aria-hidden />Sem cartão de crédito</li>
                  <li><i className="ti ti-lock" aria-hidden />Não pede a senha do banco</li>
                  <li><i className="ti ti-gift" aria-hidden />Sem limite de uso</li>
                </ul>
                <div className="v2-portao">
                  <div><span>Portão</span><b>app.compass-one.com.br</b></div>
                  <div><span>Embarque</span><b>Quando quiser</b></div>
                </div>
              </div>
            </div>

            <div className="v2-copiloto">
              <h3>Educação financeira: quer um copiloto?</h3>
              <p>É opcional. Para aprender a cuidar do seu dinheiro, um educador financeiro voa junto, no quanto de ajuda que você escolher, em pacotes e sem mensalidade:</p>
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
        </section>

        <section className="v2-sec v2-claro" id="perguntas" aria-labelledby="t-faq">
          <div className="v2-in">
            <h2 className="v2-h2" id="t-faq" style={{ textAlign: 'center' }}>Perguntas frequentes</h2>
            <div className="v2-faq">
              {PERGUNTAS_FREQUENTES.map(p => <details key={p.pergunta}><summary>{p.pergunta}</summary><p>{p.resposta}</p></details>)}
            </div>
            <div className="v2-suporte">
              <div><b>Ainda com dúvidas?</b><p>Escreva para o nosso suporte.</p></div>
              <a href="mailto:suporte@compassone.app" className="v2-btn v2-btn-escuro" style={{ minHeight: 44, padding: '10px 20px', fontSize: 15 }}>Falar com o suporte</a>
            </div>
          </div>
        </section>

        {/* No celular, o cadastro fica à mão depois do topo e sai antes da chamada final. */}
        <div className="v2-fixo">
          <div className="v2-fixo-in">
            <span className="v2-alt-cel" aria-hidden><small>ALT</small><b>{altTexto}</b><small>pés</small></span>
            <a href={cadastro} className="v2-btn v2-btn-claro">Criar conta grátis <i className="ti ti-arrow-right" /></a>
          </div>
        </div>

        <section className="v2-sec v2-fim" aria-labelledby="t-fim">
          <div className="v2-in v2-sol">
            <h2 className="v2-h2" id="t-fim">Comece hoje e descubra como o seu mês vai fechar</h2>
            <p className="v2-lead">Crie a sua conta grátis no app de planejamento financeiro e veja com quanto termina cada um dos próximos meses.</p>
            <a href={cadastro} className="v2-btn v2-btn-claro">Criar conta grátis <i className="ti ti-arrow-right" /></a>
            <ul className="v2-selos">
              <li><i className="ti ti-gift" />Sem mensalidade</li>
              <li><i className="ti ti-ad-off" />Sem anúncios</li>
              <li><i className="ti ti-lock" />Não pede a senha do banco</li>
            </ul>
          </div>
          <svg className="v2-fim-svg" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" aria-hidden>
            <defs><filter id="v2-fim-suave"><feGaussianBlur stdDeviation="5" /></filter></defs>
            <path d={banco(1440, 200, 96, 40, 56, 118, 5)} fill="#e7a978" filter="url(#v2-fim-suave)" />
            <path d={banco(1440, 200, 128, 34, 44, 96, 17)} fill="#f3c9a0" />
            <path d={banco(1440, 200, 160, 26, 34, 74, 37)} fill="#fbe3cb" />
          </svg>
        </section>
      </main>

      <footer className="v2-rodape">
        <div className="v2-in v2-rodape-in">
          <Link to="/" className="v2-marca" aria-label="Compass One"><LogoCompass size={30} /><NomeCompass /></Link>
          <nav aria-label="Rodapé">{LINKS.map(([h, t]) => <a key={h} href={h}>{t}</a>)}</nav>
          <a href={cadastro} className="v2-btn v2-btn-claro" style={{ minHeight: 44, padding: '10px 18px', fontSize: 15 }}>Criar conta grátis</a>
        </div>
        <div className="v2-in v2-rodape-fim">
          <span>© {ano} Compass One · A bússola do seu dinheiro.</span>
          <span style={{ display: 'flex', gap: 18 }}><Link to="/privacidade">Política de privacidade</Link><Link to="/termos">Termos de uso</Link></span>
        </div>
      </footer>
    </div>
  )
}
