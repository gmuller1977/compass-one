import LegalPage from '../components/LegalPage'
import rawMd from '../data/politica-de-privacidade.md?raw'

export default function PoliticaPrivacidade() {
  return <LegalPage rawMd={rawMd} />
}
