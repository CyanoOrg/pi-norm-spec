import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { BridgeClient, BridgeClientError, type BridgeLaunch } from "./bridge-client.ts";
import { resolvePlatformRuntime } from "./runtime-resolver.ts";

const STATUS_KEY = "pi-norm-spec";
const INCOMPLETE_BEHAVIOR = "injection and enforcement are not implemented";

export interface NormContextOptions {
  resolveRuntime?: () => Promise<BridgeLaunch>;
}

class NormBridgeLifecycle {
  private readonly resolveRuntime: () => Promise<BridgeLaunch>;
  private client: BridgeClient | undefined;
  private failure: BridgeClientError | undefined;
  private generation = 0;

  constructor(resolveRuntime: () => Promise<BridgeLaunch>) {
    this.resolveRuntime = resolveRuntime;
  }

  async start(ctx: ExtensionContext): Promise<void> {
    const generation = ++this.generation;
    const previous = this.client;
    this.client = undefined;
    this.failure = undefined;
    ctx.ui.setStatus(STATUS_KEY, "norm: starting");
    try {
      if (previous && previous.getStatus().state !== "failed") {
        await previous.shutdown();
      }
      if (generation !== this.generation) return;
      const launch = await this.resolveRuntime();
      if (generation !== this.generation) return;
      const client = await BridgeClient.start({
        ...launch,
        onFailure: (failure) => {
          if (generation === this.generation) this.recordFailure(ctx, failure);
        },
      });
      if (generation !== this.generation) {
        await client.shutdown();
        return;
      }
      this.client = client;
      const payload = client.getStatus().ready?.payload;
      const tag = typeof payload?.tag === "string" ? payload.tag : "unknown";
      ctx.ui.setStatus(STATUS_KEY, `norm: ${tag}`);
    } catch (error) {
      if (generation === this.generation) this.recordFailure(ctx, asBridgeError(error));
    }
  }

  async stop(ctx: ExtensionContext): Promise<void> {
    ++this.generation;
    const client = this.client;
    this.client = undefined;
    ctx.ui.setStatus(STATUS_KEY, undefined);
    if (!client || client.getStatus().state === "failed") return;
    try {
      await client.shutdown();
    } catch (error) {
      ctx.ui.notify(`pi-norm-spec shutdown failed: ${errorMessage(error)}`, "error");
    }
  }

  status(): string {
    const status = this.client?.getStatus();
    if (status?.state === "ready") {
      const tag = typeof status.ready?.payload.tag === "string" ? status.ready.payload.tag : "unknown";
      const target =
        typeof status.ready?.payload.target === "string" ? status.ready.payload.target : "unknown";
      return `pi-norm-spec runtime ready: ${tag} (${target}); ${INCOMPLETE_BEHAVIOR}`;
    }
    if (this.failure) {
      return `pi-norm-spec runtime failed [${this.failure.code}]: ${this.failure.message}`;
    }
    return `pi-norm-spec runtime is not started; ${INCOMPLETE_BEHAVIOR}`;
  }

  private recordFailure(ctx: ExtensionContext, failure: BridgeClientError): void {
    if (this.failure === failure) return;
    this.failure = failure;
    ctx.ui.setStatus(STATUS_KEY, "norm: failed");
    ctx.ui.notify(`pi-norm-spec runtime failed [${failure.code}]: ${failure.message}`, "error");
  }
}

/** Register the session-scoped Rust bridge lifecycle and status command. */
export function registerNormContext(pi: ExtensionAPI, options: NormContextOptions = {}): void {
  const lifecycle = new NormBridgeLifecycle(options.resolveRuntime ?? resolvePlatformRuntime);

  pi.on("session_start", async (_event, ctx) => lifecycle.start(ctx));
  pi.on("session_shutdown", async (_event, ctx) => lifecycle.stop(ctx));

  pi.registerCommand("norm-status", {
    description: "Show the pi-norm-spec runtime status",
    handler: async (_args, ctx) => {
      const status = lifecycle.status();
      ctx.ui.notify(status, status.includes("failed") ? "error" : "info");
    },
  });
}

export default registerNormContext;

function asBridgeError(error: unknown): BridgeClientError {
  return error instanceof BridgeClientError
    ? error
    : new BridgeClientError("pi-norm-spec/client/startup-failed", errorMessage(error));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
