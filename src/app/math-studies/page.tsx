'use client';

import { useState, FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/* 👇 visibilità editor solo per l’autore */
const canEdit = process.env.NEXT_PUBLIC_ENABLE_EDIT === 'true';

/* ---------- tipi ---------- */
type Study = {
  id: string;
  title: string;
  body: string;          // markdown (+ LaTeX inline)
  created: string;       // ISO date
  tag?: string;
  category?: Category;   // ⬅️ nuovo
};

type Category =
  | 'calculus'
  | 'physic'
  | 'statistic'
  | 'coding'
  | 'logic'
  | 'other';

/* ---------- helper LS ---------- */
const LS_KEY = 'math_studies';

function loadStudies(): Study[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStudies(st: Study[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(st));
}

/* ---------- componente ---------- */
export default function MathStudiesPage() {
  /* stato */
  const [studies, setStudies] = useState<Study[]>(loadStudies);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState<Category>('other'); // ⬅️ nuovo

  /* publish */
  function handlePublish(e: FormEvent) {
    e.preventDefault();
    if (!title || !body) return;
    const next: Study[] = [
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        body: body.trim(),
        tag: tag.trim() || undefined,
        category,
        created: new Date().toISOString(),
      },
      ...studies,
    ];
    setStudies(next);
    saveStudies(next);
    setTitle('');
    setBody('');
    setTag('');
    setCategory('other');
  }

  /* delete */
  function handleDelete(id: string) {
    if (!confirm('Delete this study?')) return;
    const next = studies.filter((s) => s.id !== id);
    setStudies(next);
    saveStudies(next);
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Math Studies</h1>

      {/* form: visibile solo se canEdit */}
      {canEdit ? (
        <form onSubmit={handlePublish} className="border p-4 rounded space-y-2">
          <h2 className="font-semibold">New study</h2>

          <input
            className="border p-2 w-full"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="border p-2 w-full h-40"
            placeholder="Body (markdown + inline LaTeX)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <input
            className="border p-2 w-full"
            placeholder="Tag (optional)"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />

          {/* --- selettore categoria --- */}
          <select
            className="border p-2 w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            <option value="calculus">Calculus</option>
            <option value="physic">Physic</option>
            <option value="statistic">Statistic</option>
            <option value="coding">Coding</option>
            <option value="logic">Logic</option>
            <option value="other">Other</option>
          </select>

          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Publish
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 italic mb-4">
          Editing disabled for visitors.
        </p>
      )}

      {/* elenco studi */}
      {studies.length === 0 && (
        <p className="text-gray-500">No studies yet.</p>
      )}

      {studies.map((study) => (
        <article key={study.id} className="border p-4 rounded relative mb-4">
          {/* delete solo se canEdit */}
          {canEdit && (
            <button
              onClick={() => handleDelete(study.id)}
              className="absolute top-2 right-2 text-sm text-red-600 hover:underline"
            >
              🗑️ Delete
            </button>
          )}

          <header className="mb-2">
            <h3 className="text-xl font-semibold">{study.title}</h3>
            <time className="text-xs text-gray-500">
              {study.created.slice(0, 10)}
            </time>

            {study.tag && (
              <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">
                {study.tag}
              </span>
            )}

            {study.category && (
              <span className="ml-2 text-xs bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                {study.category}
              </span>
            )}
          </header>

          {/* corpo: markdown + LaTeX */}
          <div className="prose max-w-none [&_p]:mb-2">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {study.body}
            </ReactMarkdown>
          </div>
        </article>
      ))}
    </main>
  );
}




