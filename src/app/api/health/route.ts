// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { serverSupabase } from '../../../../lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = serverSupabase();
    const { error } = await supabase.from('portfolio_cash').select('id').limit(1);

    return NextResponse.json({
      ok: !error,
      supabaseUrlSet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anonKeySet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseError: error?.message ?? null,
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}


