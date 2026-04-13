import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TOKEN_LIST } from "../config/tokenList.js";
import { ERC20_ABI } from "../abi/ERC20.js";
import { discoverWalletTokens } from "../hooks/discoverTokens.js";
import { ADDRESSES } from "../config/addresses.js";

export function TokenSelector({ label, token, setToken, provider, account }) {
  const [manualAddress, setManualAddress] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [info, setInfo] = useState(null);
  const [walletTokens, setWalletTokens] = useState([]);

  const ETH_TOKEN = {
    symbol: "ETH",
    address: ADDRESSES.WETH,
    isNative: true,
    decimals: 18
  };

  useEffect(() => {
    async function load() {
      if (!provider || !account) return;
      const tokens = await discoverWalletTokens(provider, account);
      const staticAddresses = new Set(
        [ADDRESSES.WETH, ...TOKEN_LIST.map((t) => t.address)].map((a) =>
          a.toLowerCase()
        )
      );
      const filtered = tokens.filter(
        (t) => !staticAddresses.has(t.address.toLowerCase())
      );
      setWalletTokens(filtered.map((t) => ({ ...t, isNative: false })));
    }
    load();
  }, [provider, account]);

  async function loadTokenInfo(addr) {
    if (!provider || !ethers.utils.isAddress(addr)) return;
    setLoadingInfo(true);
    try {
      const c = new ethers.Contract(addr, ERC20_ABI, provider);
      const [name, symbol, decimals] = await Promise.all([
        c.name(),
        c.symbol(),
        c.decimals()
      ]);
      setInfo({ name, symbol, decimals });
      setToken({ address: addr, symbol, decimals, isNative: false });
    } catch (e) {
      console.error(e);
      setInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  }

  const staticTokens = TOKEN_LIST.map((t) => ({
    ...t,
    isNative: false,
    decimals: t.decimals ?? 18
  }));
  const allTokens = [ETH_TOKEN, ...walletTokens, ...staticTokens];

  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        {token && <span className="text-slate-500">{token.symbol}</span>}
      </div>

      <select
        value={token?.address || ""}
        onChange={(e) => {
          const addr = e.target.value;
          if (!addr) return;
          const t = allTokens.find((x) => x.address === addr);
          if (t) setToken(t);
        }}
        className="mb-2 w-full ios-input"
      >
        <option value="">Select from list…</option>
        {allTokens.map((t) => (
          <option key={t.address} value={t.address}>
            {t.symbol === "ETH" ? "ETH (native)" : t.symbol} (
            {t.address.slice(0, 6)}…{t.address.slice(-4)})
          </option>
        ))}
      </select>

      <div className="mb-1 text-[11px] text-slate-500">Or enter token address:</div>
      <div className="flex gap-2">
        <input
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          placeholder="0x…"
          className="flex-1 ios-input"
        />
        <button
          onClick={() => loadTokenInfo(manualAddress)}
          className="ios-button"
        >
          Load
        </button>
      </div>
      {loadingInfo && (
        <div className="mt-1 text-[11px] text-slate-400">Loading token info…</div>
      )}
      {info && (
        <div className="mt-1 text-[11px] text-slate-400">
          {info.name} ({info.symbol}), decimals: {info.decimals}
        </div>
      )}
    </div>
  );
}

