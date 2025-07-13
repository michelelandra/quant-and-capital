"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../../lib/supabase";


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
const SUGGESTED_TICKERS = [
  "AAPL","MSFT","GOOGL","AMZN","TSLA","META","NVDA","BRK.B",
  "JPM","V","SPY","QQQ","NFLX","BABA","UNH","XOM","NKE",
  "INTC","AMD"
];


/* ------------------------------------------------------------- */
/* TIPI                                                           */
export type Position = {
  id: string;
  ticker: string;
  qty: number;        // negativo = short
  price: number;      // prezzo di carico (memorizzato auto-fetch)
  leverage?: number;
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
const [filterTicker] = useState<string>("");   // "" = tutti
const [txFilter, setTxFilter] = useState<string>("");
const [leverage, setLeverage] = useState<number>(1);
const [mounted, setMounted] = useState(false);
const portfolioValue = history.reduce((acc, h) => {
  const price = prices[h.ticker] ?? 0;
  return acc + h.qty * price * (h.leverage ?? 1);
}, 0);

const totalValue = cash + portfolioValue;

useEffect(() => {
  setMounted(true);
}, []);


// ───────── download CSV helper ─────────
const downloadCSV = (type: "history" | "positions") => {
  let data: string[][] = [];

  if (type === "history") {
    data = [
      ["Date", "Ticker", "Qty", "Price", "Note"],
      ...history.map(h => [
        h.date,
        h.ticker,
        String(h.qty),
        h.price.toFixed(2),
        h.note ?? "",
      ])
    ];
  }

  if (type === "positions") {
    data = [
      ["Ticker", "Qty", "Avg", "Current", "P/L", "P/L %"],
      ...rows.map(r => [
        r.ticker,
        String(r.qty),
        r.avg.toFixed(2),
        r.current.toFixed(2),
        r.pl.toFixed(2),
        r.plPct.toFixed(2),
      ])
    ];
  }

  const csvContent = data.map(e => e.join(",")).join("\\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${type}_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
// ───────────────────────────────────────


const toggleSort = (field: "plPct" | "qty") => {
  if (sortBy === field) {
    setSortDir(d => (d === "asc" ? "desc" : "asc"));
  } else {
    setSortBy(field);
    setSortDir("desc");
  }
};


  const today = dayjs().format("YYYY-MM-DD");

  // -------- caricamento iniziale ------------------------------ */
useEffect(() => {
  const fetchPortfolio = async () => {
    if (canEdit) {
      // 👤 Proprietario: carica direttamente da Supabase
      const { data: cashRow } = await supabase
        .from("portfolio_cash")
        .select("amount")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      const { data: historyRows } = await supabase
        .from("portfolio_history")
        .select("*");

      setCash(cashRow?.amount ?? INITIAL_CASH);
      setHistory(historyRows ?? []);
    } else {
      // 👥 Visitatori: carica dai proxy interni (no CORS)
      const [, historyRes] = await Promise.all([

  fetch("/api/safe-cash"), // ignorato, lo calcoliamo noi
  fetch("/api/safe-fetch"),
]);

const historyData = await historyRes.json();
setHistory(historyData ?? []);

const netCashMovement = historyData?.reduce((acc: number, h: any) => {
  const isSell = h.type === "sell";
  const delta = Math.abs(h.qty) * h.price * (h.leverage ?? 1);
  return acc + (isSell ? delta : -delta);
}, 0) ?? 0;

setCash(INITIAL_CASH + netCashMovement);

    }
  };

  fetchPortfolio();
}, [canEdit]);




    /* --------- persistenza ------------------------------------ */
useEffect(() => {
  if (!canEdit) return;

  const saveToSupabase = async () => {
    try {
      const { error: cashError } = await supabase
        .from("portfolio_cash")
        .upsert([{ amount: cash, updated_at: new Date().toISOString() }]);

      if (cashError) throw new Error(cashError.message);

     for (const h of history) {
  const { error: insertError } = await supabase
    .from("portfolio_history")
   .upsert([h as any], { onConflict: "id" });


  if (insertError) throw new Error(insertError.message);
}



      console.log("✅ Saved to Supabase");
    } catch (err) {
      console.error("❌ Supabase save failed:", err);
    }
  };

  saveToSupabase();
}, [cash, history]);


/* --------- salva sul file JSON pubblico ------------------- */
useEffect(() => {
  if (!canEdit) return;

  fetch("/api/portfolio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cash, history }),
  })
    .then((res) => {
      if (res.ok) {
        console.log("✅ Portfolio saved.");
      } else {
        alert("❌ Error saving portfolio (server responded with error).");
      }
    })
    .catch(() => {
      alert("❌ Network error while saving portfolio.");
    });
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
  // ticker statici + quelli attualmente presenti nel portafoglio
const allSuggestions = useMemo(
  () => Array.from(new Set([...SUGGESTED_TICKERS, ...tickers])),
  [tickers]
);


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
  const lev = history.find((p) => p.ticker === t)?.leverage ?? 1;
const leverage =
  history.find((p) => p.ticker === t && p.date === today)?.leverage ?? 1;
const pl = qty * (cur - avg) * leverage;

const plPct = (pl / (Math.abs(q) * avg)) * 100;
  return { ticker: t, qty: q, avg, current: cur, pl, plPct, leverage: lev };
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

const insights = useMemo(() => {
  if (!rows.length) return null;

 const sortedByPL = [...rows].sort((a, b) =>
  Math.abs(b.qty * (b.current - b.avg) * (b.leverage ?? 1)) -
  Math.abs(a.qty * (a.current - a.avg) * (a.leverage ?? 1))
);

  
  const sortedByImpact = [...rows].sort((a, b) =>
  Math.abs(b.pl * (b.leverage ?? 1)) - Math.abs(a.pl * (a.leverage ?? 1))
);

//const sortedByValue = [...rows].sort((a, b) =>
  //Math.abs(b.qty * b.current * (b.leverage ?? 1)) -
  //Math.abs(a.qty * a.current * (a.leverage ?? 1))
//);

  return {
    topGainer: sortedByPL[0],
    topLoser: sortedByPL[sortedByPL.length - 1],
   largestPosition: [...rows]
  .sort((a, b) => Math.abs(b.qty * b.current) - Math.abs(a.qty * a.current))[0],

    mostImpactful: sortedByImpact[0],
  };
}, [rows]);



  /* --------- equity & performance --------------------------- */
  const equity = useMemo(
  () =>
    history.reduce(
      (e, p) => e + p.qty * (prices[p.ticker] ?? p.price),
      0
    ) + cash,
  [history, prices, cash]
);

const realizedPL = useMemo(() => {
  return history
    .filter(p => p.date !== today)
    .reduce((sum, p) => {
      const cur = prices[p.ticker] ?? p.price;
      return sum + p.qty * (cur - p.price);
    }, 0);
}, [history, prices, today]);

const unrealizedPL = rows.reduce((s, r) => s + r.pl, 0);

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
  if (!canEdit) return; // ⛔ blocca i visitatori
  if (!ticker || !qty) return;

  const symbol = ticker.toUpperCase();
  const priceMap = await fetchPrices([symbol]);
  const purchasePrice = priceMap[symbol];

  if (!purchasePrice) {
    alert("Price unavailable – ticker not supported or API error");
    return;
  }

  const cost = Math.abs(qty) * purchasePrice;
  const isBuy = qty > 0;
  const newCash = isBuy ? cash - cost : cash + cost;

  if (isBuy && cost > cash) {
    alert("Not enough cash");
    return;
  }

  const newOperation = {
    id: uuidv4(),
    ticker: symbol,
    qty,
    price: purchasePrice,
    note,
    date: today,
    leverage,
  };

  if (canEdit) {
    const res = await fetch("/api/add-operation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOperation),
    });

    if (!res.ok) {
      const data = await res.json();
      alert("❌ Failed to save to Supabase: " + data.error);
      console.error("Supabase insert failed", data.error);
      return;
    }

    const { error: cashError } = await supabase
      .from("portfolio_cash")
      .upsert([{ amount: newCash, updated_at: new Date().toISOString() }]);

    if (cashError) {
      alert("❌ Failed to update cash.");
      console.error("Supabase cash update failed", cashError.message);
      return;
    }
  }

  // ✅ aggiorna stato locale
  setHistory((h) => [...h, newOperation]);
  setCash(newCash);
  setTicker("");
  setQty(0);
  setNote("");
};




  /* --------- reset helpers ---------------------------------- */
  const resetDay = () => {
    if (!canEdit) return; // ⛔ blocca i visitatori
    const keep = history.filter((p) => p.date !== today);
    const refund = history
      .filter((p) => p.date === today)
      .reduce((s, p) => s + Math.abs(p.qty) * p.price * (p.qty > 0 ? 1 : -1), 0);
    setHistory(keep);
    setCash((c) => c + refund);
  };

  const resetAll = () => {
    if (!canEdit) return; // ⛔ blocca i visitatori
  setHistory([]);
  setCash(INITIAL_CASH);
if (canEdit) {
  (async () => {
    const { error: cashError } = await supabase.from("portfolio_cash").insert([{
      amount: INITIAL_CASH,
      updated_at: new Date().toISOString(),
    }]);

   const { error: historyError } = await supabase.from("portfolio_history").delete().neq("ticker", "___unlikely___");

    if (cashError || historyError) {
      alert("❌ Failed to reset Supabase data.");
      console.error("Supabase error", { cashError, historyError });
    }
  })();
}


  if (typeof window !== "undefined") {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(SPY_BASE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  }

  if (canEdit) {
    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cash: INITIAL_CASH, history: [] }),
    }).catch((err) =>
      console.error("Error saving reset portfolio to file:", err)
    );
  }
};

