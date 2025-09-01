// src/app/api/env/route.ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const status = Object.fromEntries(keys.map(k => [k, process.env[k] ? 'set' : 'unset']));
  return NextResponse.json({ env: status, ts: new Date().toISOString() });
}
