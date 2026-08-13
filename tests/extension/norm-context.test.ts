import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { BridgeClientError } from "../../extensions/bridge-client.ts";
import { registerNormContext } from "../../extensions/norm-context.ts";

const fixture = fileURLToPath(new URL("./fixtures/fake-bridge.mjs", import.meta.url));

type EventHandler = (event: unknown, ctx: ExtensionContext) => unknown;
type CommandHandler = (args: string, ctx: ExtensionContext) => Promise<void>;

function harness() {
  const handlers = new Map<string, EventHandler>();
  const commands = new Map<string, CommandHandler>();
  const statuses = new Map<string, string | undefined>();
  const notifications: Array<{ message: string; level: string }> = [];
  const pi = {
    on(event: string, handler: EventHandler) {
      handlers.set(event, handler);
    },
    registerCommand(name: string, options: { handler: CommandHandler }) {
      commands.set(name, options.handler);
    },
  } as unknown as ExtensionAPI;
  const ctx = {
    ui: {
      setStatus(key: string, value: string | undefined) {
        statuses.set(key, value);
      },
      notify(message: string, level: string) {
        notifications.push({ message, level });
      },
    },
  } as unknown as ExtensionContext;
  return { pi, ctx, handlers, commands, statuses, notifications };
}

function launch(mode: string) {
  return Promise.resolve({ command: process.execPath, args: [fixture, mode] });
}

test("ExtensionAPI session hooks own one ready child and graceful shutdown", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("ready") });

  await testHarness.handlers.get("session_start")?.({ type: "session_start", reason: "startup" }, testHarness.ctx);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: v0.1.0-rc.1");
  await testHarness.commands.get("norm-status")?.("", testHarness.ctx);
  assert.match(testHarness.notifications.at(-1)?.message ?? "", /runtime ready/);

  await testHarness.handlers.get("session_shutdown")?.({ type: "session_shutdown", reason: "quit" }, testHarness.ctx);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), undefined);
});

test("runtime resolution failure is visible in status and UI", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, {
    resolveRuntime: async () => {
      throw new BridgeClientError("fake/runtime-missing", "runtime missing");
    },
  });

  await testHarness.handlers.get("session_start")?.({ type: "session_start", reason: "startup" }, testHarness.ctx);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: failed");
  assert.deepEqual(testHarness.notifications.at(-1), {
    message: "pi-norm-spec runtime failed [fake/runtime-missing]: runtime missing",
    level: "error",
  });
});

test("a child crash after ready becomes visible without silent restart", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("crash-after-ready") });

  await testHarness.handlers.get("session_start")?.({ type: "session_start", reason: "startup" }, testHarness.ctx);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: failed");
  assert.match(testHarness.notifications.at(-1)?.message ?? "", /pi-norm-spec\/client\//);
});
