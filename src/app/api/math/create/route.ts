import { NextResponse } from 'next/server';
import { getSupabaseService } from '../../../../../lib/supabaseService';

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
    throw new Error('Invalid JSON');
  }
}

export async function POST(req: Request) {
  try {
    // interruttore di sicurezza (produzione)
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ANALYSES_ALLOW_WRITE !== 'true'
    ) {
      return NextResponse.json(
        { ok: false, error: 'Writes disabled' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseService();

    const {
      title,
      body_md,
      is_public = true,
      owner = 'main',
      media_urls = [],
    } = await readJsonBody(req);

    if (!title || !body_md) throw new Error('Missing title/body');

    // normalizza media_urls
    const medias: string[] = Array.isArray(media_urls)
      ? media_urls
          .filter((u: unknown) => typeof u === 'string')
          .map((u: string) => u.trim())
          .filter(Boolean)
      : [];

    // slug unico
    const slug = slugify(title);
    const { data: ex, error: exErr } = await supabase
      .from('math_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json(
        { ok: false, error: exErr.message },
        { status: 400 }
      );
    }

    const finalSlug = ex ? `${slug}-${Date.now().toString(36)}` : slug;

    // inserisci record (incluso media_urls)
    const { data, error } = await supabase
      .from('math_posts')
      .insert({
        title,
        body_md,
        is_public,
        owner,
        slug: finalSlug,
        media_urls: medias,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, post: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}


