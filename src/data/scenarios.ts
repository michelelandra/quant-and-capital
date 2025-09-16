// src/data/scenarios.ts
export type Scenario = {
  slug: string;
  title: string;
  period: string;
  summary: string;
  tags: string[];
};

export const SCENARIOS: Scenario[] = [
  {
    slug: "global-financial-crisis-2008",
    title: "2008 — Global Financial Crisis",
    period: "2007–2009",
    summary: "Housing bubble burst, subprime, Lehman collapse. Credit freeze, equities -50%.",
    tags: ["credit", "banks", "volatility"],
  },
  {
    slug: "covid-crash-2020",
    title: "COVID Crash",
    period: "Feb–Mar 2020",
    summary: "Pandemic shock: fastest bear market on record; extraordinary stimulus.",
    tags: ["macro shock", "policy", "liquidity"],
  },
  {
    slug: "us-china-trade-war",
    title: "Dazi di Trump (US–China Trade War)",
    period: "2018–2019",
    summary: "Tariffs, supply-chain risk, factor rotations; semis & industrials in focus.",
    tags: ["tariffs", "China", "supply chain"],
  },
  {
    slug: "russia-ukraine-war-2022",
    title: "Guerra in Ucraina",
    period: "Feb 2022 →",
    summary: "Energy & grains shock, inflation spike in Europe, defense & commodities bid.",
    tags: ["energy", "inflation", "geopolitics"],
  },

  // altri utili
  {
    slug: "dot-com-bubble-2000",
    title: "Dot-com Bubble",
    period: "2000–2002",
    summary: "Tech boom & bust; growth vs value regime shift, long bear market in Nasdaq.",
    tags: ["tech", "duration", "valuation"],
  },
  {
    slug: "eurozone-debt-crisis-2011",
    title: "Eurozone Debt Crisis",
    period: "2011–2012",
    summary: "Peripheral sovereign spreads widen; banks under stress; LTRO/OMT interventions.",
    tags: ["rates", "sovereign", "banks"],
  },
  {
    slug: "taper-tantrum-2013",
    title: "Taper Tantrum",
    period: "2013",
    summary: "Fed hints at tapering; yields spike; EM FX/equities under pressure.",
    tags: ["rates", "EM", "Fed"],
  },
  {
    slug: "uk-gilt-crisis-2022",
    title: "UK Gilt Crisis",
    period: "Sep–Oct 2022",
    summary: "LDI dynamic; gilt yields surge; BOE temporary purchases stabilize market.",
    tags: ["rates", "LDI", "risk management"],
  },
  {
    slug: "svb-bank-run-2023",
    title: "SVB Bank Run",
    period: "Mar 2023",
    summary: "Duration mismatch, deposit flight; regional banks stress; backstop facilities.",
    tags: ["banks", "liquidity", "risk"],
  },
];
