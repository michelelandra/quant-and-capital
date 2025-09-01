// src/app/api/health-rest/route.ts
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const host = new URL(url).host;

    const res = await fetch(`${url}/rest/v1/portfolio_cash?select=id&limit=1`, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
    });

    const text = await res.text();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      urlHost: host,
      bodySample: text.slice(0, 200), // primi 200 char
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
