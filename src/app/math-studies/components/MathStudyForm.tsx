"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";  // usa il tuo client già pronto

type NewPost = {
  title: string;
  body_md: string;
  category?: string;
  tags?: string;
  media_urls?: string[];
};

export default function MathStudyForm({
  onCreated,
}: {
  onCreated?: (p: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [tags, setTags] = useState<string>("");
  const [media, setMedia] = useState<string>(""); // URL manuali
  const [files, setFiles] = useState<File[]>([]); // nuovi file
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // funzione di upload su Supabase Storage
  async function uploadFiles(): Promise<string[]> {
    if (files.length === 0) return [];
    setUploading(true);
    const uploaded: string[] = [];

    for (const f of files) {
      const ext = f.name.split(".").pop();
      const path = `math-studies/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("math-media")
        .upload(path, f, { contentType: f.type });

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      const { data } = supabase.storage.from("math-media").getPublicUrl(path);
      if (data?.publicUrl) uploaded.push(data.publicUrl);
    }

    setUploading(false);
    return uploaded;
  }

  async function publish() {
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1) carica file selezionati
      const uploadedUrls = await uploadFiles();

      // 2) prendi eventuali URL manuali
      const manualUrls: string[] = media
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);

      // 3) unisci
      const mediaUrls: string[] = [...manualUrls, ...uploadedUrls];

      const payload: NewPost = {
        title: title.trim(),
        body_md: body,
        category: category || "General",
        tags,
        media_urls: mediaUrls,
      };

      const res = await fetch("/api/math-studies/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      onCreated?.(data);
      // reset
      setTitle("");
      setBody("");
      setCategory("General");
      setTags("");
      setMedia("");
      setFiles([]);
    } catch (e: any) {
      setError(e?.message || "Publish failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
      <h2 className="text-xl font-semibold">New math study</h2>

      <input
        className="border rounded p-2 w-full"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <select
        className="border rounded p-2 w-full"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option>General</option>
        <option>Algebra</option>
        <option>Calculus</option>
        <option>Statistics</option>
        <option>Physics</option>
        <option>Coding</option>
      </select>

      <input
        className="border rounded p-2 w-full"
        placeholder="Tags (free text)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      <textarea
        className="border rounded p-2 w-full min-h-[160px]"
        placeholder="Body (Markdown + LaTeX: $E[X]=\mu$, $$\int_0^1 x^2 dx$$)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      {/* Upload files */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Upload files (images, videos, PDFs)
        </label>
        <input
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        {files.length > 0 && (
          <p className="text-xs text-gray-600">
            Selected: {files.map((f) => f.name).join(", ")}
          </p>
        )}
        {uploading && (
          <p className="text-xs text-gray-500">Uploading…</p>
        )}
      </div>

      {/* Media URLs manuali */}
      <textarea
        className="border rounded p-2 w-full min-h-[80px]"
        placeholder={"Media URLs (one per line). Images, videos, PDFs or external links"}
        value={media}
        onChange={(e) => setMedia(e.target.value)}
      />

      {error && <p className="text-red-500 text-sm">Error: {error}</p>}

      <button
        onClick={publish}
        disabled={submitting || !title.trim() || !body.trim()}
        className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50"
      >
        {submitting ? "Publishing…" : "Publish"}
      </button>
    </div>
  );
}
