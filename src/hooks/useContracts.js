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
      console.warn("Not on Sepolia; auto-switch effect will try to correct this.");
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

  // Auto-connect if MetaMask already authorized
  useEffect(() => {
    async function tryAutoConnect() {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts"
        });
        if (accounts && accounts.length > 0) {
          await connectWallet();
        }
      } catch (e) {
        console.error("Auto-connect failed:", e);
      }
    }
    tryAutoConnect();
  }, []);

  // Auto-switch to Sepolia (and auto-add if missing)
  useEffect(() => {
    async function ensureSepolia() {
      if (!window.ethereum) return;

      try {
        const chainId = await window.ethereum.request({ method: "eth_chainId" });

        if (chainId === "0xaa36a7") return; // already Sepolia

        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xaa36a7",
                  chainName: "Sepolia Test Network",
                  nativeCurrency: {
                    name: "Sepolia ETH",
                    symbol: "ETH",
                    decimals: 18
                  },
                  rpcUrls: ["https://rpc.sepolia.org"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"]
                }
              ]
            });
          } catch (addError) {
            console.error("Failed to add Sepolia:", addError);
          }
        } else {
          console.error("Failed to switch network:", switchError);
        }
      }
    }

    ensureSepolia();
  }, []);

  return { provider, signer, account, router, factory, connectWallet, disconnectWallet };
}

