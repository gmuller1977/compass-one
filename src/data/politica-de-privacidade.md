# Política de Privacidade — Compass One

**Última atualização:** Novembro de 2026

Esta Política de Privacidade descreve como o Compass One ("Plataforma", "nós") coleta, utiliza, armazena e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).

---

## 1. Dados que Coletamos

### 1.1. Dados fornecidos por você
- **Dados de cadastro:** nome, e-mail e senha
- **Dados financeiros:** contas bancárias, cartões de crédito, categorias de despesas, lançamentos, extratos, faturas e planejamentos orçamentários
- **Preferências:** configurações pessoais da Plataforma
- **Mensagens ao suporte:** o que você escreve na caixa de Mensagens, com data e hora, e quais comunicados você já leu
- **Aceite de novidades e ofertas por e-mail:** se você marcou ou não essa opção, e quando
- **Lançamentos pelo WhatsApp (só se você ligar):** o número do seu WhatsApp, quando foi ligado, e o texto das mensagens que você manda para o número do Compass One. A mensagem é usada só para montar o lançamento; o que fica guardado é o lançamento confirmado por você, e a mensagem pendente é apagada depois do SIM ou do NÃO
- **Lista de espera:** nome, e-mail e, se quiser, WhatsApp, quando você entra na lista de espera do grupo de estudos na página Fale com o Educador

### 1.2. Dados coletados automaticamente
- **Dados de acesso:** endereço IP, tipo de navegador, sistema operacional, data e hora de acesso
- **Dados de uso:** páginas visitadas, funcionalidades utilizadas e interações com a Plataforma

### 1.3. Dados que NÃO coletamos
- Senhas bancárias ou credenciais de acesso a instituições financeiras
- Números completos de cartões de crédito
- CPF, RG ou documentos de identificação
- Dados biométricos: no login por digital, a leitura é feita pelo seu próprio aparelho, e a Plataforma guarda apenas uma chave pública, que não permite reconstruir a sua digital

## 2. Como Utilizamos seus Dados

Utilizamos seus dados exclusivamente para:

- Fornecer e manter o funcionamento da Plataforma
- Autenticar seu acesso e proteger sua conta
- Armazenar e exibir seus dados financeiros conforme inseridos por você
- Gerar relatórios e visualizações para sua organização financeira pessoal
- Enviar comunicações essenciais (recuperação de senha, atualizações de segurança)
- Responder às suas mensagens ao suporte e avisar por e-mail quando houver resposta
- Enviar novidades, comunicados e ofertas do próprio Compass One por e-mail, **somente se você marcou essa opção** no cadastro ou no Perfil. A opção vem desmarcada, e você pode desmarcá-la a qualquer momento em Configurações › Perfil
- Fazer os lançamentos que você manda pelo WhatsApp, **somente se você ligou o seu número** em Configurações › Perfil. Você desliga ali ou mandando SAIR na conversa, e o número é apagado
- Avisar quem entrou na lista de espera, por e-mail ou WhatsApp, quando o grupo de estudos abrir
- Melhorar a experiência do usuário e corrigir problemas técnicos

**Não utilizamos seus dados para:** publicidade de terceiros, venda a terceiros, análise de crédito, perfilamento comercial ou qualquer finalidade não descrita acima.

## 3. Base Legal para o Tratamento (LGPD Art. 7º)

| Atividade | Base Legal |
|-----------|-----------|
| Cadastro e autenticação | Execução de contrato (Art. 7º, V) |
| Armazenamento de dados financeiros | Consentimento (Art. 7º, I) |
| Comunicações essenciais | Legítimo interesse (Art. 7º, IX) |
| Atendimento pelo suporte (Mensagens) | Execução de contrato (Art. 7º, V) |
| Novidades e ofertas por e-mail | Consentimento (Art. 7º, I), que pode ser retirado a qualquer momento |
| Lançamentos pelo WhatsApp | Consentimento (Art. 7º, I), que pode ser retirado a qualquer momento |
| Lista de espera do grupo de estudos | Consentimento (Art. 7º, I), que pode ser retirado a qualquer momento pelo suporte |
| Segurança e prevenção de fraude | Legítimo interesse (Art. 7º, IX) |
| Cumprimento de obrigações legais | Obrigação legal (Art. 7º, II) |

## 4. Compartilhamento de Dados

Seus dados **não são vendidos, alugados ou compartilhados** com terceiros para fins comerciais.

Compartilhamos dados apenas com:

