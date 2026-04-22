import { useEffect, useState } from "react";

export function usePoolInfo(pairContract, tokenA, tokenB) {
  const [info, setInfo] = useState(null);

  async function load() {
    if (!pairContract || !tokenA || !tokenB) {
      setInfo(null);
      return;
    }
    try {
      const [token0, token1] = await Promise.all([
        pairContract.token0(),
        pairContract.token1()
      ]);
      const { reserve0, reserve1 } = await pairContract.getReserves();
      let reserveA, reserveB;
      if (tokenA.toLowerCase() === token0.toLowerCase()) {
        reserveA = reserve0;
        reserveB = reserve1;
      } else {
        reserveA = reserve1;
        reserveB = reserve0;
      }
      setInfo({ reserveA, reserveB });
    } catch (e) {
      console.error(e);
      setInfo(null);
    }
  }

  useEffect(() => {
    load();
  }, [pairContract, tokenA, tokenB]);

  useEffect(() => {
    if (!pairContract || !tokenA || !tokenB) return;
    const interval = setInterval(() => {
      load();
    }, 3000);
    return () => clearInterval(interval);
  }, [pairContract, tokenA, tokenB]);

  return info;
}

