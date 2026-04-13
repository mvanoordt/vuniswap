import React from "react";

export function SlippageControl({ slippage, setSlippage }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <label className="section-label">Slippage tolerance</label>
        <span className="text-[11px] text-slate-400">{slippage}%</span>
      </div>
      <input
        type="number"
        min="0"
        max="100"
        value={slippage}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v) && v >= 0 && v <= 100) setSlippage(v);
        }}
        className="mt-1 w-full ios-input"
      />
      <p className="mt-1 text-[11px] text-slate-500">
        Slippage controls how much price impact you are willing to accept.
      </p>
    </div>
  );
}

