// src/data/scenarios/us-china-trade-war.ts
export type ScenarioDatasetPoint = { t: string; v: number };

export type ScenarioPause = {
  index: number; // index in series where we pause
  prompt: string;
  options: { id: string; text: string; correct: boolean; explain: string }[];
  revealNote?: string;
};

export type ScenarioData = {
  slug: string;
  title: string;
  period: string;
  summary: string;
  tags: string[];
  series: ScenarioDatasetPoint[]; // normalized to 100 at start
  pauses: ScenarioPause[];
  debrief: { text: string; links?: { label: string; href: string }[] };
};

// Synthetic demo series (normalized ~100). Replace with real history later.
const makeSeries = (): ScenarioDatasetPoint[] => {
  const out: ScenarioDatasetPoint[] = [];
  let v = 100;
  const start = new Date("2018-01-05").getTime();
  for (let i = 0; i < 180; i++) {
    const noise = (Math.random() - 0.5) * 0.3;
    v += noise;
    if (i === 120) v -= 2.5;
    if (i > 120 && i < 140) v -= 0.15;
    const d = new Date(start + i * 1000 * 60 * 60 * 24 * 7); // weekly
    out.push({ t: d.toISOString().slice(0, 10), v: Math.round(v * 10) / 10 });
  }
  const base = out[0]?.v ?? 100;
  return out.map((p) => ({ ...p, v: Math.round((p.v / base) * 1000) / 10 }));
};

export const US_CHINA_TRADE_WAR: ScenarioData = {
  slug: "us-china-trade-war",
  title: "US–China Trade War (Tariffs)",
  period: "2018–2019",
  summary:
    "Tariff headlines triggered risk-off bursts, FX moves, and factor rotations across cyclicals and exporters.",
  tags: ["tariffs", "FX", "semiconductors", "industrials"],
  series: makeSeries(),
  pauses: [
    {
      index: 120,
      prompt: "The U.S. raises tariffs from 30% to 40%. What is the most likely short-term reaction?",
      options: [
        { id: "A", text: "Semiconductors rally immediately", correct: false, explain: "Export and supply-chain risk usually weigh first." },
        { id: "B", text: "Industrials and materials jump",    correct: false, explain: "Cyclicals often wobble on trade uncertainty." },
        { id: "C", text: "USD up, equities down, volatility up", correct: true, explain: "Classic risk-off + flight-to-quality pattern." },
        { id: "D", text: "No material impact",                 correct: false, explain: "Tariff shocks typically move FX, vol, and cyclicals." }
      ],
      revealNote: "2018–2019 saw repeated risk-off bursts on tariff headlines.",
    },
  ],
  debrief: {
    text:
      "Tariffs raise uncertainty about costs and supply chains, often triggering short-term risk-off (USD ↑, vol ↑, equities ↓). Medium-term outcomes depend on policy path and exemptions.",
    links: [
      { label: "Case Study: Semiconductors under Tariffs", href: "/case-studies/semis-under-tariffs" },
      { label: "Analysis: FX Moves on Trade Headlines",   href: "/analyses/fx-trade-headlines" },
    ],
  },
};
