import { useEffect, useRef } from 'react'
import { COR } from '../utils/cores'
import { NOMES_MESES } from './novoLancamentoExtrato/NleShared'
import type { Descoberta } from '../utils/descoberta'

/**
 * A explicação da fase de DESCOBERTA, na primeira vez que o Planejamento é
 * aberto sem plano nenhum.
 *
 * A faixa ([`DescobertaBanner`](DescobertaBanner.tsx)) diz o ESTADO e fica
 * para sempre. Este modal diz o COMBINADO: o que o app está fazendo agora, o
 * que acontece quando o mês fechar, e quais são as duas saídas. Sem ele a
 * faixa pede paciência sem dizer em troca de quê.
 *
 * Aparece **uma vez** e depois só por pedido — pelo botão "Como funciona" da
 * faixa. Um modal que volta a cada visita vira obstáculo, e a tela por trás
 * dele já é legível sozinha.
 *
 * O "visto" mora no `localStorage`, por usuário, e não no banco: é uma
 * conveniência de leitura de um navegador só. Errar para o lado de mostrar de
 * novo — outro aparelho, aba anônima, dados limpos — custa um clique; uma
 * coluna nova no banco custa migração e mais um estado para discordar dos
 * outros.
 */
export default function DescobertaModal({
  d, onFechar, onMontarPlano,
}: {
  d: Descoberta
  onFechar: () => void
  onMontarPlano: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const mes = NOMES_MESES[d.mesObservado.mes]
  const fechaHoje = d.diasAteFechar <= 0

  useEffect(() => {
    btnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  // Os três passos SÃO uma sequência — um depende do anterior —, e é por isso
  // que levam número. Numerar o que não tem ordem seria enfeite.
  const passos = [
    <>O app soma tudo que você registrou em <b style={{ color: COR.texto }}>{mes.toLowerCase()}</b>, categoria por categoria.</>,
    <>Esses valores viram a <b style={{ color: COR.texto }}>proposta</b> do seu primeiro plano. Você ajusta o que quiser antes de aceitar.</>,
    <>A partir daí o Planejamento passa a prever os próximos meses, e o Simulador consegue dizer se uma compra cabe.</>,
  ]

  return (
    <div
      onClick={onFechar}
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Descobrindo seus números"
        style={{
          background: COR.branco, borderRadius: 16, padding: '28px 28px 24px',
          maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        }}
      >
        <div style={{ fontSize: 30, lineHeight: 1 }}>🧭</div>

        <h2 style={{
          fontSize: 19, fontWeight: 800, color: COR.texto,
          margin: '14px 0 8px', textWrap: 'balance',
        }}>
          Descobrindo seus números
        </h2>

        <p style={{ fontSize: 14, color: COR.textoSuave, lineHeight: 1.6, margin: 0 }}>
          Um plano só serve se partir do que você <b style={{ color: COR.texto }}>de fato</b> ganha
          e gasta. Por isso o Compass One começa observando, em vez de pedir
          números que ninguém sabe de cabeça.
        </p>

        {/* O combinado. 4,37:1 reprovaria aqui: COR.textoSuave sobre #eff6ff.
            Medido, #475569 sobre #eff6ff da 6,96:1 e o azul da 5,68:1. */}
        <div style={{
          background: '#eff6ff', borderRadius: 12, padding: '16px 18px', marginTop: 18,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: COR.azul, marginBottom: 12,
            textTransform: 'uppercase', letterSpacing: '.5px',
          }}>
            {fechaHoje ? `Quando ${mes.toLowerCase()} fechar — é hoje` : `Quando ${mes.toLowerCase()} fechar`}
          </div>

          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 11 }}>
            {passos.map((p, i) => (
              <li key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0, width: 21, height: 21, borderRadius: '50%',
                  background: COR.azul, color: '#fff', fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>{p}</span>
              </li>
            ))}
          </ol>
        </div>

        <p style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.6, margin: '16px 0 0' }}>
          {fechaHoje
            ? <>Com o que você já registrou dá para montar o primeiro plano agora.</>
            : <>Faltam <b style={{ color: COR.texto }}>{d.diasAteFechar} {d.diasAteFechar === 1 ? 'dia' : 'dias'}</b>.
                Até lá, o que ajuda é registrar o que entra e o que sai — quanto mais
                completo o mês, melhor a proposta.</>}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
          <button
            ref={btnRef}
            onClick={onFechar}
            style={{
              flex: '1 1 190px', padding: '12px 20px', border: 'none', borderRadius: 10,
              background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
              color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.3)',
            }}
          >
            {fechaHoje ? 'Entendi' : `Esperar ${mes.toLowerCase()} fechar`}
          </button>

          <button
            onClick={onMontarPlano}
            style={{
              flex: '1 1 190px', padding: '12px 20px', borderRadius: 10,
              border: `1.5px solid ${COR.borda}`, background: COR.branco,
              color: COR.texto, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Montar meu plano agora
          </button>
        </div>

        <p style={{ fontSize: 12, color: COR.textoSuave, margin: '10px 0 0', lineHeight: 1.5 }}>
          Não precisa esperar se você já sabe quanto ganha e quanto gasta.
        </p>
      </div>
    </div>
  )
}
