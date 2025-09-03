"use client";

import { useEffect, useMemo, useState } from "react";

type Comment = {
  id: string;
  post_id: string;
  author: string;
  body: string;
  created_at: string;
};

export default function Comments({
  postId,
  className = "",
}: {
  postId: string;
  className?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hp, setHp] = useState(""); // honeypot anti-bot (DEVE restare vuoto)

  // form validation
  const bodyTooLong = body.length > 3000;
  const authorTooLong = author.length > 80;
  const canSubmit = !submitting && body.trim().length > 0 && !bodyTooLong && !authorTooLong;

  // format time
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  // carica commenti
  useEffect(() => {
    let stop = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/math-studies/comments/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Fetch error");
        if (!stop) setComments(data as Comment[]);
      } catch (e: any) {
        if (!stop) setError(e?.message ?? "Unexpected error");
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [postId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    // optimistic UI
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      post_id: postId,
      author: (author || "Anonymous").trim(),
      body: body.trim(),
      created_at: new Date().toISOString(),
    };
    setComments((curr) => [...curr, optimistic]);

    try {
      const res = await fetch("/api/math-studies/comments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          author: author || "Anonymous",
          body,
          hp, // honeypot: deve rimanere ""
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submit error");

      // sostituisci l'optimistic con quello reale dal server
      setComments((curr) =>
        curr.map((c) => (c.id === tempId ? (data as Comment) : c))
      );
      setBody("");
      setAuthor("");
    } catch (e: any) {
      // annulla optimistic se errore
      setComments((curr) => curr.filter((c) => c.id !== tempId));
      setError(e?.message ?? "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  const count = useMemo(() => comments.length, [comments]);

  return (
    <div className={`mt-6 space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold">Comments ({count})</h3>

      {/* lista */}
      <div className="space-y-3">
        {loading && <p className="text-sm opacity-70">Loading comments…</p>}
        {error && (
          <div className="text-sm rounded-md border border-red-300 bg-red-50 p-2">
            {error}
          </div>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-sm opacity-70">Be the first to comment.</p>
        )}
        {comments.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border p-3 shadow-sm"
          >
            <div className="mb-1 text-xs opacity-70">
              <span className="font-medium">{c.author}</span> • {fmt(c.created_at)}
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>

      {/* form */}
      <form onSubmit={onSubmit} className="rounded-2xl border p-4 shadow-sm space-y-3">
        {/* honeypot invisibile per bot */}
        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-xl border px-3 py-2"
            placeholder="Your name (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={80}
          />
        </div>
        <div>
          <textarea
            className="w-full min-h-[90px] rounded-xl border px-3 py-2"
            placeholder="Write a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={3000}
          />
          <div className="mt-1 flex justify-between text-xs opacity-60">
            <span>{body.length}/3000</span>
            {authorTooLong && <span className="text-red-600">Name too long</span>}
            {bodyTooLong && <span className="text-red-600">Comment too long</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`rounded-xl px-4 py-2 text-white shadow-sm transition ${
              canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400"
            }`}
          >
            {submitting ? "Posting…" : "Add comment"}
          </button>
          <span className="text-xs opacity-60">
            Please be respectful. No spam.
          </span>
        </div>
      </form>
    </div>
  );
}
