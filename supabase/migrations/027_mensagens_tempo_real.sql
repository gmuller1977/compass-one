-- ============================================================
-- 027 — Chat do suporte em tempo real (18/11/2026, pedido do Guilherme:
-- "o chat não pode demorar"). Liga o aviso de mensagem nova da tabela
-- mensagens_suporte no Realtime do Supabase. Só ACRESCENTA a tabela à
-- publicação; nada muda nos dados nem nas permissões (o RLS da 026 continua
-- decidindo quem é avisado de quê). Idempotente. Pode rodar antes ou depois
-- de publicar o app: sem ela o chat segue atualizando a cada 30 s.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensagens_suporte'
  ) then
    alter publication supabase_realtime add table public.mensagens_suporte;
  end if;
end $$;
