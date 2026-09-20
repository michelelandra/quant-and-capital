// src/data/scenarios/global-financial-crisis-2008.ts

import type { ScenarioData, ScenarioDatasetPoint } from "./us-china-trade-war";

/**
 * Real S&P 500 weekly closes, sampled from Jan 2007 to Jun 2009.
 * Source: EconStats weekly S&P 500 historical table.
 *
 * The scenario player uses a normalized index where the first observation = 100.
 */
const RAW_SP500: { t: string; close: number }[] = [
  { t: "2007-01-05", close: 1409.71 },
  { t: "2007-02-02", close: 1448.39 },
  { t: "2007-03-02", close: 1387.17 },
  { t: "2007-04-06", close: 1443.76 },
  { t: "2007-05-04", close: 1505.62 },
  { t: "2007-06-01", close: 1536.34 },
  { t: "2007-07-06", close: 1530.44 },
  { t: "2007-07-27", close: 1458.95 },
  { t: "2007-08-17", close: 1445.94 },
  { t: "2007-09-07", close: 1453.55 },
  { t: "2007-10-12", close: 1561.80 },
  { t: "2007-11-09", close: 1453.70 },
  { t: "2007-12-07", close: 1504.66 },

  { t: "2008-01-04", close: 1411.63 },
  { t: "2008-02-01", close: 1395.42 },
  { t: "2008-03-14", close: 1288.14 },
  { t: "2008-03-21", close: 1329.51 },
  { t: "2008-04-18", close: 1390.33 },
  { t: "2008-05-16", close: 1425.35 },
  { t: "2008-06-20", close: 1317.93 },
  { t: "2008-07-18", close: 1260.68 },
  { t: "2008-08-15", close: 1298.20 },
  { t: "2008-09-12", close: 1251.70 },
  { t: "2008-09-19", close: 1255.08 },
  { t: "2008-09-26", close: 1213.27 },
  { t: "2008-10-03", close: 1099.23 },
  { t: "2008-10-10", close: 899.22 },
  { t: "2008-10-17", close: 940.55 },
  { t: "2008-10-31", close: 968.75 },
  { t: "2008-11-21", close: 800.03 },
  { t: "2008-11-28", close: 896.24 },
  { t: "2008-12-19", close: 887.88 },

  { t: "2009-01-02", close: 931.80 },
  { t: "2009-01-16", close: 850.12 },
  { t: "2009-02-13", close: 826.84 },
  { t: "2009-02-27", close: 735.09 },
  { t: "2009-03-06", close: 683.38 },
  { t: "2009-03-13", close: 756.55 },
  { t: "2009-03-27", close: 815.94 },
  { t: "2009-04-24", close: 866.23 },
  { t: "2009-05-29", close: 919.14 },
  { t: "2009-06-26", close: 918.90 },
];

function normalizeSeries(
  raw: { t: string; close: number }[]
): ScenarioDatasetPoint[] {
  const base = raw[0]?.close ?? 100;

  return raw.map((point) => ({
    t: point.t,
    v: Math.round((point.close / base) * 1000) / 10,
  }));
}

