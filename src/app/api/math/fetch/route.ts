import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(url, anon);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('math_posts')
      .select(
        'id, title, slug, body_md, is_public, owner, created_at, media_urls'
      )
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json(
      { ok: true, posts: data ?? [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json(
      { ok: false, error: msg },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}

