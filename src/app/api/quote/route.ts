import type { NextRequest } from "next/server";
import axios from "axios";

export const runtime = "edge";

/* =========================================================================
 *  /api/quote?symbol=MSFT              → { symbol:"MSFT", price: 429.12 }
 *  /api/quote?symbol=AAPL,TSLA,SPY     → [{ symbol:"AAPL", price:213.55 }, …]
 *  Usa Finnhub: https://finnhub.io/docs/api#quote
 * ========================================================================= */
const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY as string;

// helper ------------------------------------------------------------
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fetchOne(symbol: string) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
    symbol,
  )}&token=${FINNHUB_KEY}`;

  const { data } = await axios.get(url);
  /* Finnhub:  c = last, pc = prevClose ---------------------------------- */
  const price = Number((data as { c?: number; pc?: number }).c ?? data.pc ?? 0);
  return { symbol, price };
}

// handler ------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbol")?.toUpperCase();

  if (!symbolsParam) return json({ error: "Missing symbol" }, 400);
  if (!FINNHUB_KEY) return json({ error: "Finnhub API key missing" }, 401);

  const symbols = symbolsParam.split(",").map((s) => s.trim());

  try {
    if (symbols.length === 1) {
      return json(await fetchOne(symbols[0]));
    }
    const data = await Promise.all(symbols.map(fetchOne));
    return json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Quote fetch failed:", (err as Error).message);
    return json({ error: "Fetch failed" }, 500);
  }
}
