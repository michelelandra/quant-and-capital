"use client";

import { useRef, useState } from "react";

type NewPost = {
  title: string;
  body_md: string;
  category?: string;
  tags?: string;
  media_urls?: string[];
};

// Per ora manteniamo questo sistema.
// La protezione admin definitiva la sistemeremo alla fine.
const ADMIN_TOKEN =
  process.env.NEXT_PUBLIC_ADMIN_PUBLISH_TOKEN || "";

export default function MathStudyForm({
  onCreated,
}: {
  onCreated?: (p: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState<string>("General");
  const [tags, setTags] = useState("");
  const [media, setMedia] = useState("");

  const [files, setFiles] = useState<File[]>([]);

  const [uploading, setUploading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  // ------------------------------------------------------------
  // Upload files through our server API
  // ------------------------------------------------------------
  async function uploadFiles(): Promise<string[]> {
    if (files.length === 0) {
      return [];
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const formData = new FormData();

        formData.append("file", file);

        const res = await fetch(
          "/api/math-studies/upload",
          {
            method: "POST",

            headers: {
              "x-admin-token": ADMIN_TOKEN,
            },

            body: formData,
          }
        );

        const data = await res
          .json()
          .catch(() => ({}));

        if (!res.ok || !data?.ok) {
          throw new Error(
            data?.error ||
              `Upload failed for ${file.name}`
          );
        }

        if (data.url) {
          uploadedUrls.push(
            String(data.url)
          );
        }
      }

      return uploadedUrls;
    } finally {
      setUploading(false);
    }
  }

  // ------------------------------------------------------------
  // Publish study
  // ------------------------------------------------------------
  async function publish() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!body.trim()) {
      setError("Body is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload selected files
      const uploadedUrls =
        await uploadFiles();

      // 2. Parse manually entered URLs
      const manualUrls = media
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean);

      // 3. Combine uploaded files + manual URLs
      const mediaUrls = [
        ...manualUrls,
        ...uploadedUrls,
      ];

      const payload: NewPost = {
        title: title.trim(),
        body_md: body.trim(),
        category:
          category || "General",
        tags: tags.trim(),
        media_urls: mediaUrls,
      };

      // 4. Create the Math Study
      const res = await fetch(
        "/api/math-studies/add",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-admin-token":
              ADMIN_TOKEN,
          },

          body: JSON.stringify(
            payload
          ),
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

      // Update page immediately
      onCreated?.(data);

      // Reset form
      setTitle("");
      setBody("");
      setCategory("General");
      setTags("");
      setMedia("");
      setFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(
        "Math Study publish error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Publish failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
      <h2 className="text-xl font-semibold">
        New math study
      </h2>

      {/* Title */}
      <input
        className="border rounded p-2 w-full"
        placeholder="Title"
        value={title}
        onChange={(e) =>
          setTitle(e.target.value)
        }
      />

      {/* Category */}
      <select
        className="border rounded p-2 w-full"
        value={category}
        onChange={(e) =>
          setCategory(e.target.value)
        }
      >
        <option>General</option>
        <option>Algebra</option>
        <option>Calculus</option>
        <option>Statistics</option>
        <option>Physics</option>
        <option>Coding</option>
      </select>

      {/* Tags */}
      <input
        className="border rounded p-2 w-full"
        placeholder="Tags (free text)"
        value={tags}
        onChange={(e) =>
          setTags(e.target.value)
        }
      />

      {/* Body */}
      <textarea
        className="border rounded p-2 w-full min-h-[200px] font-mono"
        placeholder={`Body — Markdown + LaTeX supported

Example:

## Expected value

For a random variable $X$:

$$
E[X] = \\int_{-\\infty}^{+\\infty} x f_X(x)\\,dx
$$`}
        value={body}
        onChange={(e) =>
          setBody(e.target.value)
        }
      />

      <p className="text-xs text-gray-500">
        Markdown and LaTeX supported.
        Use $...$ for inline formulas
        and $$...$$ for display formulas.
      </p>

      {/* File upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Upload files
        </label>

        <p className="text-xs text-gray-500">
          Images, videos and PDFs.
          Maximum 25 MB per file.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="
            image/jpeg,
            image/png,
            image/webp,
            image/gif,
            video/mp4,
            video/webm,
            video/ogg,
            application/pdf
          "
          onChange={(e) =>
            setFiles(
              Array.from(
                e.target.files ?? []
              )
            )
          }
        />

        {files.length > 0 && (
          <div className="text-xs text-gray-600 space-y-1">
            <p className="font-medium">
              Selected:
            </p>

            {files.map((file) => (
              <div key={`${file.name}-${file.size}`}>
                {file.name} —{" "}
                {(
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <p className="text-sm text-blue-600">
            Uploading files…
          </p>
        )}
      </div>

      {/* Manual media URLs */}
      <textarea
        className="border rounded p-2 w-full min-h-[90px]"
        placeholder={`Media URLs (one per line)

Examples:
https://youtube.com/...
https://vimeo.com/...
https://example.com/image.jpg
https://example.com/paper.pdf
https://example.com/article`}
        value={media}
        onChange={(e) =>
          setMedia(e.target.value)
        }
      />

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={publish}
        disabled={
          submitting ||
          uploading ||
          !title.trim() ||
          !body.trim()
        }
        className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {uploading
          ? "Uploading…"
          : submitting
          ? "Publishing…"
          : "Publish"}
      </button>
    </div>
  );
}
