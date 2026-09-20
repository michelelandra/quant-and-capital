import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function editingAllowed() {
  // The site is edited locally. Public production builds can read history,
  // but cannot mutate it through this endpoint.
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ENABLE_EDIT === "true"
  );
}

export async function GET() {
  try {
    const supabase = adminClient();
    const { data, error } = await supabase
      .from("portfolio_equity_history")
      .select(
        "date,equity,portfolio_return,sp500_price,sp500_return,created_at,updated_at"
      )
      .order("date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load portfolio history" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!editingAllowed()) {
    return NextResponse.json({ error: "Editing disabled" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const date = String(body?.date || "");
    const equity = Number(body?.equity);
    const portfolioReturn = Number(body?.portfolio_return);
    const sp500Price = Number(body?.sp500_price);
    const sp500Return = Number(body?.sp500_return);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    if (
      !Number.isFinite(equity) ||
      !Number.isFinite(portfolioReturn) ||
      !Number.isFinite(sp500Price) ||
      !Number.isFinite(sp500Return) ||
      sp500Price <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid snapshot values" },
        { status: 400 }
      );
    }

    const supabase = adminClient();
    const { data, error } = await supabase
      .from("portfolio_equity_history")
      .upsert(
        [
          {
            date,
            equity,
            portfolio_return: portfolioReturn,
            sp500_price: sp500Price,
            sp500_return: sp500Return,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "date" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, snapshot: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save portfolio history" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!editingAllowed()) {
    return NextResponse.json({ error: "Editing disabled" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = adminClient();

    if (body?.all === true) {
      const { error } = await supabase
        .from("portfolio_equity_history")
        .delete()
        .gte("date", "1900-01-01");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    const date = String(body?.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const { error } = await supabase
      .from("portfolio_equity_history")
      .delete()
      .eq("date", date);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete portfolio history" },
      { status: 500 }
    );
  }
}
