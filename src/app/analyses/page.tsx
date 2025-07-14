'use client';

import { useEffect, useState, FormEvent } from 'react';
import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';

/* Supabase client */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* 👇 visibilità editor solo per l’autore  */
const canEdit = process.env.NEXT_PUBLIC_ENABLE_EDIT === 'true';

type Analysis = {
  id: string;
  title: string;
  body: string;
  media?: string;
  created_at: string; // ISO date
};

const STORAGE_KEY = 'analyses_posts';

export default function AnalysesPage() {
  /* stato -------------------------------------- */
  const [posts, setPosts] = useState<Analysis[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [media, setMedia] = useState('');

  /* load da Supabase --------------------------- */
  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching analyses:', error.message);
        // fallback a localStorage solo in locale
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setPosts(JSON.parse(saved));
      } else {
        setPosts(data || []);
      }
    }

    fetchPosts();
  }, []);

  /* save (solo su Supabase se canEdit) --------- */
  async function handlePublish(e: FormEvent) {
    e.preventDefault();
    if (!title || !body) return;

    const newPost: Analysis = {
      id: uuid(),
      title,
      body,
      media,
      created_at: new Date().toISOString(),
    };

    const next = [newPost, ...posts];
    setPosts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); // fallback salvataggio

    setTitle('');
    setBody('');
    setMedia('');

    if (canEdit) {
      const { error } = await supabase.from('analyses').insert([newPost]);
      if (error) console.error('❌ Failed to publish to Supabase:', error.message);
    }
  }

  /* delete ------------------------------------- */
  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return;

    const next = posts.filter(p => p.id !== id);
    setPosts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    if (canEdit) {
      const { error } = await supabase.from('analyses').delete().eq('id', id);
      if (error) console.error('❌ Failed to delete from Supabase:', error.message);
    }
  }

  /* render ------------------------------------- */
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Analyses</h1>

      {/* form: visibile solo se canEdit */}
      {canEdit ? (
        <form onSubmit={handlePublish} className="space-y-2 border p-4 rounded">
          <h2 className="font-semibold">New analysis</h2>
          <input
            className="border p-2 w-full"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="border p-2 w-full h-32"
            placeholder="Body (markdown or plain text)"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <input
            className="border p-2 w-full"
            placeholder="Media URL (optional image / pdf / link)"
            value={media}
            onChange={e => setMedia(e.target.value)}
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Publish
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 italic mb-4">
          Editing disabled for visitors.
        </p>
      )}

      {/* elenco */}
      {posts.length === 0 && (
        <p className="text-gray-500">No analyses yet.</p>
      )}
      {posts.map(p => (
        <article key={p.id} className="border p-4 rounded relative mb-4">
          {/* delete solo se canEdit */}
          {canEdit && (
            <button
              onClick={() => handleDelete(p.id)}
              className="absolute top-2 right-2 text-sm text-red-600 hover:underline"
            >
              🗑️ Delete
            </button>
          )}

          <h3 className="text-xl font-semibold">{p.title}</h3>
          <time className="text-xs text-gray-500">
            {p.created_at.slice(0, 10)}
          </time>

          <p className="whitespace-pre-line mt-2">{p.body}</p>

          {p.media && (
            <a
              href={p.media}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-blue-600 underline"
            >
              Media ↗
            </a>
          )}
        </article>
      ))}
    </main>
  );
}
