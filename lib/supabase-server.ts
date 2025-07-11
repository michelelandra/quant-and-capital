import { createClient } from "@supabase/supabase-js";
console.log("🧪 SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("🧪 SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
