import React, { useState } from "react";
import { TimeRangeSelector } from "./TimeRangeSelector.jsx";
import { PriceChart } from "./PriceChart.jsx";
import { RecentSwaps } from "./RecentSwaps.jsx";

const DEFAULT_RANGE = { key: "3D", label: "3D", days: 3 };

export function Activity({ pairContract, tokenA, tokenB, provider }) {
  const [range, setRange] = useState(DEFAULT_RANGE);

  if (!tokenA || !tokenB) {
    return (
      <div className="mt-4 text-center text-xs text-slate-500">
        Select Token X and Token Y to view activity.
      </div>
    );
  }

  if (!pairContract) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-xs text-slate-300">
        <div className="font-semibold mb-1 text-slate-100">Activity</div>
        <div className="text-[11px] text-slate-500">
          No pool exists yet for this pair. Once liquidity is added and swaps occur,
          transaction prices and recent trades will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="section-label">Activity</div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      <PriceChart
        pairContract={pairContract}
        tokenA={tokenA}
        tokenB={tokenB}
        provider={provider}
        range={range}
      />

      <RecentSwaps
        pairContract={pairContract}
        tokenA={tokenA}
        tokenB={tokenB}
        provider={provider}
      />
    </div>
  );
}

