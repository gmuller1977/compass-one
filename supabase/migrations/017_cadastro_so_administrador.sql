-- ============================================================
-- 017 — Conta compartilhada: cadastro só do administrador
-- ============================================================
-- Escolha do Guilherme (10/10/2026): contas, categorias e plano são do
-- ADMINISTRADOR (o dono das finanças). Quem entrou por convite vê tudo e
-- lança (extrato e fatura, com a regra de autoria da 016), mas não cria,
-- altera nem apaga conta, categoria, plano ou as preferências do dono.
--
-- O app já não grava nada disso para o membro (AppContext). Esta migração
-- faz o banco conferir de novo.
--
-- Só troca PERMISSÕES, nenhum dado: as quatro políticas "_compartilhado"
-- criadas na 015 como FOR ALL passam a FOR SELECT. As políticas de cada
-- usuário sobre as próprias linhas não são tocadas — o dono continua igual,
-- e o membro continua gravando o próprio nome na linha dele de
-- user_preferences. Extrato e fatura ficam como estão.
--
-- Rodar DEPOIS da 015 (e da 016).

begin;

drop policy if exists "contas_compartilhado" on contas;
create policy "contas_compartilhado" on contas for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

drop policy if exists "categorias_compartilhado" on categorias;
create policy "categorias_compartilhado" on categorias for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

drop policy if exists "planejamento_compartilhado" on planejamento_data;
create policy "planejamento_compartilhado" on planejamento_data for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

drop policy if exists "prefs_compartilhado" on user_preferences;
create policy "prefs_compartilhado" on user_preferences for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

commit;
