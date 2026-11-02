// Primeiro import do main.tsx: liga o monitor antes de qualquer outro módulo
// rodar, para pegar também erro na carga do app (ex.: variável faltando).
import { ligarMonitorDeErros } from './utils/monitorDeErros'

ligarMonitorDeErros()
