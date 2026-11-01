# Mudar a hospedagem para a Cloudflare

Por que: o plano gratuito da Vercel proíbe uso comercial e tem limite diário de
publicações. O gratuito da Cloudflare permite uso comercial e dá 500
publicações por mês. O Supabase não muda.

O endereço continua **www.compass-one.com.br**. Por isso a digital (passkey),
o login com Google e os links de e-mail seguem funcionando: todos estão presos
ao domínio, não à empresa que hospeda.

**A Vercel fica no ar até o passo 6.** Nada para de funcionar enquanto a
Cloudflare é montada e testada.

O app fica num **Worker com arquivos estáticos** (o caminho que a Cloudflare
oferece hoje no lugar da Pages; também gratuito e com uso comercial). Não há
código de servidor: ela só serve o `dist/` do build.

O repositório já está pronto:

- `wrangler.jsonc`: diz à Cloudflare para servir o `dist/` e abrir o
  `index.html` em qualquer endereço do app (`/radar`, `/lancar`…), como a
  Vercel faz.
- `public/_headers`: os mesmos cabeçalhos de proteção do `vercel.json`.
- `.node-version`: a Cloudflare usa o Node 22, o mesmo do GitHub.

---

## 1. Criar o projeto e ligar o GitHub (feito em 31/10)

**Compute** → **Workers & Pages** → **Create application** → importar o
repositório **gmuller1977/compass-one**, ramo `main`, nome `compass-one`.

## 2. Ajustar o build

Projeto `compass-one` → **Settings** → **Build**:

| Campo | Valor |
|---|---|
| Build command | `npm run provas && npm run build` |
| Deploy command | `npx wrangler deploy` (já está) |
| Root directory | `/` (já está) |

Em **Build variables** (é aqui, e não em "Variables and secrets": o app lê
essas três na hora do build), crie as mesmas da Vercel (Vercel → projeto →
Settings → Environment Variables, ambiente *Production*):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY` (só se existir na Vercel)

Não crie `VITE_GEMINI_API_KEY`: ela não é mais usada.

Em **Branch control**, desligue **Builds for non-production branches**:
assim os ramos `claude/*` não publicam nada, como hoje na Vercel.

Depois: **Deployments** → **Retry build** (ou espere o próximo envio ao
`main`).

## 3. Testar no endereço provisório

O endereço aparece em **Overview** (algo como
`compass-one.projetocompassone.workers.dev`).

- A página de apresentação abre; `/radar` abre o login.
- Entrar com **e-mail e senha** funciona.
- A **digital não funciona** nesse endereço, e é esperado: ela é do
  compass-one.com.br e volta no passo 5.

Atenção: esse endereço já grava no banco de verdade, como o site.

## 4. Levar o domínio para a Cloudflare (DNS)

Hoje o DNS do compass-one.com.br está na Vercel, e é ali que estão os
registros do **Resend** (e-mails). Eles precisam ir junto, senão os e-mails de
cadastro, nova senha e convite param.

1. Na Cloudflare: **Adicionar um domínio** → `compass-one.com.br` → plano
   **Free**.
2. Ela tenta copiar os registros sozinha. **Confira contra a Vercel**
   (Vercel → Domains → compass-one.com.br → DNS Records) e crie o que faltar,
   em especial:
   - os registros do Resend (`resend._domainkey`, o `send` MX e TXT, o SPF);
   - o TXT do Google Search Console, se já tiver feito;
   - o `www` apontando para a Vercel como está hoje (assim o site segue na
     Vercel durante a troca).

   Nos registros de e-mail (MX e TXT), a nuvem fica **cinza (só DNS)**.
3. A Cloudflare mostra **dois servidores de nomes** (algo como
   `ana.ns.cloudflare.com`). No **Registro.br** → domínio → **DNS** →
   **Alterar servidores DNS**, troque os da Vercel por esses dois.
4. Espere o e-mail "seu domínio está ativo" (de minutos a algumas horas).
5. Teste um e-mail: peça "esqueci minha senha" com seu e-mail. Chegou, siga.

## 5. Apontar o www para a Cloudflare

1. Projeto `compass-one` → **Domains** → **Add** → **Custom domain** →
   `www.compass-one.com.br`. A Cloudflare troca o registro do www sozinha.
2. Sem o www (compass-one.com.br) para o www: **Regras** → **Regras de
   redirecionamento** → modelo **"Redirecionar da raiz para WWW"** → salvar.
   Se pedir, crie um registro `A` em `@` com `192.0.2.1`, nuvem **laranja**.
3. Teste: www.compass-one.com.br abre, a digital funciona, compass-one.com.br
   leva para o www.

## 6. Desligar a Vercel

Só depois de um ou dois dias com tudo funcionando:

1. Vercel → projeto → Settings → Git → **Disconnect** (para de publicar).
2. Depois de mais alguns dias, **Delete Project**.
3. Avise o Claude para tirar o `vercel.json` e a Vercel da política de
   privacidade (hoje ela cita as duas).

## Se algo der errado

- **Build vermelho:** projeto → Deployments → abra a falhada → registro. Se for
  uma prova, é o mesmo aviso que o GitHub mostra.
- **Site fora no meio da troca:** em Domains, remova o www e
  recrie o registro `www` apontando para a Vercel, como era. A Vercel volta a
  atender na hora.
