import { NextResponse } from 'next/server';
import { supabaseService } from '../../../../../lib/supabaseService';

export const runtime = 'nodejs';

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function readJsonBody(req: Request) {
  const raw = await req.text();
  if (!raw) throw new Error('Empty body');
  try {
    return JSON.parse(raw);
  } catch {
    // niente variabile catturata → nessun warning ESLint
    throw new Error('Invalid JSON');
  }
}

export async function POST(req: Request) {
  try {
    const { title, body_md, is_public = true, owner = 'main' } = await readJsonBody(req);
    if (!title || !body_md) throw new Error('Missing title/body');

    const slug = slugify(title);

    // evita collisione slug
    const { data: ex, error: exErr } = await supabaseService
      .from('analyses_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (exErr) {
      return NextResponse.json({ ok: false, error: exErr.message }, { status: 400 });
    }

    const finalSlug = ex ? `${slug}-${Date.now().toString(36)}` : slug;

    const { data, error } = await supabaseService
      .from('analyses_posts')
      .insert({ title, body_md, is_public, owner, slug: finalSlug })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, post: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
