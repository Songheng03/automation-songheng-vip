import fs from "fs";

export interface EnvironmentInfo {
  type: string;
  sandboxId: string;
}

export function detectEnvironment(): EnvironmentInfo {
  // 1. Check Docker
  if (fs.existsSync("/.dockerenv")) {
    return { type: "docker", sandboxId: "" };
  }

  // 2. Fall back to platform
  return { type: process.platform, sandboxId: "" };
}
