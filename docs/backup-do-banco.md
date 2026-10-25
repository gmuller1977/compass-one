# Backup do banco

Rotina: `.github/workflows/backup-banco.yml`. Roda todo domingo às 3h
(Brasília) e também pelo botão "Run workflow" em GitHub › Actions › Backup do
banco. Cada cópia fica 90 dias em Actions › (a execução) › Artifacts.

O arquivo `compass-one-banco-AAAA-MM-DD.tar.gz.gpg` é trancado com a senha
`BACKUP_SENHA`. **Sem a senha, o backup não abre**: guarde-a fora do GitHub
(gerenciador de senhas).

## Configurar (uma vez)

1. Supabase › botão **Connect** no topo do projeto › **Session pooler** ›
   copiar a URI (`postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-...pooler.supabase.com:5432/postgres`)
   e trocar `[YOUR-PASSWORD]` pela senha do banco (Project Settings ›
   Database › Reset database password, se não lembrar).
2. GitHub › repositório › Settings › Secrets and variables › Actions ›
   **New repository secret**:
   - `SUPABASE_DB_URL` = a URI do passo 1
   - `BACKUP_SENHA` = uma senha longa escolhida por você
3. Actions › Backup do banco › **Run workflow** para testar. Ficou verde e
   apareceu o artefato: pronto.

## Restaurar (só com revisão; sobrescreve dados)

```bash
gpg -d compass-one-banco-AAAA-MM-DD.tar.gz.gpg | tar -xzf -
# public.dump: tabelas do app (estrutura e dados)
pg_restore --no-owner --no-privileges -d "$URL_DO_BANCO_NOVO" public.dump
# auth.dump: logins (rodar ANTES do public num projeto vazio)
pg_restore --data-only -d "$URL_DO_BANCO_NOVO" auth.dump
```

Restaurar em produção é destrutivo: testar antes num projeto Supabase novo.
