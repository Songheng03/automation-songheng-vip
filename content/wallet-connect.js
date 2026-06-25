/**
 * my-automaton Wallet Connector
 * Connect Web3 wallet and pay for AI services via x402.
 * MetaMask, Coinbase Wallet, WalletConnect support.
 */
(function() {
  'use strict';

  const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
  const CHAIN_ID = 8453; // Base mainnet
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const USDC_DECIMALS = 6;
  const SERVER = 'http://automation.songheng.vip:8080';

  class WalletPay {
    constructor() {
      this.provider = null;
      this.signer = null;
      this.address = null;
      this.connected = false;
      this.listeners = {};
    }

    /** Check if MetaMask or other EIP-1193 provider is available */
    async isAvailable() {
      return typeof window !== 'undefined' && window.ethereum !== undefined;
    }

    /** Connect wallet */
    async connect() {
      if (!await this.isAvailable()) {
        throw new Error('No Web3 wallet detected. Install MetaMask or Coinbase Wallet.');
      }

      this.provider = window.ethereum;
      
      try {
        const accounts = await this.provider.request({ method: 'eth_requestAccounts' });
        this.address = accounts[0].toLowerCase();
        this.connected = true;
        
        // Check we're on Base
        const chainId = await this.provider.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== CHAIN_ID) {
          try {
            await this.provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              await this.provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x' + CHAIN_ID.toString(16),
                  chainName: 'Base',
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org'],
                }],
              });
            } else {
              throw switchError;
            }
          }
        }

        // Listen for account changes
        this.provider.on('accountsChanged', (accounts) => {
          this.address = accounts[0]?.toLowerCase() || null;
          this.connected = !!accounts[0];
          this._emit('accountsChanged', this.address);
        });

        this._emit('connected', this.address);
        return this.address;
      } catch (err) {
        this.connected = false;
        throw err;
      }
    }

    /** Disconnect wallet */
    disconnect() {
      this.address = null;
      this.connected = false;
      this._emit('disconnected');
    }

    /** Get USDC balance of connected wallet */
    async getBalance() {
      if (!this.connected || !this.provider) return 0;
      
      const abi = [{
        'constant': true,
        'inputs': [{'name': '_owner', 'type': 'address'}],
        'name': 'balanceOf',
        'outputs': [{'name': 'balance', 'type': 'uint256'}],
        'type': 'function',
      }];

      // Use ethers if available, otherwise raw call
      if (window.ethers) {
        const provider = new window.ethers.BrowserProvider(this.provider);
        const contract = new window.ethers.Contract(USDC, abi, provider);
        const balance = await contract.balanceOf(this.address);
        return Number(balance) / Math.pow(10, USDC_DECIMALS);
      }

      // Raw eth_call
      const data = '0x70a08231' + this.address.slice(2).padStart(64, '0');
      const result = await this.provider.request({
        method: 'eth_call',
        params: [{ to: USDC, data }, 'latest'],
      });
      return parseInt(result, 16) / Math.pow(10, USDC_DECIMALS);
    }

    /** Pay for a service: sends USDC and returns tx hash */
    async pay(amountCents) {
      if (!this.connected || !this.provider) {
        throw new Error('Wallet not connected. Call connect() first.');
      }

      const amountWei = BigInt(Math.round(amountCents * 10000)); // cents → USDC (6 decimals) * 10000

      // ERC-20 transfer ABI
      const transferData = '0xa9059cbb' + 
        WALLET.slice(2).padStart(64, '0') +
        amountWei.toString(16).padStart(64, '0');

      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.address,
          to: USDC,
          data: transferData,
          chainId: '0x' + CHAIN_ID.toString(16),
        }],
      });

      this._emit('paymentSent', { txHash, amount: amountCents });
      return txHash;
    }

    /** Call an x402 endpoint with automatic payment handling */
    async callService(service, body) {
      // First try without payment (free tier)
      const url = `${SERVER}/v1/${service}`;
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        return { ...await res.json(), _free: true };
      }

      if (res.status === 402) {
        const paymentInfo = await res.json();
        
        if (!this.connected) {
          return { 
            _needsPayment: true, 
            ...paymentInfo,
            _message: 'Payment required. Click "Connect Wallet" and try again.',
          };
        }

        // Pay and retry
        const txHash = await this.pay(paymentInfo.costCents);

        // Wait for transaction confirmation
        await this._waitForTx(txHash);

        const paidRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-X402-Payment': txHash,
          },
          body: JSON.stringify(body),
        });

        if (!paidRes.ok) {
          const err = await paidRes.json();
          throw new Error(err.error || 'Payment verification failed');
        }

        return { ...await paidRes.json(), _paid: true, _txHash: txHash };
      }

      throw new Error(`HTTP ${res.status}: ${(await res.json()).error || 'Unknown error'}`);
    }

    /** Wait for transaction confirmation */
    async _waitForTx(txHash, maxWait = 30000) {
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        const receipt = await this.provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        if (receipt && receipt.status === '0x1') return true;
        if (receipt && receipt.status === '0x0') throw new Error('Transaction failed');
        await new Promise(r => setTimeout(r, 1000));
      }
      throw new Error('Transaction confirmation timeout');
    }

    /** Event listener */
    on(event, callback) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(callback);
      return () => {
        this.listeners[event] = this.listeners[event].filter(c => c !== callback);
      };
    }

    _emit(event, data) {
      (this.listeners[event] || []).forEach(cb => cb(data));
    }
  }

  // Expose globally
  window.WalletPay = WalletPay;
  window.walletPay = new WalletPay();
})();
