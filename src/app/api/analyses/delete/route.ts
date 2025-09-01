import { NextResponse } from 'next/server';
import { supabaseService } from '../../../../../lib/supabaseService';

export const runtime = 'nodejs';

async function readJsonBody(req: Request) {
  const raw = await req.text();
  if (!raw) throw new Error('Empty body');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON');
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, slug } = await readJsonBody(req);
    if (!id && !slug) throw new Error('Provide id or slug');

    let q = supabaseService.from('analyses_posts').delete();
    q = id ? q.eq('id', id) : q.eq('slug', slug);

    const { error } = await q;
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
