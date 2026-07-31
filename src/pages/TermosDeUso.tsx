import LegalPage from '../components/LegalPage'
import rawMd from '../data/termos-de-uso.md?raw'

export default function TermosDeUso() {
  return <LegalPage rawMd={rawMd} />
}
