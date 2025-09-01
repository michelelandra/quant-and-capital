// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ forza il runtime Node (non Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ✅ opzionale ma utile: stabilizza la fetch con undici
import { setGlobalDispatcher, Agent } from 'undici';
setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10 }));

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from('portfolio_cash').select('id').limit(1);

    return NextResponse.json({
      ok: !error,
      supabaseUrlSet: !!url,
      anonKeySet: !!anon,
      supabaseError: error?.message ?? null,
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

