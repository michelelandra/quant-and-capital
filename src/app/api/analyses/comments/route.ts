import { NextResponse } from "next/server";
import { supabaseService } from "../../../../../lib/supabaseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "Missing postId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseService
      .from("analyses_comments")
      .select("id, post_id, author, body, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      comments: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();

    const postId = String(raw.postId || "");
    const author = String(raw.author || "").trim() || "Anonymous";
    const body = String(raw.body || "").trim();

    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "Missing postId" },
        { status: 400 }
      );
    }

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Comment cannot be empty" },
        { status: 400 }
      );
    }

    if (author.length > 80) {
      return NextResponse.json(
        { ok: false, error: "Name is too long" },
        { status: 400 }
      );
    }

    if (body.length > 3000) {
      return NextResponse.json(
        { ok: false, error: "Comment is too long" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseService
      .from("analyses_comments")
      .insert({
        post_id: postId,
        author,
        body,
      })
      .select("id, post_id, author, body, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        comment: data,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}