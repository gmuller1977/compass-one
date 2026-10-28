-- ============================================================
-- 022 — Objetivos dos investimentos (a "caixinha")
-- ============================================================
-- Pedido do Guilherme (28/10/2026, tela de Investimentos): o objetivo fica
-- SEPARADO da conta, porque a mesma poupança pode guardar a reserva, a
-- viagem e o carro. Cada objetivo mora numa conta de investimento; a
-- aplicação e o resgate dizem para qual objetivo vão (o id fica no próprio
-- lançamento, em extrato_data), e o rendimento se divide pelo saldo de cada
-- objetivo. Aqui só o cadastro.
--
-- Só CRIA; nada existente muda. Rodar antes de publicar a tela.
-- Cadastro é do ADMINISTRADOR (a regra da 017): quem entrou por convite
-- só lê.

begin;

create table if not exists public.objetivos_investimento (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  conta_id      text not null references public.contas(id) on delete cascade,
  nome          text not null,
  -- Quanto quer juntar (opcional) e até quando, 'AAAA-MM' (opcional).
  valor_alvo    numeric(14,2) check (valor_alvo is null or valor_alvo > 0),
  ate           text check (ate is null or ate ~ '^[0-9]{4}-[0-9]{2}$'),
  -- Quanto do saldo que já estava na conta passou a ser deste objetivo.
  saldo_inicial numeric(14,2) not null default 0 check (saldo_inicial >= 0),
  criado_em     date not null default current_date,
  created_at    timestamptz not null default now()
);

grant select, insert, update, delete on public.objetivos_investimento to authenticated;
grant select, insert, update, delete on public.objetivos_investimento to service_role;

alter table public.objetivos_investimento enable row level security;

drop policy if exists "objetivos_usuario_proprio" on public.objetivos_investimento;
create policy "objetivos_usuario_proprio" on public.objetivos_investimento
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "objetivos_compartilhado" on public.objetivos_investimento;
create policy "objetivos_compartilhado" on public.objetivos_investimento
  for select to authenticated
  using (user_id in (select public.donos_acessiveis()));

create index if not exists idx_objetivos_investimento_user on public.objetivos_investimento(user_id);

commit;
