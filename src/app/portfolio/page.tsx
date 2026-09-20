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
  qty: number;
  price: number;
  leverage?: number;
  note?: string;
  date: string;
  type?: "buy" | "sell"; // 👈 AGGIUNTO
};


export type HistoryPoint = {
  date: string;
  equity: number;
  port: number;
  sp: number;
  spyPrice: number;
};

type OpenLot = {
  qty: number;
  entry: number;
  leverage: number;
  note?: string;
  date: string;
};

type PortfolioRow = {
  ticker: string;
  qty: number;
  avg: number;
  current: number;
  pl: number;
  plPct: number;
  leverage: number;
  marketValue: number;
  grossExposure: number;
  netExposure: number;
  direction: "Long" | "Short";
  note?: string;
};

type AccountingResult = {
  cash: number;
  rows: PortfolioRow[];
  realizedPL: number;
  unrealizedPL: number;
  totalPL: number;
  netMarketValue: number;
  grossExposure: number;
  netExposure: number;
  equity: number;
};

const EPS = 1e-9;

function buildAccounting(
  history: Position[],
  prices: Record<string, number>
): AccountingResult {
  const lotsByTicker = new Map<string, OpenLot[]>();
  let cash = INITIAL_CASH;
  let realizedPL = 0;

  for (const tx of history) {
    const txQty = Number(tx.qty) || 0;
    const txPrice = Number(tx.price) || 0;
    const txLeverage = Math.max(1, Number(tx.leverage) || 1);

    if (Math.abs(txQty) < EPS || txPrice <= 0) continue;

    // Cash flow of the underlying transaction:
    // buy/cover (+qty) consumes cash, sell/short (-qty) produces cash.
    cash -= txQty * txPrice;

    const lots = lotsByTicker.get(tx.ticker) ?? [];
    let remaining = txQty;

    // FIFO matching against lots in the opposite direction.
    while (Math.abs(remaining) > EPS) {
      const oppositeIndex = lots.findIndex(
        (lot) => Math.sign(lot.qty) !== Math.sign(remaining)
      );

      if (oppositeIndex === -1) break;

      const lot = lots[oppositeIndex];
      const lotSign = Math.sign(lot.qty);
      const closeQty = Math.min(Math.abs(remaining), Math.abs(lot.qty));

      const baseRealized = closeQty * (txPrice - lot.entry) * lotSign;
      const leveragedRealized = baseRealized * lot.leverage;
      realizedPL += leveragedRealized;

      // The normal buy/sell cash flow already realizes the 1x component.
      // Add only the extra P/L created by synthetic leverage.
      cash += baseRealized * (lot.leverage - 1);

      lot.qty -= lotSign * closeQty;
      remaining += lotSign * closeQty;

      if (Math.abs(lot.qty) < EPS) lots.splice(oppositeIndex, 1);
    }

    if (Math.abs(remaining) > EPS) {
      lots.push({
        qty: remaining,
        entry: txPrice,
        leverage: txLeverage,
        note: tx.note,
        date: tx.date,
      });
    }

    lotsByTicker.set(tx.ticker, lots);
  }

  const rows: PortfolioRow[] = [];
  let unrealizedPL = 0;
  let netMarketValue = 0;
  let grossExposure = 0;
  let netExposure = 0;
  let leverageAdjustment = 0;

  for (const [ticker, lots] of lotsByTicker.entries()) {
    if (!lots.length) continue;

    const qty = lots.reduce((sum, lot) => sum + lot.qty, 0);
    if (Math.abs(qty) < EPS) continue;

    const absQty = lots.reduce((sum, lot) => sum + Math.abs(lot.qty), 0);
    const avg =
      lots.reduce((sum, lot) => sum + Math.abs(lot.qty) * lot.entry, 0) /
      absQty;
    const basis = lots.reduce(
      (sum, lot) => sum + Math.abs(lot.qty) * lot.entry,
      0
    );
    const current = prices[ticker] > 0 ? prices[ticker] : avg;

    const pl = lots.reduce((sum, lot) => {
      const basePL =
        Math.abs(lot.qty) * (current - lot.entry) * Math.sign(lot.qty);
      return sum + basePL * lot.leverage;
    }, 0);

    const extraLeveragedPL = lots.reduce((sum, lot) => {
      const basePL =
        Math.abs(lot.qty) * (current - lot.entry) * Math.sign(lot.qty);
      return sum + basePL * (lot.leverage - 1);
    }, 0);

    const weightedLeverage =
      lots.reduce(
        (sum, lot) => sum + Math.abs(lot.qty) * lot.leverage,
        0
      ) / absQty;

    const rowGrossExposure = lots.reduce(
      (sum, lot) => sum + Math.abs(lot.qty) * current * lot.leverage,
      0
    );
    const rowNetExposure = lots.reduce(
      (sum, lot) => sum + lot.qty * current * lot.leverage,
      0
    );

    const note = [...lots].reverse().find((lot) => lot.note)?.note;

    rows.push({
      ticker,
      qty,
      avg,
      current,
      pl,
      plPct: basis > 0 ? (pl / basis) * 100 : 0,
      leverage: weightedLeverage,
      marketValue: qty * current,
      grossExposure: rowGrossExposure,
      netExposure: rowNetExposure,
      direction: qty > 0 ? "Long" : "Short",
      note,
    });

    unrealizedPL += pl;
    netMarketValue += qty * current;
    grossExposure += rowGrossExposure;
    netExposure += rowNetExposure;
    leverageAdjustment += extraLeveragedPL;
  }

  rows.sort((a, b) => a.ticker.localeCompare(b.ticker));

  const equity = cash + netMarketValue + leverageAdjustment;
  const totalPL = realizedPL + unrealizedPL;

  return {
    cash,
    rows,
    realizedPL,
    unrealizedPL,
    totalPL,
    netMarketValue,
    grossExposure,
    netExposure,
    equity,
  };
}

