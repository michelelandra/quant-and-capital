import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getReactionState(
  postId: string,
  visitorId?: string | null
) {
  const { data, error } = await supabaseAdmin
    .from("math_studies_reactions")
    .select("reaction, visitor_id")
    .eq("post_id", postId);

  if (error) throw error;

  const reactions = data ?? [];

  const likes = reactions.filter(
    (r) => Number(r.reaction) === 1
  ).length;

  const dislikes = reactions.filter(
    (r) => Number(r.reaction) === -1
  ).length;

  let myReaction = 0;

  if (visitorId) {
    const mine = reactions.find(
      (r) => r.visitor_id === visitorId
    );

    myReaction = Number(mine?.reaction ?? 0);
  }

  return {
    likes,
    dislikes,
    myReaction,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const postId = searchParams.get("postId");
    const visitorId = searchParams.get("visitorId");

    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "Missing postId" },
        { status: 400 }
      );
    }

    const state = await getReactionState(
      postId,
      visitorId
    );

    return NextResponse.json({
      ok: true,
      ...state,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load reactions";

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
    const visitorId = String(raw.visitorId || "");
    const reaction = Number(raw.reaction);

    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "Missing postId" },
        { status: 400 }
      );
    }

    if (!visitorId) {
      return NextResponse.json(
        { ok: false, error: "Missing visitorId" },
        { status: 400 }
      );
    }

    if (![1, -1, 0].includes(reaction)) {
      return NextResponse.json(
        { ok: false, error: "Invalid reaction" },
        { status: 400 }
      );
    }

    // 0 = rimuovi la reazione
    if (reaction === 0) {
      const { error } = await supabaseAdmin
        .from("math_studies_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("visitor_id", visitorId);

      if (error) throw error;
    } else {
      // 1 = like, -1 = dislike
      const { error } = await supabaseAdmin
        .from("math_studies_reactions")
        .upsert(
          {
            post_id: postId,
            visitor_id: visitorId,
            reaction,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "post_id,visitor_id",
          }
        );

      if (error) throw error;
    }

    const state = await getReactionState(
      postId,
      visitorId
    );

    return NextResponse.json({
      ok: true,
      ...state,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to save reaction";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}