import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ADDRESSES, SEPOLIA_CHAIN_ID } from "../config/addresses.js";
import { ROUTER_ABI } from "../abi/Router.js";
import { FACTORY_ABI } from "../abi/Factory.js";

export function useContracts() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [router, setRouter] = useState(null);
  const [factory, setFactory] = useState(null);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not detected");
      return;
    }

    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await web3Provider.getNetwork();
    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      alert("Please switch MetaMask to Sepolia");
    }

    const accounts = await web3Provider.send("eth_requestAccounts", []);
    const signer = web3Provider.getSigner();

    setProvider(web3Provider);
    setSigner(signer);
    setAccount(accounts[0]);

    const router = new ethers.Contract(ADDRESSES.ROUTER, ROUTER_ABI, signer);
    const factory = new ethers.Contract(ADDRESSES.FACTORY, FACTORY_ABI, signer);
    setRouter(router);
    setFactory(factory);
  }

  function disconnectWallet() {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setRouter(null);
    setFactory(null);
  }

  useEffect(() => {
    // No auto-connect; user uses Connect Wallet button
  }, []);

  return { provider, signer, account, router, factory, connectWallet, disconnectWallet };
}