function buildTransactionLabels(history: Position[]) {
  const netByTicker: Record<string, number> = {};
  const labels: Record<string, string> = {};

  for (const tx of history) {
    const before = netByTicker[tx.ticker] ?? 0;
    const amount = Math.abs(tx.qty);

    if (tx.qty > 0) {
      if (before < 0) {
        labels[tx.id] = amount <= Math.abs(before) ? "COVER" : "COVER / BUY";
      } else {
        labels[tx.id] = "BUY";
      }
    } else {
      if (before > 0) {
        labels[tx.id] = amount <= before ? "SELL" : "SELL / SHORT";
      } else {
        labels[tx.id] = "SHORT";
      }
    }

    netByTicker[tx.ticker] = before + tx.qty;
  }

  return labels;
}


/* ------------------------------------------------------------- */
export default function PortfolioPage() {
  /* --------- stato ------------------------------------------- */
  const [history, setHistory] = useState<Position[]>([]);
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [spyPrice, setSpyPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"plPct" | "qty" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterTicker] = useState<string>("");
  const [txFilter, setTxFilter] = useState<string>("");
  const [leverage, setLeverage] = useState<number>(1);
  const [mounted, setMounted] = useState(false);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  const [marketDataLoaded, setMarketDataLoaded] = useState(false);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [equityHistory, setEquityHistory] = useState<HistoryPoint[]>([]);
  const [spyBasePrice, setSpyBasePrice] = useState<number | null>(null);
  const [noteSellMap, setNoteSellMap] = useState<Record<string, string>>({});
  const [qtyToSellMap, setQtyToSellMap] = useState<Record<string, number>>({});

  // The transaction log is the source of truth. Cash is derived from it,
  // rather than maintained independently, so it cannot drift out of sync.
  const ledgerBase = useMemo(() => buildAccounting(history, {}), [history]);
  const cash = ledgerBase.cash;
  const tickers = ledgerBase.rows.map((row) => row.ticker);

  const handleSell = async (symbol: string) => {
    const row = rows.find((r) => r.ticker === symbol);
    if (!row) return;

    const closeQty = qtyToSellMap[symbol] ?? 0;
    if (closeQty <= 0 || closeQty > Math.abs(row.qty)) {
      alert(`❌ Invalid quantity to close for ${symbol}`);
      return;
    }

    const currentPrice = prices[symbol] || row.current || row.avg;
    const signedQty = row.qty > 0 ? -closeQty : closeQty;

    const previewOperation: Position = {
      id: uuidv4(),
      ticker: symbol,
      qty: signedQty,
      price: currentPrice,
      note: "",
      date: today,
      leverage: row.leverage,
      type: signedQty < 0 ? "sell" : "buy",
    };

    const preview = buildAccounting([...history, previewOperation], prices);
    const realizedOnClose = preview.realizedPL - accounting.realizedPL;
    const action = row.qty > 0 ? "Sold" : "Covered";
    const noteBase = `${action} ${closeQty} ${symbol} at ${currentPrice.toFixed(2)}€ — P/L: ${realizedOnClose.toFixed(2)}€`;
    const userNote = noteSellMap[symbol] || "";
    const fullNote = userNote ? `${noteBase} | Reason: ${userNote}` : noteBase;

    const closeOperation: Position = {
      ...previewOperation,
      note: fullNote,
    };

    if (canEdit) {
      const res = await fetch("/api/add-operation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(closeOperation),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert("❌ Failed to save operation: " + (data?.error || res.status));
        return;
      }
    }

    setHistory((h) => [...h, closeOperation]);
    setNoteSellMap((prev) => ({ ...prev, [symbol]: "" }));
    setQtyToSellMap((prev) => ({ ...prev, [symbol]: 0 }));
  };


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
        const { data: historyRows, error } = await supabase
          .from("portfolio_history")
          .select("*")
          .order("date", { ascending: true });

        if (error) {
          console.error("Failed to load portfolio history:", error.message);
          return;
        }

        setHistory(historyRows ?? []);
        setPortfolioLoaded(true);
      } else {
        const historyRes = await fetch("/api/safe-fetch", { cache: "no-store" });
        const historyData = await historyRes.json();
        setHistory(Array.isArray(historyData) ? historyData : []);
        setPortfolioLoaded(true);
      }
    };

    fetchPortfolio();
  }, []);


    /* --------- persistenza ------------------------------------ */
