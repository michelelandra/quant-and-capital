"use client";

import { useEffect, useState } from "react";
import Comments from "./components/Comments";
import MathStudyForm from "./components/MathStudyForm";
// Se vuoi renderizzare markdown+LaTeX in pagina (non solo preview), scommenta e installa le dipendenze:
// import ReactMarkdown from "react-markdown";
// import remarkMath from "remark-math";
// import rehypeKatex from "rehype-katex";
// import "katex/dist/katex.min.css";

type Post = {
  id: string;
  title: string;
  slug: string;
  body_md: string;
  created_at: string;
  category?: string;
  tags?: string;
  media_urls?: string[];
};

function renderMedia(url: string) {
  const u = url.toLowerCase();
  if (u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".gif") || u.endsWith(".webp")) {
    return <img key={url} src={url} alt="" className="max-w-full rounded border" />;
  }
  if (u.endsWith(".mp4") || u.endsWith(".webm")) {
    return <video key={url} src={url} controls className="w-full rounded border" />;
  }
  if (u.endsWith(".pdf")) {
    return (
      <iframe
        key={url}
        src={url}
        className="w-full h-[480px] rounded border"
        title="PDF"
      />
    );
  }
  // fallback (es. YouTube/Vimeo links)
  return (
    <a key={url} href={url} target="_blank" className="text-blue-600 underline">
      {url}
    </a>
  );
}

// flag build-time (client-safe perché NEXT_PUBLIC_)
const ENABLE_EDIT =
  String(process.env.NEXT_PUBLIC_ENABLE_EDIT ?? "").toLowerCase() === "true";

export default function MathStudiesPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // attiva modalità admin con #admin nell'URL
  const [showAdmin, setShowAdmin] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#admin") {
      setShowAdmin(true);
    }
  }, []);
  const canEdit = ENABLE_EDIT || showAdmin;

  async function fetchPosts() {
    try {
      const res = await fetch("/api/math-studies/fetch", { cache: "no-store" });
      const raw = await res.text().then((t) => (t ? JSON.parse(t) : []));
      if (!res.ok) throw new Error(raw?.error || `HTTP ${res.status}`);
      const list: Post[] = Array.isArray(raw) ? raw : raw?.data ?? [];
      if (!Array.isArray(list)) throw new Error("Unexpected response for posts");
      setPosts(list);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load posts");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  function handleCreated(newPost: Post) {
    // prepend appena pubblicato
    setPosts((prev) => [newPost, ...prev]);
  }

  if (loading) return <p className="p-6">Loading posts…</p>;
  if (error) return <p className="p-6 text-red-500">Error: {error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-2">Math Studies</h1>

      {/* Form di pubblicazione: visibile solo se canEdit */}
      {canEdit && (
        <section className="mb-8">
          <MathStudyForm onCreated={handleCreated} />
          {showAdmin && (
            <p className="mt-2 text-xs text-gray-500">
              Admin mode via <code>#admin</code> — publishing requires passphrase.
            </p>
          )}
        </section>
      )}

      {posts.length === 0 && (
        <p className="text-gray-600">No math studies published yet.</p>
      )}

      {posts.map((post) => (
        <article
          key={post.id}
          className="border rounded-xl p-4 shadow-sm bg-white space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{post.title}</h2>
            {post.category && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 border">
                {post.category}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {new Date(post.created_at).toLocaleDateString()}
            {post.tags ? ` • ${post.tags}` : ""}
          </p>

          {/* Corpo: markdown+LaTeX se abiliti le dipendenze */}
          {/* <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {post.body_md}
          </ReactMarkdown> */}
          <p className="whitespace-pre-line">{post.body_md}</p>

          {/* Media */}
          {!!post.media_urls?.length && (
            <div className="space-y-3">
              {post.media_urls.map((url) => renderMedia(url))}
            </div>
          )}

          {/* Commenti */}
          {post.id ? <Comments postId={post.id} /> : null}
        </article>
      ))}
    </div>
  );
}
