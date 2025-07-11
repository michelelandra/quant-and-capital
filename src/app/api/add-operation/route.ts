import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📦 Supabase payload:", body);

    const requiredFields = ["id", "ticker", "qty", "price", "date", "leverage"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    const { error } = await supabaseServer
      .from("portfolio_history")
      .insert([body]);

    if (error) {
      console.error("🔥 Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

console.log("🔥 Supabase insert error:", error);
console.log("📦 Supabase payload:", body);


    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Unexpected error in add-operation route:", err);
    return NextResponse.json({ error: "Invalid request body or fetch failed" }, { status: 400 });
  }
}