// Le singole operazioni vengono gia salvate tramite /api/add-operation.
// Non risalviamo automaticamente tutto lo storico dal browser: oltre a essere
// ridondante, questo generava richieste Supabase duplicate e NetworkError in dev.


/* --------- salva sul file JSON pubblico ------------------- */
useEffect(() => {
  if (!canEdit || !portfolioLoaded) return;

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
}, [cash, history, portfolioLoaded]);



  /* --------- prezzi e motore contabile ---------------------- */
  const allSuggestions = useMemo(
    () => Array.from(new Set([...SUGGESTED_TICKERS, ...tickers])),
    [tickers]
  );

  const fetchPrices = useCallback(async (syms: string[]) => {
    if (!syms.length) return {} as Record<string, number>;
    const res = await fetch(`/api/quote?symbol=${syms.join()}`);
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : [raw];
    const out: Record<string, number> = {};
    arr.forEach((d) => {
      if (d?.symbol) out[d.symbol] = Number(d.price || 0);
    });
    return out;
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const latest = await fetchPrices(tickers);
        if (!alive) return;
        setPrices(latest);

        const spy = await fetchPrices(["SPY"]);
        if (!alive) return;
        if (spy.SPY) setSpyPrice(spy.SPY);
      } finally {
        if (alive) setMarketDataLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [fetchPrices, tickers.join(",")]);

  const accounting = useMemo(
    () => buildAccounting(history, prices),
    [history, prices]
  );

  const baseRows = accounting.rows;

  const rows = useMemo(() => {
    let r = [...baseRows];

    if (filterTicker) r = r.filter((row) => row.ticker === filterTicker);

    if (sortBy) {
      r.sort((a, b) =>
        sortDir === "asc"
          ? a[sortBy] - b[sortBy]
          : b[sortBy] - a[sortBy]
      );
    }

    return r;
  }, [baseRows, filterTicker, sortBy, sortDir]);

  const insights = useMemo(() => {
    if (!baseRows.length) return null;

    const byPct = [...baseRows].sort((a, b) => b.plPct - a.plPct);
    const byImpact = [...baseRows].sort(
      (a, b) => Math.abs(b.pl) - Math.abs(a.pl)
    );
    const byExposure = [...baseRows].sort(
      (a, b) => b.grossExposure - a.grossExposure
    );

    return {
      topGainer: byPct[0],
      topLoser: byPct[byPct.length - 1],
      largestPosition: byExposure[0],
      mostImpactful: byImpact[0],
    };
  }, [baseRows]);

  const portfolioValue = accounting.grossExposure;
  const totalValue = accounting.equity;
  const equity = accounting.equity;
  const realizedPL = accounting.realizedPL;
  const unrealizedPL = accounting.unrealizedPL;
  const totalPL = accounting.totalPL;
  const portPct = (totalPL / INITIAL_CASH) * 100;
  const transactionLabels = useMemo(
    () => buildTransactionLabels(history),
    [history]
  );

  /* --------- storico Portfolio / S&P 500 su Supabase -------- */
  useEffect(() => {
    let alive = true;

    const loadSnapshots = async () => {
      try {
        const res = await fetch("/api/portfolio-equity-history", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        const points: HistoryPoint[] = Array.isArray(json?.history)
          ? json.history.map((p: any) => ({
              date: String(p.date),
              equity: Number(p.equity),
              port: Number(p.portfolio_return),
              sp: Number(p.sp500_return),
              spyPrice: Number(p.sp500_price),
            }))
          : [];

        if (!alive) return;
        setEquityHistory(points);
        setSpyBasePrice(points[0]?.spyPrice || null);
      } catch (err) {
        console.error("Failed to load portfolio equity history:", err);
      } finally {
        if (alive) setSnapshotLoaded(true);
      }
    };

    loadSnapshots();
    return () => {
      alive = false;
    };
  }, []);

  const effectiveSpyBase = spyBasePrice || spyPrice;
  const spPct =
    effectiveSpyBase > 0 && spyPrice > 0
      ? ((spyPrice / effectiveSpyBase) - 1) * 100
      : 0;

  /* --------- upsert del punto giornaliero ------------------- */
  useEffect(() => {
    if (!canEdit) return;
    if (!portfolioLoaded || !snapshotLoaded || !marketDataLoaded || !spyPrice) return;

    const current: HistoryPoint = {
      date: today,
      equity,
      port: portPct,
      sp: spPct,
      spyPrice,
    };

    // Aggiornamento ottimistico della UI. Una sola riga per data.
    setEquityHistory((prev) => {
      const next = [...prev];
      const idx = next.findIndex((p) => p.date === today);
      if (idx >= 0) next[idx] = current;
      else next.push(current);
      return next.sort((a, b) => a.date.localeCompare(b.date));
    });

    if (!spyBasePrice) setSpyBasePrice(spyPrice);

    fetch("/api/portfolio-equity-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        equity,
        portfolio_return: portPct,
        sp500_price: spyPrice,
        sp500_return: spPct,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
      })
      .catch((err) => {
        console.error("Failed to save daily portfolio snapshot:", err);
      });
  }, [
    canEdit,
    portfolioLoaded,
    snapshotLoaded,
    marketDataLoaded,
    spyPrice,
    spyBasePrice,
    today,
    equity,
    portPct,
    spPct,
  ]);

  /* --------- handler Add ------------------------------------ */
  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!ticker || !qty) return;

    const symbol = ticker.toUpperCase().trim();
    const priceMap = await fetchPrices([symbol]);
    const purchasePrice = priceMap[symbol];

    if (!purchasePrice) {
      alert("Price unavailable – ticker not supported or API error");
      return;
    }

    const newOperation: Position = {
      id: uuidv4(),
      ticker: symbol,
      qty,
      price: purchasePrice,
      note,
      date: today,
      leverage,
      type: qty < 0 ? "sell" : "buy",
    };

    const preview = buildAccounting([...history, newOperation], {
      ...prices,
      [symbol]: purchasePrice,
    });

    if (preview.cash < -EPS) {
      alert("Not enough cash for this operation");
      return;
    }

    if (canEdit) {
      const res = await fetch("/api/add-operation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOperation),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert("❌ Failed to save to Supabase: " + (data?.error || res.status));
        return;
      }
    }

    setHistory((h) => [...h, newOperation]);
    setTicker("");
    setQty(0);
    setNote("");
  };


  /* --------- reset helpers ---------------------------------- */
  const resetDay = async () => {
    if (!canEdit) return;

    const todayRows = history.filter((p) => p.date === today);
    const keep = history.filter((p) => p.date !== today);

    if (todayRows.length) {
      const { error } = await supabase
        .from("portfolio_history")
        .delete()
        .in("id", todayRows.map((p) => p.id));

      if (error) {
        alert("❌ Failed to reset today's operations.");
        console.error(error.message);
        return;
      }
    }

    setHistory(keep);
    // Il punto di oggi viene ricalcolato automaticamente dal nuovo ledger.
  };

  const resetAll = async () => {
    if (!canEdit) return;
    if (!confirm("Reset the entire simulated portfolio and its performance history?")) return;

    const { error: historyError } = await supabase
      .from("portfolio_history")
      .delete()
      .neq("ticker", "___unlikely___");

    if (historyError) {
      alert("❌ Failed to reset portfolio transactions.");
      console.error(historyError.message);
      return;
    }

    try {
      const res = await fetch("/api/portfolio-equity-history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to clear performance history:", err);
    }

    setEquityHistory([]);
    setSpyBasePrice(null);
    setHistory([]);

    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cash: INITIAL_CASH, history: [] }),
    }).catch((err) =>
      console.error("Error saving reset portfolio to file:", err)
    );
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
<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 mb-4">
  <div className="border rounded-lg p-3 bg-white shadow-sm">
    <div className="text-xs text-gray-500">Total Equity</div>
    <div className="text-xl font-bold text-blue-700">
      {totalValue.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
    </div>
  </div>
  <div className="border rounded-lg p-3 bg-white shadow-sm">
    <div className="text-xs text-gray-500">Cash</div>
    <div className="text-lg font-semibold">
      {cash.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
    </div>
  </div>
  <div className="border rounded-lg p-3 bg-white shadow-sm">
    <div className="text-xs text-gray-500">Gross Exposure</div>
    <div className="text-lg font-semibold">
      {portfolioValue.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
    </div>
  </div>
  <div className="border rounded-lg p-3 bg-white shadow-sm">
    <div className="text-xs text-gray-500">Net Exposure</div>
    <div className="text-lg font-semibold">
      {accounting.netExposure.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
    </div>
  </div>
</div>


{/* P/L Summary ------------------------------------------------ */}
<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-6">
  <div className="border rounded-lg p-3 bg-white shadow-sm">
    <div className="text-gray-500">Realized P/L</div>
    <div className={`font-semibold ${realizedPL >= 0 ? "text-green-600" : "text-red-600"}`}>
      {realizedPL.toFixed(2)} €
    </div>
  </div>
  <div className="border rounded-lg p-3 bg-white shadow-sm">
    <div className="text-gray-500">Unrealized P/L</div>
    <div className={`font-semibold ${unrealizedPL >= 0 ? "text-green-600" : "text-red-600"}`}>
      {unrealizedPL.toFixed(2)} €
    </div>
  </div>
  <div className="border rounded-lg p-3 bg-white shadow-sm">
    <div className="text-gray-500">Total P/L</div>
    <div className={`font-semibold ${totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
      {totalPL.toFixed(2)} €
    </div>
  </div>
  <div className="border rounded-lg p-3 bg-white shadow-sm">
    <div className="text-gray-500">Portfolio Return</div>
    <div className={`font-semibold ${portPct >= 0 ? "text-green-600" : "text-red-600"}`}>
      {portPct.toFixed(2)}%
    </div>
  </div>
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
    <th>Side</th>
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
      <td className={r.direction === "Long" ? "text-green-700" : "text-red-700"}>
        {r.direction}
      </td>
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
  {r.note || "—"}
  <br />
  <span className="text-xs text-gray-500 italic">
    Leverage: {r.leverage.toFixed(2)}×
  </span>
</td>
{canEdit && (
  <td className="flex flex-col items-start space-y-1">
    <input
      type="number"
      min={1}
      max={Math.abs(r.qty)}
      placeholder="Qty to close"
      className="border px-1 py-0.5 text-xs w-full"
      value={qtyToSellMap[r.ticker] || ""}
      onChange={(e) =>
        setQtyToSellMap((prev) => ({
          ...prev,
          [r.ticker]: Number(e.target.value),
        }))
      }
    />
    <input
      type="text"
      placeholder="Close comment"
      className="border px-1 py-0.5 text-xs w-full"
      value={noteSellMap[r.ticker] || ""}
      onChange={(e) =>
        setNoteSellMap((prev) => ({
          ...prev,
          [r.ticker]: e.target.value,
        }))
      }
    />
    <button
      onClick={() => handleSell(r.ticker)}
      className="text-blue-600 hover:underline text-xs"
      title={r.qty > 0 ? "Sell selected quantity" : "Cover selected quantity"}
    >
      {r.qty > 0 ? "Sell" : "Cover"}
    </button>
  </td>
)}




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
      {(accounting.grossExposure > 0
        ? (insights.largestPosition.grossExposure / accounting.grossExposure) * 100
        : 0
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
      <th>Type</th>
      <th>Note / Leverage</th>
    </tr>
  </thead>
  <tbody>
    {[...history]
      .filter((tx) => !txFilter || tx.ticker === txFilter)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((tx) => (
        <tr
          key={tx.id}
          className={tx.qty < 0 ? "bg-red-50 text-red-700" : ""}
        >
          <td>{tx.date}</td>
          <td>{tx.ticker}</td>
          <td className={tx.qty < 0 ? "text-red-600 font-semibold" : ""}>
            {tx.qty}
          </td>
          <td>{tx.price.toFixed(2)} €</td>
          <td className="text-xs font-bold uppercase tracking-wider">
            {transactionLabels[tx.id] || (tx.qty < 0 ? "SELL" : "BUY")}
          </td>
          <td>
            {tx.note || "—"}
            <br />
            <span className="text-xs text-gray-500 italic">
              Leverage: {tx.leverage ?? "—"}×
            </span>
          </td>
        </tr>
      ))}
  </tbody>
</table>


      {/* grafico allocation ---------------------------------- */}
      <h2 className="font-semibold mb-2">Allocation €</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={rows.map((r) => ({ ticker: r.ticker, value: r.grossExposure }))}
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
              {rows.map((r) => (
                <Cell key={r.ticker} fill={r.pl >= 0 ? "#16a34a" : "#dc2626"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Open-position unrealized P/L by ticker.
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
      <p className="text-xs text-gray-500 mt-1">
        * Performance is measured from initial equity of €10,000. Daily portfolio and S&P 500 history is stored persistently in Supabase.
      </p>
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
        {" "}– Total P/L {totalPL.toFixed(2)} €
      </div>
      {/* Disclaimer */}
<p className="text-xs text-gray-500 mt-8 italic">
  This is a simulated portfolio created for educational purposes only. It does not represent real investment advice or financial recommendations. Performance and positions shown are hypothetical and may not reflect real market conditions or risks.
</p>
    </main>
  );
}
