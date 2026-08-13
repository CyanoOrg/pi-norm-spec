import assert from "node:assert/strict";

import {
  BridgeClient,
  BridgeRequestCancelledError,
} from "../extensions/bridge-client.ts";

const [bridge, payload, root, target, sourceRevision] = process.argv.slice(2);
if (!bridge || !payload || !root || !target || !sourceRevision) {
  throw new Error(
    "usage: check-persistent-bridge.ts <bridge> <payload> <root> <target> <source-revision>",
  );
}

const client = await BridgeClient.start({
  command: bridge,
  args: ["serve", "--payload", payload],
});

try {
  const status = client.getStatus();
  assert.equal(status.state, "ready");
  assert.equal(status.ready?.payload.tag, "v0.1.0-rc.1");
  assert.equal(status.ready?.payload.sourceRevision, sourceRevision);
  assert.equal(status.ready?.payload.target, target);
  assert.equal(
    status.ready?.payload.contractDigest,
    "sha256:3d94441e9cde3ef9489618bdb8fbf37f6979331bea099acadf0136b65df7e2eb",
  );
  assert.equal(status.ready?.compatibility.apiVersion, "norm-spec/compatibility/v1");

  const collection = await client.request<{
    apiVersion: string;
    norms: Array<{ path: string }>;
  }>("collect", {
    root,
    target: "docs/planning/status.md",
  });
  assert.equal(collection.apiVersion, "norm-spec/collect/v1");
  assert.deepEqual(
    collection.norms.map((norm) => norm.path),
    ["docs/.norm", ".norm"],
  );

  const promptContext = await client.request<{
    apiVersion: string;
    target: string;
    conventionPaths: string[];
    prompt: string | null;
  }>("promptContext", {
    root,
    target: "docs/planning/status.md",
  });
  assert.equal(promptContext.apiVersion, "pi-norm-spec/prompt-context/v1");
  assert.equal(promptContext.target, "docs/planning/status.md");
  assert.deepEqual(promptContext.conventionPaths, ["docs/.norm", ".norm"]);
  const prompt = promptContext.prompt ?? "";
  assert.match(prompt, /^PI_NORM_SPEC_CONTEXT_V1\n/);
  const specific = prompt.indexOf('"path":"docs/.norm"');
  const outer = prompt.indexOf('"path":".norm"');
  assert.ok(specific >= 0 && outer > specific);
  assert.match(prompt, /END_PI_NORM_SPEC_CONTEXT_V1$/);

  const controller = new AbortController();
  const validation = client.request("validate", { root }, controller.signal);
  controller.abort();
  await assert.rejects(
    validation,
    (error) => error instanceof BridgeRequestCancelledError,
  );

  await client.shutdown();
  assert.equal(client.getStatus().state, "stopped");
} finally {
  const state = client.getStatus().state;
  if (state !== "stopped" && state !== "failed") {
    await client.shutdown();
  }
}

console.log(
  "Persistent bridge passed exact readiness, collection, prompt context, targeted cancellation, and graceful shutdown.",
);
