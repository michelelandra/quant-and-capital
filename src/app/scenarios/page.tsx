// src/app/scenarios/page.tsx
"use client";

import Link from "next/link";
import { SCENARIOS } from "@/data/scenarios";
import { motion } from "framer-motion";

export default function ScenariosPage() {
  return (
    <motion.main
      className="mx-auto max-w-6xl px-4 py-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold">Scenarios</h1>
        <p className="mt-2 text-zinc-600">
          Replay & study historic market regimes. Click a block to open the scenario workspace.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SCENARIOS.map((s) => (
          <Link
            key={s.slug}
            href={`/scenarios/${s.slug}`}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold leading-tight">{s.title}</h2>
              <span className="text-xs rounded-full border px-2 py-0.5 dark:border-zinc-700">{s.period}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{s.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </section>
    </motion.main>
  );
}
