import { ethers } from "ethers";
import { ERC20_ABI } from "../abi/ERC20.js";

export async function discoverWalletTokens(provider, account) {
  if (!provider || !account) return [];
  try {
    const erc20TransferTopic = ethers.utils.id("Transfer(address,address,uint256)");
    const logs = await provider.getLogs({
      fromBlock: 0,
      toBlock: "latest",
      topics: [erc20TransferTopic, null, null]
    });
    const tokenAddresses = new Set();
    for (const log of logs) {
      if (log.address) tokenAddresses.add(log.address);
    }
    const tokens = [];
    for (const addr of tokenAddresses) {
      try {
        const c = new ethers.Contract(addr, ERC20_ABI, provider);
        const [symbol, decimals] = await Promise.all([c.symbol(), c.decimals()]);
        tokens.push({ address: addr, symbol, decimals });
      } catch {}
    }
    return tokens;
  } catch (e) {
    console.error("Token discovery failed:", e);
    return [];
  }
}

