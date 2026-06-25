#!/usr/bin/env python3
"""
x402_verifier.py — USDC payment verification for my-automaton
Verifies on-chain USDC transfers on Base chain via public RPC.
No private keys needed — just read the blockchain.
"""

import json, os, time, hmac, hashlib, re
from urllib.request import Request, urlopen
from urllib.error import URLError

# Base chain RPC endpoints (public)
BASE_RPCS = [
    "https://mainnet.base.org",
    "https://base.llamarpc.com",
    "https://base-rpc.publicnode.com",
]

# USDC contract on Base
USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # Base USDC

# My wallet
MY_WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"

# Cache verified payments to avoid re-checking
PAYMENT_CACHE_FILE = "/root/automaton/ecosystem_data/verified_payments.json"
def load_cache():
    try:
        with open(PAYMENT_CACHE_FILE) as f: return json.load(f)
    except: return {}
def save_cache(cache):
    os.makedirs(os.path.dirname(PAYMENT_CACHE_FILE), exist_ok=True)
    with open(PAYMENT_CACHE_FILE, 'w') as f: json.dump(cache, f, indent=2)

def json_rpc(method, params, rpc_url=None):
    """Call Ethereum JSON-RPC endpoint."""
    if rpc_url is None:
        rpc_url = BASE_RPCS[0]
    
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params
    }).encode()
    
    req = Request(rpc_url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def get_transaction_receipt(tx_hash):
    """Get transaction receipt for a given tx hash."""
    result = json_rpc("eth_getTransactionReceipt", [tx_hash])
    return result.get("result")

def get_transaction(tx_hash):
    """Get transaction details."""
    result = json_rpc("eth_getTransactionByHash", [tx_hash])
    return result.get("result")

def decode_transfer_log(log):
    """Decode ERC-20 Transfer event log.
    Transfer(address indexed from, address indexed to, uint256 value)
    Topic0: keccak256("Transfer(address,address,uint256)")
    """
    if not log or len(log.get("topics", [])) < 3:
        return None
    
    # Check if this is a Transfer event
    transfer_topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    if log.get("topics", [])[0].lower() != transfer_topic:
        return None
    
    from_addr = "0x" + log["topics"][1][-40:]
    to_addr = "0x" + log["topics"][2][-40:]
    value_hex = log.get("data", "0x0")
    
    # Convert hex value to decimal (USDC has 6 decimals)
    try:
        value_wei = int(value_hex, 16)
        value_usdc = value_wei / 1_000_000  # USDC has 6 decimals
    except:
        value_usdc = 0
    
    return {
        "from": from_addr,
        "to": to_addr,
        "value_raw": value_hex,
        "value_usdc": value_usdc
    }

def verify_usdc_transfer(tx_hash, expected_sender=None, min_amount_cents=1):
    """
    Verify a USDC transfer on Base chain.
    
    Args:
        tx_hash: Transaction hash (0x-prefixed hex string)
        expected_sender: Optional wallet address that should have sent the payment
        min_amount_cents: Minimum amount in cents (e.g., 1 = $0.01)
    
    Returns:
        dict with verification result
    """
    # Normalize tx hash
    tx_hash = tx_hash.strip()
    if not tx_hash.startswith("0x"):
        tx_hash = "0x" + tx_hash
    
    # Check cache first
    cache = load_cache()
    if tx_hash in cache:
        cached = cache[tx_hash]
        if time.time() - cached.get("verified_at", 0) < 86400:  # 24h cache
            return cached
    
    # Try multiple RPC endpoints
    last_error = None
    for rpc_url in BASE_RPCS:
        # Get transaction receipt
        receipt = get_transaction_receipt(tx_hash)
        if not receipt:
            continue
        
        # Check if transaction succeeded
        if receipt.get("status") != "0x1":
            last_error = "Transaction failed or still pending"
            continue
        
        # Check if it's a transaction to USDC contract
        tx = get_transaction(tx_hash)
        if not tx:
            continue
        
        tx_to = tx.get("to", "").lower()
        usdc_addr = USDC_ADDRESS.lower()
        
        if tx_to == usdc_addr:
            # It's a direct USDC transfer
            # Parse the logs
            logs = receipt.get("logs", [])
            for log in logs:
                decoded = decode_transfer_log(log)
                if decoded:
                    # Check this is to my wallet
                    if decoded["to"].lower() != MY_WALLET.lower():
                        # This log isn't sending to me, but there might be other logs
                        continue
                    
                    # Check sender if specified
                    if expected_sender and decoded["from"].lower() != expected_sender.lower():
                        continue
                    
                    # Check amount
                    min_amount = min_amount_cents / 100.0
                    if decoded["value_usdc"] < min_amount:
                        continue
                    
                    # VERIFIED!
                    result = {
                        "verified": True,
                        "tx_hash": tx_hash,
                        "from": decoded["from"],
                        "to": decoded["to"],
                        "amount_usdc": decoded["value_usdc"],
                        "amount_cents": int(decoded["value_usdc"] * 100),
                        "min_amount_cents": min_amount_cents,
                        "verified_at": time.time(),
                        "rpc": rpc_url,
                        "block_number": int(receipt.get("blockNumber", "0x0"), 16),
                    }
                    cache[tx_hash] = result
                    save_cache(cache)
                    return result
        
        # Check if transaction interacted with USDC via logs
        logs = receipt.get("logs", [])
        for log in logs:
            if log.get("address", "").lower() == usdc_addr:
                decoded = decode_transfer_log(log)
                if decoded and decoded["to"].lower() == MY_WALLET.lower():
                    min_amount = min_amount_cents / 100.0
                    if decoded["value_usdc"] >= min_amount:
                        if not expected_sender or decoded["from"].lower() == expected_sender.lower():
                            result = {
                                "verified": True,
                                "tx_hash": tx_hash,
                                "from": decoded["from"],
                                "to": decoded["to"],
                                "amount_usdc": decoded["value_usdc"],
                                "amount_cents": int(decoded["value_usdc"] * 100),
                                "min_amount_cents": min_amount_cents,
                                "verified_at": time.time(),
                                "rpc": rpc_url,
                                "block_number": int(receipt.get("blockNumber", "0x0"), 16),
                            }
                            cache[tx_hash] = result
                            save_cache(cache)
                            return result
        
        # Transaction found but didn't match criteria
        last_error = "No USDC transfer to my wallet found in this transaction"
    
    # Not verified
    result = {
        "verified": False,
        "tx_hash": tx_hash,
        "error": last_error or "Unable to verify - all RPC endpoints failed",
        "verified_at": time.time()
    }
    cache[tx_hash] = result
    save_cache(cache)
    return result

def verify_x402_header(headers, expected_endpoint_cost_cents=None):
    """
    Verify an x402 payment from HTTP headers.
    Expected format: X-X402-Payment: <tx_hash>:<endpoint_path>
    Or just: X-X402-Payment: <tx_hash>
    """
    raw = headers.get("X-X402-Payment", headers.get("x-x402-payment", ""))
    if not raw:
        return {"verified": False, "error": "No X-X402-Payment header"}
    
    # Parse: could be just tx_hash or tx_hash:endpoint
    parts = raw.split(":", 1)
    tx_hash = parts[0].strip()
    endpoint = parts[1].strip() if len(parts) > 1 else None
    
    min_cents = expected_endpoint_cost_cents or 1
    
    result = verify_usdc_transfer(tx_hash, min_amount_cents=min_cents)
    
    if result.get("verified"):
        result["endpoint"] = endpoint
        return result
    
    return result

# Quick self-test if run directly
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        tx_hash = sys.argv[1]
        print(f"Verifying transaction: {tx_hash}")
        result = verify_usdc_transfer(tx_hash, min_amount_cents=1)
        print(json.dumps(result, indent=2))
    else:
        print("x402 Verifier Module")
        print(f"Wallet: {MY_WALLET}")
        print(f"USDC: {USDC_ADDRESS}")
        print(f"\nUsage: {sys.argv[0]} <tx_hash>")
        print("  Verifies a USDC transfer to my wallet on Base chain\n")
        
        # Print USD pricing table
        print("Premium Services:")
        print(f"  {'Endpoint':<20} {'Cost':<10} {'Min USDC':<10}")
        print(f"  {'-'*40}")
        services = [
            ("analyze", 1), ("summarize", 2), ("review", 5),
            ("security", 3), ("explain", 2), ("refactor", 5),
            ("complexity", 2), ("batch", 5), ("render", 3)
        ]
        for name, cost in services:
            print(f"  /v1/{name:<14} {cost}¢     ${cost/100:.4f}")
