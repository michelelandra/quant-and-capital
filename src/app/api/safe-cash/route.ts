import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/portfolio_cash?select=amount&order=updated_at.desc&limit=1`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY!}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Supabase cash fetch failed' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data[0]);
}

