import { useLayoutEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/barlow-condensed/700.css'
import { LogoCompass, NomeCompass } from '../components/LogoCompass'
import { tirarApresentacaoEstatica } from '../utils/apresentacaoEstatica'
import { hrefDoApp } from '../utils/site'
import { entrarNaListaDeEspera, validarInscricao, type Inscricao } from '../utils/listaEspera'

/**
 * "Fale com o Educador" (18/11/2026, pedido do Guilherme): a página do site
 * público (www) para onde o botão do app leva, com as três formas de
 * aprender com o educador financeiro: o e-book do passo a passo, o grupo de
 * estudos e a sessão de diagnóstico. No tema do voo da apresentação v2.
 *
 * Nada aqui promete resultado: o que se oferece é aprender e ter clareza.
 * Educação financeira, nunca recomendação de investimento.
 *
 * A sessão vai para o WhatsApp com a mensagem pronta; o grupo tem a lista de
 * espera gravada no banco (listaEspera.ts, migração 027), para o aviso quando
 * abrir; o e-book e o individual também vão para o WhatsApp até haver o link
 * de venda (20/11/2026: e-mail no celular perde gente no caminho).
 */

/** Quem conduz (decisão de 16/11/2026: foto e nome). Para a foto, salvar em public/ e preencher `foto`. */
const EDUCADOR: { nome: string; foto: string | null } = { nome: 'Guilherme', foto: null }

/** WhatsApp do educador (18/11/2026): agenda a sessão e recebe a lista de espera do grupo. */
const WHATSAPP = '5547988231323'
const whatsapp = (texto: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`

type Opcao = {
  id: string
  icone: string
  rotulo: string
  nome: string
  texto: string
  itens: string[]
  preco: string
  precoNota: string
  selo?: string
  botao: string
  href: string
}

const OPCOES: Opcao[] = [
  {
    id: 'ebook',
    icone: 'ti-book-2',
    rotulo: 'Manual de bordo',
    nome: 'E-book: o mês previsível, passo a passo',
    texto: 'O método para planejar o mês e saber como ele fecha, usando o Compass One tela por tela, no seu ritmo.',
    itens: ['Do cadastro das contas ao primeiro plano', 'Como ler o Radar e a previsão do mês', 'Simulador: saber se cabe antes de comprar'],
    preco: 'R$ 97,00',
    precoNota: 'pagamento único',
    botao: 'Quero o e-book',
    href: whatsapp('Olá! Quero o e-book do Compass One.'),
  },
  {
    id: 'grupo',
    icone: 'ti-users-group',
    rotulo: 'Voo em grupo',
    nome: 'Grupo de estudos',
    texto: 'Um grupo no WhatsApp para estudar junto com outras pessoas e tirar dúvidas com o educador. Depois, encontros semanais.',
    itens: ['Grupo no WhatsApp com o educador', 'Encontros semanais online', 'Troca com quem está no mesmo caminho'],
    preco: 'Em formação',
    precoNota: 'entre na lista e avisamos por e-mail ou WhatsApp quando abrir',
    selo: 'Em breve',
    botao: 'Entrar na lista de espera',
    href: '#lista-grupo',
  },
  {
    id: 'diagnostico',
    icone: 'ti-route',
    rotulo: 'Primeiro passo',
    nome: 'Sessão de diagnóstico',
    texto: '45 minutos, online, só você e eu. Olhamos juntos os seus números e você sai com o plano do mês e as 3 primeiras ações.',
    itens: ['Encontro individual de 45 minutos', 'Online, no horário combinado', 'Plano do mês e as 3 primeiras ações'],
    preco: 'R$ 247,00',
    precoNota: 'por sessão · combinamos o horário pelo WhatsApp',
    selo: 'Comece por aqui',
    botao: 'Quero agendar',
    href: whatsapp('Olá! Quero agendar uma sessão de diagnóstico de 45 minutos.'),
  },
  {
    id: 'individual',
    icone: 'ti-user-check',
    rotulo: 'Plano de voo individual',
    nome: 'Acompanhamento individual',
    texto: 'Dez encontros só seus para colocar a vida financeira em ordem com calma: o plano do mês, as dívidas, as metas e o hábito de acompanhar.',
    itens: ['10 encontros individuais, online', 'O e-book e o grupo de estudos incluídos', 'Acesso direto ao educador'],
    preco: 'Sob consulta',
    precoNota: 'conversamos pelo WhatsApp sobre o seu momento',
    botao: 'Quero conversar',
    href: whatsapp('Olá! Quero saber mais sobre o acompanhamento individual de 10 encontros.'),
  },
]

/** Como funciona a sessão de diagnóstico, em três passos. */
const PASSOS = [
  { icone: 'ti-brand-whatsapp', titulo: 'Você chama no WhatsApp', texto: 'Combinamos o dia e o horário da sessão.' },
  { icone: 'ti-video', titulo: 'Olhamos os seus números juntos', texto: 'Salário, contas, cartão e dívidas, com calma e sem julgamento.' },
  { icone: 'ti-list-check', titulo: 'Você sai com um rumo', texto: 'O plano do mês e as 3 primeiras ações para colocar em prática.' },
]

const PERGUNTAS = [
  { p: 'Preciso usar o Compass One?', r: 'Não é obrigatório, mas ajuda: com o app, olhamos os seus números já organizados. Ele é grátis, para sempre.' },
  { p: 'É recomendação de investimento?', r: 'Não. É educação financeira: você aprende a entender os seus números e toma as suas decisões.' },
  { p: 'Como marco o horário e pago?', r: 'Pelo WhatsApp: combinamos o horário e a forma de pagamento antes da sessão.' },
  { p: 'Os encontros são online?', r: 'Sim, por vídeo, no horário combinado. Funciona do celular ou do computador.' },
]

const CSS = `
.fe { --noite: #0b1322; --noite2: #18233a; --claro: #dcecfb; --claro2: #eaf4fe; --tinta: #0b2545; --tinta2: #3d5170; --ambar: #f5b942; --ambar-escuro: #9a5b00;
  font-family: 'Barlow', -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--tinta); background: var(--claro2); min-height: 100vh;
  overflow-x: hidden; overflow-x: clip; -webkit-font-smoothing: antialiased; }
.fe * { box-sizing: border-box; }
.fe a { color: inherit; }
.fe a:focus-visible { outline: 3px solid var(--ambar); outline-offset: 3px; border-radius: 8px; }
.fe h1, .fe h2, .fe h3 { text-wrap: balance; }
.fe p, .fe li { text-wrap: pretty; }
.fe-in { max-width: 1140px; margin: 0 auto; padding: 0 20px; position: relative; }
.fe-cond { font-family: 'Barlow Condensed', 'Barlow', sans-serif; }

.fe-topo { position: relative; background: linear-gradient(180deg, var(--noite) 0%, var(--noite2) 55%, #1f4f96 100%); color: #fff; padding-bottom: 120px; overflow: hidden; }
.fe-nav { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 0; position: relative; z-index: 2; }
.fe-marca { display: flex; align-items: center; gap: 10px; font-size: 20px; text-decoration: none; min-height: 44px; }
.fe-voltar { min-height: 44px; display: inline-flex; align-items: center; gap: 8px; padding: 0 16px; border-radius: 10px;
  border: 1.5px solid rgba(255,255,255,.45); text-decoration: none; font-weight: 600; font-size: 15px; color: #fff !important; }
.fe-hero { position: relative; z-index: 2; padding-top: 40px; max-width: 720px; }
.fe-olho { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; letter-spacing: .14em; color: var(--ambar); margin-bottom: 16px; }
.fe-hero h1 { font-family: 'Barlow Condensed', 'Barlow', sans-serif; font-weight: 700; font-size: 44px; line-height: 1; letter-spacing: -.01em; margin: 0 0 18px; }
.fe-hero h1 em { font-style: normal; color: var(--ambar); }
.fe-hero p { font-size: 18px; line-height: 1.6; color: rgba(255,255,255,.88); margin: 0; }
.fe-rota { position: absolute; right: -40px; top: 70px; width: 520px; height: 300px; opacity: .55; z-index: 1; display: none; }
.fe-nuvens { position: absolute; left: 0; right: 0; bottom: -1px; width: 100%; height: 90px; z-index: 1; }

.fe-cartoes { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; margin-top: -72px; position: relative; z-index: 3; }
.fe-cartao { background: #fff; border-radius: 18px; padding: 26px 22px 22px; box-shadow: 0 18px 40px rgba(11,37,69,.14); border: 1px solid #c9dcf2;
  display: flex; flex-direction: column; position: relative; }
.fe-cartao.destaque { border: 2px solid var(--tinta); }
.fe-ic { width: 52px; height: 52px; border-radius: 14px; background: var(--noite); color: var(--ambar); display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
.fe-rot { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ambar-escuro); margin: 0 0 6px; }
.fe-cartao h2 { font-family: 'Barlow Condensed', 'Barlow', sans-serif; font-size: 28px; line-height: 1.05; margin: 0 0 10px; }
.fe-cartao > p { font-size: 16px; line-height: 1.55; color: var(--tinta2); margin: 0 0 16px; }
.fe-cartao ul { list-style: none; padding: 0; margin: 0 0 22px; display: grid; gap: 9px; font-size: 15px; color: var(--tinta); }
.fe-cartao li { display: flex; gap: 9px; align-items: flex-start; }
.fe-cartao li i { color: #15803d; font-size: 18px; margin-top: 1px; flex-shrink: 0; }
.fe-preco { margin-top: auto; padding-top: 16px; border-top: 1px dashed #c9dcf2; margin-bottom: 16px; }
.fe-preco b { display: block; font-family: 'Barlow Condensed', 'Barlow', sans-serif; font-size: 32px; line-height: 1.05; color: var(--tinta); }
.fe-preco span { font-size: 14px; color: var(--tinta2); }
.fe-selo { position: absolute; top: 20px; right: 18px; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 99px; background: #fff4dc; color: var(--ambar-escuro); }
.fe-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 12px 22px; border-radius: 10px;
  font-weight: 700; font-size: 16px; text-decoration: none; transition: transform .25s cubic-bezier(.16,1,.3,1); }
.fe-btn:hover { transform: translateY(-2px); }
.fe-btn-escuro { background: var(--noite); color: #fff !important; box-shadow: 0 10px 24px rgba(11,19,34,.22); }
.fe-btn-linha { color: var(--tinta) !important; border: 1.5px solid var(--tinta); }

.fe-form { display: grid; gap: 10px; }
.fe-form label { display: grid; gap: 4px; font-size: 14px; font-weight: 600; color: var(--tinta); }
.fe-form label small { font-weight: 500; color: var(--tinta2); }
.fe-form input { min-height: 46px; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #9fb6d3; font: inherit; font-size: 16px; color: var(--tinta); background: #fff; }
.fe-form input:focus { outline: 3px solid var(--ambar); outline-offset: 1px; border-color: var(--tinta); }
.fe-form button { cursor: pointer; border: none; font-family: inherit; }
.fe-erro { margin: 0; font-size: 14px; color: #b91c1c; font-weight: 600; }
.fe-cartao .fe-ok { margin: 0; display: flex; gap: 10px; align-items: flex-start; padding: 14px; border-radius: 12px; background: #f0fdf4; color: #14532d; font-size: 15px; line-height: 1.45; }
.fe-cartao .fe-ok i { font-size: 22px; color: #15803d; flex-shrink: 0; }
.fe-letra { margin: 0; font-size: 13px; color: var(--tinta2); line-height: 1.45; }
.fe-sec { padding: 64px 0 24px; }
.fe-nota { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; align-items: center; background: #fff; border-radius: 18px; padding: 24px 22px; border: 1px solid #c9dcf2; }
.fe-nota h3 { font-family: 'Barlow Condensed', 'Barlow', sans-serif; font-size: 24px; margin: 0 0 6px; }
.fe-nota p { margin: 0; font-size: 16px; line-height: 1.55; color: var(--tinta2); }
.fe-rodape { padding: 32px 0 40px; font-size: 14px; color: var(--tinta2); }
.fe-rodape .fe-in { display: flex; flex-wrap: wrap; gap: 12px 24px; justify-content: space-between; }
.fe-rodape nav { display: flex; gap: 18px; }

.fe-h2 { font-family: 'Barlow Condensed', 'Barlow', sans-serif; font-size: 34px; line-height: 1.05; margin: 0 0 22px; color: var(--tinta); }
.fe-passos { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; counter-reset: passo; }
.fe-passos li { background: #fff; border: 1px solid #c9dcf2; border-radius: 16px; padding: 20px; display: grid; grid-template-columns: 44px 1fr; gap: 14px; align-items: start; }
.fe-passos li > i { width: 44px; height: 44px; border-radius: 12px; background: var(--noite); color: var(--ambar); display: grid; place-items: center; font-size: 22px; }
.fe-passos b { display: block; font-size: 17px; color: var(--tinta); margin-bottom: 4px; }
.fe-passos span { font-size: 15px; line-height: 1.5; color: var(--tinta2); }
.fe-paraquem { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.fe-paraquem > div { background: #fff; border: 1px solid #c9dcf2; border-radius: 16px; padding: 22px; }
.fe-paraquem h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 18px; }
.fe-paraquem p { margin: 0; font-size: 16px; line-height: 1.55; color: var(--tinta2); }
.fe-sim i { color: #15803d; } .fe-nao i { color: #b91c1c; }
.fe-faq { display: grid; gap: 10px; max-width: 820px; }
.fe-faq details { background: #fff; border: 1px solid #c9dcf2; border-radius: 14px; padding: 0 20px; }
.fe-faq summary { cursor: pointer; min-height: 52px; display: flex; align-items: center; font-weight: 700; font-size: 16px; color: var(--tinta); }
.fe-faq summary:focus-visible { outline: 3px solid var(--ambar); outline-offset: 3px; border-radius: 8px; }
.fe-faq details p { margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: var(--tinta2); }
.fe-quem { display: flex; gap: 18px; align-items: flex-start; }
.fe-foto { flex-shrink: 0; width: 76px; height: 76px; border-radius: 50%; object-fit: cover; background: var(--noite); color: var(--ambar);
  display: grid; place-items: center; font-family: 'Barlow Condensed', sans-serif; font-size: 38px; font-weight: 700; box-shadow: 0 0 0 3px var(--ambar); }
@media (min-width: 880px) {
  .fe-hero h1 { font-size: 60px; }
  .fe-rota { display: block; }
  .fe-cartoes { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
  .fe-nota { grid-template-columns: minmax(0, 1fr) auto; padding: 28px 32px; }
  .fe-passos { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .fe-paraquem { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) { .fe-btn { transition: none; } }
`

export default function FaleComEducador() {
  useLayoutEffect(() => { tirarApresentacaoEstatica() }, [])
  useLayoutEffect(() => {
    const antes = document.title
    document.title = 'Fale com o Educador · Compass One'
    return () => { document.title = antes }
  }, [])
  const ano = new Date().getFullYear()

  return (
    <div className="fe">
      <style>{CSS}</style>

      <header className="fe-topo">
        <div className="fe-in">
          <nav className="fe-nav" aria-label="Principal">
            <Link to="/" className="fe-marca" aria-label="Compass One"><LogoCompass size={34} /><NomeCompass /></Link>
            <a href={hrefDoApp('/')} className="fe-voltar"><i className="ti ti-arrow-left" aria-hidden />Voltar ao app</a>
          </nav>
          <div className="fe-hero">
            <span className="fe-olho"><i className="ti ti-school" aria-hidden />FALE COM O EDUCADOR</span>
            <h1>Organize o seu dinheiro com <em>um educador ao seu lado</em>.</h1>
            <p>O Compass One mostra como o seu mês vai fechar. Comigo, você aprende a usar essa previsão para sair do aperto, quitar o que deve e começar a guardar. Sem mensalidade e sem recomendação de investimento.</p>
          </div>
        </div>
        <svg className="fe-rota" viewBox="0 0 520 300" aria-hidden>
          <path d="M20 270 C 140 250, 160 120, 280 130 S 430 60, 500 24" fill="none" stroke="#f5b942" strokeWidth="2.5" strokeDasharray="7 9" strokeLinecap="round" />
          <circle cx="20" cy="270" r="6" fill="#f5b942" />
          <circle cx="280" cy="130" r="5" fill="#fff" />
          <path d="M500 24 l-20 4 l8 6 l-2 12 z" fill="#fff" />
        </svg>
        <svg className="fe-nuvens" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden>
          <path d="M0 60 C 120 30, 220 70, 340 48 S 560 20, 700 50 S 940 80, 1080 46 S 1320 26, 1440 52 L1440 90 L0 90 Z" fill="#a9cbef" opacity=".55" />
          <path d="M0 74 C 160 54, 300 88, 460 66 S 760 46, 920 70 S 1240 86, 1440 64 L1440 90 L0 90 Z" fill="#eaf4fe" />
        </svg>
      </header>

      <main>
        <div className="fe-in">
          <div className="fe-cartoes">
            {OPCOES.map(o => (
              <section key={o.id} className={`fe-cartao${o.id === 'diagnostico' ? ' destaque' : ''}`} aria-labelledby={`t-${o.id}`}>
                {o.selo && <span className="fe-selo">{o.selo}</span>}
                <span className="fe-ic" aria-hidden><i className={`ti ${o.icone}`} /></span>
                <p className="fe-rot">{o.rotulo}</p>
                <h2 id={`t-${o.id}`}>{o.nome}</h2>
                <p>{o.texto}</p>
                <ul>{o.itens.map(t => <li key={t}><i className="ti ti-circle-check" aria-hidden />{t}</li>)}</ul>
                <div className="fe-preco"><b>{o.preco}</b><span>{o.precoNota}</span></div>
                {o.id === 'grupo'
                  ? <ListaDeEspera botao={o.botao} />
                  : <a href={o.href} target={o.href.startsWith('https') ? '_blank' : undefined} rel="noreferrer" className={`fe-btn ${o.id === 'diagnostico' ? 'fe-btn-escuro' : 'fe-btn-linha'}`}>{o.botao} <i className="ti ti-arrow-right" aria-hidden /></a>}
              </section>
            ))}
          </div>
        </div>

        <section className="fe-sec" aria-labelledby="t-quem">
          <div className="fe-in">
            <div className="fe-nota">
              <div className="fe-quem">
                {EDUCADOR.foto
                  ? <img className="fe-foto" src={EDUCADOR.foto} alt={`Foto de ${EDUCADOR.nome}`} width={76} height={76} />
                  : <span className="fe-foto" aria-hidden>{EDUCADOR.nome.charAt(0)}</span>}
                <div>
                  <h3 id="t-quem">Quem conduz: {EDUCADOR.nome}, educador financeiro</h3>
                  <p>Criei o Compass One a partir da planilha que usava com as pessoas que acompanhei, cerca de 25 em um ano, uma a uma. O foco é você entender os seus números e tomar as suas decisões. Não há recomendação de investimento.</p>
                </div>
              </div>
              <a href={whatsapp('Olá! Tenho uma dúvida sobre as aulas do Compass One.')} target="_blank" rel="noreferrer" className="fe-btn fe-btn-linha">Tirar uma dúvida</a>
            </div>
          </div>
        </section>

        <section className="fe-sec" aria-labelledby="t-como">
          <div className="fe-in">
            <h2 className="fe-h2" id="t-como">Como funciona a sessão de diagnóstico</h2>
            <ol className="fe-passos">
              {PASSOS.map(p => <li key={p.titulo}><i className={`ti ${p.icone}`} aria-hidden /><div><b>{p.titulo}</b><span>{p.texto}</span></div></li>)}
            </ol>
          </div>
        </section>

        <section className="fe-sec" aria-labelledby="t-paraquem">
          <div className="fe-in">
            <h2 className="fe-h2" id="t-paraquem">Para quem é</h2>
            <div className="fe-paraquem">
              <div className="fe-sim">
                <h3><i className="ti ti-circle-check" aria-hidden />É para você se</h3>
                <p>Você trabalha, ganha o suficiente para viver e, mesmo assim, o dinheiro aperta no fim do mês. Quer sair das dívidas, ter as contas em dia e começar a guardar.</p>
              </div>
              <div className="fe-nao">
                <h3><i className="ti ti-circle-x" aria-hidden />Não é para você se</h3>
                <p>Você procura dica de investimento, de ação ou de criptomoeda. Aqui o assunto é organizar o dinheiro do mês a mês.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="fe-sec" aria-labelledby="t-faq">
          <div className="fe-in">
            <h2 className="fe-h2" id="t-faq">Perguntas frequentes</h2>
            <div className="fe-faq">
              {PERGUNTAS.map(q => <details key={q.p}><summary>{q.p}</summary><p>{q.r}</p></details>)}
            </div>
          </div>
        </section>
      </main>

      <footer className="fe-rodape">
        <div className="fe-in">
          <span>© {ano} Compass One · A bússola do seu dinheiro.</span>
          <nav aria-label="Rodapé">
            <Link to="/privacidade">Política de privacidade</Link>
            <Link to="/termos">Termos de uso</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/** O botão do grupo abre o formulário ali mesmo; a inscrição vai para o banco. */
function ListaDeEspera({ botao }: { botao: string }) {
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<Inscricao>({ nome: '', email: '', whatsapp: '' })
  const [erro, setErro] = useState<string | null>(null)
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'pronto'>('editando')

  if (estado === 'pronto') {
    return (
      <p className="fe-ok" role="status"><i className="ti ti-circle-check" aria-hidden />
        <span>Pronto, {dados.nome.trim().split(' ')[0]}! Você está na lista. Avisamos por e-mail{dados.whatsapp.trim() ? ' ou WhatsApp' : ''} quando o grupo abrir.</span></p>
    )
  }
  if (!aberto) {
    return <button type="button" className="fe-btn fe-btn-linha" style={{ background: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setAberto(true)}>{botao} <i className="ti ti-arrow-right" aria-hidden /></button>
  }
  const mudar = (campo: keyof Inscricao) => (e: React.ChangeEvent<HTMLInputElement>) => { setDados(d => ({ ...d, [campo]: e.target.value })); setErro(null) }
  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const problema = validarInscricao(dados)
    if (problema) { setErro(problema); return }
    setEstado('enviando')
    const r = await entrarNaListaDeEspera('grupo', dados)
    if (r === 'ok') setEstado('pronto')
    else { setEstado('editando'); setErro('Não deu para salvar agora. Tente de novo em instantes.') }
  }
  return (
    <form className="fe-form" id="lista-grupo" onSubmit={enviar} noValidate>
      <label>Nome<input value={dados.nome} onChange={mudar('nome')} autoComplete="name" autoFocus /></label>
      <label>E-mail<input type="email" inputMode="email" value={dados.email} onChange={mudar('email')} autoComplete="email" /></label>
      <label>WhatsApp <small>(opcional, com DDD)</small><input type="tel" inputMode="numeric" value={dados.whatsapp} onChange={mudar('whatsapp')} autoComplete="tel" placeholder="(47) 99999-9999" /></label>
      {erro && <p className="fe-erro" role="alert">{erro}</p>}
      <button type="submit" className="fe-btn fe-btn-escuro" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Quero ser avisado'}</button>
      <p className="fe-letra">Usamos esses dados só para avisar sobre o grupo de estudos. Veja a <Link to="/privacidade">política de privacidade</Link>.</p>
    </form>
  )
}
