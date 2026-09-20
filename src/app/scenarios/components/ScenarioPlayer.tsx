"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ScenarioData } from "../../../data/scenarios/us-china-trade-war";

function ValueTooltipLabel({
  label,
  payload,
}: {
  label?: string | number;
  payload?: Array<{ value?: number }>;
}) {
  const val = payload?.[0]?.value;

  return (
    <div className="rounded-md border bg-white p-2 text-xs shadow-sm">
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

  const visible = useMemo(
    () => data.series.slice(0, Math.min(idx + 1, data.series.length)),
    [data.series, idx]
  );

  /* --------------------------------------------------------------- */
  /* Playback                                                        */
  /* --------------------------------------------------------------- */

  useEffect(() => {
    if (phase !== "playing") return;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setIdx((currentIndex) => {
        const next = currentIndex + 1;

        // Stop exactly at the next decision checkpoint.
        if (pause && next === pause.index) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }

          setPhase("question");
          return next;
        }

        if (next >= maxIndex) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }

          setPhase("finished");
          return maxIndex;
        }

        return next;
      });
    }, 90);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, pause, maxIndex]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  /* --------------------------------------------------------------- */
  /* Controls                                                        */
  /* --------------------------------------------------------------- */

  function start() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIdx(0);
    setQIndex(0);
    setSelected(undefined);
    setCorrectCount(0);
    setPhase("playing");
  }

  function choose(id: string) {
    if (phase !== "question") return;
    setSelected(id);
  }

  function submitAnswer() {
    if (!pause || !selected) return;

    const selectedOption = pause.options.find(
      (option) => option.id === selected
    );

    if (selectedOption?.correct) {
      setCorrectCount((count) => count + 1);
    }

    // Stay paused while the explanation is shown.
    setPhase("reveal");
  }

  function continueScenario() {
    // Move to the next checkpoint only after the player has read the reveal.
    setQIndex((current) => current + 1);
    setSelected(undefined);

    if (idx >= maxIndex) {
      setPhase("finished");
      return;
    }

    setPhase("playing");
  }

  const isQuestion = phase === "question" && !!pause;

  const selectedOption =
    selected && pause
      ? pause.options.find((option) => option.id === selected)
      : undefined;

  const outcome = selectedOption
    ? selectedOption.correct
      ? "correct"
      : "incorrect"
    : undefined;

  /* --------------------------------------------------------------- */
  /* UI                                                              */
  /* --------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Intro */}
      {phase === "intro" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border p-5"
        >
          <h2 className="text-xl font-semibold">{data.title}</h2>
          <p className="text-sm text-zinc-500">{data.period}</p>

          <p className="mt-3 text-zinc-700">{data.summary}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            onClick={start}
            className="mt-4 rounded-lg border px-4 py-2 text-sm transition hover:bg-black hover:text-white"
          >
            Start Scenario
          </button>
        </motion.div>
      )}

      {/* Chart */}
      <div className="h-64 w-full rounded-xl border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visible}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="t"
              tick={{ fontSize: 10 }}
              angle={-30}
              textAnchor="end"
              height={40}
            />

            <YAxis
              domain={["dataMin - 5", "dataMax + 5"]}
              tick={{ fontSize: 10 }}
            />

            <Tooltip
              content={({ label, payload }) => (
                <ValueTooltipLabel
                  label={label}
                  payload={payload as Array<{ value?: number }>}
                />
              )}
            />

            <Line
              type="monotone"
              dataKey="v"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Question */}
      {isQuestion && pause && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border p-5"
        >
          <div className="mb-2 text-xs font-medium text-zinc-500">
            Checkpoint {qIndex + 1} of {data.pauses.length}
          </div>

          <h3 className="text-lg font-semibold">{pause.prompt}</h3>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pause.options.map((option) => (
              <button
                key={option.id}
                onClick={() => choose(option.id)}
                className={[
                  "rounded-lg border px-3 py-2 text-left text-sm transition hover:shadow-sm",
                  selected === option.id
                    ? "bg-zinc-900 text-white"
                    : "bg-white",
                ].join(" ")}
              >
                <span className="mr-2 font-semibold">{option.id}.</span>
                {option.text}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={submitAnswer}
              disabled={!selected}
              className="rounded-lg border px-4 py-2 text-sm transition hover:bg-black hover:text-white disabled:opacity-50"
            >
              Submit decision
            </button>

            <span className="text-xs text-zinc-500">
              Choose one option before continuing.
            </span>
          </div>
        </motion.div>
      )}

      {/* Outcome / reveal */}
      {phase === "reveal" && pause && selectedOption && outcome && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={[
            "rounded-xl border p-5 text-sm",
            outcome === "correct"
              ? "border-green-600/40 bg-green-50/40"
              : "border-red-600/40 bg-red-50/40",
          ].join(" ")}
        >
          <div
            className={[
              "font-semibold",
              outcome === "correct" ? "text-green-700" : "text-red-700",
            ].join(" ")}
          >
            {outcome === "correct"
              ? "Strong decision for the stated objective"
              : "Less defensible for the stated objective"}
          </div>

          <div className="mt-2 text-zinc-700">
            {selectedOption.explain}
          </div>

          {pause.revealNote && (
            <div className="mt-3 rounded-lg bg-white p-3 text-zinc-600">
              <span className="font-medium text-zinc-800">
                What happened next:{" "}
              </span>
              {pause.revealNote}
            </div>
          )}

          <button
            onClick={continueScenario}
            className="mt-4 rounded-lg border bg-white px-4 py-2 text-sm transition hover:bg-black hover:text-white"
          >
            Continue playback
          </button>
        </motion.div>
      )}

      {/* Finished / Debrief */}
      {phase === "finished" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border p-5"
        >
          <div className="text-sm text-zinc-500">
            Score: {correctCount}/{data.pauses.length}
          </div>

          <h3 className="mt-1 text-lg font-semibold">Debrief</h3>

          <p className="mt-1 text-zinc-700">{data.debrief.text}</p>

          {data.debrief.links && data.debrief.links.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-sm">
              {data.debrief.links.map((link) => {
                const isExternal = /^https?:\/\//i.test(link.href);

                return (
                  <li key={link.href}>
                    {isExternal ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={start}
              className="rounded-lg border px-4 py-2 text-sm transition hover:bg-black hover:text-white"
            >
              Replay
            </button>

            <Link
              href="/scenarios"
              className="rounded-lg border px-4 py-2 text-sm transition hover:bg-black hover:text-white"
            >
              Back to Scenarios
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
