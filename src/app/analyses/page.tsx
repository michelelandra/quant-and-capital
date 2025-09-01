'use client';

import { useEffect, useState, FormEvent } from 'react';

/** Editor visibile solo a te (in base all'env) */
const canEdit = process.env.NEXT_PUBLIC_ENABLE_EDIT === 'true';

type Post = {
  id: string;
  title: string;
  slug: string;
  body_md: string;
  is_public: boolean;
  owner: string;
  created_at: string; // ISO
};

export default function AnalysesPage() {
  // ---- state ----
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ---- load from API (DB) ----
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/analyses/fetch', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load posts');
        const json = await res.json();
        if (!alive) return;
        setPosts(Array.isArray(json.posts) ? json.posts : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Error loading posts');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  // ---- publish ----
  async function handlePublish(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return alert('Publishing is disabled on this device.');
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/analyses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body_md: body,
          is_public: true,
          owner: 'main',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Publish failed');

      // prepend the newly created post returned by the server
      setPosts((prev) => [json.post as Post, ...prev]);
      setTitle('');
      setBody('');
    } catch (e: any) {
      alert(e?.message || 'Error while publishing');
    } finally {
      setSubmitting(false);
    }
  }

  // ---- delete ----
  async function handleDelete(id: string) {
    if (!canEdit) return;
    if (!confirm('Delete this post?')) return;

    // ottimismo: rimuovi subito dalla UI
    setPosts((prev) => prev.filter((p) => p.id !== id));

    try {
      const res = await fetch('/api/analyses/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Delete failed');
      }
    } catch (e: any) {
      alert(e?.message || 'Error while deleting');
      // rollback UI se vuoi:
      // await refetch() // oppure ricarica la lista
    }
  }

  // ---- render ----
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Analyses</h1>

      {/* form: only for owner */}
      {canEdit ? (
        <form onSubmit={handlePublish} className="space-y-2 border p-4 rounded">
          <h2 className="font-semibold">New analysis</h2>
          <input
            className="border p-2 w-full rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="border p-2 w-full h-32 rounded"
            placeholder="Body (Markdown or plain text)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Publishing…' : 'Publish'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 italic mb-4">
          Editing disabled for visitors.
        </p>
      )}

      {/* list */}
      {loading && <p className="text-gray-500">Loading…</p>}
      {err && <p className="text-red-600">{err}</p>}
      {!loading && !err && posts.length === 0 && (
        <p className="text-gray-500">No analyses yet.</p>
      )}

      {!loading &&
        !err &&
        posts.map((p) => (
          <article key={p.id} className="border p-4 rounded mb-4 relative">
            {/* delete solo per owner */}
            {canEdit && (
              <button
                onClick={() => handleDelete(p.id)}
                className="absolute top-2 right-2 text-sm text-red-600 hover:underline"
                title="Delete post"
              >
                🗑️ Delete
              </button>
            )}

            <h3 className="text-xl font-semibold">{p.title}</h3>
            <time className="text-xs text-gray-500 block mb-2">
              {new Date(p.created_at).toLocaleString()}
            </time>
            <p className="whitespace-pre-line mt-2">
              {p.body_md?.slice(0, 150)}
              {p.body_md?.length > 150 ? '…' : ''}
            </p>
          </article>
        ))}
    </main>
  );
}

