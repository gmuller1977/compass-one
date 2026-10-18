import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import { chaveDoItem, colocarNoPlano, mesQueFechou, textoDoMesQueFechou, type ItemDoMesQueFechou, type MesQueFechou } from '../../utils/mesQueFechou'
import { jaViu, marcarVisto } from '../../utils/vistoNaConta'
import MesQueFechouDialog from './MesQueFechouDialog'

/**
 * O aviso "Outubro fechou" da Início e da Bússola, e a janela dele
 * (utils/mesQueFechou). Some quando cada item foi colocado no plano ou
 * marcado "Foi só uma vez" (guardado na conta, vistoNaConta); "Lembrar
 * depois" esconde até amanhã neste aparelho. Só o administrador grava plano,
 * então quem entrou por convite não vê.
 */
const chaveAdiado = (uid: string) => `compass:mes-fechou-adiado:${uid}`
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }

export function useMesQueFechou(deps: Deps) {
  const { user, compartilhamento, setPlanos, categorias } = useApp()
  const [aberto, setAberto] = useState(false)
  const [versao, setVersao] = useState(0)
  const membro = compartilhamento.papel === 'membro'
  const bruto = useMemo(() => (membro ? null : mesQueFechou(deps)), [deps, membro])
  const pendente = useMemo<MesQueFechou | null>(() => {
    void versao
    if (!bruto) return null
    const itens = bruto.itens.filter(i => !jaViu(user, chaveDoItem(bruto, i)))
    return itens.length ? { ...bruto, itens } : null
  }, [bruto, user, versao])
  const adiado = useMemo(() => {
    void versao
    if (!user) return false
    try { return localStorage.getItem(chaveAdiado(user.id)) === hojeISO() } catch { return false }
  }, [user, versao])

  const lembrarDepois = () => {
    if (user) { try { localStorage.setItem(chaveAdiado(user.id), hojeISO()) } catch { /* aba anônima */ } }
    setVersao(v => v + 1)
  }
  const resolver = (f: MesQueFechou, escolhas: { item: ItemDoMesQueFechou; valor: number | null }[]) => {
    const noPlano = escolhas.filter((e): e is { item: ItemDoMesQueFechou; valor: number } => e.valor !== null && e.valor > 0)
    if (noPlano.length) setPlanos(prev => colocarNoPlano(prev, noPlano, deps, categorias))
    void Promise.all(escolhas.map(e => marcarVisto(user, chaveDoItem(f, e.item)))).then(() => setVersao(v => v + 1))
    setVersao(v => v + 1)
    return noPlano.length
  }

  const texto = pendente && !adiado ? textoDoMesQueFechou(pendente) : null
  const dialog = aberto && pendente
    ? <MesQueFechouDialog f={pendente} onFechar={() => setAberto(false)}
      onLembrarDepois={() => { lembrarDepois(); setAberto(false) }} onResolver={resolver} />
    : null
  return { texto, abrir: () => setAberto(true), dialog }
}
