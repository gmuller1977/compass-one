// prova107 (31/10/2026): no Radar, o grupo aberto separa FIXAS e VARIÁVEIS
// (pedido do Guilherme). Fixa pelo cadastro; sem cadastro, variável; ordem
// mantida dentro de cada parte; parte vazia não aparece.
import { fixasEVariaveis } from '../src/components/acompanhamento/evolucaoCalcs'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const categorias = [
  { id: '1', nome: 'Streaming', descricao: 'Netflix', fixa: true },
  { id: '2', nome: 'Streaming', descricao: 'Spotify', fixa: true },
  { id: '3', nome: 'Viagens', fixa: false },
  { id: '4', nome: 'Lazer / Entretenimento', fixa: false },
] as any[]
const cats = [
  { nome: 'Lazer / Entretenimento' }, { nome: 'Streaming', descricao: 'Netflix' },
  { nome: 'Viagens' }, { nome: 'Streaming', descricao: 'Spotify' }, { nome: 'Excluída' },
]
const p = fixasEVariaveis(cats, categorias)
t('duas partes, fixas primeiro', p.map(x => x.rotulo).join() === 'Fixas,Variáveis')
t('fixas pela variante', p[0].cats.map(c => c.descricao).join() === 'Netflix,Spotify')
t('variáveis na ordem, sem cadastro junto', p[1].cats.map(c => c.nome).join() === 'Lazer / Entretenimento,Viagens,Excluída')
t('nada se perde', p[0].cats.length + p[1].cats.length === cats.length)
t('só variáveis: uma parte', fixasEVariaveis([{ nome: 'Viagens' }], categorias).map(x => x.rotulo).join() === 'Variáveis')
t('vazio: nenhuma parte', fixasEVariaveis([], categorias).length === 0)
console.log(`prova107: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
