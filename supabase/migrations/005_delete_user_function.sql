-- ============================================================
-- Função para exclusão da conta pelo próprio usuário
--
-- SECURITY DEFINER: roda com privilégios do dono da função
-- (postgres), que tem acesso à tabela auth.users.
-- auth.uid() garante que só o próprio usuário pode deletar
-- sua conta. O CASCADE nas tabelas remove todos os dados.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Permite que qualquer usuário autenticado chame a função
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