export const GLOBAL_FINANCIAL_CRISIS_2008: ScenarioData = {
  slug: "global-financial-crisis-2008",
  title: "2008 — Global Financial Crisis",
  period: "2007–2009",
  summary:
    "The U.S. housing and credit crisis escalated into a global financial panic, culminating in major institutional failures, a severe credit freeze and a historic equity drawdown.",
  tags: ["credit", "banks", "liquidity", "volatility"],
  series: normalizeSeries(RAW_SP500),

  pauses: [
    {
      // Weekly observation ending 14 March 2008.
      index: 15,
      prompt:
        "March 2008: Bear Stearns is facing an acute liquidity crisis and emergency support has been arranged through JPMorgan and the Federal Reserve. Your priority is to limit portfolio drawdown over the next few months. What is the most defensible immediate response?",
      options: [
        {
          id: "A",
          text: "Increase leveraged exposure to financial stocks because the rescue removes systemic risk",
          correct: false,
          explain:
            "The intervention reduced the immediate risk of a disorderly Bear Stearns failure, but it did not remove the broader funding, housing and credit stresses affecting the financial system.",
        },
        {
          id: "B",
          text: "Reduce concentrated financial exposure and raise some liquidity while keeping part of the portfolio invested",
          correct: true,
          explain:
            "For a capital-preservation objective, reducing concentrated exposure and increasing liquidity is a defensible response to a sharp deterioration in funding conditions without assuming that the entire market must be sold.",
        },
        {
          id: "C",
          text: "Ignore the event because Bear Stearns is not a commercial bank",
          correct: false,
          explain:
            "Bear Stearns was deeply connected to securities financing and derivatives markets. Its funding problems were relevant to broader market liquidity even though it was an investment bank.",
        },
        {
          id: "D",
          text: "Move the entire portfolio into a single bank stock expected to benefit from consolidation",
          correct: false,
          explain:
            "That would replace one source of risk with a highly concentrated bet at a moment when uncertainty across the financial sector was rising.",
        }
      ],
      revealNote:
        "On March 13, Bear Stearns told the Federal Reserve that it expected to lack sufficient funding or liquid assets to meet obligations the next day. Emergency financing was approved on March 14, and on March 16 Bear agreed to be acquired by JPMorgan Chase in a transaction supported by the Federal Reserve Bank of New York.",
    },
    {
      // Friday, September 12, 2008: the last weekly observation before Lehman's bankruptcy.
      index: 22,
      prompt:
        "September 12, 2008: Lehman Brothers is under severe funding and capital pressure. Authorities and major financial firms are trying to find a private-sector solution over the weekend, but no rescue is guaranteed. Your priority is to limit portfolio drawdown over the next month. What is the most defensible move?",
      options: [
        {
          id: "A",
          text: "Increase leveraged exposure to financial stocks because another Bear Stearns-style rescue is likely",
          correct: false,
          explain:
            "That assumes a specific policy outcome that was not guaranteed. By this point, funding stress was severe and a failed rescue could transmit rapidly through credit, derivatives and money markets.",
        },
        {
          id: "B",
          text: "Move fully into small-cap equities because domestic companies are insulated from investment-bank stress",
          correct: false,
          explain:
            "A broad funding shock can tighten credit conditions across the economy. Smaller companies are not automatically insulated and can be particularly sensitive to financing conditions.",
        },
        {
          id: "C",
          text: "Do nothing because Lehman's problems are idiosyncratic and unlikely to affect money markets",
          correct: false,
          explain:
            "Lehman was deeply connected to wholesale funding and securities markets. A disorderly failure had the potential to spread well beyond one firm.",
        },
        {
          id: "D",
          text: "Reduce financial and cyclical risk, raise liquidity, and add some high-quality defensive exposure",
          correct: true,
          explain:
            "For a drawdown-control objective, reducing concentrated risk while preserving liquidity was a defensible response to unusually high uncertainty around a systemically connected institution.",
        }
      ],
      revealNote:
        "No private-sector rescue was completed. Lehman Brothers filed for Chapter 11 bankruptcy on Monday, September 15, 2008. The following day the Federal Reserve supported AIG, and stress soon spread into money-market funds and commercial-paper markets.",
    },
    {
      // Friday, October 3, 2008: EESA is enacted and TARP is authorized.
      index: 25,
      prompt:
        "October 3, 2008: The Emergency Economic Stabilization Act has been enacted, authorizing TARP as credit markets remain under severe stress. Your objective is to limit drawdown over the next four to six weeks. What is the most defensible interpretation?",
      options: [
        {
          id: "A",
          text: "Policy support is important, but keep liquidity high, avoid excessive leverage, and wait for evidence that credit conditions are stabilizing",
          correct: true,
          explain:
            "For a drawdown-control objective, this separates long-run policy support from near-term market timing. The legislation expanded the authorities available to policymakers, but severe credit and growth risks were still present.",
        },
        {
          id: "B",
          text: "The policy backstop means the market bottom is now in, so maximum leverage is justified",
          correct: false,
          explain:
            "A new policy tool can reduce tail risk without immediately repairing funding markets, bank balance sheets or the economic outlook. Treating legislation as proof of an equity-market bottom would be an aggressive assumption.",
        },
        {
          id: "C",
          text: "Ignore the policy response because government actions cannot affect financial-system liquidity",
          correct: false,
          explain:
            "The legislation explicitly created new authorities intended to support financial stability and liquidity. Policy actions were therefore highly relevant to market functioning even though their effects were uncertain.",
        },
        {
          id: "D",
          text: "Concentrate the portfolio entirely in the most distressed financial institutions because TARP guarantees every firm will survive",
          correct: false,
          explain:
            "TARP did not guarantee the survival of every institution. Concentrating in the weakest balance sheets would still expose the portfolio to large firm-specific and systemic risks.",
        }
      ],
      revealNote:
        "The Emergency Economic Stabilization Act became law on October 3, 2008. Credit stress remained extreme: on October 8 the Federal Reserve and several other central banks announced coordinated rate cuts, and on October 14 the U.S. Treasury announced a Capital Purchase Program making up to $250 billion available for preferred-stock investments in qualifying financial institutions. Equity markets remained highly volatile during this period.",
    },
    {
      // Friday, March 6, 2009: the last weekly observation before the March 9 market trough.
      index: 36,
      prompt:
        "March 6, 2009: The S&P 500 has fallen dramatically from its 2007 peak, the recession remains severe, and confidence is extremely weak. Your horizon is 12–24 months and your objective is long-term capital growth while avoiding a single all-or-nothing market-timing bet. What is the most defensible approach?",
      options: [
        {
          id: "A",
          text: "Stay entirely in cash until the economic recovery is obvious and markets have already risen substantially",
          correct: false,
          explain:
            "Waiting for complete macroeconomic certainty can reduce short-term risk, but it can also mean re-entering only after a large part of a recovery has already occurred. For a long horizon, this creates significant timing risk.",
        },
        {
          id: "B",
          text: "Use maximum leverage to buy the weakest financial stocks because a market bottom is certain",
          correct: false,
          explain:
            "Even after a major drawdown, the exact trough is unknowable in real time. Maximum leverage and concentration would expose the portfolio to severe losses if the crisis deepened.",
        },
        {
          id: "C",
          text: "Rebalance gradually into a diversified equity allocation while retaining liquidity and accepting that the exact bottom cannot be known in real time",
          correct: true,
          explain:
            "For a 12–24 month horizon, staged rebalancing avoids requiring perfect bottom-calling. It can increase exposure after a very large drawdown while preserving liquidity in case conditions deteriorate further.",
        },
        {
          id: "D",
          text: "Short the broad market with the entire portfolio because a recession guarantees that equities must continue falling",
          correct: false,
          explain:
            "Economic data and equity prices do not turn at the same time. A recession can remain severe even as markets begin to anticipate future stabilization, so an all-in short position carries substantial reversal risk.",
        }
      ],
      revealNote:
        "The S&P 500 reached its bear-market closing low of 676.53 on March 9, 2009, about 56.8% below its October 2007 peak. On March 18, the Federal Reserve expanded its large-scale asset-purchase program, including additional agency securities and up to $300 billion of longer-term Treasury securities. The market subsequently began a powerful recovery, even though economic conditions remained weak for some time.",
    },
  ],

  debrief: {
    text:
      "The 2007–2009 crisis illustrates how portfolio decisions change as a crisis evolves: early funding stress can justify reducing concentrated risk; a systemic failure can make liquidity especially valuable; major policy intervention does not guarantee an immediate market bottom; and after a historic drawdown, gradual rebalancing can be more robust than trying to identify the exact turning point. The exercise scores choices against the objective stated at each checkpoint, not as universal investment rules.",
    links: [
      {
        label: "Federal Reserve History: Support for Specific Institutions",
        href: "https://www.federalreservehistory.org/essays/support-for-specific-institutions",
      },
      {
        label: "Federal Reserve: March 16, 2008 liquidity initiatives",
        href: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20080316a.htm",
      },
      {
        label: "U.S. Treasury: About TARP",
        href: "https://home.treasury.gov/data/troubled-assets-relief-program/about-tarp",
      },
      {
        label: "Federal Reserve: Coordinated policy rate reductions, October 8, 2008",
        href: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20081008a.htm",
      },
      {
        label: "S&P Dow Jones Indices: Historical bear-market trough (March 9, 2009)",
        href: "https://www.spglobal.com/content/dam/spglobal/corporate/en/documents/general/adding-more-women-to-the-us-workforce.pdf",
      },
      {
        label: "Federal Reserve: March 18, 2009 FOMC statement",
        href: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20090318a.htm",
      },
    ],
  },
};