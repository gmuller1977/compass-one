// Gera os modelos de e-mail do Supabase Auth a partir do desenho único
// (functions/_shared/emailLayout.ts). Rodar com `npx jiti supabase/templates/gerar.ts`
// e colar cada HTML no painel: Authentication → Emails → Templates.
//
// Variáveis do Supabase (Go template): {{ .ConfirmationURL }} é o link,
// {{ .Data.nome }} o nome gravado no cadastro (pode estar vazio: o login
// com Google não passa pelo cadastro e não recebe estes e-mails).
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emailHtml } from '../functions/_shared/emailLayout.ts'

const aqui = dirname(fileURLToPath(import.meta.url))
const ola = '{{ if .Data.nome }}Olá, {{ .Data.nome }}!{{ else }}Olá!{{ end }}'

const modelos = {
  'confirmar-cadastro.html': {
    assunto: 'Confirme seu e-mail e comece no Compass One',
    html: emailHtml({
      preview: 'Falta um clique para ativar a sua conta.',
      titulo: 'Falta só confirmar seu e-mail',
      paragrafos: [
        ola,
        'Que bom ter você no Compass One. Aqui você vai saber, todo dia, quanto ainda pode gastar no mês, quanto vai sobrar no fim e o que vence nos próximos dias.',
        'Confirme seu e-mail para ativar a conta:',
      ],
      botao: { texto: 'Confirmar meu e-mail', url: '{{ .ConfirmationURL }}' },
      depois: [
        'Depois de confirmar, o app abre e leva você pelo primeiro passo: cadastrar contas, cartões e categorias. Leva uns 5 minutos.',
      ],
      rodape: 'Você recebeu este e-mail porque alguém criou uma conta no Compass One com este endereço. Se não foi você, é só ignorar: sem a confirmação, a conta não é ativada.',
    }),
  },
  'redefinir-senha.html': {
    assunto: 'Crie uma nova senha no Compass One',
    html: emailHtml({
      preview: 'O link para criar uma nova senha vale por 1 hora.',
      titulo: 'Vamos criar uma nova senha',
      paragrafos: [
        ola,
        'Recebemos um pedido para trocar a senha da sua conta no Compass One. Toque no botão para escolher a nova:',
      ],
      botao: { texto: 'Criar nova senha', url: '{{ .ConfirmationURL }}' },
      depois: [
        'O link vale por 1 hora e funciona uma vez só.',
        'Seus lançamentos, contas e planejamento continuam exatamente como estão.',
      ],
      rodape: 'Não pediu a troca? Ignore este e-mail: sua senha atual continua valendo e ninguém entra sem ela.',
    }),
  },
}

for (const [arquivo, m] of Object.entries(modelos)) {
  writeFileSync(join(aqui, arquivo), m.html)
  console.log(`${arquivo}  ·  assunto: ${m.assunto}`)
}
