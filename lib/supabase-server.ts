// lib/supabase-server.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { installUndiciIPv4 } from './net';

installUndiciIPv4(); // <— importantissimo: fa effetto per tutte le route server

export function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}


