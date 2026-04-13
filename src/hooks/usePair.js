import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { PAIR_ABI } from "../abi/Pair.js";

export function usePair(factory, tokenA, tokenB, provider) {
  const [pairAddress, setPairAddress] = useState(null);
  const [pairContract, setPairContract] = useState(null);

  useEffect(() => {
    if (!factory || !tokenA || !tokenB) return;
    let cancelled = false;
    async function load() {
      try {
        const pair = await factory.getPair(tokenA, tokenB);
        if (!cancelled) {
          setPairAddress(pair !== ethers.constants.AddressZero ? pair : null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setPairAddress(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [factory, tokenA, tokenB]);

  useEffect(() => {
    if (!provider || !pairAddress) {
      setPairContract(null);
      return;
    }
    const c = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    setPairContract(c);
  }, [provider, pairAddress]);

  return { pairAddress, pairContract };
}

