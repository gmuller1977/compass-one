import { useState } from 'react'
import { getLayoutPref, type LayoutLancamentos } from '../utils/prefs'
import NovoLancamentoClassico  from './NovoLancamentoClassico'
import NovoLancamentoExtrato   from './NovoLancamentoExtrato'

export default function NovoLancamento() {
  const [layout] = useState<LayoutLancamentos>(getLayoutPref)
  return layout === 'extrato'
    ? <NovoLancamentoExtrato />
    : <NovoLancamentoClassico />
}