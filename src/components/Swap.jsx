import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ERC20_ABI } from "../abi/ERC20.js";
import { ADDRESSES } from "../config/addresses.js";

function fmt(amount, decimals = 18) {
  try { return ethers.utils.formatUnits(amount, decimals); }
  catch { return "0"; }
}

export function Swap({
  provider,
  signer,
  account,
  router,
  tokenA,
  tokenB,
  slippage,
  poolInfo
}) {
  const [amountIn, setAmountIn] = useState("");
  const [estimOut, setEstimOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [priceImpact, setPriceImpact] = useState(null);

  async function estimate() {
    if (!router || !tokenA?.address || !tokenB?.address || !amountIn) {
      setEstimOut(null);
      setPriceImpact(null);
      return;
    }
    try {
      const amountInWei = ethers.utils.parseUnits(
        amountIn || "0",
        tokenA.decimals || 18
      );
      if (amountInWei.isZero()) {
        setEstimOut(null);
        setPriceImpact(null);
        return;
      }

      const path = [tokenA.address, tokenB.address];
      const amounts = await router.getAmountsOut(amountInWei, path);
      const out = amounts[amounts.length - 1];
      setEstimOut(out);

      if (
        poolInfo &&
        poolInfo.reserveA &&
        poolInfo.reserveB &&
        !poolInfo.reserveA.isZero() &&
        !out.isZero()
      ) {
        const poolPrice = poolInfo.reserveB
          .mul(ethers.BigNumber.from(10).pow(18))
          .div(poolInfo.reserveA);

        const userPrice = out
          .mul(ethers.BigNumber.from(10).pow(18))
          .div(amountInWei);

        const diff = userPrice.sub(poolPrice);
        const slippagePct =
          diff.mul(10000).div(poolPrice).toNumber() / 100;

        setPriceImpact(slippagePct);
      } else {
        setPriceImpact(null);
      }
    } catch (e) {
      console.error(e);
      setEstimOut(null);
      setPriceImpact(null);
    }
  }

  useEffect(() => {
    estimate();
  }, [amountIn, tokenA, tokenB, router, poolInfo]);

  async function doSwap() {
    if (!router || !signer || !tokenA?.address || !tokenB?.address || !amountIn)
      return;

    setBusy(true);
    setTxHash(null);

    try {
      if (
        priceImpact !== null &&
        (priceImpact > slippage || priceImpact < -slippage)
      ) {
        alert(
          `Price impact (${priceImpact.toFixed(
            1
          )}%) exceeds your slippage tolerance (${slippage}%).`
        );
        setBusy(false);
        return;
      }

      const amountInWei = ethers.utils.parseUnits(
        amountIn,
        tokenA.decimals || 18
      );
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      let amountOutMin = 0;
      if (estimOut && slippage < 100) {
        const factor = 100 - slippage;
        amountOutMin = estimOut.mul(factor).div(100);
      }

      let tx;
      if (tokenA.isNative && !tokenB.isNative) {
        const path = [ADDRESSES.WETH, tokenB.address];
        tx = await router.swapExactETHForTokens(
          amountOutMin,
          path,
          account,
          deadline,
          { value: amountInWei }
        );
      } else if (!tokenA.isNative && tokenB.isNative) {
        const path = [tokenA.address, ADDRESSES.WETH];
        const token = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
        const allowance = await token.allowance(account, ADDRESSES.ROUTER);
        if (allowance.lt(amountInWei)) {
          const tx1 = await token.approve(
            ADDRESSES.ROUTER,
            ethers.constants.MaxUint256
          );
          await tx1.wait();
        }
        tx = await router.swapExactTokensForETH(
          amountInWei,
          amountOutMin,
          path,
          account,
          deadline
        );
      } else {
        const path = [tokenA.address, tokenB.address];
        const token = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
        const allowance = await token.allowance(account, ADDRESSES.ROUTER);
        if (allowance.lt(amountInWei)) {
          const tx1 = await token.approve(
            ADDRESSES.ROUTER,
            ethers.constants.MaxUint256
          );
          await tx1.wait();
        }
        tx = await router.swapExactTokensForTokens(
          amountInWei,
          amountOutMin,
          path,
          account,
          deadline
        );
      }

      setTxHash(tx.hash);
      await tx.wait();

      setAmountIn("");
      setEstimOut(null);
      setPriceImpact(null);
    } catch (e) {
      console.error(e);
      alert(e?.error?.message || e.message || "Swap failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="section-label">Swap</div>
        <div className="text-[11px] text-slate-400">
          You send <span className="text-slate-100">{tokenA?.symbol || "Token X"}</span>
        </div>
      </div>

      <input
        type="number"
        min="0"
        value={amountIn}
        onChange={(e) => setAmountIn(e.target.value)}
        placeholder={`Amount of ${tokenA?.symbol || "Token X"} to send`}
        className="mb-3 w-full ios-input"
      />

      <div className="flex items-center justify-center my-2 text-slate-500 text-lg">
        ↓
      </div>

      <div className="mb-1 text-xs text-slate-400">
        You receive:{" "}
        <span className="text-slate-200">
          {tokenB?.symbol || "Token Y"}
        </span>
      </div>

      <div className="mb-2 text-xs text-slate-400">
        Estimated out:{" "}
        {estimOut && tokenB
          ? `${fmt(estimOut, tokenB.decimals || 18)} ${tokenB.symbol}`
          : "-"}
      </div>

      {priceImpact !== null && Math.abs(priceImpact) > 5 && (
        <div className="mb-3 rounded-xl border border-amber-500/60 bg-amber-500/10 p-2 text-[11px] text-amber-100">
          Slippage: {priceImpact.toFixed(1)}%.
        </div>
      )}

      <button
        onClick={doSwap}
        disabled={busy}
        className="w-full ios-button"
      >
        {busy ? "Swapping…" : "Confirm Swap"}
      </button>

      {txHash && (
        <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-[11px] text-emerald-100">
          <div className="font-semibold mb-1">Swap submitted</div>
          <div className="mb-1">
            Your transaction has been sent to the Sepolia network.
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="underline text-emerald-200"
          >
            View on Etherscan
          </a>
        </div>
      )}
    </div>
  );
}

