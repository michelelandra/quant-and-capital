"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  post_id: string;
  author: string;
  body: string;
  created_at: string;
};

export default function Comments({ postId }: { postId?: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ⛔ Non chiamare l'API se non c'è un postId valido
    if (!postId) {
      setComments([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/math-studies/comments/fetch?postId=${encodeURIComponent(postId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          // Provo a leggere JSON, altrimenti testo grezzo
          let msg = "";
          try {
            const j = await res.json();
            msg = j?.error || `HTTP ${res.status}`;
          } catch {
            msg = await res.text();
          }
          throw new Error(msg || `HTTP ${res.status}`);
        }
        const data: Comment[] = await res.json();
        if (!cancelled) setComments(data);
      } catch (e: any) {
        console.error("Comments fetch failed:", e);
        if (!cancelled) {
          setComments([]); // non bloccare la pagina
          setError(e?.message || "Failed to load comments");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function addComment() {
    if (!postId) {
      alert("Missing postId: impossibile aggiungere il commento.");
      return;
    }
    if (!body.trim()) return;

    try {
      const res = await fetch("/api/math-studies/comments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          author: author || "Anonymous",
          body,
          hp: "", // honeypot
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      // Aggiungo in coda il nuovo commento
      setComments((prev) => [...prev, data as Comment]);
      setBody("");
      setAuthor("");
    } catch (e: any) {
      alert(e?.message || "Error adding comment");
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="font-semibold">Comments</h3>

      {!postId && (
        <p className="text-sm text-gray-500">
          No comments available for this item.
        </p>
      )}

      {postId && loading && <p className="text-sm">Loading…</p>}
      {postId && error && (
        <p className="text-sm text-red-500">Error: {error}</p>
      )}
      {postId && comments.length === 0 && !loading && !error && (
        <p className="text-sm text-gray-500">No comments yet.</p>
      )}

      {postId && (
        <>
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="border rounded p-2">
                <p className="text-sm">
                  <b>{c.author}</b> •{" "}
                  {new Date(c.created_at).toLocaleString()}
                </p>
                <p>{c.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="border rounded p-1"
            />
            <textarea
              placeholder="Write a comment..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="border rounded p-1"
            />
            <button
              onClick={addComment}
              disabled={!body.trim()}
              className="bg-blue-500 text-white rounded p-1 hover:bg-blue-600 disabled:opacity-50"
            >
              Add Comment
            </button>
          </div>
        </>
      )}
    </div>
  );
}

