import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type NewPost = {
  title?: string;
  body_md?: string;
  category?: string | null;
  tags?: string | null;
  media_urls?: string[] | null;
};

export async function POST(req: Request) {
  try {
    const json: NewPost & { hp?: string } = await req.json().catch(() => ({} as any));

    // Honeypot anti-bot
    if ((json.hp ?? "").toString().length > 0) {
      return NextResponse.json({ ok: true });
    }

    const title = (json.title ?? "").trim();
    const body_md = (json.body_md ?? "").toString();
    const category = (json.category ?? null) as string | null;
    const tags = (json.tags ?? null) as string | null;
    const media_urls = Array.isArray(json.media_urls) ? json.media_urls : null;

    if (!title || !body_md) {
      return NextResponse.json(
        { error: "title and body_md are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("math_studies")
      .insert([{ title, body_md, category, tags, media_urls }])
      .select("*")
      .single(); // ritorna il post creato

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
