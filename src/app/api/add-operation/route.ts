import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase server configuration missing" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const body = await req.json();

    const {
      id,
      ticker,
      qty,
      price,
      note,
      date,
      leverage,
      type,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing operation id" },
        { status: 400 }
      );
    }

    if (!ticker) {
      return NextResponse.json(
        { error: "Missing ticker" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(Number(qty)) || Number(qty) === 0) {
      return NextResponse.json(
        { error: "Invalid quantity" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "Missing date" },
        { status: 400 }
      );
    }

    const operation = {
      id,
      ticker: String(ticker).toUpperCase(),
      qty: Number(qty),
      price: Number(price),
      note: note || null,
      date,
      leverage: Number(leverage) || 1,
      type:
        type ||
        (Number(qty) > 0 ? "buy" : "sell"),
    };

    const { data, error } = await supabaseAdmin
      .from("portfolio_history")
      .insert([operation])
      .select()
      .single();

    if (error) {
      console.error("Supabase operation insert error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        operation: data,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("add-operation error:", err);

    return NextResponse.json(
      {
        error: err?.message || "Failed to save operation",
      },
      { status: 500 }
    );
  }
}



