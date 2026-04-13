import React from "react";

export function CreatePoolNotice({ pairAddress, tokenA, tokenB }) {
  if (!tokenA || !tokenB) return null;
  if (pairAddress) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-xs text-amber-100">
      <div className="font-semibold">No pool exists yet</div>
      <div>When you add liquidity for this pair, a new pool will be created.</div>
    </div>
  );
}