const handleSave = async () => {
  if (!canEdit) return; // ⛔ blocca i visitatori
  try {
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cash, history }),
    });
    if (res.ok) {
      alert("Portfolio saved successfully.");
    } else {
      alert("Failed to save portfolio.");
    }
  } catch (err) {
  console.error("Error saving to file:", err);
}

};
if (!mounted) return null;

  /* ----------------------------------------------------------- */
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-tight">
  My Investment Portfolio
</h1>

      {/* Strategy Summary ------------------------------------------------ */}
<div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded shadow-sm text-sm">
  <p className="font-semibold mb-1">📌 Strategy Summary</p>
  <p>
  This portfolio reflects a macro-aware strategy designed to navigate global
  economic cycles by combining defensive assets with high-risk, high-conviction
  plays — including short positions, cryptocurrencies, and leveraged instruments
  (2x, 3x, and 4x exposure). The focus is on tech, AI, and emerging market trends.
</p>
  <p className="text-xs text-gray-500 mt-2">
    Last updated:&nbsp;
    {history.length > 0 ? history[history.length - 1].date : "—"}
  </p>
</div>

{/* Portfolio Snapshot ------------------------------------------------ */}
<div className="text-right text-sm mt-4 mb-6">
  <div className="text-xl font-bold text-gray-800">
    Total Portfolio:&nbsp;
    <span className="text-blue-700">
      {totalValue.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
    </span>
  </div>
  <div className="text-sm text-gray-600 mt-1">
    <div>
      Cash:&nbsp;
      <span className="font-medium">
        {cash.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
      </span>
    </div>
    <div>
      Asset Value:&nbsp;
      <span className="font-medium">
        {portfolioValue.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
      </span>
    </div>
  </div>
</div>



{/* Realized / Unrealized P/L -------------------------------- */}
<div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 mb-6 bg-white/80 p-3 rounded-lg shadow-sm border border-gray-200">
  <span>
    <span className="font-medium">Realized P/L:</span>{" "}
    <span className={realizedPL >= 0 ? "text-green-600" : "text-red-600"}>
      {realizedPL.toFixed(2)} €
    </span>
  </span>
  <span>
    <span className="font-medium">Unrealized P/L:</span>{" "}
    <span className={unrealizedPL >= 0 ? "text-green-600" : "text-red-600"}>
      {unrealizedPL.toFixed(2)} €
    </span>
  </span>
</div>



      {/* form -------------------------------------------------- */}
      {canEdit && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
          <input
  className="border p-2 flex-1 min-w-[120px]"
  placeholder="Ticker"
  list="ticker-list"
  value={ticker}
  onChange={(e) => setTicker(e.target.value)}
/>
<datalist id="ticker-list">
  {allSuggestions.map(t => (
    <option key={t} value={t} />
  ))}
</datalist>

          <input
            type="number"
            className="border p-2 w-24"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            title="Quantity: positive = long, negative = short" 

          />
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={qty < 0}
              onChange={(e) => setQty(Math.abs(qty) * (e.target.checked ? -1 : 1))}
            />
            Short
          </label>
          <button className="bg-blue-500 text-white px-4 py-2 rounded"
          title="Insert the operation in the portfolio">Add</button>
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
      <button
        onClick={resetDay}
        className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 text-white rounded transition-colors"
      >
        Reset Day
      </button>
      <button
        onClick={resetAll}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 text-white rounded transition-colors duration-200"
      >
        Reset All
      </button>
      <button
        onClick={handleSave}
        className="bg-green-600 px-4 py-2 text-white rounded"
        title="Save portfolio to server (public view)"
      >
        Save Changes
      </button>
    </>
  )}
  
</div>


{/* pulsanti export ---------------------------------------- */}
<div className="flex gap-4 items-center mt-2">
  <button
    onClick={() => downloadCSV("history")}
    className="bg-gray-600 text-white px-3 py-1 rounded"
  >
    Export Transaction Log
  </button>
  <button
    onClick={() => downloadCSV("positions")}
    className="bg-gray-600 text-white px-3 py-1 rounded"
  >
    Export Portfolio
  </button>
</div>

      {/* tabella --------------------------------------------- */}
      <div className="overflow-x-auto rounded border border-gray-200 shadow-sm bg-white bg-opacity-90">
  <table className="min-w-[600px] text-sm w-full">
    <thead className="border-b">
  <tr className="text-left">
    <th>Ticker</th>
    <th>
      <button onClick={() => toggleSort("qty")} className="flex items-center gap-1">
        Qty {sortBy === "qty" && (sortDir === "asc" ? "▲" : "▼")}
      </button>
    </th>
    <th>Avg.</th>
    <th>Current</th>
    <th>P/L</th>
    <th>
      <button onClick={() => toggleSort("plPct")} className="flex items-center gap-1">
        P/L % {sortBy === "plPct" && (sortDir === "asc" ? "▲" : "▼")}
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
      <td>
  {history.find((p) => p.ticker === r.ticker)?.note || "—"}
  <br />
  <span className="text-xs text-gray-500 italic">
    Leverage: {history.find((p) => p.ticker === r.ticker)?.leverage ?? "—"}×
  </span>
</td>

    </tr>
  ))}
