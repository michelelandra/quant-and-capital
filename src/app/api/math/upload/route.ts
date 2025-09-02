import { NextResponse } from 'next/server';
import { getSupabaseService } from '../../../../../lib/supabaseService';

export const runtime = 'nodejs';

const BUCKET = 'math-media';                // nome bucket
const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;          // 10 MB per file
const ALLOWED = [
  'image/png','image/jpeg','image/webp','image/gif',
  'video/mp4','video/webm','video/quicktime'
];

function sanitize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-]+/g, '-').replace(/-+/g, '-');
}

export async function POST(req: Request) {
  try {
    // interruttore di sicurezza
    if (process.env.NODE_ENV === 'production' &&
        process.env.ANALYSES_ALLOW_WRITE !== 'true') {
      return NextResponse.json({ ok:false, error:'Writes disabled' }, { status: 403 });
    }

    const form = await req.formData();
    const files = form.getAll('files') as unknown as File[];

    if (!files.length) return NextResponse.json({ ok: true, urls: [] });
    if (files.length > MAX_FILES) throw new Error(`Too many files (max ${MAX_FILES})`);

    const supabase = getSupabaseService();

    // crea bucket se non esiste (idempotente)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    const urls: string[] = [];
    for (const f of files) {
      if (!ALLOWED.includes((f as any).type)) {
        throw new Error(`Unsupported type: ${(f as any).type}`);
      }
      if ((f as any).size > MAX_SIZE) {
        throw new Error(`File too large: ${(f as any).name}`);
      }

      const ab = await f.arrayBuffer();
      const path = `${new Date().toISOString().slice(0,10)}/` +
                   `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-` +
                   `${sanitize((f as any).name)}`;

      const { data, error } = await supabase
        .storage
        .from(BUCKET)
        // @ts-ignore - Buffer disponibile in runtime node
        .upload(path, Buffer.from(ab), { contentType: (f as any).type, upsert: false });

      if (error) throw error;

      const pub = supabase.storage.from(BUCKET).getPublicUrl(data.path);
      urls.push(pub.data.publicUrl);
    }

    return NextResponse.json({ ok: true, urls });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ ok:false, error: message }, { status: 400 });
  }
}
