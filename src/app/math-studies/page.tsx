"use client";

import { useEffect, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";

import MediaRenderer from "./components/MediaRenderer";
import Comments from "./components/Comments";
import MathStudyForm from "./components/MathStudyForm";

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

type ReactionState = {
  likes: number;
  dislikes: number;
  myReaction: number;
};

const ENABLE_EDIT =
  String(
    process.env.NEXT_PUBLIC_ENABLE_EDIT ?? ""
  ).toLowerCase() === "true";

const VISITOR_KEY =
  "math_studies_visitor_id";

function MarkdownMath({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
        remarkMath,
      ]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-3">
            {children}
          </h1>
        ),

        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-5 mb-3">
            {children}
          </h2>
        ),

        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2">
            {children}
          </h3>
        ),

        p: ({ children }) => (
          <p className="my-3 leading-relaxed">
            {children}
          </p>
        ),

        strong: ({ children }) => (
          <strong className="font-bold">
            {children}
          </strong>
        ),

        em: ({ children }) => (
          <em className="italic">
            {children}
          </em>
        ),

        ul: ({ children }) => (
          <ul className="list-disc pl-6 my-3 space-y-1">
            {children}
          </ul>
        ),

        ol: ({ children }) => (
          <ol className="list-decimal pl-6 my-3 space-y-1">
            {children}
          </ol>
        ),

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
          <td className="border px-3 py-2">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function MathStudyCard({
  post,
  visitorId,
}: {
  post: Post;
  visitorId: string;
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [commentsOpen, setCommentsOpen] =
    useState(false);

  const [commentCount, setCommentCount] =
    useState(0);

  const [reactionLoading, setReactionLoading] =
    useState(false);

  const [reaction, setReaction] =
    useState<ReactionState>({
      likes: 0,
      dislikes: 0,
      myReaction: 0,
    });

  useEffect(() => {
    if (!visitorId) return;

    let alive = true;

    async function loadReactions() {
      try {
        const res = await fetch(
          `/api/math-studies/reactions?postId=${encodeURIComponent(
            post.id
          )}&visitorId=${encodeURIComponent(
            visitorId
          )}`,
          {
            cache: "no-store",
          }
        );

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error ||
              "Failed to load reactions"
          );
        }

        if (alive) {
          setReaction({
            likes: Number(
              json.likes || 0
            ),

            dislikes: Number(
              json.dislikes || 0
            ),

            myReaction: Number(
              json.myReaction || 0
            ),
          });
        }
      } catch (err) {
        console.error(
          "Reaction load error:",
          err
        );
      }
    }

    loadReactions();

    return () => {
      alive = false;
    };
  }, [post.id, visitorId]);

  async function handleReaction(
    value: 1 | -1
  ) {
    if (
      !visitorId ||
      reactionLoading
    ) {
      return;
    }

    const nextReaction =
      reaction.myReaction === value
        ? 0
        : value;

    setReactionLoading(true);

    try {
      const res = await fetch(
        "/api/math-studies/reactions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            postId: post.id,
            visitorId,
            reaction: nextReaction,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error ||
            "Reaction failed"
        );
      }

      setReaction({
        likes: Number(json.likes || 0),
        dislikes: Number(
          json.dislikes || 0
        ),
        myReaction: Number(
          json.myReaction || 0
        ),
      });
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Could not save reaction"
      );
    } finally {
      setReactionLoading(false);
    }
  }

  const bodyIsLong =
    post.body_md.length > 700;

  return (
    <article className="border rounded-xl p-5 shadow-sm bg-white">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold">
          {post.title}
        </h2>

        {post.category && (
          <span className="text-xs px-3 py-1 rounded-full bg-gray-100 border whitespace-nowrap">
            {post.category}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-2">
        {new Date(
          post.created_at
        ).toLocaleDateString()}

        {post.tags
          ? ` • ${post.tags}`
          : ""}
      </p>

      {/* Markdown + LaTeX */}
      <div
        className={`mt-5 ${
          bodyIsLong && !expanded
            ? "relative max-h-64 overflow-hidden"
            : ""
        }`}
      >
        <MarkdownMath
          content={post.body_md}
        />

        {bodyIsLong && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {bodyIsLong && (
        <button
          onClick={() =>
            setExpanded((v) => !v)
          }
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          {expanded
            ? "Show less"
            : "Read more"}
        </button>
      )}

      {/* Media */}
      {(post.media_urls?.length ?? 0) >
        0 && (
        <div className="mt-5">
          <MediaRenderer
            urls={
              post.media_urls ?? []
            }
          />
        </div>
      )}

      {/* Social bar */}
      <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t">
        <button
          disabled={reactionLoading}
          onClick={() =>
            handleReaction(1)
          }
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
          onClick={() =>
            handleReaction(-1)
          }
          className={`px-3 py-1.5 rounded-full border transition ${
            reaction.myReaction === -1
              ? "bg-red-100 border-red-400 text-red-700"
              : "bg-white hover:bg-gray-50"
          }`}
        >
          👎 {reaction.dislikes}
        </button>

        <button
          onClick={() =>
            setCommentsOpen(
              (v) => !v
            )
          }
          className="px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50"
        >
          💬 {commentCount}{" "}
          {commentCount === 1
            ? "Comment"
            : "Comments"}
        </button>
      </div>

      {/* Lo teniamo montato per conoscere
          sempre il numero dei commenti */}
      <div
        className={
          commentsOpen
            ? "mt-5 pt-5 border-t"
            : "hidden"
        }
      >
        <Comments
          postId={post.id}
          onCountChange={
            setCommentCount
          }
        />
      </div>

      {!commentsOpen && (
        <div className="hidden">
          <Comments
            postId={post.id}
            onCountChange={
              setCommentCount
            }
          />
        </div>
      )}
    </article>
  );
}

export default function MathStudiesPage() {
  const [posts, setPosts] =
    useState<Post[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [visitorId, setVisitorId] =
    useState("");

  const [showAdmin, setShowAdmin] =
    useState(false);

  useEffect(() => {
    let id = localStorage.getItem(
      VISITOR_KEY
    );

    if (!id) {
      id = crypto.randomUUID();

      localStorage.setItem(
        VISITOR_KEY,
        id
      );
    }

    setVisitorId(id);
  }, []);

  useEffect(() => {
    if (
      typeof window !==
        "undefined" &&
      window.location.hash ===
        "#admin"
    ) {
      setShowAdmin(true);
    }
  }, []);

  const canEdit =
    ENABLE_EDIT || showAdmin;

  async function fetchPosts() {
    try {
      const res = await fetch(
        "/api/math-studies/fetch",
        {
          cache: "no-store",
        }
      );

      const raw = await res
        .text()
        .then((text) =>
          text
            ? JSON.parse(text)
            : []
        );

      if (!res.ok) {
        throw new Error(
          raw?.error ||
            `HTTP ${res.status}`
        );
      }

      const list: Post[] =
        Array.isArray(raw)
          ? raw
          : raw?.data ?? [];

      if (!Array.isArray(list)) {
        throw new Error(
          "Unexpected response for posts"
        );
      }

      setPosts(list);
      setError(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load posts"
      );

      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  function handleCreated(
    newPost: Post
  ) {
    setPosts((prev) => [
      newPost,
      ...prev,
    ]);
  }

  if (loading) {
    return (
      <p className="p-6">
        Loading posts…
      </p>
    );
  }

  if (error) {
    return (
      <p className="p-6 text-red-500">
        Error: {error}
      </p>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">
          Math Studies
        </h1>

        <p className="text-gray-600 mt-2">
          Mathematics, physics,
          quantitative experiments and
          personal scientific notes.
        </p>
      </header>

      {canEdit && (
        <section>
          <MathStudyForm
            onCreated={
              handleCreated
            }
          />

          {showAdmin && (
            <p className="mt-2 text-xs text-gray-500">
              Admin mode via{" "}
              <code>#admin</code>
            </p>
          )}
        </section>
      )}

      {posts.length === 0 && (
        <p className="text-gray-600">
          No math studies published
          yet.
        </p>
      )}

      <section className="space-y-6">
        {posts.map((post) => (
          <MathStudyCard
            key={post.id}
            post={post}
            visitorId={visitorId}
          />
        ))}
      </section>
    </main>
  );
}