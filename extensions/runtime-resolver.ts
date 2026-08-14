import { type BridgeLaunch, BridgeClientError } from "./bridge-client.ts";
import {
  PackageRuntimeError,
  resolvePackageRuntime,
} from "../runtime/package-runtime.js";

export async function resolvePlatformRuntime(): Promise<BridgeLaunch> {
  try {
    const runtime = await resolvePackageRuntime();
    return {
      command: runtime.bridgePath,
      args: ["serve", "--payload", runtime.payloadPath],
    };
  } catch (error) {
    if (error instanceof PackageRuntimeError) {
      throw new BridgeClientError(error.code, error.message, error.path);
    }
    throw error;
  }
}
