import { createClient } from '@supabase/supabase-js';

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error(
      'Server env not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing'
    );
  }
  return { url, service };
}

/** Factory: crea il client quando serve (niente crash a build-time) */
export function getSupabaseService() {
  const { url, service } = getEnv();
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** (legacy) export opzionale per codice esistente; evita throw a build */
export const supabaseService =
  (() => {
    try {
      const { url, service } = getEnv();
      return createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch {
      // non usare questo export se mancano le ENV; usa la factory sopra
      return undefined as unknown as ReturnType<typeof createClient>;
    }
  })();
