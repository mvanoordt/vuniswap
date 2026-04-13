import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ERC20_ABI } from "../abi/ERC20.js";
import { ADDRESSES } from "../config/addresses.js";
import { PAIR_ABI } from "../abi/Pair.js";

function fmt(amount, decimals = 18) {
  try {
    return ethers.utils.formatUnits(amount, decimals);
  } catch {
    return "0";
  }
}

export function RemoveLiquidity({
  provider,
  signer,
  account,
  router,
  pairAddress,
  tokenA,
  tokenB
}) {
  const [lpBalance, setLpBalance] = useState(null);
  const [lpTotalSupply, setLpTotalSupply] = useState(null);
  const [percent, setPercent] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!provider || !pairAddress || !account) {
      setLpBalance(null);
      setLpTotalSupply(null);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const lp = new ethers.Contract(pairAddress, PAIR_ABI, provider);
        const [bal, total] = await Promise.all([
          lp.balanceOf(account),
          lp.totalSupply()
        ]);
        if (!cancelled) {
          setLpBalance(bal);
          setLpTotalSupply(total);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [provider, pairAddress, account]);

  async function doRemove() {
    if (!router || !signer || !pairAddress || !lpBalance || !lpTotalSupply) return;
    if (percent <= 0) return;
    setBusy(true);
    try {
      const lpToBurn = lpBalance.mul(percent).div(100);
      const lpToken = new ethers.Contract(pairAddress, ERC20_ABI, signer);
      const allowance = await lpToken.allowance(account, ADDRESSES.ROUTER);
      if (allowance.lt(lpToBurn)) {
        const txA = await lpToken.approve(
          ADDRESSES.ROUTER,
          ethers.constants.MaxUint256
        );
        await txA.wait();
      }

      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      let tx;
      if (tokenA.isNative && !tokenB.isNative) {
        tx = await router.removeLiquidityETH(
          tokenB.address,
          lpToBurn,
          0,
          0,
          account,
          deadline
        );
      } else if (!tokenA.isNative && tokenB.isNative) {
        tx = await router.removeLiquidityETH(
          tokenA.address,
          lpToBurn,
          0,
          0,
          account,
          deadline
        );
      } else {
        tx = await router.removeLiquidity(
          tokenA.address,
          tokenB.address,
          lpToBurn,
          0,
          0,
          account,
          deadline
        );
      }
      await tx.wait();
      alert("Liquidity removed");
    } catch (e) {
      console.error(e);
      alert(e?.error?.message || e.message || "Remove liquidity failed");
    } finally {
      setBusy(false);
    }
  }

  let share = null;
  if (lpBalance && lpTotalSupply && !lpTotalSupply.isZero()) {
    share = lpBalance.mul(10000).div(lpTotalSupply).toNumber() / 100;
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="mb-2 text-sm font-semibold text-slate-100">Remove Liquidity</div>
      {!pairAddress ? (
        <div className="text-xs text-slate-500">No pool exists yet for this pair.</div>
      ) : (
        <>
          <div className="mb-1 text-xs text-slate-400">
            LP balance: {lpBalance ? fmt(lpBalance, 18) : "-"}
          </div>
          {share !== null && (
            <div className="mb-2 text-xs text-slate-400">
              Your pool share: {share.toFixed(4)}%
            </div>
          )}
          <label className="text-xs text-slate-400">Percentage to remove (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value) || 0)}
            className="mb-3 mt-1 w-full ios-input"
          />
          <button
            onClick={doRemove}
            disabled={busy || percent <= 0}
            className="w-full ios-button"
          >
            {busy ? "Removing…" : "Remove Liquidity"}
          </button>
        </>
      )}
    </div>
  );
}