</tbody>
</table>
</div>



      {/* Insights ------------------------------------------------ */}
{insights && (
  <div className="grid sm:grid-cols-2 gap-4 mt-8 text-sm bg-gray-50 p-4 rounded-lg shadow-inner border">
    <div>
      <strong>📈 Top Gainer:</strong>{" "}
      {insights.topGainer.ticker} ({insights.topGainer.plPct.toFixed(2)}%)
    </div>
    <div>
      <strong>📉 Top Loser:</strong>{" "}
      {insights.topLoser.ticker} ({insights.topLoser.plPct.toFixed(2)}%)
    </div>
    <div>
      <strong>💰 Largest Position:</strong>{" "}
      {insights.largestPosition.ticker} (
      {(
        (Math.abs(
          insights.largestPosition.qty * insights.largestPosition.current
        ) /
          equity) *
        100
      ).toFixed(2)}
      %)
    </div>
    <div>
      <strong>📊 Most Impactful:</strong>{" "}
      {insights.mostImpactful.ticker} ({insights.mostImpactful.pl.toFixed(2)} €)
    </div>
  </div>
)}

<div className="flex items-center gap-2 text-sm mb-2">
  <label className="font-semibold">Filter by ticker:</label>
  <select
    className="border p-1 rounded"
    value={txFilter}
    onChange={(e) => setTxFilter(e.target.value)}
  >
    <option value="">All</option>
    {tickers.map((t) => (
      <option key={t} value={t}>
        {t}
      </option>
    ))}
  </select>
