-- ============================================================
-- 025 — Avisos (WARN) do Security Advisor do Supabase, 11/11/2026.
-- Não apaga nada e não muda o que o app faz. Idempotente.
--
-- 1. search_path fixo nas funções que não o tinham
--    (lancamentos_de_outros, da 016, e duas legadas da antiga
--    user_data_history, que nem existe mais).
-- 2. Quem não fez login (anon) deixa de poder chamar funções
--    SECURITY DEFINER. O app só as chama logado.
-- 3. proteger_lancamentos é função de GATILHO: o gatilho roda sem
--    precisar de EXECUTE de quem grava, então ninguém precisa
--    chamá-la pela API.
--
-- Ficam como estão, de propósito, os avisos "Signed-In Users Can
-- Execute": aceitar_convite, delete_current_user, donos_acessiveis
-- (usada nas políticas de RLS), meu_codigo_indicacao,
-- registrar_indicacao e minhas_indicacoes são chamadas pelo app logado.
-- ============================================================

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('lancamentos_de_outros', 'cleanup_user_data_history', 'fn_user_data_history')
  loop
    execute format('alter function %s set search_path = public', f.assinatura);
  end loop;
end $$;

revoke execute on function public.aceitar_convite(uuid)   from public, anon;
revoke execute on function public.delete_current_user()   from public, anon;
revoke execute on function public.donos_acessiveis()      from public, anon;
revoke execute on function public.proteger_lancamentos()  from public, anon, authenticated;

grant execute on function public.aceitar_convite(uuid)  to authenticated;
grant execute on function public.delete_current_user()  to authenticated;
grant execute on function public.donos_acessiveis()     to authenticated;
