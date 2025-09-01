import { NextResponse } from 'next/server';
import { supabaseService } from '../../../../../lib/supabaseService';

export const runtime = 'nodejs';

// Accetta { id } (preferito) oppure { slug }
export async function DELETE(req: Request) {
  try {
    const raw = await req.text();
    if (!raw) throw new Error('Empty body');
    let body: any;
    try { body = JSON.parse(raw); } catch { throw new Error('Invalid JSON'); }

    const { id, slug } = body || {};
    if (!id && !slug) throw new Error('Provide id or slug');

    let query = supabaseService.from('analyses_posts').delete();
    if (id) query = query.eq('id', id);
    else query = query.eq('slug', slug);

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Error' }, { status: 400 });
  }
}
