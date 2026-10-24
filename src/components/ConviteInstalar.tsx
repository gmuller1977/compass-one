import { useEffect, useState } from 'react'
import { COR } from '../utils/cores'
import { BOLINHA_AZUL } from './mobile/estilo'
import {
  abertoComoApp, aoMudarInstalacao, dispensarInstalar, dispensouInstalar, ehIphone, instalarApp, podeInstalarDireto,
} from '../utils/acessoRapido'

/**
 * Convite na Bússola para pôr o Compass One na tela inicial (24/10/2026):
 * aberto pelo ícone, o app vai direto à digital, sem barra do navegador.
 * No Android, um botão instala; no iPhone, diz o caminho. Some quando o app
 * já está instalado ou a pessoa toca em "Agora não".
 */
export default function ConviteInstalar() {
  const [, atualizar] = useState(0)
  const [dispensou, setDispensou] = useState(dispensouInstalar)
  useEffect(() => aoMudarInstalacao(() => atualizar(n => n + 1)), [])

  const iphone = ehIphone()
  if (dispensou || abertoComoApp() || (!iphone && !podeInstalarDireto())) return null

  return (
    <div style={{
      background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: '12px 14px', marginTop: 18,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <span aria-hidden style={{
        width: 40, height: 40, borderRadius: '50%', background: BOLINHA_AZUL, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-device-mobile-plus" style={{ fontSize: 20, color: '#fff' }} />
      </span>
      <span style={{ flex: '1 1 180px' }}>
        <b style={{ display: 'block', fontSize: 15, color: COR.texto }}>Abra o Compass com um toque</b>
        <span style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.45 }}>
          {iphone
            ? <>Toque em <b style={{ color: COR.texto }}>Compartilhar</b> e depois em <b style={{ color: COR.texto }}>Adicionar à Tela de Início</b>. Pelo ícone, o app abre direto na digital.</>
            : 'Coloque o app na tela inicial: pelo ícone, ele abre direto na digital.'}
        </span>
      </span>
      <span style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        <button onClick={() => { dispensarInstalar(); setDispensou(true) }} style={{
          minHeight: 44, border: 'none', background: 'none', color: COR.textoSuave,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '0 6px',
        }}>Agora não</button>
        {!iphone && (
          <button onClick={() => void instalarApp()} style={{
            minHeight: 44, border: 'none', background: COR.azul, color: '#fff', borderRadius: 999, padding: '0 18px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Instalar</button>
        )}
      </span>
    </div>
  )
}