- **Supabase (infraestrutura):** armazenamento do banco de dados e autenticação — atuando como operador sob nossas instruções
- **Vercel e Cloudflare (hospedagem):** hospedagem da aplicação web
- **Resend (e-mail):** envio de e-mails (confirmação de conta, recuperação de senha, convites, avisos de mensagens do suporte e, para quem aceitou, novidades e ofertas)
- **Meta (API do WhatsApp) e n8n:** só para quem ligou o WhatsApp. A Meta, pela API oficial do WhatsApp, recebe e entrega as mensagens trocadas com o número do Compass One, e o n8n as repassa à Plataforma. Recebem o seu número e o texto das mensagens, não o resto dos seus dados financeiros. O WhatsApp é um serviço da Meta, com política de privacidade própria
- **Sentry (monitor de erros):** quando uma tela apresenta um erro, recebe a mensagem técnica do erro, o endereço da tela e o tipo de navegador e aparelho. Não recebe dados financeiros, seu nome, seu e-mail nem identificação da sua conta. Servidores nos Estados Unidos.
- **Google (Gemini, inteligência artificial):** **o assistente Norte está desativado no momento, e nenhum dado é enviado ao Google.** Antes de ele voltar, esta política será atualizada para dizer o que é enviado e em que condições.

Todos os prestadores acima atuam como operadores de dados e estão sujeitos a obrigações de confidencialidade e segurança.

Podemos compartilhar dados quando exigido por lei, ordem judicial ou autoridade competente.

## 5. Armazenamento e Segurança

### 5.1. Onde seus dados são armazenados
Seus dados são armazenados em servidores seguros do Supabase, localizados nos Estados Unidos (região us-west-2).

### 5.2. Transferência internacional
Em razão da infraestrutura utilizada, seus dados podem ser transferidos para fora do Brasil. Essa transferência ocorre com base no Art. 33 da LGPD, garantindo nível adequado de proteção por meio de cláusulas contratuais e políticas de segurança dos provedores.

### 5.3. Medidas de segurança
- Criptografia em trânsito (HTTPS/TLS)
- Row Level Security (RLS) no banco de dados — cada usuário acessa apenas seus próprios dados
- Senhas armazenadas com hash seguro (bcrypt) pelo Supabase Auth
- Tokens de autenticação com expiração automática (JWT)
- Acesso administrativo restrito e monitorado

## 6. Seus Direitos (LGPD Art. 18)

Você tem direito a:

- **Confirmação e acesso:** saber se tratamos seus dados e acessá-los
- **Correção:** corrigir dados incompletos, inexatos ou desatualizados
- **Anonimização ou eliminação:** solicitar a exclusão de dados desnecessários ou tratados sem base legal
- **Portabilidade:** solicitar seus dados em formato estruturado
- **Eliminação:** solicitar a exclusão completa dos dados vinculados à sua conta
- **Informação:** saber com quem seus dados são compartilhados
- **Revogação do consentimento:** revogar o consentimento a qualquer momento

Para exercer qualquer direito, entre em contato pelo e-mail: **privacidade@compassone.com.br**

Responderemos em até 15 dias úteis, conforme a LGPD.

## 7. Retenção de Dados

- **Conta ativa:** seus dados são mantidos enquanto sua conta existir
- **Exclusão de conta:** seus dados são removidos em até 30 dias após a solicitação
- **Dados de log:** mantidos por até 12 meses para fins de segurança e cumprimento legal
- **Backups:** dados em backup são removidos dentro do ciclo de rotação (até 90 dias)

## 8. Cookies

A Plataforma utiliza apenas cookies essenciais para autenticação e funcionamento da sessão. Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros.

## 9. Menores de Idade

A Plataforma é destinada a maiores de 18 anos. Não coletamos intencionalmente dados de menores. Se identificarmos dados de menores de 18 anos, serão excluídos imediatamente.

## 10. Alterações nesta Política

Esta Política pode ser atualizada periodicamente. Alterações significativas serão comunicadas por e-mail ou notificação na Plataforma com pelo menos 15 dias de antecedência antes de entrar em vigor.

## 11. Encarregado de Dados (DPO)

Para questões relacionadas à proteção de dados pessoais:

**E-mail:** privacidade@compassone.com.br

## 12. Autoridade Nacional

Se considerar que o tratamento dos seus dados viola a LGPD, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD): https://www.gov.br/anpd

## 13. Legislação Aplicável

Esta Política é regida pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e demais leis brasileiras aplicáveis.
