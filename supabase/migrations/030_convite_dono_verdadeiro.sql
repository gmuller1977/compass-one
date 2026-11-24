-- ============================================================
-- 030 — Convite: o dono gravado é o do login (revisão de 24/11/2026, A2)
-- ============================================================
-- A política de criar convite (015) só conferia dono_id. dono_nome e
-- dono_email eram texto livre do aparelho e aparecem para o convidado (no
-- e-mail e na tela do convite): dava para escrever "Banco X" e um e-mail de
-- outra pessoa. Agora o e-mail do dono tem de ser o do login e o nome tem no
-- máximo 80 letras. A função convite-email já não lê esses campos.
--
-- Só troca UMA política. Não mexe em dado nenhum: convites já gravados ficam.
-- O app grava user.email, então nada muda para quem convida.

drop policy if exists "compartilhamentos_dono_convidar" on compartilhamentos;
create policy "compartilhamentos_dono_convidar" on compartilhamentos
  for insert to authenticated
  with check (
    auth.uid() = dono_id
    and status = 'pendente'
    and membro_id is null
    and email <> ''
    and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', ''))
    and lower(dono_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and char_length(dono_nome) <= 80
  );
