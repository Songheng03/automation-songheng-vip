/**
 * x402.ts — Local-only x402 stubs (no local mode).
 * In local mode, x402 payments are not supported.
 */

export interface UsdcBalanceResult {
  usdcBalance: string;
  ethBalance: string;
  walletAddress: string;
  chainId: number;
}

/**
 * Returns USDC balance in cents (always 0 in local mode).
 */
export async function getUsdcBalance(
  _wallet: string,
  _network = "base",
  _options?: unknown,
): Promise<number> {
  return 0;
}

export async function getUsdcBalanceDetailed(
  _wallet: string,
): Promise<{
  usdc: string;
  eth: string;
  wallet: string;
  chainId: number;
  providers: string[];
  errors: string[];
}> {
  return {
    usdc: "0",
    eth: "0",
    wallet: _wallet,
    chainId: 8453,
    providers: [],
    errors: ["Local mode: not available"],
  };
}

export async function checkX402(
  _url: string,
): Promise<{
  supported: boolean;
  costCents: number;
  wallet: string;
  chain: string;
}> {
  return { supported: false, costCents: 0, wallet: "", chain: "" };
}

/**
 * x402 fetch — returns a result compatible with callers that check `.success`.
 * Accepts the full signature expected by the x402_fetch tool.
 */
export async function x402Fetch(
  url: string,
  _account?: { address: string },
  _method?: string,
  _body?: string,
  _extraHeaders?: Record<string, string>,
  _maxPaymentCents?: number,
): Promise<{ success: boolean; error?: string; response?: { status: number }; data?: unknown }> {
  return { success: false, error: "Local mode: x402 not available" };
}
