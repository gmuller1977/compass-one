import { useEffect, useMemo, useState } from 'react'
import { useApp, type DadosMes } from '../../context/AppContext'
import { useMesDaInicio } from '../inicio/useMesDaInicio'
import { bussolaDeHoje, conversaDoDia, itensNaoVistos, lancouHoje, lerVisto } from '../../utils/norteProativo'

/**
 * Quantos avisos importantes do Norte ainda não foram vistos hoje — o selo do
 * ícone na barra de baixo (Fase C). `ativo` falso não calcula nada: no
 * computador a barra nem aparece.
 */
export function useSeloNorte(ativo: boolean): number {
  const { user, extratoData, faturaData } = useApp()
  const hoje = new Date()
  const { deps } = useMesDaInicio(hoje.getFullYear(), hoje.getMonth())
  const uid = user?.id
  const [visto, setVisto] = useState(() => (uid ? lerVisto(uid) : null))
  // A hora entra na conta (à noite aparece "lançou hoje?"): revê a cada 10 min.
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    if (!uid) return
    const reler = () => setVisto(lerVisto(uid))
    reler()
    const t = setInterval(() => setAgora(new Date()), 600000)
    window.addEventListener('compass-norte-visto', reler)
    window.addEventListener('storage', reler)
    return () => { clearInterval(t); window.removeEventListener('compass-norte-visto', reler); window.removeEventListener('storage', reler) }
  }, [uid])

  return useMemo(() => {
    if (!ativo || !uid) return 0
    const b = bussolaDeHoje(deps, deps.categorias, agora)
    const { itens } = conversaDoDia({ bussola: b, nome: '', hoje: agora, lancouHoje: lancouHoje(extratoData as Record<string, DadosMes>, faturaData, agora) })
    return itensNaoVistos(itens, visto, agora)
  }, [ativo, uid, deps, extratoData, faturaData, visto, agora])
}
