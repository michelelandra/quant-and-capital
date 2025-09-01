import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
if (!service) throw new Error('Missing env SUPABASE_SERVICE_ROLE_KEY');

export const supabaseService = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false }
});
