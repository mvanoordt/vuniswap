import React from "react";
import { ethers } from "ethers";

function fmt(amount, decimals = 18) {
  try {
    return ethers.utils.formatUnits(amount, decimals);
  } catch {
    return "0";
  }
}

export function PoolInfo({ poolInfo, tokenA, tokenB, lpBalance, lpTotalSupply }) {
  if (!poolInfo || !tokenA || !tokenB) return null;

  const { reserveA, reserveB } = poolInfo;
  const priceAinB =
    reserveA && !reserveA.isZero()
      ? reserveB.mul(ethers.BigNumber.from(10).pow(18)).div(reserveA)
      : null;
  const priceBinA =
    reserveB && !reserveB.isZero()
      ? reserveA.mul(ethers.BigNumber.from(10).pow(18)).div(reserveB)
      : null;

  let share = null;
  if (lpBalance && lpTotalSupply && !lpTotalSupply.isZero()) {
    share = lpBalance.mul(10000).div(lpTotalSupply).toNumber() / 100;
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
      <div className="mb-1 font-semibold text-slate-200">Pool info</div>
      <div>
        Reserves: {fmt(reserveA, tokenA.decimals || 18)} {tokenA.symbol} /{" "}
        {fmt(reserveB, tokenB.decimals || 18)} {tokenB.symbol}
      </div>
      <div>
        Price: 1 {tokenA.symbol} ≈{" "}
        {priceAinB
          ? Number(ethers.utils.formatUnits(priceAinB, 18)).toPrecision(6)
          : "-"}{" "}
        {tokenB.symbol}
      </div>
      <div>
        Price: 1 {tokenB.symbol} ≈{" "}
        {priceBinA
          ? Number(ethers.utils.formatUnits(priceBinA, 18)).toPrecision(6)
          : "-"}{" "}
        {tokenA.symbol}
      </div>
      {share !== null && <div>Your pool share: {share.toFixed(4)}%</div>}
    </div>
  );
}

