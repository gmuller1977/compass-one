-- Lista de espera do "Fale com o Educador" (18/11/2026, pedido do Guilherme:
-- "quem clicar na lista de espera, precisamos ter este controle para poder
-- enviar notificação"). A página fica no www e quem se inscreve pode não ter
-- login: a gravação é pela função entrar_lista_espera (security definer), e
-- só o suporte (eh_suporte(), migração 026) lê, marca como avisado e apaga.
-- Rodar DEPOIS da 026.

create table if not exists public.lista_espera (
  id           uuid primary key default gen_random_uuid(),
  criado_em    timestamptz not null default now(),
  oferta       text not null check (oferta in ('grupo')),
  nome         text not null check (char_length(nome) between 1 and 120),
  email        text not null check (char_length(email) between 3 and 200),
  whatsapp     text check (whatsapp is null or char_length(whatsapp) <= 30),
  user_id      uuid references auth.users(id) on delete set null,
  avisado_em   timestamptz
);
create unique index if not exists lista_espera_oferta_email on public.lista_espera (oferta, lower(email));

grant select, insert, update, delete on public.lista_espera to authenticated;
grant select, insert, update, delete on public.lista_espera to service_role;
alter table public.lista_espera enable row level security;

drop policy if exists lista_espera_suporte_le on public.lista_espera;
create policy lista_espera_suporte_le on public.lista_espera
  for select to authenticated using (public.eh_suporte());
drop policy if exists lista_espera_suporte_marca on public.lista_espera;
create policy lista_espera_suporte_marca on public.lista_espera
  for update to authenticated using (public.eh_suporte()) with check (public.eh_suporte());
drop policy if exists lista_espera_suporte_apaga on public.lista_espera;
create policy lista_espera_suporte_apaga on public.lista_espera
  for delete to authenticated using (public.eh_suporte());

-- Inscrever-se: aberto a quem não tem login. O mesmo e-mail na mesma oferta
-- atualiza nome e WhatsApp em vez de duplicar. Devolve true quando gravou.
create or replace function public.entrar_lista_espera(p_oferta text, p_nome text, p_email text, p_whatsapp text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_nome  text := btrim(coalesce(p_nome, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_zap   text := nullif(btrim(coalesce(p_whatsapp, '')), '');
begin
  if p_oferta not in ('grupo') then raise exception 'oferta inválida'; end if;
  if v_nome = '' or char_length(v_nome) > 120 then raise exception 'nome inválido'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then raise exception 'e-mail inválido'; end if;
  if v_zap is not null and char_length(v_zap) > 30 then raise exception 'whatsapp inválido'; end if;
  -- Freio simples contra robô: no máximo 200 inscrições por hora no total.
  if (select count(*) from public.lista_espera where criado_em > now() - interval '1 hour') >= 200 then
    raise exception 'muitas inscrições, tente mais tarde';
  end if;
  insert into public.lista_espera (oferta, nome, email, whatsapp, user_id)
  values (p_oferta, v_nome, v_email, v_zap, auth.uid())
  on conflict (oferta, lower(email)) do update
    set nome = excluded.nome, whatsapp = coalesce(excluded.whatsapp, public.lista_espera.whatsapp);
  return true;
end $$;
revoke execute on function public.entrar_lista_espera(text, text, text, text) from public;
grant execute on function public.entrar_lista_espera(text, text, text, text) to anon, authenticated;
