"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CandlestickData,
  ISeriesApi,
  IChartApi,
  Time,
} from "lightweight-charts";

/* ---------- tipi ---------- */
type Candle = Omit<CandlestickData, "time"> & { time: Time };
type Side = "long" | "short";
type Position = { side: Side; qty: number; avg: number };
type OrderAction = "buy" | "sell";
type Fill = {
  t: number; // ms
  action: OrderAction;
  price: number;
  qty: number;
  realized: number; // pnl realizzato da questo fill
  note?: string;
};

/* utility */
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function TradingArenaPage() {
  /* ------- stato simulazione ------- */
  const [running, setRunning] = useState(false);
  const [tickMs, setTickMs] = useState(250);
  const [candleMs, setCandleMs] = useState(1000);
  const [startPrice, setStartPrice] = useState(100);
  const [spread, setSpread] = useState(0.2);
  const [mid, setMid] = useState(startPrice);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ------- chart refs ------- */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  /* ------- candela corrente ------- */
  const candleRef = useRef<Candle | null>(null);
  const candleStartRef = useRef<number>(0);

  /* ------- trading state ------- */
  const [qty, setQty] = useState(1);
  const [pos, setPos] = useState<Position | null>(null);
  const [realized, setRealized] = useState(0);
  const [unrealized, setUnrealized] = useState(0);
  const [fills, setFills] = useState<Fill[]>([]);

  /* reset quando cambia il prezzo iniziale */
  useEffect(() => {
    handleReset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPrice]);

  /* init chart via dynamic import (safe lato client) */
  useEffect(() => {
    let resizeObs: ResizeObserver | null = null;

    async function init() {
      if (!containerRef.current) return;

      const { createChart, ColorType } = await import("lightweight-charts");

      const chart = createChart(containerRef.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "#ffffff" },
          textColor: "#333",
        },
        grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
        rightPriceScale: { borderColor: "#ddd" },
        timeScale: { borderColor: "#ddd", secondsVisible: true },
      });

      let series: ISeriesApi<"Candlestick"> | null = null;
      const anyChart = chart as unknown as Record<string, any>;
      if (typeof anyChart.addCandlestickSeries === "function") {
        series = anyChart.addCandlestickSeries({
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderUpColor: "#16a34a",
          borderDownColor: "#dc2626",
          wickUpColor: "#16a34a",
          wickDownColor: "#dc2626",
        }) as ISeriesApi<"Candlestick">;
      } else {
        anyChart.addLineSeries?.({ color: "#0ea5e9", lineWidth: 2 });
        console.warn("[TradingArena] Fallback a line series");
      }

      chartRef.current = chart;
      seriesRef.current = series;

      resizeObs = new ResizeObserver(() => {
        if (containerRef.current)
          chart.applyOptions({ width: containerRef.current.clientWidth });
      });
      resizeObs.observe(containerRef.current);
    }

    init();

    return () => {
      resizeObs?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  /* ----------------- pricing helpers ----------------- */
  const bid = Math.max(0, +(mid - spread / 2).toFixed(2));
  const ask = +(mid + spread / 2).toFixed(2);

  // mark-to-market per PnL non realizzato
  useEffect(() => {
    if (!pos) {
      setUnrealized(0);
      return;
    }
    const mark =
      pos.side === "long" ? bid /* si marca a bid */ : ask /* si marca a ask */;
    const upnl =
      pos.side === "long"
        ? (mark - pos.avg) * pos.qty
        : (pos.avg - mark) * pos.qty;
    setUnrealized(round2(upnl));
  }, [pos, bid, ask]);

  /* ----------------- price engine ----------------- */
  function randDelta() {
    const d = Math.random() * 2 - 1; // [-1, +1]
    return round2(d);
  }

  function startNewCandle(t: number, open: number) {
    const c: Candle = {
      time: Math.floor(t / 1000) as Time,
      open,
      high: open,
      low: open,
      close: open,
    };
    candleRef.current = c;
    candleStartRef.current = t;
    seriesRef.current?.update(c);
  }

  function updateCandle(price: number) {
    const now = Date.now();
    const cur = candleRef.current;
    if (!cur || now - candleStartRef.current >= candleMs) {
      startNewCandle(now, price);
      return;
    }
    cur.high = Math.max(cur.high, price);
    cur.low = Math.min(cur.low, price);
    cur.close = price;
    seriesRef.current?.update(cur);
  }

  function tick() {
    setMid((prev) => {
      const next = Math.max(0, round2(prev + randDelta()));
      updateCandle(next);
      return next;
    });
  }

  /* ----------------- trading engine ----------------- */
  function logFill(f: Fill) {
    setFills((prev) => [f, ...prev].slice(0, 100)); // tieni gli ultimi 100
  }

  function placeMarket(action: OrderAction, q: number) {
    if (q <= 0) return;
    const price = action === "buy" ? ask : bid; // market: buy su ask, sell su bid
    const t = Date.now();

    setPos((cur) => {
      let realizedThis = 0;
      let next: Position | null = cur;

      if (!cur) {
        // non c'è posizione: buy → long, sell → short
        next =
          action === "buy"
            ? { side: "long", qty: q, avg: price }
            : { side: "short", qty: q, avg: price };
      } else if (cur.side === "long") {
        if (action === "buy") {
          // aumenta long (media prezzo)
          const newQty = cur.qty + q;
          const newAvg = (cur.avg * cur.qty + price * q) / newQty;
          next = { side: "long", qty: newQty, avg: round2(newAvg) };
        } else {
          // sell: chiudi long (parziale o totale)
          const closeQty = Math.min(q, cur.qty);
          realizedThis = (price - cur.avg) * closeQty;
          if (closeQty === cur.qty) {
            next = null; // chiusa tutta
          } else {
            next = { side: "long", qty: cur.qty - closeQty, avg: cur.avg };
          }
        }
      } else {
        // cur.side === "short"
        if (action === "sell") {
          // aumenta short (media prezzo)
          const newQty = cur.qty + q;
          const newAvg = (cur.avg * cur.qty + price * q) / newQty;
          next = { side: "short", qty: newQty, avg: round2(newAvg) };
        } else {
          // buy: chiudi short
          const closeQty = Math.min(q, cur.qty);
          realizedThis = (cur.avg - price) * closeQty;
          if (closeQty === cur.qty) {
            next = null;
          } else {
            next = { side: "short", qty: cur.qty - closeQty, avg: cur.avg };
          }
        }
      }

      // aggiorna pnl e log
      if (realizedThis !== 0) {
        setRealized((prev) => round2(prev + realizedThis));
      }
      logFill({
        t,
        action,
        price,
        qty: q,
        realized: round2(realizedThis),
      });

      return next;
    });
  }

  /* ----------------- controlli ----------------- */
  function handleStart() {
    if (running) return;
    setRunning(true);
    startNewCandle(Date.now(), mid);
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
    setMid(startPrice);
    candleRef.current = null;
    candleStartRef.current = 0;
    seriesRef.current?.setData([]);
    // azzera trading
    setPos(null);
    setRealized(0);
    setUnrealized(0);
    setFills([]);
  }

  function handleSpeedChange(ms: number) {
    setTickMs(ms);
    if (running) {
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(tick, ms);
    }
  }

  /* ----------------- UI ----------------- */
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Trading Arena</h1>

      {/* testata bid/ask */}
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="rounded border p-3 text-center">
          <div className="text-xs uppercase text-gray-500">Bid (domanda)</div>
          <div className="text-2xl font-semibold text-green-700 tabular-nums">
            {bid.toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">Spread</div>
          <div className="text-lg tabular-nums">{spread.toFixed(2)}</div>
        </div>
        <div className="rounded border p-3 text-center">
          <div className="text-xs uppercase text-gray-500">Ask (lettera)</div>
          <div className="text-2xl font-semibold text-red-700 tabular-nums">
            {ask.toFixed(2)}
          </div>
        </div>
      </div>

      {/* grafico */}
      <div className="h-[380px] rounded border" ref={containerRef} />

      {/* controlli */}
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
          <label className="block text-xs text-gray-600">Spread</label>
          <input
            type="number"
            step="0.01"
            value={spread}
            onChange={(e) => setSpread(Number(e.target.value) || 0)}
            className="border rounded px-2 py-1 w-28"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600">Tick speed</label>
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

        <div>
          <label className="block text-xs text-gray-600">
            Candle interval
          </label>
          <select
            value={candleMs}
            onChange={(e) => setCandleMs(Number(e.target.value))}
            className="border rounded px-2 py-1"
          >
            <option value={250}>Tick (250ms)</option>
            <option value={500}>0.5s</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600">Qty</label>
          <input
            type="number"
            step="1"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.floor(+e.target.value || 1)))}
            className="border rounded px-2 py-1 w-24"
          />
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

      {/* pannello ordini */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border p-4">
          <h3 className="font-semibold mb-2">Long → guadagno/perdita</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => placeMarket("buy", qty)}
              className="bg-red-600 text-white px-3 py-1.5 rounded"
            >
              Buy @ Ask ({ask.toFixed(2)})
            </button>
            <button
              onClick={() => placeMarket("sell", qty)}
              className="bg-green-700 text-white px-3 py-1.5 rounded"
            >
              Sell @ Bid ({bid.toFixed(2)})
            </button>
          </div>
        </div>
        <div className="rounded border p-4">
          <h3 className="font-semibold mb-2">Short → guadagno/perdita</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => placeMarket("sell", qty)}
              className="bg-green-700 text-white px-3 py-1.5 rounded"
            >
              Sell @ Bid ({bid.toFixed(2)})
            </button>
            <button
              onClick={() => placeMarket("buy", qty)}
              className="bg-red-600 text-white px-3 py-1.5 rounded"
            >
              Buy @ Ask ({ask.toFixed(2)})
            </button>
          </div>
        </div>
      </div>

      {/* Resoconto */}
      <div className="rounded border p-4 space-y-3">
        <h3 className="font-semibold">Resoconto</h3>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-gray-500 mr-1">Posizione:</span>
            {pos ? (
              <span>
                {pos.side.toUpperCase()} • qty {pos.qty} • avg{" "}
                {pos.avg.toFixed(2)}
              </span>
            ) : (
              <span>Nessuna</span>
            )}
          </div>
          <div>
            <span className="text-gray-500 mr-1">Realized PnL:</span>
            <span className={realized >= 0 ? "text-green-700" : "text-red-700"}>
              {realized.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 mr-1">Unrealized PnL:</span>
            <span
              className={unrealized >= 0 ? "text-green-700" : "text-red-700"}
            >
              {unrealized.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 pr-2">Time</th>
                <th className="py-1 pr-2">Action</th>
                <th className="py-1 pr-2">Qty</th>
                <th className="py-1 pr-2">Price</th>
                <th className="py-1 pr-2">Realized</th>
              </tr>
            </thead>
            <tbody>
              {fills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-2 text-gray-500">
                    Nessun ordine eseguito.
                  </td>
                </tr>
              ) : (
                fills.map((f, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1 pr-2">
                      {new Date(f.t).toLocaleTimeString()}
                    </td>
                    <td className="py-1 pr-2 uppercase">{f.action}</td>
                    <td className="py-1 pr-2">{f.qty}</td>
                    <td className="py-1 pr-2">{f.price.toFixed(2)}</td>
                    <td
                      className={`py-1 pr-2 ${
                        f.realized >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                      
        
                    >
                      {f.realized.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}