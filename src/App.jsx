import React, { useState, useEffect } from "react";
import { useContracts } from "./hooks/useContracts.js";
import { usePair } from "./hooks/usePair.js";
import { usePoolInfo } from "./hooks/usePoolInfo.js";
import { TokenSelector } from "./components/TokenSelector.jsx";
import { SlippageControl } from "./components/SlippageControl.jsx";
import { PoolInfo } from "./components/PoolInfo.jsx";
import { Swap } from "./components/Swap.jsx";
import { AddLiquidity } from "./components/AddLiquidity.jsx";
import { RemoveLiquidity } from "./components/RemoveLiquidity.jsx";
import { CreatePoolNotice } from "./components/CreatePool.jsx";
import { Activity } from "./components/Activity.jsx";

export default function App() {
  const {
    provider,
    signer,
    account,
    router,
    factory,
    connectWallet,
    disconnectWallet
  } = useContracts();

  const [tokenA, setTokenA] = useState(null);
  const [tokenB, setTokenB] = useState(null);
  const [slippage, setSlippage] = useState(50);
  const [screen, setScreen] = useState("swap");
  const [swapSession, setSwapSession] = useState(0);

  const { pairAddress, pairContract } = usePair(
    factory,
    tokenA?.address,
    tokenB?.address,
    provider
  );
  const poolInfo = usePoolInfo(pairContract, tokenA?.address, tokenB?.address);

  const [lpBalance, setLpBalance] = useState(null);
  const [lpTotalSupply, setLpTotalSupply] = useState(null);

  useEffect(() => {
    async function loadLp() {
      if (!pairContract || !account) {
        setLpBalance(null);
        setLpTotalSupply(null);
        return;
      }
      try {
        const [bal, total] = await Promise.all([
          pairContract.balanceOf(account),
          pairContract.totalSupply()
        ]);
        setLpBalance(bal);
        setLpTotalSupply(total);
      } catch (e) {
        console.error(e);
      }
    }
    loadLp();
  }, [pairContract, account]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        connectWallet();
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [connectWallet, disconnectWallet]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const sameToken =
    tokenA?.address &&
    tokenB?.address &&
    tokenA.address.toLowerCase() === tokenB.address.toLowerCase();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-6">
      <div className="card w-full max-w-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-50">VUniswap 2026</div>
          </div>
          <div>
            {account ? (
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 border border-slate-700/70">
                  {account.slice(0, 6)}…{account.slice(-4)}
                </div>
                <button
                  onClick={disconnectWallet}
                  className="ios-button text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="ios-button text-xs px-3 py-1"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {!account && (
          <div className="mb-3 text-[11px] text-slate-500">
            Wallet not connected — connect to start swapping or adding liquidity.
          </div>
        )}

        <div className="mb-4 inline-flex gap-2 rounded-full bg-slate-900/70 p-1 border border-slate-700/70">
          <button
            onClick={() => setScreen("swap")}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              screen === "swap"
                ? "bg-slate-50 text-slate-900 shadow-sm"
                : "text-slate-300"
            }`}
          >
            Swap
          </button>
          <button
            onClick={() => setScreen("liquidity")}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              screen === "liquidity"
                ? "bg-slate-50 text-slate-900 shadow-sm"
                : "text-slate-300"
            }`}
          >
            Liquidity
          </button>
          <button
            onClick={() => setScreen("activity")}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              screen === "activity"
                ? "bg-slate-50 text-slate-900 shadow-sm"
                : "text-slate-300"
            }`}
          >
            Activity
          </button>
        </div>

        <div className="space-y-3">
          <TokenSelector
            label="Token X"
            token={tokenA}
            setToken={setTokenA}
            provider={provider}
            account={account}
          />

          <button
            onClick={() => {
              const oldA = tokenA;
              setTokenA(tokenB);
              setTokenB(oldA);
              setSwapSession((s) => s + 1);
            }}
            className="mx-auto mb-1 block rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200 border border-slate-600 hover:bg-slate-700"
          >
            Switch X ↔ Y
          </button>

          <TokenSelector
            label="Token Y"
            token={tokenB}
            setToken={setTokenB}
            provider={provider}
            account={account}
          />

          {screen === "swap" && sameToken && tokenA && tokenB && (
            <div className="mt-2 text-center text-xs text-slate-500">
              Select two different tokens to swap.
            </div>
          )}

          {screen === "swap" && !sameToken && tokenA && tokenB && (
            <>
              <SlippageControl slippage={slippage} setSlippage={setSlippage} />

              <PoolInfo
                poolInfo={poolInfo}
                tokenA={tokenA}
                tokenB={tokenB}
                lpBalance={lpBalance}
                lpTotalSupply={lpTotalSupply}
              />

              <Swap
                key={swapSession}
                provider={provider}
                signer={signer}
                account={account}
                router={router}
                tokenA={tokenA}
                tokenB={tokenB}
                slippage={slippage}
                poolInfo={poolInfo}
              />
            </>
          )}

          {screen === "liquidity" && tokenA && tokenB && (
            <>
              <CreatePoolNotice
                pairAddress={pairAddress}
                tokenA={tokenA}
                tokenB={tokenB}
              />

              <PoolInfo
                poolInfo={poolInfo}
                tokenA={tokenA}
                tokenB={tokenB}
                lpBalance={lpBalance}
                lpTotalSupply={lpTotalSupply}
              />

              <AddLiquidity
                provider={provider}
                signer={signer}
                account={account}
                router={router}
                tokenA={tokenA}
                tokenB={tokenB}
                poolInfo={poolInfo}
              />

              <RemoveLiquidity
                provider={provider}
                signer={signer}
                account={account}
                router={router}
                pairAddress={pairAddress}
                tokenA={tokenA}
                tokenB={tokenB}
              />
            </>
          )}

          {screen === "activity" && (
            <Activity
              pairContract={pairContract}
              tokenA={tokenA}
              tokenB={tokenB}
              provider={provider}
            />
          )}

          {(!tokenA || !tokenB) && (
            <div className="mt-4 text-center text-xs text-slate-500">
              Select Token X and Token Y to view pool info, swap, liquidity, and activity data.
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 text-[9px] text-center text-slate-600">
        Disclaimer: Educational platform on the Ethereum Sepolia testnet.
      </div>
    </div>
  );
}
