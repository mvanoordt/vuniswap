import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ERC20_ABI } from "../abi/ERC20.js";
import { ADDRESSES } from "../config/addresses.js";

function fmt(amount, decimals = 18) {
  try {
    return ethers.utils.formatUnits(amount, decimals);
  } catch {
    return "0";
  }
}

export function AddLiquidity({
  provider,
  signer,
  account,
  router,
  tokenA,
  tokenB,
  poolInfo
}) {
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [busy, setBusy] = useState(false);
  const [balA, setBalA] = useState(null);
  const [balB, setBalB] = useState(null);
  const [txHash, setTxHash] = useState(null);

  useEffect(() => {
    if (!provider || !account || !tokenA?.address || !tokenB?.address) return;
    let cancelled = false;
    async function load() {
      try {
        const [ba, bb] = await Promise.all([
          tokenA.isNative
            ? provider.getBalance(account)
            : new ethers.Contract(tokenA.address, ERC20_ABI, provider).balanceOf(
                account
              ),
          tokenB.isNative
            ? provider.getBalance(account)
            : new ethers.Contract(tokenB.address, ERC20_ABI, provider).balanceOf(
                account
              )
        ]);
        if (!cancelled) {
          setBalA(ba);
          setBalB(bb);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [provider, account, tokenA, tokenB]);

  async function doAdd() {
    if (!router || !signer || !tokenA?.address || !tokenB?.address || !amountA || !amountB)
      return;
    setBusy(true);
    setTxHash(null);
    try {
      const amountAWei = ethers.utils.parseUnits(amountA, tokenA.decimals || 18);
      const amountBWei = ethers.utils.parseUnits(amountB, tokenB.decimals || 18);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      let tx;
      if (tokenA.isNative && !tokenB.isNative) {
        const token = new ethers.Contract(tokenB.address, ERC20_ABI, signer);
        const allow = await token.allowance(account, ADDRESSES.ROUTER);
        if (allow.lt(amountBWei)) {
          const txA = await token.approve(
            ADDRESSES.ROUTER,
            ethers.constants.MaxUint256
          );
          await txA.wait();
        }
        tx = await router.addLiquidityETH(
          tokenB.address,
          amountBWei,
          0,
          0,
          account,
          deadline,
          { value: amountAWei }
        );
      } else if (!tokenA.isNative && tokenB.isNative) {
        const token = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
        const allow = await token.allowance(account, ADDRESSES.ROUTER);
        if (allow.lt(amountAWei)) {
          const txA = await token.approve(
            ADDRESSES.ROUTER,
            ethers.constants.MaxUint256
          );
          await txA.wait();
        }
        tx = await router.addLiquidityETH(
          tokenA.address,
          amountAWei,
          0,
          0,
          account,
          deadline,
          { value: amountBWei }
        );
      } else {
        const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
        const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);
        const [allowA, allowB] = await Promise.all([
          tokenAContract.allowance(account, ADDRESSES.ROUTER),
          tokenBContract.allowance(account, ADDRESSES.ROUTER)
        ]);
        if (allowA.lt(amountAWei)) {
          const txA = await tokenAContract.approve(
            ADDRESSES.ROUTER,
            ethers.constants.MaxUint256
          );
          await txA.wait();
        }
        if (allowB.lt(amountBWei)) {
          const txB = await tokenBContract.approve(
            ADDRESSES.ROUTER,
            ethers.constants.MaxUint256
          );
          await txB.wait();
        }
        tx = await router.addLiquidity(
          tokenA.address,
          tokenB.address,
          amountAWei,
          amountBWei,
          0,
          0,
          account,
          deadline
        );
      }
      setTxHash(tx.hash);
      await tx.wait();
    } catch (e) {
      console.error(e);
      alert(e?.error?.message || e.message || "Add liquidity failed");
    } finally {
      setBusy(false);
    }
  }

  const priceInfo =
    poolInfo && tokenA && tokenB
      ? `Pool price: 1 ${tokenA.symbol} ≈ ${
          poolInfo.reserveA && !poolInfo.reserveA.isZero()
            ? Number(
                ethers.utils.formatUnits(
                  poolInfo.reserveB
                    .mul(ethers.BigNumber.from(10).pow(18))
                    .div(poolInfo.reserveA),
                  18
                )
              ).toPrecision(6)
            : "-"
        } ${tokenB.symbol}`
      : null;

  return (
    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="section-label">Add liquidity</div>
        <div className="text-[11px] text-slate-400">
          X:{" "}
          {balA
            ? `${fmt(balA, tokenA?.decimals || 18)} ${tokenA?.symbol || "X"}`
            : "-"}{" "}
          · Y:{" "}
          {balB
            ? `${fmt(balB, tokenB?.decimals || 18)} ${tokenB?.symbol || "Y"}`
            : "-"}
        </div>
      </div>
      {priceInfo && <div className="mb-2 text-[11px] text-slate-500">{priceInfo}</div>}
      <input
        type="number"
        min="0"
        value={amountA}
        onChange={(e) => setAmountA(e.target.value)}
        placeholder={`Amount ${tokenA?.symbol || "Token X"}`}
        className="mb-2 w-full ios-input"
      />
      <input
        type="number"
        min="0"
        value={amountB}
        onChange={(e) => setAmountB(e.target.value)}
        placeholder={`Amount ${tokenB?.symbol || "Token Y"}`}
        className="mb-3 w-full ios-input"
      />
      <button
        onClick={doAdd}
        disabled={busy}
        className="w-full ios-button"
      >
        {busy ? "Adding…" : "Confirm Add Liquidity"}
      </button>

      {txHash && (
        <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-[11px] text-emerald-100">
          <div className="font-semibold mb-1">Liquidity added</div>
          <div className="mb-1">
            Your liquidity transaction has been sent to the Sepolia network.
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

