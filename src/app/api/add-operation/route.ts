import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { table, row } = await req.json();

  if (!table || !row || typeof row !== "object") {
    return NextResponse.json(
      { error: "Missing table or row" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from(table).insert([row]);

  if (error) {
    console.error("Supabase insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { table, match } = await req.json();

  if (!table || !match) {
    return NextResponse.json(
      { error: "Missing table or match condition" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from(table).delete().match(match);

  if (error) {
    console.error("Supabase delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

