export default function TradingArenaPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Trading Arena</h1>

      <p>
        <b>Work in progress.</b> This section will introduce a dynamic and stressful
        trading simulation. The goal is not to perfectly replicate a real market,
        but to train emotional control and execution under pressure.
      </p>

      <div>
        <h2 className="text-lg font-semibold">Planned features</h2>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Trade long/short on assets with scripted, realistic price paths.</li>
          <li>Set Take Profit (TP) and Stop Loss (SL) levels.</li>
          <li>Timed sessions (e.g., 10 minutes) with Start/Stop controls.</li>
          <li>Optional early exit with final P/L summary.</li>
          <li>Public leaderboard with name + score.</li>
          <li>Historical replays (e.g., Bitcoin during major events).</li>
          <li>Mini-scenarios: recession, FOMO, high volatility, beginner mode.</li>
        </ul>
      </div>

      <div className="bg-yellow-100 border border-yellow-400 rounded p-4 text-center">
        🚀 <b>Work in progress, coming soon!</b>
      </div>
    </div>
  );
}
