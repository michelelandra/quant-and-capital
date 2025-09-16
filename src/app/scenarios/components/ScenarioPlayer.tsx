// src/app/scenarios/components/ScenarioPlayer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScenarioData } from "../../../data/scenarios/us-china-trade-war";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import Link from "next/link";

function ValueTooltipLabel({ label, payload }: any) {
  const val = payload?.[0]?.value;
  return (
    <div className="rounded-md border bg-white p-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="font-medium">{label}</div>
      {val != null && <div>Index: {val}</div>}
    </div>
  );
}

export default function ScenarioPlayer({ data }: { data: ScenarioData }) {
  type Phase = "intro" | "playing" | "question" | "reveal" | "finished";
  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [correctCount, setCorrectCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  const pause = data.pauses[qIndex];
  const maxIndex = data.series.length - 1;

  const visible = useMemo(() => data.series.slice(0, Math.min(idx + 1, data.series.length)), [data.series, idx]);

  // playback driver
  useEffect(() => {
    if (phase !== "playing" && phase !== "reveal") return;
    const speed = phase === "playing" ? 30 : 35;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIdx((i) => {
        const next = i + 1;
        if (phase === "playing" && pause && next === pause.index) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setPhase("question");
          return next;
        }
        if (next >= maxIndex) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setPhase("finished");
          return maxIndex;
        }
        return next;
      });
    }, speed);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [phase, pause, maxIndex]);

  const start = () => {
    setPhase("playing");
    setIdx(0);
    setQIndex(0);
    setSelected(undefined);
    setCorrectCount(0);
  };

  const choose = (id: string) => setSelected(id);

  const submitAnswer = () => {
    if (!pause || !selected) return;
    const isCorrect = !!pause.options.find((o) => o.id === selected && o.correct);
    if (isCorrect) setCorrectCount((c) => c + 1);
    setPhase("reveal");
  };

  const isQuestion = phase === "question" && pause;
  const outcome =
    selected && pause ? (pause.options.find((o) => o.id === selected)?.correct ? "correct" : "incorrect") : undefined;

  return (
    <div className="space-y-6">
      {/* Intro */}
      {phase === "intro" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border p-5 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">{data.title}</h2>
          <p className="text-sm text-zinc-500">{data.period}</p>
          <p className="mt-3 text-zinc-700 dark:text-zinc-300">{data.summary}</p>
          <button
            onClick={start}
            className="mt-4 rounded-lg border px-4 py-2 text-sm hover:bg-black hover:text-white dark:border-zinc-700 dark:hover:bg-white dark:hover:text-black"
          >
            Start Scenario
          </button>
        </motion.div>
      )}

      {/* Chart */}
      <div className="h-64 w-full rounded-xl border p-3 dark:border-zinc-800">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visible} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={40} />
            <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fontSize: 10 }} />
            <Tooltip content={({ label, payload }) => <ValueTooltipLabel label={label} payload={payload} />} />
            <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Question */}
      {isQuestion && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border p-5 dark:border-zinc-800">
          <div className="mb-2 text-xs font-medium text-zinc-500">Checkpoint</div>
          <h3 className="text-lg font-semibold">{pause.prompt}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pause.options.map((o) => (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition hover:shadow-sm ${
                  selected === o.id ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : ""
                }`}
              >
                <span className="mr-2 font-semibold">{o.id}.</span> {o.text}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={submitAnswer}
              disabled={!selected}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-black hover:text-white dark:border-zinc-700 dark:hover:bg-white dark:hover:text-black"
            >
              Continue
            </button>
            <span className="text-xs text-zinc-500">Choose one option to continue</span>
          </div>
        </motion.div>
      )}

      {/* Outcome + reveal note */}
      {phase === "reveal" && outcome && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-4 text-sm ${outcome === "correct" ? "border-green-600/40" : "border-red-600/40"}`}
        >
          <div className="font-semibold capitalize">{outcome}</div>
          <div className="mt-1 text-zinc-700 dark:text-zinc-300">
            {pause.options.find((o) => o.id === selected)?.explain}
          </div>
          {pause.revealNote && <div className="mt-2 text-zinc-500">{pause.revealNote}</div>}
          <div className="mt-3 text-xs text-zinc-500">Playback continues to show what actually happened…</div>
        </motion.div>
      )}

      {/* Finished / Debrief */}
      {phase === "finished" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border p-5 dark:border-zinc-800">
          <div className="text-sm text-zinc-500">Score: {correctCount}/{data.pauses.length}</div>
          <h3 className="mt-1 text-lg font-semibold">Debrief</h3>
          <p className="mt-1 text-zinc-700 dark:text-zinc-300">{data.debrief.text}</p>
          {data.debrief.links && data.debrief.links.length > 0 && (
  <ul className="mt-3 list-inside list-disc text-sm">
    {data.debrief.links.map((l) => {
      const isExternal = /^https?:\/\//i.test(l.href);
      return (
        <li key={l.href}>
          {isExternal ? (
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:no-underline"
            >
              {l.label}
            </a>
          ) : (
            <Link href={l.href} className="underline underline-offset-4 hover:no-underline">
              {l.label}
            </Link>
          )}
        </li>
      );
    })}
  </ul>
)}

          <div className="mt-4 flex gap-2">
            <button
              onClick={start}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-black hover:text-white dark:border-zinc-700 dark:hover:bg-white dark:hover:text-black"
            >
              Replay
            </button>
            <Link
  href="/scenarios"
  className="rounded-lg border px-4 py-2 text-sm hover:bg-black hover:text-white dark:border-zinc-700 dark:hover:bg-white dark:hover:text-black"
>
  Back to Scenarios
</Link>

          </div>
        </motion.div>
      )}
    </div>
  );
}
