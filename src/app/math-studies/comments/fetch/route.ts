// src/app/api/math-studies/comments/fetch/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  // Debug: se la route esiste risponde {ok:true}
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const { postId } = await req.json();

    if (!postId || typeof postId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid postId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("math_studies_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
