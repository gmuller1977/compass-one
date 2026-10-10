-- ============================================================
-- 016 — Conta compartilhada: cada um mexe só nos próprios lançamentos
-- ============================================================
-- Regra do Guilherme (10/10/2026): "os dois podem ver tudo, o adm pode editar
-- e excluir lançamentos de todos, e os outros podem fazer manutenção somente
-- dos seus lançamentos".
--
-- O ADMINISTRADOR é o dono das finanças (o user_id da linha). Cada lançamento
-- guarda `autor` (o id do login de quem lançou), carimbado pelo app na
-- gravação. Lançamento sem autor é de antes do compartilhamento: é do dono.
--
-- O app já devolve o lançamento alheio antes de gravar
-- (src/utils/autorDoLancamento.ts). Este gatilho confere de novo no banco,
-- para que nada passe por fora do app: um membro que tente gravar um mês em
-- que o lançamento de outra pessoa mudou, sumiu ou trocou de dia recebe erro.
--
-- Só CRIA duas funções e dois gatilhos. Rodar DEPOIS da 015. Não muda dado
-- nenhum, e o dono (e o próprio servidor) passa direto pelo gatilho.

-- Os lançamentos de um mês que NÃO são de `eu`, por id, com o dia junto
-- (trocar de dia também é alterar).
create or replace function public.lancamentos_de_outros(d jsonb, eu uuid)
returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_object_agg(item ->> 'id', jsonb_build_object('dia', dia.k, 'item', item)), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(d -> 'lancamentos') = 'object' then d -> 'lancamentos' else '{}'::jsonb end) as dia(k, itens),
       jsonb_array_elements(case when jsonb_typeof(dia.itens) = 'array' then dia.itens else '[]'::jsonb end) as item
  where coalesce(item ->> 'autor', '') <> eu::text
$$;

create or replace function public.proteger_lancamentos()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  eu uuid := auth.uid();
  existe boolean;
begin
  -- Servidor (chave de serviço) e o próprio dono: sem restrição.
  if eu is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    if old.user_id <> eu and public.lancamentos_de_outros(old.dados, eu) <> '{}'::jsonb then
      raise exception 'Só o administrador da conta exclui lançamentos de outras pessoas';
    end if;
    return old;
  end if;
  if new.user_id = eu then return new; end if;
  if tg_op = 'INSERT' then
    -- O app grava por upsert, e no upsert o gatilho de INSERT roda antes mesmo
    -- quando a linha já existe (aí vira UPDATE e o gatilho de UPDATE confere).
    execute format('select exists (select 1 from %I where user_id = $1 and conta_id = $2 and ano = $3 and mes = $4)', tg_table_name)
      into existe using new.user_id, new.conta_id, new.ano, new.mes;
    if existe then return new; end if;
    if public.lancamentos_de_outros(new.dados, eu) <> '{}'::jsonb then
      raise exception 'Lançamento novo precisa ter como autor quem lançou';
    end if;
    return new;
  end if;
  if public.lancamentos_de_outros(old.dados, eu) <> public.lancamentos_de_outros(new.dados, eu) then
    raise exception 'Só o administrador da conta altera lançamentos de outras pessoas';
  end if;
  return new;
end;
$$;

create trigger extrato_proteger_lancamentos
  before insert or update or delete on extrato_data
  for each row execute function public.proteger_lancamentos();
create trigger fatura_proteger_lancamentos
  before insert or update or delete on fatura_data
  for each row execute function public.proteger_lancamentos();
