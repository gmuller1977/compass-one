import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  // Passkey: a entrada por digital (src/utils/digital.ts). Sem a flag, toda
  // chamada de passkey lança erro antes de chegar ao servidor.
  { auth: { experimental: { passkey: true } } },
)
