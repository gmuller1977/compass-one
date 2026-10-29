import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Cartao, Etiqueta, Linha, Pilula, TituloCartao } from '../mobile/ui'
import { M, fmt, mostrar } from '../mobile/estilo'
import { COR } from '../../utils/cores'
import { mascaraCentavos, parseValor, trocarSinal } from '../../utils/moeda'
import { CARTEIRA, chaveDoMes, informarSaldo, marcarConferido, saldosDosBancos, type SaldoDoBanco } from '../../utils/conferirSaldos'
import type { Deps } from '../../utils/saldoConta'

/**
 * "Confira seus saldos" (18/10/2026, pedidos do Guilherme). Logo
 * abaixo do saldo, na Início do computador e na Bússola do celular. Uma linha
 * por banco, e a carteira quando a pessoa usa dinheiro: pedindo conferência
 * (dia de movimento ou muitos dias sem conferir), "Confere" e "Está diferente"; conferido, o
 * resultado fica à vista — "✓ confere" ou a diferença entre o banco e o app,
 * com "Ver Lançamentos". Regras em utils/conferirSaldos.ts.
 */
export default function ConferirSaldosCard({ deps, oculto }: { deps: Deps; oculto: boolean }) {
  const navigate = useNavigate()
  const { updateExtratoMes, compartilhamento } = useApp()
  // O Educador Financeiro só visualiza: vê o resultado, sem Confere / Está diferente.
  const ver = compartilhamento.soVisualizar
  const hoje = new Date()
  const ano = hoje.getFullYear(), mes = hoje.getMonth()

  const bancos = useMemo(() => saldosDosBancos(deps), [deps])
  const [editando, setEditando] = useState<string | null>(null)
  // "Está diferente" numa conta com contas vencidas e não marcadas: antes do
  // campo, a lista do que pode explicar a diferença (conferirSaldos.ts).
  const [explicando, setExplicando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  if (bancos.length === 0) return null

  // O nome do banco; o apelido da conta só desempata dois do mesmo banco.
  const nomeDe = (s: SaldoDoBanco) => {
    const banco = s.conta.banco || s.conta.nome
    const repetido = bancos.filter(b => (b.conta.banco || b.conta.nome) === banco).length > 1
    return repetido ? `${banco} · ${s.conta.apelido || s.conta.nome}` : banco
  }

  const vazio = { lancamentos: {}, saldoBanco: '' }
  const confere = (contaId: string) =>
    updateExtratoMes(chaveDoMes(contaId, ano, mes), prev => marcarConferido(prev ?? vazio, hoje))

  const salvar = (contaId: string) => {
    const n = parseValor(texto)
    if (n === null || texto.trim() === '') { setErro('Digite o saldo, por exemplo 1.234,56.'); return }
    if (contaId === CARTEIRA.id && n < 0) { setErro('O dinheiro não fica negativo: digite zero ou mais.'); return }
    updateExtratoMes(chaveDoMes(contaId, ano, mes), prev => informarSaldo(prev ?? vazio, fmt(n), hoje))
    setEditando(null); setTexto(''); setErro('')
  }

  const pendentes = bancos.filter(b => b.pendente || b.aviso).length
  const abrirCampo = (contaId: string) => { setExplicando(null); setEditando(contaId); setTexto(''); setErro('') }
  const verLancamentos = (contaId: string) =>
    navigate(contaId === CARTEIRA.id ? '/novo-lancamento?tipo=dinheiro' : `/novo-lancamento?tipo=banco&conta=${contaId}`)

  return (
    <Cartao>
      <TituloCartao direita={pendentes === 0
        ? <Etiqueta cor={COR.sucessoTexto} fundo={COR.sucessoFundo}>✓ conferido</Etiqueta>
        : undefined}>
        Confira seus saldos
      </TituloCartao>
      {pendentes > 0 && (
        <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: -4, marginBottom: 6, lineHeight: 1.45 }}>
          Abra o app do banco, conte o dinheiro e veja se o saldo de hoje é o mesmo daqui.
        </div>
      )}

      {bancos.map((s, i) => {
        const nome = nomeDe(s)
        const aberto = editando === s.conta.id
        const explicar = explicando === s.conta.id
        const temDif = s.informado !== null && Math.abs(s.diferenca) >= 0.005
        const pede = s.pendente || s.aviso
        return (
          <div key={s.conta.id}>
            <Linha primeira={i === 0} icone={s.conta.icone || '🏦'} cor={s.conta.cor || COR.azul}
              titulo={nome}
              // Pedindo conferência, a pergunta é se o número do APP confere:
              // um "No banco" digitado antes do último movimento seria velho.
              legenda={temDif && !pede
                ? <>No banco: <b style={{ color: COR.texto }}>{mostrar(s.informado!, oculto)}</b><br />No app: {mostrar(s.calculado, oculto)}</>
                : <>No app: <b style={{ color: s.calculado < 0 ? COR.erroTexto : COR.texto }}>{mostrar(s.calculado, oculto)}</b></>}
              direita={!pede && !aberto && !temDif &&
                <Etiqueta cor={COR.sucessoTexto} fundo={COR.sucessoFundo}>✓ confere</Etiqueta>} />

            {s.aviso && !aberto && !explicar && (
              <div style={{ padding: '0 0 8px 56px' }}>
                <div style={{ fontSize: M.legenda, fontWeight: 600, color: COR.avisoTexto, background: COR.avisoFundo,
                  borderRadius: 10, padding: '6px 10px', lineHeight: 1.45 }}>
                  Faz {s.diasSemConferir} dias que este saldo não é conferido. Isso pode deixar a previsão diferente do banco.
                </div>
              </div>
            )}

            {pede && !aberto && !explicar && (
              <div style={botoes}>
                {!ver && <Pilula forte onClick={() => confere(s.conta.id)}>Confere</Pilula>}
                {!ver && <Pilula onClick={() => (s.naoMarcadas.length ? setExplicando(s.conta.id) : abrirCampo(s.conta.id))}>Está diferente</Pilula>}
              </div>
            )}

            {explicar && (
              <div style={{ padding: '0 0 12px 56px' }}>
                <div style={{ fontSize: M.legenda, color: COR.texto, lineHeight: 1.45, marginBottom: 6 }}>
                  {s.naoMarcadas.length === 1 ? 'Esta conta venceu e ainda não está marcada no app:' : 'Estas contas venceram e ainda não estão marcadas no app:'}
                </div>
                {s.naoMarcadas.map(n => (
                  <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: M.legenda, padding: '3px 0' }}>
                    <span style={{ color: COR.texto, minWidth: 0 }}>{n.nome} <span style={{ color: COR.textoSuave }}>· {n.entrada ? 'a receber' : 'a pagar'}</span></span>
                    <b style={{ color: n.entrada ? COR.sucessoTexto : COR.erroTexto, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {n.entrada ? '+ ' : '− '}{mostrar(n.valor, oculto)}
                    </b>
                  </div>
                ))}
                <div style={{ fontSize: M.legenda, color: COR.textoSuave, lineHeight: 1.45, margin: '6px 0 8px' }}>
                  Se já {s.naoMarcadas.every(n => n.entrada) ? 'entrou' : s.naoMarcadas.some(n => n.entrada) ? 'entrou ou saiu' : 'saiu'} do banco, marque em Lançamentos: o saldo do app se acerta sozinho.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Pilula forte onClick={() => verLancamentos(s.conta.id)}>Marcar em Lançamentos</Pilula>
                  <Pilula onClick={() => abrirCampo(s.conta.id)}>Não, o saldo é outro</Pilula>
                  <button type="button" onClick={() => setExplicando(null)} style={link}>Cancelar</button>
                </div>
              </div>
            )}

            {!pede && !aberto && temDif && (
              <div style={{ ...botoes, alignItems: 'center' }}>
                <Etiqueta cor={COR.avisoTexto} fundo={COR.avisoFundo}>
                  {s.diferenca < 0 ? 'faltam' : 'sobram'} {oculto ? '••••' : fmt(Math.abs(s.diferenca))}
                </Etiqueta>
                <Pilula onClick={() => verLancamentos(s.conta.id)}>Ver Lançamentos</Pilula>
                {/* Acertou em Lançamentos, ou o banco mudou depois: o app confere agora. */}
                {!ver && <Pilula onClick={() => confere(s.conta.id)}>Já confere</Pilula>}
              </div>
            )}

            {aberto && (
              <div style={{ padding: '0 0 12px 56px' }}>
                <label style={{ display: 'block', fontSize: M.legenda, color: COR.textoSuave, marginBottom: 6 }}>
                  {s.conta.id === CARTEIRA.id ? 'Quanto tem em dinheiro hoje?' : `Quanto tem no ${nome} hoje?`}
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.conta.id !== CARTEIRA.id && (
                    <button type="button" aria-label="Trocar o sinal (saldo negativo)" title="Saldo negativo"
                      onClick={() => setTexto(trocarSinal(texto))} style={sinal}>+/−</button>
                  )}
                  <input autoFocus inputMode="numeric" value={texto} placeholder="R$ 0,00"
                    onChange={e => setTexto(mascaraCentavos(e.target.value, s.conta.id !== CARTEIRA.id))}
                    onKeyDown={e => { if (e.key === 'Enter') salvar(s.conta.id) }}
                    style={campo} />
                  <Pilula forte onClick={() => salvar(s.conta.id)}>Salvar</Pilula>
                  <button type="button" onClick={() => setEditando(null)} style={link}>Cancelar</button>
                </div>
                {erro && <div role="alert" style={{ fontSize: M.legenda, color: COR.erroTexto, marginTop: 6 }}>{erro}</div>}
              </div>
            )}
          </div>
        )
      })}
    </Cartao>
  )
}

const botoes: CSSProperties = { display: 'flex', gap: 8, padding: '0 0 12px 56px', flexWrap: 'wrap' }

// 16 px: abaixo disso o iPhone dá zoom no campo.
const campo: CSSProperties = {
  flex: '1 1 140px', minWidth: 0, height: 40, padding: '0 12px', borderRadius: 10,
  border: `1.5px solid ${COR.borda}`, fontSize: 16, fontFamily: 'inherit', color: COR.texto,
}

const link: CSSProperties = {
  border: 'none', background: 'none', color: COR.textoSuave, minHeight: 40, padding: '0 6px',
  fontFamily: 'inherit', fontSize: M.legenda, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
}

const sinal: CSSProperties = {
  flexShrink: 0, minWidth: 44, minHeight: 44, borderRadius: 12, border: `1.5px solid ${COR.borda}`,
  background: '#fff', color: COR.texto, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
