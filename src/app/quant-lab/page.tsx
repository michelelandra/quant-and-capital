"use client";

import { motion } from "framer-motion";

const LABS = [
  {
    title: "Monte Carlo Simulator",
    description:
      "Simulate thousands of possible price paths and study the distribution of future outcomes.",
    topics: ["GBM", "volatility", "probability"],
    status: "First build",
  },
  {
    title: "Efficient Frontier",
    description:
      "Explore the relationship between expected return, volatility and portfolio allocation.",
    topics: ["Markowitz", "Sharpe ratio", "allocation"],
    status: "Planned",
  },
  {
    title: "Black–Scholes & Greeks",
    description:
      "Study option pricing interactively and see how Delta, Gamma, Vega, Theta and Rho evolve.",
    topics: ["options", "Greeks", "pricing"],
    status: "Planned",
  },
  {
    title: "VaR & Expected Shortfall",
    description:
      "Compare different approaches to estimating portfolio downside risk.",
    topics: ["VaR", "CVaR", "risk"],
    status: "Planned",
  },
  {
    title: "CAPM / Beta Explorer",
    description:
      "Estimate beta, alpha and market sensitivity through regression analysis.",
    topics: ["CAPM", "beta", "regression"],
    status: "Planned",
  },
  {
    title: "Correlation Lab",
    description:
      "Visualize correlation matrices and observe how relationships between assets change over time.",
    topics: ["correlation", "rolling windows", "diversification"],
    status: "Planned",
  },
];

export default function QuantLabPage() {
  return (
    <motion.main
      className="mx-auto max-w-6xl px-4 py-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Quant Lab</h1>

        <p className="mt-3 max-w-3xl text-zinc-600">
          Interactive experiments for quantitative finance, statistics and
          portfolio theory. Change parameters, visualize models and explore how
          financial systems behave.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LABS.map((lab) => (
          <div
            key={lab.title}
            className="flex min-h-[230px] flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">{lab.title}</h2>

              <span
                className={[
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs",
                  lab.status === "First build"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 text-zinc-500",
                ].join(" ")}
              >
                {lab.status}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {lab.description}
            </p>

            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {lab.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </motion.main>
  );
}