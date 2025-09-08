import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type NewPost = {
  title?: string;
  body_md?: string;
  category?: string | null;
  tags?: string | null;
  media_urls?: string[] | null;
  adminToken?: string;  // dal form
  hp?: string;          // honeypot
};

export async function POST(req: Request) {
  try {
    const json = (await req.json().catch(() => ({}))) as NewPost;

    // Honeypot anti-bot
    if ((json.hp ?? "").toString().length > 0) {
      return NextResponse.json({ ok: true });
    }

    // ✅ check admin (accetta dal body o da header custom)
    const passed = json.adminToken || req.headers.get("x-admin-token") || "";
    if (passed !== process.env.ADMIN_PUBLISH_TOKEN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const title = (json.title ?? "").trim();
    const body_md = (json.body_md ?? "").toString();
    const category = json.category ?? null;
    const tags = json.tags ?? null;
    const media_urls = Array.isArray(json.media_urls) ? json.media_urls : null;

    if (!title || !body_md) {
      return NextResponse.json(
        { error: "title and body_md are required" },
        { status: 400 }
      );
    }

    // Inserimento con service role (bypassa RLS dopo il check)
    const { data, error } = await supabaseAdmin
      .from("math_studies")
      .insert([{ title, body_md, category, tags, media_urls }])
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}

