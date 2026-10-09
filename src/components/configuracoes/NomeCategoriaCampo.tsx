import React, { useId, useMemo, useState } from 'react'
import type { Categoria, TipoCategoria } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { inputSt } from './CfgShared'
import { nomesParaSugerir, mesmoNome, type NomeSugerido } from '../../utils/nomeCategoria'

/**
 * "Nome da categoria" com autocomplete: ao digitar, as categorias já
 * cadastradas daquele tipo — as do grupo escolhido primeiro. Escolher uma usa
 * o nome EXATO dela (e o grupo, se ainda não houver), e o cadastro vira uma
 * nova variante. Nome que não casa com nenhuma diz "Nova categoria". Pedido do
 * Guilherme em 08/10/2026.
 *
 * O nome exato importa: o app identifica a categoria por (nome, variante), e
 * "academia" não casa com "Academia" no plano nem no Radar.
 */
export default function NomeCategoriaCampo({
  inputRef, formCat, setFormCat, categorias, editCatId,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  formCat: Omit<Categoria, 'id'>
  setFormCat: React.Dispatch<React.SetStateAction<Omit<Categoria, 'id'>>>
  categorias: Categoria[]
  editCatId: string | null
}) {
  const id = useId()
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const tipo = formCat.tipo as TipoCategoria
  const outras = useMemo(() => categorias.filter(c => c.id !== editCatId), [categorias, editCatId])
  const sugestoes = useMemo(
    () => nomesParaSugerir(formCat.nome, tipo, formCat.grupo, outras),
    [formCat.nome, tipo, formCat.grupo, outras],
  )
  // Editando sem mudar o nome: não há o que avisar.
  const original = editCatId ? categorias.find(c => c.id === editCatId) : undefined
  const nomeIgualAoOriginal = !!original && mesmoNome(original.nome, formCat.nome)
  const existente = formCat.nome.trim()
    ? sugestoes.find(s => mesmoNome(s.nome, formCat.nome)) ?? nomesParaSugerir(formCat.nome, tipo, undefined, outras).find(s => mesmoNome(s.nome, formCat.nome))
    : undefined
  const mostrar = aberto && sugestoes.length > 0 && !(sugestoes.length === 1 && sugestoes[0].nome === formCat.nome)

  function escolher(s: NomeSugerido) {
    setFormCat(p => ({ ...p, nome: s.nome, grupo: p.grupo || s.grupo }))
    setAberto(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!mostrar) { if (e.key === 'ArrowDown' && sugestoes.length) { setAberto(true); setAtivo(0); e.preventDefault() } return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo(i => (i + 1) % sugestoes.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(i => (i - 1 + sugestoes.length) % sugestoes.length) }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(sugestoes[ativo]) }
    else if (e.key === 'Escape') { e.preventDefault(); setAberto(false) }
  }

  const semVariante = !formCat.descricao?.trim()
  const listaId = `${id}-lista`

  return (
    <div>
      <div style={{ position: 'relative' }}>
      <input ref={inputRef} value={formCat.nome}
        role="combobox" aria-expanded={mostrar} aria-controls={listaId} aria-autocomplete="list"
        aria-activedescendant={mostrar ? `${id}-op-${ativo}` : undefined}
        onChange={e => { setFormCat(p => ({ ...p, nome: e.target.value })); setAberto(true); setAtivo(0) }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 120)}
        onKeyDown={onKeyDown}
        placeholder="Comece a digitar: Mercado, Lazer..." autoComplete="off"
        className="campo-cfg" style={inputSt} />

      {mostrar && (
        <ul id={listaId} role="listbox" style={{
          position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', marginTop: 4, padding: 4, listStyle: 'none',
          background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 10,
          boxShadow: '0 10px 24px rgba(15,23,42,.12)', maxHeight: 240, overflowY: 'auto',
        }}>
          {sugestoes.map((s, i) => (
            <li key={s.nome} id={`${id}-op-${i}`} role="option" aria-selected={i === ativo}
              onMouseDown={e => { e.preventDefault(); escolher(s) }}
              onMouseEnter={() => setAtivo(i)}
              style={{
                padding: '7px 10px', borderRadius: 7, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8,
                background: i === ativo ? COR.infoFundo : 'transparent',
              }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COR.texto }}>{s.nome}</span>
              <span style={{ fontSize: 11, color: COR.textoSuave, whiteSpace: 'nowrap' }}>
                {s.grupo ?? 'sem grupo'}{s.variantes.length > 0 ? ` · ${s.variantes.length} ${s.variantes.length === 1 ? 'variante' : 'variantes'}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      </div>

      {/* Existente ou nova — o que acontece ao salvar. infoTexto/infoFundo 5,5:1;
          sucessoTexto/sucessoFundo 4,8:1 (cores.ts). */}
      {formCat.nome.trim() && !nomeIgualAoOriginal && !mostrar && (existente ? (
        <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.4, color: COR.infoTexto, background: COR.infoFundo,
          borderRadius: 8, padding: '6px 8px' }}>
          <b>{existente.nome}</b> já existe{existente.grupo ? ` (${existente.grupo})` : ''}: esta será uma nova variante dela.
          {semVariante && <> Preencha a <b>variante</b> abaixo para diferenciar{existente.variantes.length
            ? ` — já existem: ${existente.variantes.join(', ')}` : ''}.</>}
        </div>
      ) : (
        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: COR.sucessoTexto, background: COR.sucessoFundo,
          borderRadius: 8, padding: '6px 8px', display: 'inline-block' }}>
          ✦ Nova categoria
        </div>
      ))}
    </div>
  )
}
