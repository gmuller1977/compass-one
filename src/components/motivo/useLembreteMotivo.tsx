import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { LinhaDoMes } from '../acompanhamento/evolucaoCalcs'
import { estourosComMotivo, textoDoLembrete } from '../../utils/motivoDoEstouro'
import { jaViu, marcarVisto } from '../../utils/vistoNaConta'
import { useMotivosDoMes } from './useMotivosDoMes'
import MotivoEstouroDialog from './MotivoEstouroDialog'

/**
 * Dispensar o lembrete é escolha da pessoa (pedido do Guilherme em
 * 12/10/2026: "às vezes o usuário não quer usar"). Duas saídas:
 * - "Lembrar depois": some até amanhã, neste aparelho (localStorage).
 * - "Fechar": as categorias pendentes AGORA deixam de pedir motivo neste mês,
 *   guardado na conta (vistoNaConta). Categoria que passar depois pede de novo.
 * O botão "Anotar o motivo" da Início e a linha da Bússola seguem o mesmo
 * `texto`, então somem junto.
 */
const chaveFechada = (ano: number, mes: number, rotulo: string) =>
  `motivo-fechado:${ano}-${String(mes + 1).padStart(2, '0')}:${rotulo}`
const chaveAdiado = (uid: string) => `compass:motivo-adiado:${uid}`
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

/**
 * O lembrete do motivo, para quem desenha: estouros do mês com o motivo de
 * cada um, a frase (nula quando todos já têm motivo) e a janela. Só faz
 * sentido no mês CORRENTE — mês fechado é assunto da Revisão mensal.
 */
export function useLembreteMotivo(linhasSaida: LinhaDoMes[], ano: number, mes: number) {
  const { desvioMinPerc, user } = useApp()
  const { motivos, salvar } = useMotivosDoMes(ano, mes)
  const [aberto, setAberto] = useState(false)
  const [versao, setVersao] = useState(0)
  const estouros = useMemo(
    () => estourosComMotivo(linhasSaida, motivos, desvioMinPerc),
    [linhasSaida, motivos, desvioMinPerc])
  const adiado = useMemo(() => {
    void versao
    if (!user) return false
    try { return localStorage.getItem(chaveAdiado(user.id)) === hojeISO() } catch { return false }
  }, [user, versao])
  const pendentes = useMemo(() => {
    void versao
    return estouros.filter(e => !jaViu(user, chaveFechada(ano, mes, e.rotulo)))
  }, [estouros, user, ano, mes, versao])
  const texto = adiado ? null : textoDoLembrete(pendentes)
  const lembrarDepois = () => {
    if (user) { try { localStorage.setItem(chaveAdiado(user.id), hojeISO()) } catch { /* aba anônima */ } }
    setVersao(v => v + 1)
  }
  const fechar = () => {
    const sem = pendentes.filter(p => !p.motivo)
    void Promise.all(sem.map(p => marcarVisto(user, chaveFechada(ano, mes, p.rotulo)))).then(() => setVersao(v => v + 1))
    setVersao(v => v + 1)
  }
  const dialog = aberto && estouros.length > 0
    ? <MotivoEstouroDialog estouros={estouros} nomeMes={MESES[mes]} salvar={salvar} onFechar={() => setAberto(false)} />
    : null
  return { estouros, texto, abrir: () => setAberto(true), lembrarDepois, fechar, dialog }
}
