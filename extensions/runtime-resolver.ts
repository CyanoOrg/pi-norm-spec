import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { BridgeClientError, type BridgeLaunch } from "./bridge-client.ts";

const PLATFORM_RUNTIME_API = "pi-norm-spec/platform-runtime/v1";

const PLATFORM_PACKAGES: Readonly<Record<string, string>> = {
  "darwin-arm64": "pi-norm-spec-darwin-arm64",
  "darwin-x64": "pi-norm-spec-darwin-x64",
  "linux-x64": "pi-norm-spec-linux-x64",
  "win32-x64": "pi-norm-spec-win32-x64",
};

interface RuntimeLocator {
  apiVersion: string;
  bridge: string;
  payload: string;
}

export async function resolvePlatformRuntime(): Promise<BridgeLaunch> {
  const key = `${process.platform}-${process.arch}`;
  const packageName = PLATFORM_PACKAGES[key];
  if (!packageName) {
    throw new BridgeClientError(
      "pi-norm-spec/runtime/unsupported-platform",
      `pi-norm-spec has no runtime package for ${key}`,
    );
  }

  const require = createRequire(import.meta.url);
  let locatorPath: string;
  try {
    locatorPath = require.resolve(`${packageName}/runtime.json`);
  } catch {
    throw new BridgeClientError(
      "pi-norm-spec/runtime/package-unavailable",
      `required platform runtime package is unavailable: ${packageName}`,
    );
  }

  const locator = await readLocator(locatorPath);
  const root = path.dirname(locatorPath);
  return {
    command: resolvePortablePath(root, locator.bridge, "bridge"),
    args: ["serve", "--payload", resolvePortablePath(root, locator.payload, "payload")],
  };
}

async function readLocator(locatorPath: string): Promise<RuntimeLocator> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(locatorPath, "utf8"));
  } catch (error) {
    throw new BridgeClientError(
      "pi-norm-spec/runtime/locator-invalid",
      `platform runtime locator could not be read: ${errorMessage(error)}`,
      locatorPath,
    );
  }
  if (
    !isRecord(value) ||
    value.apiVersion !== PLATFORM_RUNTIME_API ||
    typeof value.bridge !== "string" ||
    typeof value.payload !== "string"
  ) {
    throw new BridgeClientError(
      "pi-norm-spec/runtime/locator-invalid",
      "platform runtime locator has an unexpected schema or API",
      locatorPath,
    );
  }
  return {
    apiVersion: value.apiVersion,
    bridge: value.bridge,
    payload: value.payload,
  };
}

function resolvePortablePath(root: string, relative: string, field: string): string {
  const segments = relative.split("/");
  if (
    relative.length === 0 ||
    relative.includes("\\") ||
    path.posix.isAbsolute(relative) ||
    path.win32.isAbsolute(relative) ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new BridgeClientError(
      "pi-norm-spec/runtime/locator-unsafe",
      `platform runtime ${field} path is not safe and relative`,
    );
  }
  return path.join(root, ...segments);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
