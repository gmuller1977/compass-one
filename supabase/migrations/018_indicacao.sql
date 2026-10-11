-- ============================================================
-- 018 — Link de indicação (substitui a gamificação Aurix)
-- ============================================================
-- Pedido do Guilherme (11/10/2026): tirar a gamificação e deixar só um link
-- de compartilhamento. No futuro cada indicação vira desconto na
-- mensalidade, então o link precisa dizer QUEM indicou, e a contagem não
-- pode ser inflada por quem indicou.
--
-- O que faz:
--   1. indicacao_codigos: um código por login (o do link /i/<código>).
--   2. indicacoes (já existe desde a 010, vazia — a aba era "em breve"):
--      um indicado só pode ter UM indicador.
--   3. A política antiga da 010 deixava o indicador INSERIR as próprias
--      indicações (FOR ALL). Sai: agora só as funções abaixo gravam, e o
--      indicador não lê a tabela direto (ela tem o e-mail do indicado).
--   4. Funções:
--      - meu_codigo_indicacao(): devolve o código, criando na 1ª vez.
--      - registrar_indicacao(codigo): chamada pelo indicado no 1º acesso.
--        Só vale para conta criada há até 30 dias, nunca a si mesmo, e uma
--        vez por indicado.
--      - minhas_indicacoes(): lista do indicador, com e-mail mascarado.
--
-- Nenhum dado é apagado. As tabelas aurix e conquistas e as colunas de
-- streak/nível em user_preferences ficam como estão (o app não lê mais).

begin;

create table if not exists indicacao_codigos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  codigo text not null unique,
  created_at timestamptz default now()
);
alter table indicacao_codigos enable row level security;
drop policy if exists "indicacao_codigos_proprio" on indicacao_codigos;
create policy "indicacao_codigos_proprio" on indicacao_codigos
  for select to authenticated using (auth.uid() = user_id);

create unique index if not exists idx_indicacoes_indicado
  on indicacoes(indicado_id) where indicado_id is not null;
create index if not exists idx_indicacoes_indicador on indicacoes(indicador_id);

drop policy if exists "indicacoes_indicador" on indicacoes;

-- ── Código do link ────────────────────────────────────────────
create or replace function public.meu_codigo_indicacao()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_codigo text;
  -- sem 0/O, 1/I/L: o código pode ser ditado
  v_alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
begin
  if v_uid is null then raise exception 'sem login'; end if;
  select codigo into v_codigo from indicacao_codigos where user_id = v_uid;
  if v_codigo is not null then return v_codigo; end if;
  loop
    v_codigo := '';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    begin
      insert into indicacao_codigos(user_id, codigo) values (v_uid, v_codigo);
      return v_codigo;
    exception when unique_violation then
      -- outro login já tem esse código, ou este login criou o seu agora
      select codigo into v_codigo from indicacao_codigos where user_id = v_uid;
      if v_codigo is not null then return v_codigo; end if;
    end;
  end loop;
end $$;

-- ── Registro pelo indicado ────────────────────────────────────
-- Devolve: 'ok', 'ja_indicado', 'codigo_invalido', 'proprio', 'conta_antiga'.
create or replace function public.registrar_indicacao(p_codigo text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_indicador uuid;
  v_email text;
  v_criado timestamptz;
begin
  if v_uid is null then raise exception 'sem login'; end if;
  select user_id into v_indicador from indicacao_codigos
    where codigo = upper(trim(p_codigo));
  if v_indicador is null then return 'codigo_invalido'; end if;
  if v_indicador = v_uid then return 'proprio'; end if;
  if exists (select 1 from indicacoes where indicado_id = v_uid) then return 'ja_indicado'; end if;
  select email, created_at into v_email, v_criado from auth.users where id = v_uid;
  if v_criado < now() - interval '30 days' then return 'conta_antiga'; end if;
  begin
    insert into indicacoes(indicador_id, indicado_email, indicado_id, status)
      values (v_indicador, coalesce(v_email, ''), v_uid, 'cadastrado');
  exception when unique_violation then
    return 'ja_indicado';
  end;
  return 'ok';
end $$;

-- ── Lista do indicador ────────────────────────────────────────
create or replace function public.minhas_indicacoes()
returns table (email text, status text, criado_em timestamptz)
language sql security definer set search_path = public stable as $$
  select
    case when position('@' in i.indicado_email) > 1
      then left(i.indicado_email, 1) || '***' || substr(i.indicado_email, position('@' in i.indicado_email))
      else '***' end,
    i.status,
    i.created_at
  from indicacoes i
  where i.indicador_id = auth.uid()
  order by i.created_at desc
$$;

revoke all on function public.meu_codigo_indicacao() from public, anon;
revoke all on function public.registrar_indicacao(text) from public, anon;
revoke all on function public.minhas_indicacoes() from public, anon;
grant execute on function public.meu_codigo_indicacao() to authenticated;
grant execute on function public.registrar_indicacao(text) to authenticated;
grant execute on function public.minhas_indicacoes() to authenticated;

commit;

-- Consulta para o desconto, quando chegar a hora:
-- select c.codigo, i.indicador_id, count(*) filter (where i.status = 'ativo') ativos,
--        count(*) total
-- from indicacoes i join indicacao_codigos c on c.user_id = i.indicador_id
-- group by 1, 2 order by total desc;
