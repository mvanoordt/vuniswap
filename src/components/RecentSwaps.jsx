import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

function short(addr) {
  return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "-";
}

function formatAge(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function fmt(amount, decimals = 18) {
  try {
    return Number(ethers.utils.formatUnits(amount, decimals)).toPrecision(6);
  } catch {
    return "0";
  }
}

export function RecentSwaps({ pairContract, tokenA, tokenB, provider }) {
  const [swaps, setSwaps] = useState([]);

  async function loadSwaps() {
    if (!pairContract || !tokenA || !tokenB || !provider) return;
    try {
      const latest = await provider.getBlockNumber();
      const from = Math.max(latest - 50000, 0);
      const events = await pairContract.queryFilter("Swap", from, latest);
      const last10 = events.slice(-10).reverse();

      const token0 = await pairContract.token0();
      const token1 = await pairContract.token1();
      const tokenXAddr = tokenA.address.toLowerCase();
      const tokenYAddr = tokenB.address.toLowerCase();
      const token0IsX = token0.toLowerCase() === tokenXAddr;
      const token1IsX = token1.toLowerCase() === tokenXAddr;
      const token0IsY = token0.toLowerCase() === tokenYAddr;
      const token1IsY = token1.toLowerCase() === tokenYAddr;

      const enriched = await Promise.all(
        last10.map(async (ev) => {
          const block = await provider.getBlock(ev.blockNumber);
          const ageSec = Math.max(
            0,
            Math.floor(Date.now() / 1000) - block.timestamp
          );
          const {
            sender,
            amount0In,
            amount1In,
            amount0Out,
            amount1Out,
            to
          } = ev.args;

          const tokenXBought =
            (token0IsX && amount0Out.gt(0)) ||
            (token1IsX && amount1Out.gt(0));
          const tokenXSold =
            (token0IsX && amount0In.gt(0)) ||
            (token1IsX && amount1In.gt(0));
          const tokenYBought =
            (token0IsY && amount0Out.gt(0)) ||
            (token1IsY && amount1Out.gt(0));
          const tokenYSold =
            (token0IsY && amount0In.gt(0)) ||
            (token1IsY && amount1In.gt(0));

          const isBuyTokenX = tokenXBought || tokenYSold;
          const isSellTokenX = tokenXSold || tokenYBought;

          let type = "-";
          if (isBuyTokenX) type = `Buy ${tokenA.symbol}`;
          else if (isSellTokenX) type = `Sell ${tokenA.symbol}`;

          let amountX;
          let amountY;

          if (token0IsX) {
            amountX = amount0In.gt(0) ? amount0In : amount0Out;
          } else {
            amountX = amount1In.gt(0) ? amount1In : amount1Out;
          }

          if (token0IsY) {
            amountY = amount0In.gt(0) ? amount0In : amount0Out;
          } else {
            amountY = amount1In.gt(0) ? amount1In : amount1Out;
          }

          let price = null;
          if (amountX && amountY && amountX.gt(0) && amountY.gt(0)) {
            const priceBN = amountY
              .mul(ethers.BigNumber.from(10).pow(18))
              .div(amountX);
            price = Number(ethers.utils.formatUnits(priceBN, 18));
          }

          return {
            recipient: to,
            ageSec,
            type,
            amountX,
            amountY,
            price
          };
        })
      );

      setSwaps(enriched);
    } catch (e) {
      console.error("RecentSwaps load error:", e);
    }
  }

  useEffect(() => {
    loadSwaps();
  }, [pairContract, tokenA, tokenB, provider]);

  useEffect(() => {
    if (!pairContract || !tokenA || !tokenB || !provider) return;
    const interval = setInterval(() => {
      loadSwaps();
    }, 3000);
    return () => clearInterval(interval);
  }, [pairContract, tokenA, tokenB, provider]);

  return (
    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-xs text-slate-300">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold text-slate-100">Last 10 transactions</div>
      </div>
      {swaps.length === 0 && (
        <div className="text-[11px] text-slate-500">
          No recent swaps found for this pool in the scanned range.
        </div>
      )}
      <div className="space-y-2">
        {swaps.map((s, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2"
          >
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-400">
                {formatAge(s.ageSec)} ago
              </span>
              <span
                className={`text-[11px] ${
                  s.type.startsWith("Buy")
                    ? "text-emerald-300"
                    : s.type.startsWith("Sell")
                    ? "text-rose-300"
                    : "text-slate-300"
                }`}
              >
                {s.type}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {s.amountX && s.amountY && (
                <>
                  Amounts:{" "}
                  <span className="text-slate-200">
                    {fmt(s.amountX, tokenA.decimals || 18)} {tokenA.symbol}
                  </span>
                  {" · "}
                  <span className="text-slate-200">
                    {fmt(s.amountY, tokenB.decimals || 18)} {tokenB.symbol}
                  </span>
                  {" · "}
                  Price:{" "}
                  <span className="text-slate-200">
                    {s.price ? s.price.toPrecision(6) : "-"}{" "}
                    {tokenB.symbol}/{tokenA.symbol}
                  </span>
                </>
              )}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Recipient:{" "}
              <span className="text-slate-300">
                {short(s.recipient)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