</div>

<select
  className="border p-2 rounded w-24"
  value={leverage}
  onChange={(e) => setLeverage(Number(e.target.value))}
  title="Multiplier for exposure (e.g. 2x = double gains/losses)"
>
  {[1, 2, 3, 4].map((x) => (
    <option key={x} value={x}>{x}x</option>
  ))}
</select>


      {/* transaction log --------------------------------------- */}
<h2 className="font-semibold mt-12 mb-2">Transaction Log</h2>
<table className="w-full text-sm border-collapse">
  <thead className="border-b bg-gray-50">
    <tr className="text-left">
      <th>Date</th>
      <th>Ticker</th>
      <th>Qty</th>
      <th>Price</th>
      <th>Note / Leverage</th>

    </tr>
  </thead>

  <tbody>
  {[...history]
  .filter((tx) => !txFilter || tx.ticker === txFilter)
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((tx) => (
    <tr key={tx.id}>
      <td>{tx.date}</td>
      <td>{tx.ticker}</td>
      <td className={tx.qty < 0 ? "text-red-600" : ""}>{tx.qty}</td>
      <td>{tx.price.toFixed(2)} €</td>
      <td>
  {tx.note || "—"}
  <br />
  <span className="text-xs text-gray-500 italic">
    Leverage: {tx.leverage ?? "—"}×
  </span>
</td>

    </tr>
  ))
}
</tbody>


