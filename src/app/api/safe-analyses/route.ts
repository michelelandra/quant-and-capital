import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/analyses?select=*&order=created_at.desc`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Supabase fetch failed' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
