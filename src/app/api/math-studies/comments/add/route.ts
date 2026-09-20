import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { postId, author, body, hp } = await req.json();

    // Honeypot anti-spam
    if (hp) {
      return NextResponse.json(
        { error: "Invalid submission" },
        { status: 400 }
      );
    }

    // Controlli minimi
    if (!postId) {
      return NextResponse.json(
        { error: "Missing postId" },
        { status: 400 }
      );
    }

    if (!body || !body.trim()) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("math_studies_comments")
      .insert([
        {
          post_id: postId,
          author: author?.trim() || "Anonymous",
          body: body.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}