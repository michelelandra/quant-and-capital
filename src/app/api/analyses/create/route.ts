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
  // parse robusto: evita il crash di req.json() quando il body non è JSON puro
  const raw = await req.text();
  if (!raw) throw new Error('Empty body');
  try {
    return JSON.parse(raw);
  } catch (e) {
    // aiuta in debug: vedi prime 200 chars del body
    if (process.env.NODE_ENV !== 'production') {
      console.error('Invalid JSON body (first 200 chars):', raw.slice(0, 200));
      console.error('Headers:', Object.fromEntries(req.headers));
    }
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
    if (exErr) throw exErr;
    const finalSlug = ex ? `${slug}-${Date.now().toString(36)}` : slug;

    const { data, error } = await supabaseService
      .from('analyses_posts')
      .insert({ title, body_md, is_public, owner, slug: finalSlug })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, post: data });
  } catch (e: any) {
    // rispondi SEMPRE JSON, così il client non esplode su r.json()
    return NextResponse.json({ ok: false, error: e?.message ?? 'Error' }, { status: 400 });
  }
}

