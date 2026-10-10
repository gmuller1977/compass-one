-- ============================================================
-- 015 — Conta compartilhada: duas ou mais pessoas nas mesmas finanças
-- ============================================================
-- Pedido do Guilherme em 10/10/2026: "duas ou mais pessoas acessarem a mesma
-- conta". Cada pessoa continua com o PRÓPRIO login; os dados financeiros
-- continuam gravados com o user_id do DONO, e quem aceita o convite passa a
-- ler e gravar essas linhas.
--
-- Só CRIA: uma tabela, duas funções e políticas NOVAS. Nenhuma política
-- existente é alterada ou apagada — no Postgres as políticas permissivas se
-- somam (OR), então "o próprio usuário" continua valendo exatamente como
-- antes, e a nova só acrescenta "ou um membro aceito do dono".
--
-- O app já está no ar sem esta migração: sem a tabela, a tela de
-- compartilhamento avisa que falta configurar e todo o resto segue igual.
--
-- Convite: o dono informa o e-mail. A pessoa entra no app com esse e-mail
-- (e-mail CONFIRMADO, ver aceitar_convite) e aceita. Aceitar é por função,
-- e não por UPDATE direto, para que quem foi convidado não possa trocar o
-- dono_id da linha.

create table compartilhamentos (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users(id) on delete cascade,
  dono_nome text not null default '',
  dono_email text not null default '',
  email text not null,
  membro_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'aceito')),
  criado_em timestamptz not null default now(),
  aceito_em timestamptz,
  unique (dono_id, email)
);
create index idx_compartilhamentos_membro on compartilhamentos(membro_id) where status = 'aceito';
create index idx_compartilhamentos_email on compartilhamentos(lower(email)) where status = 'pendente';
-- Uma pessoa participa de UMA conta compartilhada por vez.
create unique index uq_compartilhamentos_um_dono on compartilhamentos(membro_id) where status = 'aceito';

alter table compartilhamentos enable row level security;

-- O dono vê, convida e remove os membros da conta dele. Sem UPDATE: o dono
-- não pode pôr ninguém na conta dele sem a pessoa aceitar.
create policy "compartilhamentos_dono_ler" on compartilhamentos
  for select to authenticated using (auth.uid() = dono_id);
create policy "compartilhamentos_dono_convidar" on compartilhamentos
  for insert to authenticated
  with check (auth.uid() = dono_id and status = 'pendente' and membro_id is null
    and email <> '' and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "compartilhamentos_dono_remover" on compartilhamentos
  for delete to authenticated using (auth.uid() = dono_id);
-- O convidado vê o convite que é para o e-mail dele, e o membro vê a linha dele.
create policy "compartilhamentos_convidado_ler" on compartilhamentos
  for select to authenticated
  using (membro_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- O membro pode sair (apagar a própria participação) e recusar convite.
create policy "compartilhamentos_membro_sair" on compartilhamentos
  for delete to authenticated
  using (membro_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Os donos cujas finanças o usuário atual pode acessar. SECURITY DEFINER para
-- as políticas abaixo não dependerem da política da própria tabela.
create or replace function public.donos_acessiveis()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select dono_id from compartilhamentos where membro_id = auth.uid() and status = 'aceito'
$$;
grant execute on function public.donos_acessiveis() to authenticated;

-- Aceitar: só com o e-mail do convite, e só com o e-mail CONFIRMADO — sem
-- isso, alguém poderia criar uma conta com o e-mail de outra pessoa e aceitar.
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
  if exists (select 1 from compartilhamentos where membro_id = auth.uid() and status = 'aceito') then
    raise exception 'você já participa de uma conta compartilhada';
  end if;
  update compartilhamentos
     set membro_id = auth.uid(), status = 'aceito', aceito_em = now()
   where id = convite and status = 'pendente' and lower(email) = lower(meu_email) and dono_id <> auth.uid();
  if not found then raise exception 'convite não encontrado'; end if;
end;
$$;
grant execute on function public.aceitar_convite(uuid) to authenticated;

-- Os dados financeiros: membro aceito lê e grava as linhas do dono.
create policy "contas_compartilhado" on contas for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "categorias_compartilhado" on categorias for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "prefs_compartilhado" on user_preferences for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "extrato_compartilhado" on extrato_data for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "fatura_compartilhado" on fatura_data for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
create policy "planejamento_compartilhado" on planejamento_data for all to authenticated
  using (user_id in (select public.donos_acessiveis())) with check (user_id in (select public.donos_acessiveis()));
