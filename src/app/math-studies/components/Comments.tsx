"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  post_id: string;
  author: string;
  body: string;
  created_at: string;
};

export default function Comments({
  postId,
  onCountChange,
}: {
  postId?: string;
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentPostId: string = postId ?? "";

    if (!currentPostId) {
      setComments([]);
      setLoading(false);
      setError(null);
      onCountChange?.(0);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/math-studies/comments/fetch?postId=${encodeURIComponent(
            currentPostId
          )}`,
          {
            cache: "no-store",
          }
        );

        if (!res.ok) {
          let message = "";

          try {
            const json = await res.json();
            message = json?.error || `HTTP ${res.status}`;
          } catch {
            message = await res.text();
          }

          throw new Error(
            message || `HTTP ${res.status}`
          );
        }

        const data = await res.json();

        if (!cancelled) {
          const list: Comment[] = Array.isArray(data)
            ? data
            : [];

          setComments(list);
          onCountChange?.(list.length);
        }
      } catch (err) {
        console.error(
          "Comments fetch failed:",
          err
        );

        if (!cancelled) {
          setComments([]);
          onCountChange?.(0);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load comments"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [postId, onCountChange]);

  async function addComment() {
    const currentPostId: string = postId ?? "";

    if (!currentPostId || !body.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        "/api/math-studies/comments/add",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            postId: currentPostId,
            author:
              author.trim() || "Anonymous",
            body: body.trim(),
            hp: "",
          }),
        }
      );

      const data = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ||
            `HTTP ${res.status}`
        );
      }

      setComments((prev) => {
        const next = [
          ...prev,
          data as Comment,
        ];

        onCountChange?.(next.length);

        return next;
      });

      setBody("");
      setAuthor("");
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Error adding comment"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Comments
      </h3>

      {loading && (
        <p className="text-sm text-gray-500">
          Loading comments…
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">
          Error: {error}
        </p>
      )}

      {!loading &&
        !error &&
        comments.length === 0 && (
          <p className="text-sm text-gray-500">
            No comments yet. Be the first
            to comment.
          </p>
        )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="border rounded-lg p-3 bg-gray-50"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <strong className="text-sm">
                {comment.author}
              </strong>

              <span className="text-xs text-gray-500">
                {new Date(
                  comment.created_at
                ).toLocaleString()}
              </span>
            </div>

            <p className="mt-2 whitespace-pre-wrap">
              {comment.body}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <input
          type="text"
          maxLength={80}
          placeholder="Your name (optional)"
          value={author}
          onChange={(e) =>
            setAuthor(e.target.value)
          }
          className="border rounded p-2 w-full"
        />

        <textarea
          maxLength={3000}
          placeholder="Write a comment..."
          value={body}
          onChange={(e) =>
            setBody(e.target.value)
          }
          className="border rounded p-2 w-full min-h-24"
        />

        <button
          onClick={addComment}
          disabled={
            !body.trim() || submitting
          }
          className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {submitting
            ? "Posting…"
            : "Post comment"}
        </button>
      </div>
    </div>
  );
}