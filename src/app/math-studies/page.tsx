'use client';

import { useEffect, useState, FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const canEdit = process.env.NEXT_PUBLIC_ENABLE_EDIT === 'true';

type Post = {
  id: string;
  title: string;
  slug: string;
  body_md: string;
  is_public: boolean;
  owner: string;
  created_at: string;     // ISO
  media_urls?: string[];  // 👈 nuovo
};

export default function MathStudiesPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fmt = (iso: string) => (iso ? iso.replace('T', ' ').slice(0, 16) : '');

  // load
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/math/fetch', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load posts');
        const json = await res.json();
        if (alive) setPosts(Array.isArray(json.posts) ? json.posts : []);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Error loading posts');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // publish
  async function handlePublish(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return alert('Publishing disabled here.');
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      // 1) upload media (se presenti)
      let media_urls: string[] = [];
      if (files.length) {
        const fd = new FormData();
        for (const f of files) fd.append('files', f);
        const up = await fetch('/api/math/upload', { method: 'POST', body: fd });
        const uj = await up.json();
        if (!up.ok || !uj?.ok) throw new Error(uj?.error || 'Upload failed');
        media_urls = uj.urls as string[];
      }

      // 2) crea il post con gli URL
      const res = await fetch('/api/math/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body_md: body,
          is_public: true,
          owner: 'main',
          media_urls,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Publish failed');

      setPosts((p) => [json.post as Post, ...p]);
      setTitle(''); setBody(''); setFiles([]);
      // pulizia input file
      const el = document.getElementById('math-files') as HTMLInputElement | null;
      if (el) el.value = '';
    } catch (e: any) {
      alert(e?.message || 'Error while publishing');
    } finally {
      setSubmitting(false);
    }
  }

  // delete
  async function handleDelete(id: string) {
    if (!canEdit) return;
    if (!confirm('Delete this note?')) return;
    setPosts((p) => p.filter((x) => x.id !== id));
    const res = await fetch('/api/math/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) alert(json?.error || 'Delete failed');
  }

  // helper per render media
  function renderMedia(urls?: string[]) {
    if (!urls?.length) return null;
    return (
      <div className="mt-3 grid grid-cols-1 gap-3">
        {urls.map((u) => {
          const lower = u.toLowerCase();
          if (/\.(mp4|webm|mov)(\?|$)/.test(lower)) {
            return (
              <video key={u} controls className="w-full rounded">
                <source src={u} />
              </video>
            );
          }
          // default: image
          return (
            <img key={u} src={u} alt="" className="max-w-full rounded" />
          );
        })}
      </div>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Math Studies</h1>

      {canEdit ? (
        <form onSubmit={handlePublish} className="border p-4 rounded space-y-3">
          <h2 className="font-semibold">New study</h2>

          <input
            className="border p-2 w-full rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="border p-2 w-full h-40 rounded"
            placeholder="Body (Markdown + inline LaTeX)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <input
            id="math-files"
            type="file"
            multiple
            accept="image/*,video/*"
            className="block w-full"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Publishing…' : 'Publish'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 italic">Editing disabled for visitors.</p>
      )}

      {loading && <p className="text-gray-500">Loading…</p>}
      {err && <p className="text-red-600">{err}</p>}
      {!loading && !err && posts.length === 0 && <p className="text-gray-500">No studies yet.</p>}

      {!loading && !err && posts.map((p) => (
        <article key={p.id} className="border p-4 rounded relative mb-4">
          {canEdit && (
            <button
              onClick={() => handleDelete(p.id)}
              className="absolute top-2 right-2 text-sm text-red-600 hover:underline"
              title="Delete"
            >
              🗑️ Delete
            </button>
          )}
          <header className="mb-2">
            <h3 className="text-xl font-semibold">{p.title}</h3>
            <time className="text-xs text-gray-500 block">{fmt(p.created_at)}</time>
          </header>

          <div className="prose max-w-none [&_p]:mb-2">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {p.body_md}
            </ReactMarkdown>
          </div>

          {renderMedia(p.media_urls)}
        </article>
      ))}
    </main>
  );
}

