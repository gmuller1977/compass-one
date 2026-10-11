import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { LinhaDoMes } from '../acompanhamento/evolucaoCalcs'
import { estourosComMotivo, textoDoLembrete } from '../../utils/motivoDoEstouro'
import { useMotivosDoMes } from './useMotivosDoMes'
import MotivoEstouroDialog from './MotivoEstouroDialog'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

/**
 * O lembrete do motivo, para quem desenha: estouros do mês com o motivo de
 * cada um, a frase (nula quando todos já têm motivo) e a janela. Só faz
 * sentido no mês CORRENTE — mês fechado é assunto da Revisão mensal.
 */
export function useLembreteMotivo(linhasSaida: LinhaDoMes[], ano: number, mes: number) {
  const { desvioMinPerc } = useApp()
  const { motivos, salvar } = useMotivosDoMes(ano, mes)
  const [aberto, setAberto] = useState(false)
  const estouros = useMemo(
    () => estourosComMotivo(linhasSaida, motivos, desvioMinPerc),
    [linhasSaida, motivos, desvioMinPerc])
  const texto = textoDoLembrete(estouros)
  const dialog = aberto && estouros.length > 0
    ? <MotivoEstouroDialog estouros={estouros} nomeMes={MESES[mes]} salvar={salvar} onFechar={() => setAberto(false)} />
    : null
  return { estouros, texto, abrir: () => setAberto(true), dialog }
}
