import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BridgeClient,
  BridgeClientError,
  BridgeRequestCancelledError,
} from "../../extensions/bridge-client.ts";

const fixture = fileURLToPath(new URL("./fixtures/fake-bridge.mjs", import.meta.url));

function launch(mode: string, onFailure?: (failure: BridgeClientError) => void) {
  return BridgeClient.start({
    command: process.execPath,
    args: [fixture, mode],
    startupTimeoutMs: 2_000,
    shutdownTimeoutMs: 2_000,
    onFailure,
  });
}

test("ready identity, request correlation, and graceful shutdown", async () => {
  const client = await launch("ready");
  assert.equal(client.getStatus().state, "ready");
  assert.equal(client.getStatus().ready?.payload.tag, "v0.1.0-rc.1");
  assert.deepEqual(await client.request("status"), { healthy: true });

  await client.shutdown();
  assert.equal(client.getStatus().state, "stopped");
});

test("startupFailed rejects initialization without fallback", async () => {
  let observed: BridgeClientError | undefined;
  await assert.rejects(
    launch("startup-failure", (failure) => {
      observed = failure;
    }),
    (error) => error instanceof BridgeClientError && error.code === "fake/startup",
  );
  assert.equal(observed?.code, "fake/startup");
});

test("AbortSignal cancels exactly the pending request", async () => {
  const client = await launch("cancel");
  const controller = new AbortController();
  const request = client.request("collect", { root: ".", target: "." }, controller.signal);
  controller.abort();

  await assert.rejects(request, (error) => error instanceof BridgeRequestCancelledError);
  await client.shutdown();
  assert.equal(client.getStatus().state, "stopped");
});

test("unexpected child exit rejects pending work and becomes failed state", async () => {
  let observed: BridgeClientError | undefined;
  const client = await launch("crash", (failure) => {
    observed = failure;
  });
  await assert.rejects(
    client.request("collect", { root: ".", target: "." }),
    (error) => error instanceof BridgeClientError,
  );
  assert.equal(client.getStatus().state, "failed");
  assert.ok(observed);
});

test("malformed stdout fails startup instead of being ignored", async () => {
  await assert.rejects(
    launch("malformed"),
    (error) => error instanceof BridgeClientError && error.code === "pi-norm-spec/client/frame-invalid",
  );
});
