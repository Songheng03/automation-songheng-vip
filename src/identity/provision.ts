/**
 * provision.ts — Local-only stub.
 * API key provisioning is not available in local mode.
 */

import type { ProvisionResult } from "../types.js";

export async function provisionApiKey(
  _config?: any,
  _options?: any,
): Promise<ProvisionResult | null> {
  console.log("Local mode: API key provisioning not available");
  return null;
}
