"use client";

import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const canEdit = process.env.NEXT_PUBLIC_ENABLE_EDIT === "true";

const VISITOR_KEY = "analyses_visitor_id";

type Post = {
  id: string;
  title: string;
  slug: string;
  body_md: string;
  is_public: boolean;
  owner: string;
  created_at: string;
};

type Comment = {
  id: string;
  post_id: string;
  author: string;
  body: string;
  created_at: string;
};

type ReactionState = {
  likes: number;
  dislikes: number;
  myReaction: number;
};

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>
        ),

        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
        ),

        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
        ),

        p: ({ children }) => (
          <p className="my-3 leading-relaxed">{children}</p>
        ),

        strong: ({ children }) => (
          <strong className="font-bold">{children}</strong>
        ),

        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),

        ul: ({ children }) => (
          <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>
        ),

        ol: ({ children }) => (
          <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>
        ),

        li: ({ children }) => <li>{children}</li>,

        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-4 my-4 text-gray-600 italic">
            {children}
          </blockquote>
        ),

        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {children}
          </a>
        ),

        code: ({ children }) => (
          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
            {children}
          </code>
        ),

        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="w-full border-collapse text-sm">
              {children}
            </table>
          </div>
        ),

        th: ({ children }) => (
          <th className="border px-3 py-2 bg-gray-100 text-left">
            {children}
          </th>
        ),

        td: ({ children }) => (
          <td className="border px-3 py-2">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function AnalysisCard({
  post,
  visitorId,
  onDelete,
}: {
  post: Post;
  visitorId: string;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [author, setAuthor] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [reaction, setReaction] = useState<ReactionState>({
    likes: 0,
    dislikes: 0,
    myReaction: 0,
  });

  const [reactionLoading, setReactionLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadComments() {
      try {
        setCommentsLoading(true);

        const res = await fetch(
          `/api/analyses/comments?postId=${encodeURIComponent(post.id)}`,
          { cache: "no-store" }
        );

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load comments");
        }

        if (alive) {
          setComments(Array.isArray(json.comments) ? json.comments : []);
        }
      } catch (err) {
        console.error("Comments load error:", err);
      } finally {
        if (alive) setCommentsLoading(false);
      }
    }

    loadComments();

    return () => {
      alive = false;
    };
  }, [post.id]);

  useEffect(() => {
    if (!visitorId) return;

    let alive = true;

    async function loadReactions() {
      try {
        const res = await fetch(
          `/api/analyses/reactions?postId=${encodeURIComponent(
            post.id
          )}&visitorId=${encodeURIComponent(visitorId)}`,
          { cache: "no-store" }
        );

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load reactions");
        }

        if (alive) {
          setReaction({
            likes: Number(json.likes || 0),
            dislikes: Number(json.dislikes || 0),
            myReaction: Number(json.myReaction || 0),
          });
        }
      } catch (err) {
        console.error("Reaction load error:", err);
      }
    }

    loadReactions();

    return () => {
      alive = false;
    };
  }, [post.id, visitorId]);

  async function handleReaction(value: 1 | -1) {
    if (!visitorId || reactionLoading) return;

    const nextReaction = reaction.myReaction === value ? 0 : value;

    setReactionLoading(true);

    try {
      const res = await fetch("/api/analyses/reactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          visitorId,
          reaction: nextReaction,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Reaction failed");
      }

      setReaction({
        likes: Number(json.likes || 0),
        dislikes: Number(json.dislikes || 0),
        myReaction: Number(json.myReaction || 0),
      });
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error ? err.message : "Could not save reaction"
      );
    } finally {
      setReactionLoading(false);
    }
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();

    if (!commentBody.trim()) return;

    setCommentSubmitting(true);

    try {
      const res = await fetch("/api/analyses/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          author: author.trim(),
          body: commentBody.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Comment failed");
      }

      setComments((prev) => [...prev, json.comment as Comment]);

      setCommentBody("");
      setCommentsOpen(true);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Could not publish comment"
      );
    } finally {
      setCommentSubmitting(false);
    }
  }

  const bodyIsLong = post.body_md.length > 700;

  return (
    <article className="border rounded-lg p-5 relative bg-white shadow-sm">
      {canEdit && (
        <button
          onClick={() => onDelete(post.id)}
          className="absolute top-4 right-4 text-sm text-red-600 hover:underline"
          title="Delete post"
        >
          🗑️ Delete
        </button>
      )}

      <h2 className="text-2xl font-semibold pr-20">
        {post.title}
      </h2>

      <time className="text-xs text-gray-500 block mt-1 mb-4">
        {new Date(post.created_at).toLocaleString()}
      </time>

      <div
        className={
          bodyIsLong && !expanded
            ? "relative max-h-56 overflow-hidden"
            : ""
        }
      >
        <MarkdownContent content={post.body_md} />

        {bodyIsLong && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {bodyIsLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t">
        <button
          disabled={reactionLoading}
          onClick={() => handleReaction(1)}
          className={`px-3 py-1.5 rounded-full border transition ${
            reaction.myReaction === 1
              ? "bg-green-100 border-green-400 text-green-700"
              : "bg-white hover:bg-gray-50"
          }`}
        >
          👍 {reaction.likes}
        </button>

        <button
          disabled={reactionLoading}
          onClick={() => handleReaction(-1)}
          className={`px-3 py-1.5 rounded-full border transition ${
            reaction.myReaction === -1
              ? "bg-red-100 border-red-400 text-red-700"
              : "bg-white hover:bg-gray-50"
          }`}
        >
          👎 {reaction.dislikes}
        </button>

        <button
          onClick={() => setCommentsOpen((v) => !v)}
          className="px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50"
        >
          💬 {comments.length}{" "}
          {comments.length === 1 ? "Comment" : "Comments"}
        </button>
      </div>

      {commentsOpen && (
        <div className="mt-5 border-t pt-5">
          <h3 className="font-semibold text-lg mb-4">
            Comments
          </h3>

          {commentsLoading && (
            <p className="text-sm text-gray-500">
              Loading comments…
            </p>
          )}

          {!commentsLoading && comments.length === 0 && (
            <p className="text-sm text-gray-500 mb-4">
              No comments yet. Be the first to comment.
            </p>
          )}

          <div className="space-y-3 mb-5">
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

          <form
            onSubmit={handleComment}
            className="space-y-2"
          >
            <input
              type="text"
              maxLength={80}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name (optional)"
              className="border rounded p-2 w-full"
            />

            <textarea
              value={commentBody}
              onChange={(e) =>
                setCommentBody(e.target.value)
              }
              placeholder="Write a comment..."
              maxLength={3000}
              className="border rounded p-2 w-full min-h-24"
            />

            <button
              type="submit"
              disabled={
                !commentBody.trim() || commentSubmitting
              }
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {commentSubmitting
                ? "Posting…"
                : "Post comment"}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function AnalysesPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [visitorId, setVisitorId] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    let id = localStorage.getItem(VISITOR_KEY);

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }

    setVisitorId(id);
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(
          "/api/analyses/fetch",
          {
            cache: "no-store",
          }
        );

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error || "Failed to load posts"
          );
        }

        if (!alive) return;

        setPosts(
          Array.isArray(json.posts) ? json.posts : []
        );
      } catch (err) {
        if (!alive) return;

        setErr(
          err instanceof Error
            ? err.message
            : "Error loading posts"
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  async function handlePublish(e: FormEvent) {
    e.preventDefault();

    if (!canEdit) {
      alert(
        "Publishing is disabled on this device."
      );
      return;
    }

    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);

    try {
      const res = await fetch(
        "/api/analyses/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            body_md: body.trim(),
            is_public: true,
            owner: "main",
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Publish failed"
        );
      }

      setPosts((prev) => [
        json.post as Post,
        ...prev,
      ]);

      setTitle("");
      setBody("");
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Error while publishing"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!canEdit) return;

    if (!confirm("Delete this post?")) return;

    const previousPosts = posts;

    setPosts((prev) =>
      prev.filter((p) => p.id !== id)
    );

    try {
      const res = await fetch(
        "/api/analyses/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Delete failed"
        );
      }
    } catch (err) {
      setPosts(previousPosts);

      alert(
        err instanceof Error
          ? err.message
          : "Error while deleting"
      );
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">
          Analyses
        </h1>

        <p className="text-gray-600 mt-2">
          Financial and economic analyses, market
          views and investment research.
        </p>
      </header>

      {canEdit && (
        <form
          onSubmit={handlePublish}
          className="space-y-3 border p-5 rounded-lg bg-white"
        >
          <h2 className="font-semibold text-lg">
            New analysis
          </h2>

          <input
            className="border p-2 w-full rounded"
            placeholder="Title"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
          />

          <textarea
            className="border p-2 w-full h-48 rounded font-mono"
            placeholder={`Write your analysis in Markdown...

Example:

## Investment thesis

**Bull case:** strong earnings growth.

- Revenue growth
- Margin expansion
- AI exposure

> Main risk: valuation`}
            value={body}
            onChange={(e) =>
              setBody(e.target.value)
            }
          />

          <p className="text-xs text-gray-500">
            Markdown supported: headings, bold,
            italic, lists, links, tables and quotes.
          </p>

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={submitting}
          >
            {submitting
              ? "Publishing…"
              : "Publish"}
          </button>
        </form>
      )}

      {loading && (
        <p className="text-gray-500">
          Loading analyses…
        </p>
      )}

      {err && (
        <p className="text-red-600">{err}</p>
      )}

      {!loading &&
        !err &&
        posts.length === 0 && (
          <p className="text-gray-500">
            No analyses yet.
          </p>
        )}

      {!loading && !err && (
        <section className="space-y-6">
          {posts.map((post) => (
            <AnalysisCard
              key={post.id}
              post={post}
              visitorId={visitorId}
              onDelete={handleDelete}
            />
          ))}
        </section>
      )}
    </main>
  );
}