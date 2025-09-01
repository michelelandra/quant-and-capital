// src/app/api/health2/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const host = (() => { try { return new URL(url).host; } catch { return null; } })();

    const res = await fetch(`${url}/rest/v1/portfolio_cash?select=id&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      cache: 'no-store',
    });

    const text = await res.text();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      host,
      bodySample: text.slice(0, 160),
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

