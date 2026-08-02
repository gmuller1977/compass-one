create table if not exists simulacoes (
  id                      uuid default gen_random_uuid() primary key,
  user_id                 uuid references auth.users(id) on delete cascade not null,
  tipo                    text not null check (tipo in ('divida', 'meta')),
  nome                    text not null,
  valor_total             numeric not null,
  parcela                 numeric not null,
  juros                   numeric default 0,
  resultado_meses         integer not null,
  data_conclusao          text not null,
  total_pago              numeric,
  juros_pagos             numeric,
  ativo                   boolean default true,
  integrado_planejamento  boolean default false,
  created_at              timestamptz default now()
);

alter table simulacoes enable row level security;

create policy "simulacoes_usuario_proprio" on simulacoes
  for all to public
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
