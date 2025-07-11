import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const requiredFields = ["id", "ticker", "qty", "price", "date", "leverage"];
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    const res = await axios.post(
      `${supabaseUrl}/rest/v1/portfolio_history`,
      [body],
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
      }
    );

    return NextResponse.json({ success: true, data: res.data });
  } catch (error: any) {
    console.error("🔥 Axios Supabase insert error:", error.message || error);
    return NextResponse.json(
      { error: "Insert failed: " + (error.message || "unknown") },
      { status: 500 }
    );
  }
}
