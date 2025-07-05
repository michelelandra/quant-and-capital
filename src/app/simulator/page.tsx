"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

// Tipi
type Position = {
  id: string;
  ticker: string;
  qty: number;
  buyPrice: number;
  date: string;
};

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE"];

const STARTING_CASH = 100_000;

const SimulatorPage: React.FC = () => {
  const [cash, setCash] = useState(STARTING_CASH);
  const [history, setHistory] = useState<Position[]>([]);
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState(0);
  const [price, setPrice] = useState(0);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [track, setTrack] = useState<{ date: string; equity: number }[]>([]);

  const today = dayjs().format("YYYY-MM-DD");
  const todayPositions = history.filter((p) => p.date === today);

  // LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("portfolio-demo");
    if (saved) {
      const { cash: c, history: h, track: t } = JSON.parse(saved);
      setCash(c);
      setHistory(h);
      setTrack(t ?? []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "portfolio-demo",
      JSON.stringify({ cash, history, track })
    );
  }, [cash, history, track]);

  // Prezi correnti
  const fetchPrices = async (symbols: string[]) => {
    if (!symbols.length) return {};
    const res = await fetch(`/api/quote?symbol=${symbols.join()}`);
    const raw = await res.json();
    const items = Array.isArray(raw) ? raw : [raw];
    const out: Record<string, number> = {};
    items.forEach((d: any) => {
      out[d.symbol] = Number(d.price ?? d.close ?? 0);
    });
    return out;
  };

  const aggregate = history.reduce<Record<string, { qty: number; cost: number }>>(
    (acc, p) => {
      acc[p.ticker] ??= { qty: 0, cost: 0 };
      acc[p.ticker].qty += p.qty;
      acc[p.ticker].cost += p.qty * p.buyPrice;
      return acc;
    },
    {}
  );

  const tickers = Object.keys(aggregate);

  useEffect(() => {
    (async () => {
      const latest = await fetchPrices(tickers);
      setPrices(latest);
    })();
  }, [tickers.join(",")]);

  const plByTicker = tickers.map((t) => {
    const { qty, cost } = aggregate[t];
    const cur = prices[t] ?? 0;
    return {
      ticker: t,
      qty,
      avg: cost / qty,
      current: cur,
      pl: qty * (cur - cost / qty),
      value: qty * cur,
    };
  });

  const usedCash = history.reduce((s, p) => s + p.qty * p.buyPrice, 0);
  const totalPL = plByTicker.reduce((s, r) => s + r.pl, 0);
  const equity = usedCash + totalPL;

  // Operazioni
  const handleAdd = () => {
    if (!ticker || qty <= 0 || price <= 0) return;
    const cost = qty * price;
    if (cost > cash) {
      alert("Not enough cash");
      return;
    }
    setCash((c) => c - cost);
    setHistory((h) => [
      ...h,
      {
        id: uuidv4(),
        ticker: ticker.toUpperCase(),
        qty,
        buyPrice: price,
        date: today,
      },
    ]);
    setTicker("");
    setQty(0);
    setPrice(0);
  };

  const resetDay = () => {
    const keep = history.filter((p) => p.date !== today);
    const refunded = todayPositions.reduce((s, p) => s + p.qty * p.buyPrice, 0);
    setHistory(keep);
    setCash((c) => c + refunded);
  };

  const resetAll = () => {
    setHistory([]);
    setTrack([]);
    setCash(STARTING_CASH);
  };

  // Salvataggio storico equity
  useEffect(() => {
    if (track.at(-1)?.date === today) return;
    setTrack((t) => [...t, { date: today, equity }]);
  }, [equity, today]);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Portfolio Simulator</h1>
      <p className="text-sm text-gray-500 mb-4">
        Questa è una modalità demo aperta ai visitatori. I dati vengono salvati nel tuo browser.
      </p>

      {/* Form */}
      <div className="flex gap-2 items-center">
        <input
          className="border p-2 flex-1"
          placeholder="Ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
        />
        <input
          type="number"
          className="border p-2 w-28"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />
        <input
          type="number"
          className="border p-2 w-28"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Position
        </button>
      </div>

      {/* Controlli */}
      <div className="flex gap-2 items-center mt-2">
        <button onClick={resetDay} className="bg-yellow-500 px-4 py-2 text-white rounded">
          Reset Day
        </button>
        <button onClick={resetAll} className="bg-red-600 px-4 py-2 text-white rounded">
          Reset All
        </button>
        <span className="ml-auto font-semibold">
          Cash: {cash.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
        </span>
      </div>

      {/* Tabella */}
      <table className="w-full text-sm border-collapse mt-4">
        <thead className="border-b">
          <tr className="text-left">
            <th>Ticker</th>
            <th>Qty</th>
            <th>Avg. Price</th>
            <th>Current Price</th>
            <th>P/L</th>
          </tr>
        </thead>
        <tbody>
          {plByTicker.map((r) => (
            <tr key={r.ticker} className="border-b">
              <td>{r.ticker}</td>
              <td>{r.qty}</td>
              <td>{r.avg.toFixed(2)} €</td>
              <td>{r.current.toFixed(2)} €</td>
              <td className={r.pl >= 0 ? "text-green-600" : "text-red-600"}>
                {r.pl.toFixed(2)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Grafico a torta */}
      <h2 className="text-xl font-semibold mt-6">Allocazione per Ticker</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={plByTicker}
              dataKey="value"
              nameKey="ticker"
              outerRadius={100}
              label
            >
              {plByTicker.map((entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Grafico temporale */}
      <h2 className="text-xl font-semibold mt-6">Equity nel tempo</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={track}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} />
            <Line type="monotone" dataKey="equity" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
};

export default SimulatorPage;
