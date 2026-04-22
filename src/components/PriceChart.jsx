import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  CartesianGrid
} from "recharts";
import { ethers } from "ethers";

function formatTime(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}

export function PriceChart({ pairContract, tokenA, tokenB, provider, range }) {
  const [data, setData] = useState([]);
  const [lastBlock, setLastBlock] = useState(null);
  const [loading, setLoading] = useState(false);

  async function convertEventsToPoints(events) {
    if (!pairContract || !provider || !tokenA || !tokenB) return [];

    const token0 = await pairContract.token0();
    const token1 = await pairContract.token1();

    const tokenXAddr = tokenA.address.toLowerCase();
    const tokenYAddr = tokenB.address.toLowerCase();

    const token0IsX = token0.toLowerCase() === tokenXAddr;
    const token1IsX = token1.toLowerCase() === tokenXAddr;
    const token0IsY = token0.toLowerCase() === tokenYAddr;
    const token1IsY = token1.toLowerCase() === tokenYAddr;

    const points = [];

    for (const ev of events) {
      const block = await provider.getBlock(ev.blockNumber);
      const ts = block.timestamp;

      const { amount0In, amount1In, amount0Out, amount1Out } = ev.args;

      let amountX = token0IsX
        ? amount0In.gt(0)
          ? amount0In
          : amount0Out
        : amount1In.gt(0)
        ? amount1In
        : amount1Out;

      let amountY = token0IsY
        ? amount0In.gt(0)
          ? amount0In
          : amount0Out
        : amount1In.gt(0)
        ? amount1In
        : amount1Out;

      if (!amountX || !amountY || amountX.isZero() || amountY.isZero()) continue;

      const priceBN = amountY
        .mul(ethers.BigNumber.from(10).pow(18))
        .div(amountX);
      const price = Number(ethers.utils.formatUnits(priceBN, 18));
      if (!price || !isFinite(price)) continue;

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

      let marker = null;
      if (isBuyTokenX) marker = "buy";
      else if (isSellTokenX) marker = "sell";

      points.push({
        time: ts,
        price,
        marker
      });
    }

    return points;
  }

  async function initialLoad() {
    if (!pairContract || !provider || !tokenA || !tokenB) return;

    setLoading(true);
    try {
      const latest = await provider.getBlockNumber();

      const avgBlockTime = 12; // seconds, approximate for Sepolia
      let fromBlock = 0;

      if (range.days !== null) {
        const blocksBack = Math.floor((range.days * 86400) / avgBlockTime);
        fromBlock = Math.max(latest - blocksBack, 0);
      }

      const events = await pairContract.queryFilter("Swap", fromBlock, latest);
      const points = await convertEventsToPoints(events);

      points.sort((a, b) => a.time - b.time);

      setData(points);
      setLastBlock(latest);
    } catch (e) {
      console.error("Initial load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function incrementalUpdate() {
    if (!pairContract || !provider || !tokenA || !tokenB || lastBlock === null)
      return;

    try {
      const latest = await provider.getBlockNumber();
      if (latest <= lastBlock) return;

      const newEvents = await pairContract.queryFilter(
        "Swap",
        lastBlock + 1,
        latest
      );

      const newPoints = await convertEventsToPoints(newEvents);

      setData((prev) => [...prev, ...newPoints]);
      setLastBlock(latest);
    } catch (e) {
      console.error("Incremental update error:", e);
    }
  }

  useEffect(() => {
    initialLoad();
  }, [pairContract, tokenA, tokenB, provider, range]);

  useEffect(() => {
    if (!pairContract || !tokenA || !tokenB || !provider) return;
    const interval = setInterval(() => {
      incrementalUpdate();
    }, 30000);
    return () => clearInterval(interval);
  }, [pairContract, tokenA, tokenB, provider, lastBlock, range]);

  const buyPoints = data.filter((d) => d.marker === "buy");
  const sellPoints = data.filter((d) => d.marker === "sell");

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-100">
          Transaction price
        </div>
        {loading && (
          <div className="text-[11px] text-slate-400">Updating…</div>
        )}
      </div>

      <div className="w-full h-64 rounded-xl bg-slate-950/80 border border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />

            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={["auto", "auto"]}
              tickFormatter={(t) =>
                new Date(t * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              }
              stroke="#64748b"
              tick={{ fontSize: 10 }}
              minTickGap={20}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 10 }}
              domain={["auto", "auto"]}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #334155",
                fontSize: "11px",
                color: "#e5e7eb"
              }}
              labelFormatter={(t) => formatTime(t)}
              formatter={(value) => [
                value.toPrecision ? value.toPrecision(6) : value,
                `${tokenB.symbol}/${tokenA.symbol}`
              ]}
            />

            <Line
              type="monotone"
              dataKey="price"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            <Scatter
              data={buyPoints}
              dataKey="price"
              fill="#22c55e"
              shape="circle"
            />
            <Scatter
              data={sellPoints}
              dataKey="price"
              fill="#ef4444"
              shape="circle"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

