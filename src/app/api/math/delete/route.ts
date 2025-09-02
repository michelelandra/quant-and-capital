import { NextResponse } from 'next/server';
import { getSupabaseService } from '../../../../../lib/supabaseService';

export const runtime = 'nodejs';

const BUCKET = 'math-media';

function pathsFromPublicUrls(urls: string[]) {
  const out: string[] = [];
  for (const u of urls || []) {
    const m = u.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (m?.[1]) out.push(m[1]);
  }
  return out;
}

async function readJson(req: Request) {
  const txt = await req.text();
  if (!txt) throw new Error('Empty body');
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error('Invalid JSON');
  }
}

export async function DELETE(req: Request) {
  try {
    // interruttore sicurezza in produzione
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ANALYSES_ALLOW_WRITE !== 'true'
    ) {
      return NextResponse.json(
        { ok: false, error: 'Writes disabled' },
        { status: 403 }
      );
    }

    const { id } = await readJson(req);
    if (!id || typeof id !== 'string') throw new Error('Missing id');

    const supabase = getSupabaseService();

    // leggo gli URL per rimuovere eventuali file dallo storage (best-effort)
    const { data: rec, error: getErr } = await supabase
      .from('math_posts')
      .select('media_urls')
      .eq('id', id)
      .maybeSingle();

    if (getErr) {
      return NextResponse.json({ ok: false, error: getErr.message }, { status: 400 });
    }

    // elimino la riga
    const { error: delErr } = await supabase
      .from('math_posts')
      .delete()
      .eq('id', id);

    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
    }

    // rimozione file dallo storage (se presenti) – non blocca la risposta
    const paths = pathsFromPublicUrls(rec?.media_urls || []);
    if (paths.length) {
      try {
        await supabase.storage.from(BUCKET).remove(paths);
      } catch {
        // best effort: non falliamo la request se lo storage non si pulisce
      }
    }

    return NextResponse.json({ ok: true, deleted: id, removed: paths || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