</table>


      {/* grafico allocation ---------------------------------- */}
      <h2 className="font-semibold mb-2">Allocation €</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={rows.map((r) => ({ ticker: r.ticker, value: Math.abs(r.qty) * r.current * (r.leverage ?? 1)
}))}
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
            <Legend verticalAlign="bottom" height={36} />
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
      <p className="text-xs text-gray-500 mt-1">
  * Percentage performance based on initial equity of €10,000.
</p>

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
      <h3 className="font-semibold mt-6 mb-2">Equity Daily Log</h3>
<div className="overflow-x-auto rounded border border-gray-200 shadow-sm bg-white">
  <table className="min-w-[400px] text-sm w-full text-left">
    <thead className="bg-gray-100 border-b">
      <tr>
        <th className="px-3 py-2">Date</th>
        <th className="px-3 py-2">Portfolio (%)</th>
        <th className="px-3 py-2">S&P 500 (%)</th>
      </tr>
    </thead>
    <tbody>
      {equityHistory.map((entry) => (
        <tr key={entry.date} className="border-b">
          <td className="px-3 py-1">{entry.date}</td>
          <td className={`px-3 py-1 ${entry.port >= 0 ? "text-green-600" : "text-red-600"}`}>
            {entry.port.toFixed(2)}%
          </td>
          <td className={`px-3 py-1 ${entry.sp >= 0 ? "text-green-600" : "text-red-600"}`}>
            {entry.sp.toFixed(2)}%
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


      <div className="text-right font-bold text-lg">
        Equity {equity.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
        {" "}– Total P/L {rows.reduce((s, r) => s + r.pl, 0).toFixed(2)} €
      </div>
      {/* Disclaimer */}
<p className="text-xs text-gray-500 mt-8 italic">
  This is a simulated portfolio created for educational purposes only. It does not represent real investment advice or financial recommendations. Performance and positions shown are hypothetical and may not reflect real market conditions or risks.
</p>
    </main>
  );
}



