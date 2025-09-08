"use client";

import { useEffect, useRef, useState } from "react";

type Row = {
  i: number;
  time: string;
  delta: number;
  price: number;
};

export default function TradingArenaPage() {
  // --- demo controlli ---
  const [running, setRunning] = useState(false);
  const [tickMs, setTickMs] = useState(500);
  const [startPrice, setStartPrice] = useState(100);
  const [price, setPrice] = useState<number>(startPrice);
  const [rows, setRows] = useState<Row[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const counter = useRef(0);

  // reset quando cambia lo start price
  useEffect(() => {
    handleReset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPrice]);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function randDelta() {
    // delta uniforme tra -1 e +1 con decimali
    const d = Math.random() * 2 - 1; // [-1, 1)
    return Math.round(d * 100) / 100; // due decimali
  }

  function tick() {
    setPrice((prev) => {
      const delta = randDelta();
      const next = Math.max(0, Math.round((prev + delta) * 100) / 100); // 2 decimali, no negativi
      const now = new Date().toLocaleTimeString();
      const i = ++counter.current;

      setRows((r) => {
        const updated = [...r, { i, time: now, delta, price: next }];
        // limitiamo la tabella per non crescere all'infinito
        if (updated.length > 300) updated.shift();
        return updated;
      });

      return next;
    });
  }

  function handleStart() {
    if (running) return;
    setRunning(true);
    timer.current = setInterval(tick, tickMs);
  }

  function handleStop() {
    setRunning(false);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  function handleReset(stop = true) {
    if (stop) handleStop();
    counter.current = 0;
    setPrice(startPrice);
    setRows([]);
  }

  function handleSpeedChange(ms: number) {
    setTickMs(ms);
    if (running) {
      // riavvia con il nuovo intervallo
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(tick, ms);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Trading Arena</h1>

      {/* Blocco descrizione / coming soon */}
      <div className="space-y-3">
        <p>
          <b>Work in progress.</b> This section will introduce a dynamic and
          stressful trading simulation. The goal is not perfect market
          replication, but training emotional control and execution under
          pressure.
        </p>

        <div>
          <h2 className="text-lg font-semibold">Planned features</h2>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Long/short on scripted, realistic price paths.</li>
            <li>TP/SL, timed sessions (e.g., 10 minutes), Start/Stop.</li>
            <li>Leaderboard and historical replays.</li>
            <li>Mini-scenarios: recession, FOMO, high volatility.</li>
          </ul>
        </div>

        <div className="bg-yellow-100 border border-yellow-400 rounded p-4">
          🚀 <b>Work in progress, coming soon!</b>
        </div>
      </div>

      {/* --- Demo: tabella con prezzo che varia con delta random [-1,1] --- */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Prototype: Random Ticker</h2>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600">Start price</label>
            <input
              type="number"
              step="0.01"
              value={startPrice}
              onChange={(e) => setStartPrice(Number(e.target.value) || 0)}
              className="border rounded px-2 py-1 w-28"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Speed</label>
            <select
              value={tickMs}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={250}>Fast (250ms)</option>
              <option value={500}>Normal (500ms)</option>
              <option value={1000}>Slow (1s)</option>
            </select>
          </div>

          <div className="ml-auto flex gap-2">
            {!running ? (
              <button
                onClick={handleStart}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded"
              >
                Start
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded"
              >
                Stop
              </button>
            )}
            <button
              onClick={() => handleReset(true)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">Current price:</div>
          <div className="text-2xl font-semibold tabular-nums">
            {price.toFixed(2)}
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-right px-3 py-2">Δ</th>
                <th className="text-right px-3 py-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.i} className="border-b last:border-b-0">
                  <td className="px-3 py-1">{r.i}</td>
                  <td className="px-3 py-1">{r.time}</td>
                  <td
                    className={`px-3 py-1 text-right tabular-nums ${
                      r.delta > 0 ? "text-green-700" : r.delta < 0 ? "text-red-700" : ""
                    }`}
                  >
                    {r.delta > 0 ? "+" : ""}
                    {r.delta.toFixed(2)}
                  </td>
                  <td className="px-3 py-1 text-right tabular-nums">
                    {r.price.toFixed(2)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-2 text-gray-500" colSpan={4}>
                    Press <b>Start</b> to begin streaming ticks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
