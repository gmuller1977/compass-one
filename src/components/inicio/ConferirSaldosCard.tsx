import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Cartao, Linha, Pilula, TituloCartao } from '../mobile/ui'
import { M, fmt, mostrar } from '../mobile/estilo'
import { COR } from '../../utils/cores'
import { parseValor } from '../../utils/moeda'
import { chaveDoMes, informarSaldo, marcarConferido, saldosAConferir } from '../../utils/conferirSaldos'
import type { Deps } from '../../utils/saldoConta'

type Resultado = { contaId: string; nome: string; banco: number; app: number }

/**
 * "Confira o saldo dos bancos" (18/10/2026, pedido do Guilherme). Uma linha
 * por conta ainda não conferida hoje: o saldo de hoje no app, "Confere" e
 * "Está diferente". Regras em utils/conferirSaldos.ts. A mesma na Início do
 * computador e na Bússola do celular.
 */
export default function ConferirSaldosCard({ deps, oculto }: { deps: Deps; oculto: boolean }) {
  const navigate = useNavigate()
  const { updateExtratoMes } = useApp()
  const hoje = new Date()
  const ano = hoje.getFullYear(), mes = hoje.getMonth()

  const pendentes = useMemo(() => saldosAConferir(deps), [deps])
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  if (pendentes.length === 0 && !resultado) return null

  const vazio = { lancamentos: {}, saldoBanco: '' }
  const confere = (contaId: string) =>
    updateExtratoMes(chaveDoMes(contaId, ano, mes), prev => marcarConferido(prev ?? vazio, hoje))

  const salvar = (contaId: string, nome: string, app: number) => {
    const n = parseValor(texto)
    if (n === null || texto.trim() === '') { setErro('Digite o saldo, por exemplo 1.234,56.'); return }
    if (n <= 0) { setErro('Saldo zerado ou negativo se ajusta em Lançamentos.'); return }
    updateExtratoMes(chaveDoMes(contaId, ano, mes), prev => informarSaldo(prev ?? vazio, fmt(n), hoje))
    setEditando(null); setTexto(''); setErro('')
    setResultado({ contaId, nome, banco: n, app })
  }

  const dif = resultado ? resultado.banco - resultado.app : 0

  return (
    <Cartao>
      <TituloCartao>Confira o saldo dos bancos</TituloCartao>
      {pendentes.length > 0 && (
        <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: -4, marginBottom: 6, lineHeight: 1.45 }}>
          Abra o app do banco e veja se o saldo de hoje é o mesmo daqui.
        </div>
      )}

      {pendentes.map((s, i) => {
        const nome = s.conta.apelido || s.conta.nome
        const aberto = editando === s.conta.id
        return (
          <div key={s.conta.id}>
            <Linha primeira={i === 0} icone={s.conta.icone || '🏦'} cor={s.conta.cor || COR.azul}
              titulo={nome}
              legenda={<>No app: <b style={{ color: s.saldoNoApp < 0 ? COR.erroTexto : COR.texto }}>{mostrar(s.saldoNoApp, oculto)}</b></>}
              />
            {!aberto && (
              <div style={{ display: 'flex', gap: 8, padding: '0 0 12px 56px', flexWrap: 'wrap' }}>
                <Pilula forte onClick={() => confere(s.conta.id)}>Confere</Pilula>
                <Pilula onClick={() => { setEditando(s.conta.id); setTexto(''); setErro('') }}>Está diferente</Pilula>
              </div>
            )}
            {aberto && (
              <div style={{ padding: '0 0 12px 56px' }}>
                <label style={{ display: 'block', fontSize: M.legenda, color: COR.textoSuave, marginBottom: 6 }}>
                  Quanto tem no {nome} hoje?
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input autoFocus inputMode="decimal" value={texto} placeholder="R$ 0,00"
                    onChange={e => setTexto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') salvar(s.conta.id, nome, s.saldoNoApp) }}
                    style={campo} />
                  <Pilula forte onClick={() => salvar(s.conta.id, nome, s.saldoNoApp)}>Salvar</Pilula>
                  <button type="button" onClick={() => setEditando(null)} style={link}>Cancelar</button>
                </div>
                {erro && <div role="alert" style={{ fontSize: M.legenda, color: COR.erroTexto, marginTop: 6 }}>{erro}</div>}
              </div>
            )}
          </div>
        )
      })}

      {resultado && (
        <div style={{ marginTop: pendentes.length ? 8 : 0, padding: 14, borderRadius: 14,
          background: Math.abs(dif) < 0.005 ? COR.sucessoFundo : COR.avisoFundo, lineHeight: 1.45, fontSize: M.legenda, color: COR.texto }}>
          {Math.abs(dif) < 0.005
            ? <>Saldo do {resultado.nome} anotado: confere com o app.</>
            : <>No {resultado.nome} há <b>{mostrar(resultado.banco, oculto)}</b> e o app tinha <b>{mostrar(resultado.app, oculto)}</b>:
                {' '}{dif > 0 ? 'sobram' : 'faltam'} <b>{mostrar(Math.abs(dif), oculto)}</b>. O app passa a usar o saldo do banco.
                {dif < 0 ? ' Algum gasto ficou sem lançar?' : ' Alguma entrada ficou sem lançar?'}</>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {Math.abs(dif) >= 0.005 && (
              <Pilula onClick={() => navigate(`/novo-lancamento?tipo=banco&conta=${resultado.contaId}`)}>Ver Lançamentos</Pilula>
            )}
            <button type="button" onClick={() => setResultado(null)} style={link}>Fechar</button>
          </div>
        </div>
      )}
    </Cartao>
  )
}

// 16 px: abaixo disso o iPhone dá zoom no campo.
const campo: CSSProperties = {
  flex: '1 1 140px', minWidth: 0, height: 40, padding: '0 12px', borderRadius: 10,
  border: `1.5px solid ${COR.borda}`, fontSize: 16, fontFamily: 'inherit', color: COR.texto,
}

const link: CSSProperties = {
  border: 'none', background: 'none', color: COR.textoSuave, minHeight: 40, padding: '0 6px',
  fontFamily: 'inherit', fontSize: M.legenda, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
}
