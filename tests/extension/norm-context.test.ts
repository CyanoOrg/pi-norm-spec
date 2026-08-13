import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { BridgeClientError } from "../../extensions/bridge-client.ts";
import { registerNormContext } from "../../extensions/norm-context.ts";

const fixture = fileURLToPath(new URL("./fixtures/fake-bridge.mjs", import.meta.url));

type EventHandler = (event: unknown, ctx: ExtensionContext) => unknown;
type CommandHandler = (args: string, ctx: ExtensionContext) => Promise<void>;

function harness(options: { cwd?: string; signal?: AbortSignal } = {}) {
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
    cwd: options.cwd ?? process.cwd(),
    signal: options.signal,
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

test("context hook injects root conventions without a persistent message hook", async () => {
  const testHarness = harness({ cwd: "/project" });
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("ready") });

  assert.equal(testHarness.handlers.has("before_agent_start"), false);
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );
  const original = { role: "user", content: "inspect the project", timestamp: 1 };
  const result = (await testHarness.handlers.get("context")?.(
    { type: "context", messages: [original] },
    testHarness.ctx,
  )) as { messages: Array<Record<string, unknown>> };

  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0], original);
  assert.deepEqual(result.messages[1], {
    role: "custom",
    customType: "pi-norm-spec-context",
    content: "PI_NORM_SPEC_CONTEXT_V1\ntarget=.\nEND_PI_NORM_SPEC_CONTEXT_V1",
    display: false,
    details: {
      apiVersion: "pi-norm-spec/prompt-context/v1",
      target: ".",
      conventionPaths: [".norm"],
    },
    timestamp: result.messages[1]?.timestamp,
  });
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: 1 @ .");

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("built-in tool paths select the next provider target deterministically", async () => {
  const testHarness = harness({ cwd: "/project" });
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("ready") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  await testHarness.handlers.get("tool_call")?.(
    { type: "tool_call", toolCallId: "t1", toolName: "read", input: { path: "docs/guide.md" } },
    testHarness.ctx,
  );
  await testHarness.handlers.get("tool_call")?.(
    { type: "tool_call", toolCallId: "t2", toolName: "bash", input: { command: "pwd" } },
    testHarness.ctx,
  );
  let result = (await testHarness.handlers.get("context")?.(
    { type: "context", messages: [] },
    testHarness.ctx,
  )) as { messages: Array<Record<string, unknown>> };
  assert.equal((result.messages[0]?.details as Record<string, unknown>).target, "docs/guide.md");

  await testHarness.handlers.get("tool_call")?.(
    { type: "tool_call", toolCallId: "t3", toolName: "write", input: { path: "crates/new.rs", content: "" } },
    testHarness.ctx,
  );
  result = (await testHarness.handlers.get("context")?.(
    { type: "context", messages: result.messages },
    testHarness.ctx,
  )) as { messages: Array<Record<string, unknown>> };
  assert.equal(result.messages.length, 1, "prior ephemeral context should be replaced");
  assert.equal((result.messages[0]?.details as Record<string, unknown>).target, "crates");

  await testHarness.handlers.get("tool_call")?.(
    { type: "tool_call", toolCallId: "t4", toolName: "grep", input: { pattern: "Gate D" } },
    testHarness.ctx,
  );
  result = (await testHarness.handlers.get("context")?.(
    { type: "context", messages: [] },
    testHarness.ctx,
  )) as { messages: Array<Record<string, unknown>> };
  assert.equal((result.messages[0]?.details as Record<string, unknown>).target, ".");

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("successful write validates without changing a green tool result", async () => {
  const testHarness = harness({ cwd: "/project" });
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("ready") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const result = await testHarness.handlers.get("tool_result")?.(
    {
      type: "tool_result",
      toolCallId: "write-green",
      toolName: "write",
      input: { path: "docs/guide.md", content: "updated" },
      content: [{ type: "text", text: "Wrote docs/guide.md" }],
      details: undefined,
      isError: false,
    },
    testHarness.ctx,
  );

  assert.equal(result, undefined);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: valid (2 files)");
  assert.deepEqual(testHarness.notifications, []);
  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("validation findings append bounded soft feedback and preserve result state", async () => {
  const testHarness = harness({ cwd: "/project" });
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("validate-findings") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const original = { type: "text", text: "Edited docs/.norm" };
  const result = (await testHarness.handlers.get("tool_result")?.(
    {
      type: "tool_result",
      toolCallId: "edit-findings",
      toolName: "edit",
      input: { path: "docs/.norm", oldText: "old", newText: "new" },
      content: [original],
      details: { diff: "old -> new" },
      isError: false,
      usage: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, cost: { total: 0 } },
    },
    testHarness.ctx,
  )) as { content: Array<{ type: string; text: string }>; isError?: boolean; details?: unknown; usage?: unknown };

  assert.equal(result.content.length, 2);
  assert.equal(result.content[0], original);
  assert.match(result.content[1]?.text ?? "", /post-edit validation: soft feedback/);
  assert.match(result.content[1]?.text ?? "", /norm-spec\/test-warning/);
  assert.match(result.content[1]?.text ?? "", /norm-spec\/test-error/);
  assert.match(result.content[1]?.text ?? "", /already completed/);
  assert.equal("isError" in result, false);
  assert.equal("details" in result, false);
  assert.equal("usage" in result, false);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: 1 errors, 1 warnings");
  assert.deepEqual(testHarness.notifications, [
    {
      message: "pi-norm-spec post-edit validation: 1 errors and 1 warnings across 2 .norm files.",
      level: "error",
    },
  ]);

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("post-edit trigger matrix excludes failed edits and unknown mutation contracts", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("validate-findings") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const events = [
    { toolCallId: "read", toolName: "read", input: { path: ".norm" }, isError: false },
    { toolCallId: "bash", toolName: "bash", input: { command: "touch .norm" }, isError: false },
    { toolCallId: "custom", toolName: "custom_mutator", input: { path: ".norm" }, isError: false },
    { toolCallId: "failed-edit", toolName: "edit", input: { path: ".norm" }, isError: true },
  ];
  for (const event of events) {
    const result = await testHarness.handlers.get("tool_result")?.(
      {
        type: "tool_result",
        ...event,
        content: [{ type: "text", text: "original" }],
        details: undefined,
      },
      testHarness.ctx,
    );
    assert.equal(result, undefined, `${event.toolName} must not trigger post-edit validation`);
  }
  assert.deepEqual(testHarness.notifications, []);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: v0.1.0-rc.1");

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("validation failures remain distinct feedback and repeated UI errors are deduplicated", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("validate-error") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  for (const toolCallId of ["failed-feedback-1", "failed-feedback-2"]) {
    const result = (await testHarness.handlers.get("tool_result")?.(
      {
        type: "tool_result",
        toolCallId,
        toolName: "write",
        input: { path: ".norm", content: "invalid" },
        content: [{ type: "text", text: "write completed" }],
        details: undefined,
        isError: false,
      },
      testHarness.ctx,
    )) as { content: Array<{ type: string; text: string }>; isError?: boolean };
    assert.match(result.content.at(-1)?.text ?? "", /validation unavailable/);
    assert.match(result.content.at(-1)?.text ?? "", /fake\/validation/);
    assert.equal("isError" in result, false);
  }
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: validation failed");
  assert.equal(testHarness.notifications.length, 1);
  assert.equal(testHarness.notifications[0]?.level, "error");

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("an inconsistent validation envelope is a visible protocol failure", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("validate-invalid") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const result = (await testHarness.handlers.get("tool_result")?.(
    {
      type: "tool_result",
      toolCallId: "invalid-envelope",
      toolName: "edit",
      input: { path: ".norm", oldText: "a", newText: "b" },
      content: [{ type: "text", text: "edit completed" }],
      details: undefined,
      isError: false,
    },
    testHarness.ctx,
  )) as { content: Array<{ type: string; text: string }> };
  assert.match(result.content.at(-1)?.text ?? "", /pi-norm-spec\/client\/validation-invalid/);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: validation failed");

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("cancelled post-edit validation does not synthesize success or failure", async () => {
  const controller = new AbortController();
  const testHarness = harness({ signal: controller.signal });
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("validate-cancel") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const pending = testHarness.handlers.get("tool_result")?.(
    {
      type: "tool_result",
      toolCallId: "cancel-validation",
      toolName: "write",
      input: { path: ".norm", content: "updated" },
      content: [{ type: "text", text: "write completed" }],
      details: undefined,
      isError: false,
    },
    testHarness.ctx,
  );
  setImmediate(() => controller.abort());
  assert.equal(await pending, undefined);
  assert.deepEqual(testHarness.notifications, []);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: v0.1.0-rc.1");

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("parallel tool results serialize validation requests in completion order", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("validate-serial") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const results = (await Promise.all(
    ["write", "edit"].map((toolName, index) =>
      testHarness.handlers.get("tool_result")?.(
        {
          type: "tool_result",
          toolCallId: `serial-${index + 1}`,
          toolName,
          input: { path: `${index + 1}.norm` },
          content: [{ type: "text", text: `${toolName} completed` }],
          details: undefined,
          isError: false,
        },
        testHarness.ctx,
      ),
    ),
  )) as Array<{ content: Array<{ type: string; text: string }> }>;

  assert.match(results[0]?.content.at(-1)?.text ?? "", /fake\/serial-1/);
  assert.match(results[1]?.content.at(-1)?.text ?? "", /fake\/serial-2/);
  assert.equal(testHarness.notifications.length, 2);
  assert.equal(testHarness.notifications.every((notice) => notice.level === "warning"), true);

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("post-edit feedback caps diagnostic count and UTF-8 size", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("validate-many-findings") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const result = (await testHarness.handlers.get("tool_result")?.(
    {
      type: "tool_result",
      toolCallId: "bounded-feedback",
      toolName: "write",
      input: { path: ".norm", content: "updated" },
      content: [{ type: "text", text: "write completed" }],
      details: undefined,
      isError: false,
    },
    testHarness.ctx,
  )) as { content: Array<{ type: string; text: string }> };
  const feedback = result.content.at(-1)?.text ?? "";
  assert.ok(Buffer.byteLength(feedback, "utf8") <= 8 * 1024);
  assert.equal((feedback.match(/^- ERROR /gmu) ?? []).length, 8);
  assert.match(feedback, /4 additional diagnostics omitted/);
  assert.match(feedback, /already completed/);

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("zero-convention context is typed and does not synthesize prompt guidance", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("empty-context") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const original = { role: "user", content: "hello", timestamp: 1 };
  const result = (await testHarness.handlers.get("context")?.(
    { type: "context", messages: [original] },
    testHarness.ctx,
  )) as { messages: unknown[] };
  assert.deepEqual(result.messages, [original]);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: empty @ .");
  assert.deepEqual(testHarness.notifications, [
    {
      message:
        "pi-norm-spec found no .norm conventions. The pi-norm-spec Skill can guide an explicit setup; no project files were created.",
      level: "info",
    },
  ]);

  await testHarness.handlers.get("context")?.(
    { type: "context", messages: [original] },
    testHarness.ctx,
  );
  assert.equal(testHarness.notifications.length, 1, "onboarding notice must be session-bounded");

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("resources discovery registers only the pi-specific Skill", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("ready") });

  const resources = (await testHarness.handlers.get("resources_discover")?.(
    { type: "resources_discover", cwd: process.cwd(), reason: "startup" },
    testHarness.ctx,
  )) as { skillPaths: string[] };
  assert.equal(resources.skillPaths.length, 1);
  assert.match(resources.skillPaths[0] ?? "", /skills[/\\]pi-norm-spec[/\\]SKILL\.md$/);
  const skill = await readFile(resources.skillPaths[0] ?? "", "utf8");
  assert.match(skill, /^---\r?\nname: pi-norm-spec\r?\n/);
  assert.match(skill, /does not create or modify files/i);
  assert.match(skill, /github\.com\/CyanoOrg\/norm-spec\/blob\/v0\.1\.0-rc\.1/);
  assert.doesNotMatch(skill, /name: norm-spec\r?\n/);
});

test("request-scoped context failure is visible and a later success recovers", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("context-error-once") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  let result = (await testHarness.handlers.get("context")?.(
    { type: "context", messages: [] },
    testHarness.ctx,
  )) as { messages: unknown[] };
  assert.deepEqual(result.messages, []);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: context failed");
  assert.match(testHarness.notifications.at(-1)?.message ?? "", /fake\/context/);

  result = (await testHarness.handlers.get("context")?.(
    { type: "context", messages: [] },
    testHarness.ctx,
  )) as { messages: unknown[] };
  assert.equal(result.messages.length, 1);
  assert.equal(testHarness.statuses.get("pi-norm-spec"), "norm: 1 @ .");

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("identical context failures notify once without becoming an empty success", async () => {
  const testHarness = harness();
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("context-error") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  await testHarness.handlers.get("context")?.({ type: "context", messages: [] }, testHarness.ctx);
  await testHarness.handlers.get("context")?.({ type: "context", messages: [] }, testHarness.ctx);
  assert.equal(testHarness.notifications.length, 1);

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
});

test("context cancellation removes stale injection without reporting failure", async () => {
  const controller = new AbortController();
  const testHarness = harness({ signal: controller.signal });
  registerNormContext(testHarness.pi, { resolveRuntime: () => launch("cancel") });
  await testHarness.handlers.get("session_start")?.(
    { type: "session_start", reason: "startup" },
    testHarness.ctx,
  );

  const stale = {
    role: "custom",
    customType: "pi-norm-spec-context",
    content: "stale",
    display: false,
    timestamp: 1,
  };
  const injection = testHarness.handlers.get("context")?.(
    { type: "context", messages: [stale] },
    testHarness.ctx,
  );
  setImmediate(() => controller.abort());
  const result = (await injection) as { messages: unknown[] };
  assert.deepEqual(result.messages, []);
  assert.equal(testHarness.notifications.length, 0);

  await testHarness.handlers.get("session_shutdown")?.(
    { type: "session_shutdown", reason: "quit" },
    testHarness.ctx,
  );
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
