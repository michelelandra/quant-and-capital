import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const host = (() => { try { return new URL(url).host; } catch { return ''; } })();

  const out: any = { url, host };

  try {
    const r = await fetch(`${url}/auth/v1/health`, { method: 'GET', cache: 'no-store' });
    out.pingAuth = { ok: r.ok, status: r.status };
  } catch (e: any) {
    out.pingAuth = { ok: false, error: String(e) };
  }

  try {
    if (host) {
      const addrs = await lookup(host, { all: true });
      out.dns = addrs;
    }
  } catch (e: any) {
    out.dnsError = String(e);
  }

  try {
    const g = await fetch('https://www.google.com', { method: 'HEAD', cache: 'no-store' });
    out.google = { ok: g.ok, status: g.status };
  } catch (e: any) {
    out.google = { ok: false, error: String(e) };
  }

  return NextResponse.json(out);
}

