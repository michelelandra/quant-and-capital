import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// Piccolo rate-limit in memoria
const lastHitByIp = new Map<string, number>();
const WINDOW_MS = 20_000; // 20 secondi

function getClientIp(headers: Headers) {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export async function POST(req: Request) {
  try {
    const json = await req.json();

    // Honeypot anti-bot
    const hp = (json?.hp ?? "").toString();
    if (hp.length > 0) {
      return NextResponse.json({ ok: true });
    }

    const postId = (json?.postId ?? "").toString().trim();
    const author = (json?.author ?? "Anonymous").toString().trim();
    const body = (json?.body ?? "").toString().trim();

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }
    if (!body) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }
    if (author.length > 80) {
      return NextResponse.json({ error: "author too long" }, { status: 400 });
    }
    if (body.length > 3000) {
      return NextResponse.json({ error: "body too long" }, { status: 400 });
    }

    // Rate-limit base
    const ip = getClientIp(req.headers);
    const now = Date.now();
    const last = lastHitByIp.get(ip) ?? 0;
    if (now - last < WINDOW_MS) {
      return NextResponse.json(
        { error: "Please wait a few seconds before commenting again." },
        { status: 429 }
      );
    }
    lastHitByIp.set(ip, now);

    // Inserimento in Supabase
    const { data, error } = await supabase
      .from("math_studies_comments")
      .insert([{ post_id: postId, author, body }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
