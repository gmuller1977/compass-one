-- ============================================================
-- 023 — Conta compartilhada: convite "Só visualizar"
-- ============================================================
-- Pedido do Guilherme (29/10/2026): o Compass One gratuito como porta de
-- entrada para atendimento de educação financeira. O cliente convida o
-- consultor para VER as finanças dele, sem lançar nem editar nada.
--
-- Ao convidar, o dono escolhe o acesso:
--   'lancar'     — "Família": como sempre foi (vê tudo, lança, mexe só no
--                  que lançou);
--   'visualizar' — "Educador Financeiro": vê tudo e não grava nada.
--
-- E o dono LIGA e DESLIGA o acesso (`ativo`): "quando tiver reunião, a
-- pessoa libera o acesso; quando encerra, ela desativa". Desligado, o
-- convidado não lê nem grava nada daquelas finanças; só a própria linha do
-- convite, para o app dizer que o acesso está desligado.
--
-- Só ACRESCENTA: uma coluna (os convites que já existem ficam 'lancar', o
-- que valia até hoje), uma função de leitura, uma para o dono trocar o
-- acesso, e troca as duas políticas de extrato e fatura da 015 (FOR ALL) por
-- leitura para todo membro + gravação só para quem pode lançar. Nenhum dado
-- muda. Contas, categorias, plano e preferências já eram só leitura (017).
--
-- Junto, no mesmo pedido: uma pessoa pode participar de VÁRIAS contas
-- compartilhadas ("vou visualizar com o mesmo e-mail dados de vários
-- clientes"). Sai o índice de uma conta por pessoa da 015, e o aceitar deixa
-- de recusar quem já participa de outra. O app escolhe qual abrir; as
-- consultas sempre filtram pelo user_id do dono escolhido.
--
-- Rodar DEPOIS da 015, 016 e 017.

begin;

alter table public.compartilhamentos
  add column if not exists acesso text not null default 'lancar'
  check (acesso in ('lancar', 'visualizar'));
alter table public.compartilhamentos
  add column if not exists ativo boolean not null default true;

-- Os donos cujas finanças o usuário atual pode LER: agora só com o acesso ligado.
create or replace function public.donos_acessiveis()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select dono_id from compartilhamentos where membro_id = auth.uid() and status = 'aceito' and ativo
$$;

drop index if exists public.uq_compartilhamentos_um_dono;

create or replace function public.aceitar_convite(convite uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  meu_email text;
  confirmado timestamptz;
begin
  select email, email_confirmed_at into meu_email, confirmado from auth.users where id = auth.uid();
  if meu_email is null then raise exception 'sem usuário'; end if;
  if confirmado is null then raise exception 'confirme o seu e-mail antes de aceitar'; end if;
  update compartilhamentos
     set membro_id = auth.uid(), status = 'aceito', aceito_em = now()
   where id = convite and status = 'pendente' and lower(email) = lower(meu_email) and dono_id <> auth.uid();
  if not found then raise exception 'convite não encontrado'; end if;
end;
$$;
grant execute on function public.aceitar_convite(uuid) to authenticated;

-- Os donos em cujas finanças o usuário atual pode GRAVAR lançamentos.
create or replace function public.donos_que_lanco()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select dono_id from compartilhamentos
   where membro_id = auth.uid() and status = 'aceito' and ativo and acesso = 'lancar'
$$;
grant execute on function public.donos_que_lanco() to authenticated;

-- O dono troca o acesso de um convite (pendente ou aceito). Por função, e
-- não por UPDATE, para o dono não conseguir mexer em mais nada da linha.
create or replace function public.trocar_acesso_convite(convite uuid, novo text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if novo not in ('lancar', 'visualizar') then raise exception 'acesso inválido'; end if;
  update compartilhamentos set acesso = novo where id = convite and dono_id = auth.uid();
  if not found then raise exception 'convite não encontrado'; end if;
end;
$$;
grant execute on function public.trocar_acesso_convite(uuid, text) to authenticated;

-- O dono liga ou desliga o acesso de um convite.
create or replace function public.ativar_convite(convite uuid, ligado boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update compartilhamentos set ativo = coalesce(ligado, false) where id = convite and dono_id = auth.uid();
  if not found then raise exception 'convite não encontrado'; end if;
end;
$$;
grant execute on function public.ativar_convite(uuid, boolean) to authenticated;

drop policy if exists "extrato_compartilhado" on extrato_data;
create policy "extrato_compartilhado" on extrato_data for select to authenticated
  using (user_id in (select public.donos_acessiveis()));
drop policy if exists "extrato_compartilhado_lancar" on extrato_data;
create policy "extrato_compartilhado_lancar" on extrato_data for all to authenticated
  using (user_id in (select public.donos_que_lanco())) with check (user_id in (select public.donos_que_lanco()));

drop policy if exists "fatura_compartilhado" on fatura_data;
create policy "fatura_compartilhado" on fatura_data for select to authenticated
  using (user_id in (select public.donos_acessiveis()));
drop policy if exists "fatura_compartilhado_lancar" on fatura_data;
create policy "fatura_compartilhado_lancar" on fatura_data for all to authenticated
  using (user_id in (select public.donos_que_lanco())) with check (user_id in (select public.donos_que_lanco()));

commit;
