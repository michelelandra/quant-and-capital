"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

/* ------------------------------------------------------------- */
/* 👇 visibilità editor solo per l’autore                         */
const canEdit = process.env.NEXT_PUBLIC_ENABLE_EDIT === "true";

/* ------------------------------------------------------------- */
/* COSTANTI                                                      */
const INITIAL_CASH = 10_000;                // capitale di partenza
const STORAGE_KEY  = "portfolio";
const HISTORY_KEY  = "portfolio_history";
const SPY_BASE_KEY = "spy_base";            // primo prezzo SPY per % benchmark
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];

/* ------------------------------------------------------------- */
/* TIPI                                                           */
export type Position = {
  id: string;
  ticker: string;
  qty: number;        // negativo = short
  price: number;      // prezzo di carico (memorizzato auto-fetch)
  note?: string;
  date: string;       // yyyy-mm-dd
};

export type HistoryPoint = { date: string; port: number; sp: number };

/* ------------------------------------------------------------- */
export default function PortfolioPage() {
  /* --------- stato ------------------------------------------- */
  const [cash, setCash]         = useState<number>(INITIAL_CASH);
  const [history, setHistory]   = useState<Position[]>([]);
  const [ticker, setTicker]     = useState("");
  const [qty, setQty]           = useState(0);
  const [note, setNote]         = useState("");
  const [prices, setPrices]     = useState<Record<string, number>>({});
  const [spyPrice, setSpyPrice] = useState<number>(0);
const [sortBy, setSortBy]   = useState<"plPct" | "qty" | null>(null);
const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
const [filterTicker, setFilterTicker] = useState<string>("");   // "" = tutti
const toggleSort = (field: "plPct" | "qty") => {
  if (sortBy === field) {
    setSortDir(d => (d === "asc" ? "desc" : "asc"));
  } else {
    setSortBy(field);
    setSortDir("desc");
  }
};


  const today = dayjs().format("YYYY-MM-DD");

  /* --------- carica da localStorage -------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { cash: c, history: h } = JSON.parse(saved);
      setCash(c);
      setHistory(h);
    }
  }, []);

  /* --------- persistenza ------------------------------------ */
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cash, history }));
  }, [cash, history]);

  /* --------- aggregati -------------------------------------- */
  const aggregate = useMemo(() => {
    const acc: Record<string, { qty: number; cost: number }> = {};
    history.forEach((p) => {
      acc[p.ticker] ??= { qty: 0, cost: 0 };
      acc[p.ticker].qty += p.qty;
      acc[p.ticker].cost += p.qty * p.price;
    });
    return acc;
  }, [history]);

  const tickers = Object.keys(aggregate);

  /* --------- fetch prezzi ----------------------------------- */
  const fetchPrices = useCallback(async (syms: string[]) => {
    if (!syms.length) return {} as Record<string, number>;
    const res = await fetch(`/api/quote?symbol=${syms.join()}`);
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : [raw];
    const out: Record<string, number> = {};
    arr.forEach((d) => (out[d.symbol] = Number(d.price || 0)));
    return out;
  }, []);

  /* fetch prezzi titoli + SPY -------------------------------- */
  useEffect(() => {
    (async () => {
      const latest = await fetchPrices(tickers);
      setPrices(latest);

      const spy = await fetchPrices(["SPY"]);
      if (spy.SPY) setSpyPrice(spy.SPY);
    })();
  }, [fetchPrices, tickers.join(",")]);

  /* --------- righe tabella --------------------------------- */
  // ---- righe tabella con P/L %, filtro e ordinamento ----
const baseRows = tickers.map(t => {
  const { qty: q, cost } = aggregate[t];
  const cur  = prices[t] ?? 0;
  const avg  = cost / q;
  const pl   = q * (cur - avg);
  const plPct = Math.abs(q) > 0 ? (pl / (Math.abs(q) * avg)) * 100 : 0;
  return { ticker: t, qty: q, avg, current: cur, pl, plPct };
});

