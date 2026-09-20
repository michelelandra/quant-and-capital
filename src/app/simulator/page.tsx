"use client";

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dayjs from "dayjs";
import InstallSimulator from "./components/InstallSimulator";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
const STORAGE_KEY = "quant-capital-portfolio-simulator-v2";
const DEFAULT_STARTING_CASH = 100_000;
const EPS = 1e-9;
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];

const SUGGESTED_TICKERS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "TSLA",
  "META",
  "NVDA",
  "BRK.B",
  "JPM",
  "V",
  "SPY",
  "QQQ",
  "NFLX",
  "BABA",
  "UNH",
  "XOM",
  "NKE",
  "INTC",
  "AMD",
];

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
type Trade = {
  id: string;
  ticker: string;
  qty: number; // positive = buy/cover, negative = sell/short
  price: number;
  leverage?: number;
  note?: string;
  date: string;
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

type EquityPoint = {
  date: string;
  equity: number;
  port: number;
  sp: number;
  spyPrice: number;
};

type SavedSimulator = {
  version: 2;
  startingCash: number;
  history: Trade[];
  equityHistory: EquityPoint[];
  spyBasePrice: number | null;
};

/* ------------------------------------------------------------------ */
/* ACCOUNTING ENGINE                                                   */
function buildAccounting(
  history: Trade[],
  prices: Record<string, number>,
  startingCash: number
): AccountingResult {
  const lotsByTicker = new Map<string, OpenLot[]>();
  let cash = startingCash;
  let realizedPL = 0;

  for (const tx of history) {
    const txQty = Number(tx.qty) || 0;
    const txPrice = Number(tx.price) || 0;
    const txLeverage = Math.max(1, Number(tx.leverage) || 1);

    if (Math.abs(txQty) < EPS || txPrice <= 0) continue;

    // Positive quantity consumes cash; negative quantity produces cash.
    cash -= txQty * txPrice;

    const lots = lotsByTicker.get(tx.ticker) ?? [];
    let remaining = txQty;

    // FIFO close against lots in the opposite direction.
    while (Math.abs(remaining) > EPS) {
      const oppositeIndex = lots.findIndex(
        (lot) => Math.sign(lot.qty) !== Math.sign(remaining)
      );

      if (oppositeIndex === -1) break;

      const lot = lots[oppositeIndex];
      const lotSign = Math.sign(lot.qty);
      const closeQty = Math.min(Math.abs(remaining), Math.abs(lot.qty));

      const baseRealized = closeQty * (txPrice - lot.entry) * lotSign;
      realizedPL += baseRealized * lot.leverage;

      // Standard 1x P/L is already reflected by normal cash flows.
      // Add only the extra synthetic leveraged component.
      cash += baseRealized * (lot.leverage - 1);

      lot.qty -= lotSign * closeQty;
      remaining += lotSign * closeQty;

      if (Math.abs(lot.qty) < EPS) {
        lots.splice(oppositeIndex, 1);
      }
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

function buildTransactionLabels(history: Trade[]) {
  const netByTicker: Record<string, number> = {};
  const labels: Record<string, string> = {};

  for (const tx of history) {
    const before = netByTicker[tx.ticker] ?? 0;
    const amount = Math.abs(tx.qty);

    if (tx.qty > 0) {
      labels[tx.id] =
        before < 0
          ? amount <= Math.abs(before)
            ? "COVER"
            : "COVER / BUY"
          : "BUY";
    } else {
      labels[tx.id] =
        before > 0
          ? amount <= before
            ? "SELL"
            : "SELL / SHORT"
          : "SHORT";
    }

    netByTicker[tx.ticker] = before + tx.qty;
  }

  return labels;
}

function money(value: number) {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
}

/* ------------------------------------------------------------------ */
export default function SimulatorPage() {
  const today = dayjs().format("YYYY-MM-DD");

  const [hydrated, setHydrated] = useState(false);
  const [startingCash, setStartingCash] = useState(DEFAULT_STARTING_CASH);
  const [history, setHistory] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [spyPrice, setSpyPrice] = useState(0);
  const [spyBasePrice, setSpyBasePrice] = useState<number | null>(null);
  const [equityHistory, setEquityHistory] = useState<EquityPoint[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);

  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState(0);
  const [short, setShort] = useState(false);
  const [leverage, setLeverage] = useState(1);
  const [note, setNote] = useState("");

  const [qtyToClose, setQtyToClose] = useState<Record<string, number>>({});
  const [closeNote, setCloseNote] = useState<Record<string, string>>({});

  const importRef = useRef<HTMLInputElement | null>(null);

  /* ------------------------- PWA service worker --------------------- */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("Service Worker registered");
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  }, []);

  /* ------------------------- load local data ------------------------ */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SavedSimulator>;

        if (Number(parsed.startingCash) > 0) {
          setStartingCash(Number(parsed.startingCash));
        }

        if (Array.isArray(parsed.history)) {
          setHistory(parsed.history as Trade[]);
        }

        if (Array.isArray(parsed.equityHistory)) {
          setEquityHistory(parsed.equityHistory as EquityPoint[]);
        }

        if (parsed.spyBasePrice != null && Number(parsed.spyBasePrice) > 0) {
          setSpyBasePrice(Number(parsed.spyBasePrice));
        }
      }
    } catch (err) {
      console.error("Failed to load simulator data:", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  /* ------------------------- price helpers -------------------------- */
  const ledgerBase = useMemo(
    () => buildAccounting(history, {}, startingCash),
    [history, startingCash]
  );

  const tickers = useMemo(
    () => ledgerBase.rows.map((row) => row.ticker),
    [ledgerBase.rows]
  );

  const fetchPrices = useCallback(async (symbols: string[]) => {
    if (!symbols.length) return {} as Record<string, number>;

    const res = await fetch(`/api/quote?symbol=${symbols.join()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Quote API returned HTTP ${res.status}`);
    }

    const raw = await res.json();
    const items = Array.isArray(raw) ? raw : [raw];
    const out: Record<string, number> = {};

    items.forEach((item: any) => {
      const symbol = String(item?.symbol || "").toUpperCase();
      const price = Number(item?.price ?? item?.close ?? 0);
      if (symbol && price > 0) out[symbol] = price;
    });

    return out;
  }, []);

  const refreshMarket = useCallback(async () => {
    setMarketLoading(true);

    try {
      if (tickers.length) {
        const latest = await fetchPrices(tickers);
        setPrices(latest);
      } else {
        setPrices({});
      }

      const spy = await fetchPrices(["SPY"]);
      if (spy.SPY) setSpyPrice(spy.SPY);
    } catch (err) {
      console.error("Failed to refresh market prices:", err);
    } finally {
      setMarketLoading(false);
    }
  }, [fetchPrices, tickers.join(",")]);

  useEffect(() => {
    if (!hydrated) return;
    refreshMarket();
  }, [hydrated, refreshMarket]);

  const accounting = useMemo(
    () => buildAccounting(history, prices, startingCash),
    [history, prices, startingCash]
  );

  const rows = accounting.rows;
  const portPct = startingCash > 0 ? (accounting.totalPL / startingCash) * 100 : 0;

  /* ------------------------- daily local history -------------------- */
  useEffect(() => {
    if (!hydrated || !spyPrice || startingCash <= 0) return;

    if (!spyBasePrice) {
      setSpyBasePrice(spyPrice);
    }

    const base = spyBasePrice || spyPrice;
    const currentSpPct = base > 0 ? (spyPrice / base - 1) * 100 : 0;

    setEquityHistory((prev) => {
      const point: EquityPoint = {
        date: today,
        equity: accounting.equity,
        port: portPct,
        sp: currentSpPct,
        spyPrice,
      };

      const existing = prev.findIndex((p) => p.date === today);
      if (existing === -1) {
        return [...prev, point].sort((a, b) => a.date.localeCompare(b.date));
      }

      const next = [...prev];
      next[existing] = point;
      return next;
    });
  }, [
    hydrated,
    spyPrice,
    spyBasePrice,
    startingCash,
    today,
    accounting.equity,
    portPct,
  ]);

  /* ------------------------- save local data ------------------------ */
  useEffect(() => {
    if (!hydrated) return;

    const payload: SavedSimulator = {
      version: 2,
      startingCash,
      history,
      equityHistory,
      spyBasePrice,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, startingCash, history, equityHistory, spyBasePrice]);

  /* ------------------------- trade actions -------------------------- */
  async function handleAdd(e: FormEvent) {
    e.preventDefault();

    const symbol = ticker.toUpperCase().trim();
    if (!symbol || qty <= 0) return;

    try {
      const quote = await fetchPrices([symbol]);
      const executionPrice = quote[symbol];

      if (!executionPrice) {
        alert("Price unavailable. Check the ticker or try again.");
        return;
      }

      const signedQty = short ? -qty : qty;

      const operation: Trade = {
        id: crypto.randomUUID(),
        ticker: symbol,
        qty: signedQty,
        price: executionPrice,
        leverage,
        note: note.trim(),
        date: today,
      };

      const preview = buildAccounting(
        [...history, operation],
        { ...prices, [symbol]: executionPrice },
        startingCash
      );

      if (preview.cash < -EPS) {
        alert("Not enough cash for this operation.");
        return;
      }

      setPrices((prev) => ({ ...prev, [symbol]: executionPrice }));
      setHistory((prev) => [...prev, operation]);
      setTicker("");
      setQty(0);
      setShort(false);
      setLeverage(1);
      setNote("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not add position.");
    }
  }

  async function handleClose(symbol: string) {
    const row = rows.find((item) => item.ticker === symbol);
    if (!row) return;

    const amount = Number(qtyToClose[symbol] || 0);
    if (amount <= 0 || amount > Math.abs(row.qty)) {
      alert(`Invalid quantity to close for ${symbol}.`);
      return;
    }

    try {
      const quote = await fetchPrices([symbol]);
      const executionPrice = quote[symbol] || row.current || row.avg;
      const signedQty = row.qty > 0 ? -amount : amount;

      const previewOperation: Trade = {
        id: crypto.randomUUID(),
        ticker: symbol,
        qty: signedQty,
        price: executionPrice,
        leverage: row.leverage,
        note: "",
        date: today,
      };

      const preview = buildAccounting(
        [...history, previewOperation],
        { ...prices, [symbol]: executionPrice },
        startingCash
      );

      const realizedOnClose = preview.realizedPL - accounting.realizedPL;
      const action = row.qty > 0 ? "Sold" : "Covered";
      const userNote = closeNote[symbol]?.trim() || "";

      const operation: Trade = {
        ...previewOperation,
        note: `${action} ${amount} ${symbol} at ${executionPrice.toFixed(
          2
        )} EUR - P/L: ${realizedOnClose.toFixed(2)} EUR${
          userNote ? ` | Reason: ${userNote}` : ""
        }`,
      };

      setPrices((prev) => ({ ...prev, [symbol]: executionPrice }));
      setHistory((prev) => [...prev, operation]);
      setQtyToClose((prev) => ({ ...prev, [symbol]: 0 }));
      setCloseNote((prev) => ({ ...prev, [symbol]: "" }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not close position.");
    }
  }

  function resetDay() {
    const todayRows = history.filter((tx) => tx.date === today);
    if (!todayRows.length) return;

    if (!confirm("Remove all transactions made today?")) return;

    setHistory((prev) => prev.filter((tx) => tx.date !== today));
    setEquityHistory((prev) => prev.filter((point) => point.date !== today));
  }

  function resetAll() {
    if (!confirm("Reset the entire virtual portfolio? This cannot be undone.")) {
      return;
    }

    setHistory([]);
    setPrices({});
    setEquityHistory([]);
    setSpyBasePrice(null);
    setStartingCash(DEFAULT_STARTING_CASH);
    setTicker("");
    setQty(0);
    setShort(false);
    setLeverage(1);
    setNote("");
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ------------------------- import / export ------------------------ */
  function exportPortfolio() {
    const payload: SavedSimulator = {
      version: 2,
      startingCash,
      history,
      equityHistory,
      spyBasePrice,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quant-capital-simulator-${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function importPortfolio(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<SavedSimulator>;

      if (!Array.isArray(parsed.history) || !(Number(parsed.startingCash) > 0)) {
        throw new Error("Invalid simulator backup file.");
      }

      if (!confirm("Replace the current virtual portfolio with this backup?")) {
        return;
      }

      setStartingCash(Number(parsed.startingCash));
      setHistory(parsed.history as Trade[]);
      setEquityHistory(
        Array.isArray(parsed.equityHistory)
          ? (parsed.equityHistory as EquityPoint[])
          : []
      );
      setSpyBasePrice(
        parsed.spyBasePrice != null && Number(parsed.spyBasePrice) > 0
          ? Number(parsed.spyBasePrice)
          : null
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import failed.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  /* ------------------------- derived UI data ------------------------ */
  const transactionLabels = useMemo(
    () => buildTransactionLabels(history),
    [history]
  );

  const allocationData = rows.map((row) => ({
    ticker: row.ticker,
    value: Math.abs(row.marketValue),
  }));

  const plChartData = rows.map((row) => ({
    ticker: row.ticker,
    pl: row.pl,
  }));

  const insights = useMemo(() => {
    if (!rows.length) return null;

    const byPct = [...rows].sort((a, b) => b.plPct - a.plPct);
    const byImpact = [...rows].sort((a, b) => Math.abs(b.pl) - Math.abs(a.pl));
    const byExposure = [...rows].sort(
      (a, b) => b.grossExposure - a.grossExposure
    );

    return {
      topGainer: byPct[0],
      topLoser: byPct[byPct.length - 1],
      largestPosition: byExposure[0],
      mostImpactful: byImpact[0],
    };
  }, [rows]);

  if (!hydrated) return null;

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-bold text-gray-800">Portfolio Simulator</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Build and manage your own virtual portfolio. Your data stays in this
          browser unless you export a backup.
        </p>
      </header>

      <InstallSimulator />

      {/* Starting capital */}
      <section className="border rounded-xl p-4 bg-blue-50">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-sm font-semibold">Starting capital</div>
            <div className="text-xs text-gray-500">
              Change it only before placing trades, or reset the portfolio first.
            </div>
          </div>

          <input
            type="number"
            min="1"
            step="1000"
            value={startingCash}
            disabled={history.length > 0}
            onChange={(e) => setStartingCash(Math.max(1, Number(e.target.value)))}
            className="ml-auto border rounded p-2 w-48 bg-white disabled:bg-gray-100"
          />
        </div>
      </section>

      {/* Snapshot */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Total Equity</div>
          <div className="text-xl font-bold text-blue-700">
            {money(accounting.equity)}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Cash</div>
          <div className="text-lg font-semibold">{money(accounting.cash)}</div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Gross Exposure</div>
          <div className="text-lg font-semibold">
            {money(accounting.grossExposure)}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Net Exposure</div>
          <div className="text-lg font-semibold">
            {money(accounting.netExposure)}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Realized P/L</div>
          <div
            className={`text-lg font-semibold ${
              accounting.realizedPL >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {money(accounting.realizedPL)}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Unrealized P/L</div>
          <div
            className={`text-lg font-semibold ${
              accounting.unrealizedPL >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {money(accounting.unrealizedPL)}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Total P/L</div>
          <div
            className={`text-lg font-semibold ${
              accounting.totalPL >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {money(accounting.totalPL)}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Portfolio Return</div>
          <div
            className={`text-lg font-semibold ${
              portPct >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {portPct.toFixed(2)}%
          </div>
        </div>
      </section>

      {/* New trade */}
      <form onSubmit={handleAdd} className="space-y-3 border rounded-xl p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            list="simulator-tickers"
            className="border p-2 flex-1 min-w-48"
            placeholder="Ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
          />

          <datalist id="simulator-tickers">
            {SUGGESTED_TICKERS.map((symbol) => (
              <option key={symbol} value={symbol} />
            ))}
          </datalist>

          <input
            type="number"
            min="0"
            step="any"
            className="border p-2 w-28"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />

          <label className="flex items-center gap-2 px-2">
            <input
              type="checkbox"
              checked={short}
              onChange={(e) => setShort(e.target.checked)}
            />
            Short
          </label>

          <select
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="border rounded p-2"
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
          </select>

          <button
            type="submit"
            disabled={!ticker.trim() || qty <= 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Add Position
          </button>
        </div>

        <textarea
          className="border p-2 w-full min-h-20"
          placeholder="Trade note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </form>

      {/* Controls */}
      <section className="flex flex-wrap gap-2 items-center">
        <button
          onClick={refreshMarket}
          disabled={marketLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {marketLoading ? "Refreshing…" : "Refresh Prices"}
        </button>

        <button
          onClick={resetDay}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Reset Day
        </button>

        <button
          onClick={resetAll}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Reset All
        </button>

        <button
          onClick={exportPortfolio}
          className="bg-slate-600 text-white px-4 py-2 rounded"
        >
          Export Backup
        </button>

        <button
          onClick={() => importRef.current?.click()}
          className="bg-slate-600 text-white px-4 py-2 rounded"
        >
          Import Backup
        </button>

        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importPortfolio(file);
          }}
        />
      </section>

      {/* Open positions */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Open Positions</h2>

        {rows.length === 0 ? (
          <p className="text-gray-500">No open positions yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left">
                  <th className="p-2">Ticker</th>
                  <th className="p-2">Side</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Avg.</th>
                  <th className="p-2">Current</th>
                  <th className="p-2">P/L</th>
                  <th className="p-2">P/L %</th>
                  <th className="p-2">Note</th>
                  <th className="p-2 min-w-52">Close</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.ticker} className="border-b align-top">
                    <td className="p-2 font-medium">{row.ticker}</td>
                    <td
                      className={`p-2 ${
                        row.direction === "Long"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {row.direction}
                    </td>
                    <td className="p-2">{Math.abs(row.qty)}</td>
                    <td className="p-2">{row.avg.toFixed(2)} EUR</td>
                    <td className="p-2">{row.current.toFixed(2)} EUR</td>
                    <td
                      className={`p-2 ${
                        row.pl >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {row.pl.toFixed(2)} EUR
                    </td>
                    <td
                      className={`p-2 ${
                        row.plPct >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {row.plPct.toFixed(2)}%
                    </td>
                    <td className="p-2">
                      <div>{row.note || "—"}</div>
                      <div className="text-xs text-gray-500 italic">
                        Leverage: {row.leverage.toFixed(2)}x
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        max={Math.abs(row.qty)}
                        step="any"
                        placeholder="Qty to close"
                        value={qtyToClose[row.ticker] ?? ""}
                        onChange={(e) =>
                          setQtyToClose((prev) => ({
                            ...prev,
                            [row.ticker]: Number(e.target.value),
                          }))
                        }
                        className="border p-1 w-full mb-1"
                      />

                      <input
                        type="text"
                        placeholder="Close comment"
                        value={closeNote[row.ticker] ?? ""}
                        onChange={(e) =>
                          setCloseNote((prev) => ({
                            ...prev,
                            [row.ticker]: e.target.value,
                          }))
                        }
                        className="border p-1 w-full mb-1"
                      />

                      <button
                        onClick={() => handleClose(row.ticker)}
                        className="text-blue-600 hover:underline"
                      >
                        {row.direction === "Long" ? "Sell" : "Cover"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Insights */}
      {insights && (
        <section className="border rounded-xl p-4 grid sm:grid-cols-2 gap-3 bg-gray-50">
          <div>
            📈 <b>Top Gainer:</b> {insights.topGainer.ticker} (
            {insights.topGainer.plPct.toFixed(2)}%)
          </div>
          <div>
            📉 <b>Top Loser:</b> {insights.topLoser.ticker} (
            {insights.topLoser.plPct.toFixed(2)}%)
          </div>
          <div>
            💰 <b>Largest Position:</b> {insights.largestPosition.ticker} (
            {money(insights.largestPosition.grossExposure)})
          </div>
          <div>
            📊 <b>Most Impactful:</b> {insights.mostImpactful.ticker} (
            {money(insights.mostImpactful.pl)})
          </div>
        </section>
      )}

      {/* Transaction log */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Transaction Log</h2>

        {history.length === 0 ? (
          <p className="text-gray-500">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="border-b bg-gray-50">
                <tr className="text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Ticker</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Note / Leverage</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((tx) => (
                  <tr key={tx.id} className="border-b">
                    <td className="p-2">{tx.date}</td>
                    <td className="p-2">{tx.ticker}</td>
                    <td className="p-2">{tx.qty}</td>
                    <td className="p-2">{tx.price.toFixed(2)} EUR</td>
                    <td className="p-2 font-semibold">
                      {transactionLabels[tx.id]}
                    </td>
                    <td className="p-2">
                      <div>{tx.note || "—"}</div>
                      <div className="text-xs text-gray-500 italic">
                        Leverage: {Number(tx.leverage || 1).toFixed(0)}x
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Allocation */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Allocation</h2>
        <div className="h-72">
          {allocationData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="ticker"
                  outerRadius={100}
                  label
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={entry.ticker} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => money(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500">No allocation data yet.</p>
          )}
        </div>
      </section>

      {/* P/L by ticker */}
      <section>
        <h2 className="text-xl font-semibold mb-3">P/L by Ticker</h2>
        <div className="h-72">
          {plChartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ticker" />
                <YAxis />
                <Tooltip formatter={(value: number) => money(value)} />
                <Bar dataKey="pl">
                  {plChartData.map((entry) => (
                    <Cell
                      key={entry.ticker}
                      fill={entry.pl >= 0 ? "#16a34a" : "#dc2626"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500">No P/L data yet.</p>
          )}
        </div>
      </section>

      {/* Benchmark */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Portfolio vs S&P 500 (%)</h2>
        <div className="h-80">
          {equityHistory.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis unit="%" />
                <Tooltip
                  formatter={(value: number) => `${Number(value).toFixed(2)}%`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="port"
                  name="Portfolio"
                  stroke="#8884d8"
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="sp"
                  name="S&P 500"
                  stroke="#82ca9d"
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500">Performance history starts today.</p>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Performance is measured from your chosen starting capital. The S&P 500
          comparison begins when this virtual portfolio is created.
        </p>
      </section>

      {/* Daily log */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Equity Daily Log</h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Equity</th>
                <th className="p-2">Portfolio (%)</th>
                <th className="p-2">S&P 500 (%)</th>
              </tr>
            </thead>
            <tbody>
              {equityHistory.map((point) => (
                <tr key={point.date} className="border-b">
                  <td className="p-2">{point.date}</td>
                  <td className="p-2">{money(point.equity)}</td>
                  <td
                    className={`p-2 ${
                      point.port >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {point.port.toFixed(2)}%
                  </td>
                  <td
                    className={`p-2 ${
                      point.sp >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {point.sp.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-sm text-gray-500 italic border-t pt-4">
        This simulator is for educational purposes only. Data is stored locally
        in your browser and does not represent real money or investment advice.
      </footer>
    </main>
  );
}
