// src/app/scenarios/[slug]/page.tsx
import { notFound } from "next/navigation";
import ScenarioPlayer from "../components/ScenarioPlayer";
import { US_CHINA_TRADE_WAR } from "../../../data/scenarios/us-china-trade-war";

export default function ScenarioDetail({ params }: { params: { slug: string } }) {
  const { slug } = params;

  if (slug === US_CHINA_TRADE_WAR.slug) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{US_CHINA_TRADE_WAR.title}</h1>
        <p className="text-sm text-zinc-500">{US_CHINA_TRADE_WAR.period}</p>
        <div className="mt-6">
          <ScenarioPlayer data={US_CHINA_TRADE_WAR} />
        </div>
      </main>
    );
  }

  return notFound();
}