const rows = useMemo(() => {
  let r = [...baseRows];

  /* filtro ticker */
  if (filterTicker) r = r.filter(row => row.ticker === filterTicker);

  /* ordinamento */
  if (sortBy) {
    r.sort((a, b) =>
      sortDir === "asc"
        ? a[sortBy]! - b[sortBy]!
        : b[sortBy]! - a[sortBy]!
    );
  }
  return r;
}, [baseRows, filterTicker, sortBy, sortDir]);



  /* --------- equity & performance --------------------------- */
  const equity = useMemo(
    () => history.reduce((e, p) => e + p.qty * (prices[p.ticker] ?? p.price), 0) + cash,
    [history, prices, cash]
  );

  const portPct = ((equity / INITIAL_CASH) - 1) * 100;

  /* --------- % S&P 500 -------------------------------------- */
  const baseSpy = typeof window !== "undefined" ? Number(localStorage.getItem(SPY_BASE_KEY) || 0) : 0;
  useEffect(() => {
    if (typeof window === "undefined" || !spyPrice) return;
    if (!baseSpy) localStorage.setItem(SPY_BASE_KEY, String(spyPrice));
  }, [spyPrice]);

  const spPct = baseSpy ? ((spyPrice / baseSpy) - 1) * 100 : 0;

  /* --------- salva storico giornaliero ---------------------- */
  useEffect(() => {
    if (!spyPrice) return;
    if (typeof window === "undefined") return;

    const saved: HistoryPoint[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

    const idx = saved.findIndex((h) => h.date === today);
    const entry: HistoryPoint = { date: today, port: portPct, sp: spPct };

    if (idx >= 0) saved[idx] = entry;
    else saved.push(entry);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(saved));
  }, [portPct, spPct, spyPrice, today]);

  /* --------- equityHistory per grafico ---------------------- */
  const equityHistory: HistoryPoint[] = useMemo(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  }, [portPct, spPct]);

  /* --------- handler Add ------------------------------------ */
  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticker || !qty) return;

    const symbol = ticker.toUpperCase();
    const priceMap = await fetchPrices([symbol]);
    const purchasePrice = priceMap[symbol];

    if (!purchasePrice) {
      alert("Price unavailable – ticker not supported or API error");
      return;
    }

    const cost = Math.abs(qty) * purchasePrice;

    if (qty > 0 && cost > cash) {
      alert("Not enough cash");
      return;
    }

    setCash((c) => c + (qty < 0 ? cost : -cost));
    setHistory((h) => [
      ...h,
      {
        id: uuidv4(),
        ticker: symbol,
        qty,
        price: purchasePrice,
        note,
        date: today,
      },
    ]);

    // reset form
    setTicker("");
    setQty(0);
    setNote("");
  };

  /* --------- reset helpers ---------------------------------- */
  const resetDay = () => {
    const keep = history.filter((p) => p.date !== today);
    const refund = history
      .filter((p) => p.date === today)
      .reduce((s, p) => s + Math.abs(p.qty) * p.price * (p.qty > 0 ? 1 : -1), 0);
    setHistory(keep);
    setCash((c) => c + refund);
  };

  const resetAll = () => {
    setHistory([]);
    setCash(INITIAL_CASH);
    if (typeof window !== "undefined") {
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(SPY_BASE_KEY);
    }
  };

  /* ----------------------------------------------------------- */
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Portfolio</h1>
<div className="flex gap-4 items-center mb-4">
  <label className="font-semibold">Filter Ticker:</label>
  <select
    className="border p-1 rounded"
    value={filterTicker}
    onChange={e => setFilterTicker(e.target.value)}
  >
    <option value="">All</option>
    {tickers.map(t => (
      <option key={t} value={t}>{t}</option>
    ))}
  </select>
