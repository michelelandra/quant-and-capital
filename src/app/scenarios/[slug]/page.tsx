import Link from "next/link";
import { notFound } from "next/navigation";

import ScenarioPlayer from "../components/ScenarioPlayer";

import { SCENARIOS } from "@/data/scenarios";
import { US_CHINA_TRADE_WAR } from "@/data/scenarios/us-china-trade-war";
import { GLOBAL_FINANCIAL_CRISIS_2008 } from "@/data/scenarios/global-financial-crisis-2008";

const BUILT_SCENARIOS = [
  GLOBAL_FINANCIAL_CRISIS_2008,
  US_CHINA_TRADE_WAR,
];

export default async function ScenarioDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Scenario completo e giocabile
  const playableScenario = BUILT_SCENARIOS.find(
    (scenario) => scenario.slug === slug
  );

  if (playableScenario) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/scenarios"
            className="text-sm text-zinc-500 hover:text-black"
          >
            ← Back to Scenarios
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold">
          {playableScenario.title}
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          {playableScenario.period}
        </p>

        <div className="mt-6">
          <ScenarioPlayer data={playableScenario} />
        </div>
      </main>
    );
  }

  // Scenario presente nel catalogo ma non ancora costruito
  const scenarioMeta = SCENARIOS.find(
    (scenario) => scenario.slug === slug
  );

  if (!scenarioMeta) {
    return notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/scenarios"
        className="text-sm text-zinc-500 hover:text-black"
      >
        ← Back to Scenarios
      </Link>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">
              {scenarioMeta.title}
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              {scenarioMeta.period}
            </p>
          </div>

          <span className="rounded-full border px-3 py-1 text-xs">
            In development
          </span>
        </div>

        <p className="mt-5 text-zinc-700">
          {scenarioMeta.summary}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {scenarioMeta.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="font-semibold">
            Interactive scenario coming soon
          </h2>

          <p className="mt-2 text-sm text-zinc-600">
            This historical scenario will include market playback,
            decision checkpoints, alternative choices and an
            evidence-based debrief.
          </p>
        </div>
      </div>
    </main>
  );
}