</div>

      {/* form -------------------------------------------------- */}
      {canEdit && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
          <input
            className="border p-2 flex-1 min-w-[120px]"
            placeholder="Ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          />
          <input
            type="number"
            className="border p-2 w-24"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={qty < 0}
              onChange={(e) => setQty(Math.abs(qty) * (e.target.checked ? -1 : 1))}
            />
            Short
          </label>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
          <textarea
            className="border p-2 flex-[1_1_100%]"
            placeholder="Comment (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </form>
      )}

      {/* controlli -------------------------------------------- */}
      <div className="flex items-center gap-2">
        {canEdit && (
          <>
            <button onClick={resetDay} className="bg-yellow-500 px-4 py-2 text-white rounded">
              Reset Day
            </button>
            <button onClick={resetAll} className="bg-red-600 px-4 py-2 text-white rounded">
              Reset All
            </button>
          </>
        )}
        <span className="ml-auto font-semibold">
          Cash: {cash.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
        </span>
      </div>

      {/* tabella --------------------------------------------- */}
      <table className="w-full text-sm border-collapse">
        <thead className="border-b">
  <tr className="text-left">
    <th>Ticker</th>
    <th>
      <button onClick={() => toggleSort("qty")} className="flex items-center gap-1">
        Qty
        {sortBy === "qty" && (sortDir === "asc" ? "▲" : "▼")}
      </button>
    </th>
    <th>Avg.</th>
    <th>Current</th>
    <th>P/L</th>
    <th>
      <button onClick={() => toggleSort("plPct")} className="flex items-center gap-1">
        P/L %
        {sortBy === "plPct" && (sortDir === "asc" ? "▲" : "▼")}
      </button>
    </th>
    <th>Note</th>
  </tr>
</thead>



        <tbody>
          {rows.map((r) => (
            <tr key={r.ticker} className="border-b">
              <td>{r.ticker}</td>
              <td>{r.qty}</td>
              <td>{r.avg.toFixed(2)} €</td>
              <td>{r.current ? r.current.toFixed(2) + " €" : "—"}</td>
              <td className={r.pl >= 0 ? "text-green-600" : "text-red-600"}>
  {r.pl.toFixed(2)} €
</td>
<td className={r.plPct >= 0 ? "text-green-600" : "text-red-600"}>
  {r.plPct.toFixed(2)} %
</td>
<td>{history.find((p) => p.ticker === r.ticker)?.note ?? ""}</td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* transaction log --------------------------------------- */}
<h2 className="font-semibold mt-12 mb-2">Transaction Log</h2>
<table className="w-full text-sm border-collapse">
  <thead className="border-b bg-gray-50">
    <tr className="text-left">
      <th>Date</th>
      <th>Ticker</th>
      <th>Qty</th>
      <th>Price</th>
      <th>Note</th>
    </tr>
  </thead>

  <tbody>
  {[...history]
    .sort((a, b) => b.date.localeCompare(a.date))   // più recente in alto
    .map((tx) => (
      <tr key={tx.id} className="border-b">
        <td>{tx.date}</td>
        <td>{tx.ticker}</td>
        <td className={tx.qty < 0 ? "text-red-600" : ""}>
          {tx.qty}
        </td>
        <td>{tx.price.toFixed(2)} €</td>
        <td>{tx.note || "—"}</td>
      </tr>
  ))}
</tbody>


</table>


      {/* grafico allocation ---------------------------------- */}
      <h2 className="font-semibold mb-2">Allocation €</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={rows.map((r) => ({ ticker: r.ticker, value: Math.abs(r.qty) * r.current }))}
            dataKey="value"
            nameKey="ticker"
            isAnimationActive={false}
            label={({ value }) => (value as number).toFixed(0)}
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => v.toFixed(2) + " €"} />
        </PieChart>
      </ResponsiveContainer>

      {/* P/L by ticker --------------------------------------- */}
      <h2 className="font-semibold">P/L by Ticker</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ticker" />
            <YAxis />
            <Tooltip formatter={(v: number) => v.toFixed(2) + " €"} />
            <Bar dataKey="pl" fill="#8884d8">
              {rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* performance % --------------------------------------- */}
      <h2 className="font-semibold">Portfolio vs S&P 500 (%)</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equityHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => v + "%"} />
            <Tooltip formatter={(v: number) => v.toFixed(2) + "%"} />
            <Legend />
            <Line dataKey="port" name="Portfolio" stroke="#8884d8" dot={false} />
            <Line dataKey="sp" name="S&P 500" stroke="#82ca9d" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-right font-bold text-lg">
        Equity {equity.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
        {" "}– Total P/L {rows.reduce((s, r) => s + r.pl, 0).toFixed(2)} €
      </div>
    </main>
  );
}



