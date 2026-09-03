import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  createAgentSession,
  type ExtensionUIContext,
} from "@earendil-works/pi-coding-agent";

import { registerNormContext } from "../extensions/norm-context.ts";

const [bridge, payload] = process.argv.slice(2);
if (!bridge || !payload) {
  throw new Error("usage: check-target-rescoping.ts <bridge> <payload>");
}

const project = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-rescoping-"));
await writeFile(
  path.join(project, ".norm"),
  "---\n" +
    "metadata:\n" +
    "  layer: root\n" +
    "  scope: ./\n" +
    '  version: "1.0"\n' +
    "  description: rescoping fixture root convention\n" +
    "---\n" +
    "\n" +
    "# Root fixture\n" +
    "Root-level guidance for the rescoping check.\n",
  "utf8",
);
await mkdir(path.join(project, "sub"));
await writeFile(
  path.join(project, "sub", ".norm"),
  "---\n" +
    "metadata:\n" +
    "  layer: subpackage\n" +
    "  scope: sub/\n" +
    '  version: "1.0"\n' +
    "  description: rescoping fixture subdirectory convention\n" +
    "---\n" +
    "\n" +
    "# Subdirectory fixture\n" +
    "Subdirectory-level guidance for the rescoping check.\n",
  "utf8",
);
await writeFile(path.join(project, "sub", "guide.md"), "# Guide\n", "utf8");
await writeFile(path.join(project, "sub", "other.md"), "# Other\n", "utf8");

const agentDir = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-agent-"));
let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | undefined;
try {
  const settingsManager = SettingsManager.inMemory();
  const resourceLoader = new DefaultResourceLoader({
    cwd: project,
    agentDir,
    settingsManager,
    extensionFactories: [
      {
        name: "pi-norm-spec-rescoping-e2e",
        factory: (pi) =>
          registerNormContext(pi, {
            resolveRuntime: async () => ({
              command: bridge,
              args: ["serve", "--payload", payload],
            }),
          }),
      },
    ],
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();
  const modelRuntime = await ModelRuntime.create({
    allowModelNetwork: false,
    modelsPath: null,
    refreshOnCreate: false,
  });
  const model = modelRuntime.getModels()[0];
  if (!model) throw new Error("pi model catalog unexpectedly had no static model");
  const statuses = new Map<string, string | undefined>();
  const created = await createAgentSession({
    cwd: project,
    agentDir,
    model,
    modelRuntime,
    noTools: "all",
    resourceLoader,
    settingsManager,
    sessionManager: SessionManager.inMemory(project),
    sessionStartEvent: { type: "session_start", reason: "startup" },
  });
  session = created.session;
  const runner = session.extensionRunner;
  await session.bindExtensions({
    uiContext: {
      notify() {},
      setStatus(key: string, value: string | undefined) {
        statuses.set(key, value);
      },
    } as unknown as ExtensionUIContext,
    mode: "print",
    onError: (error) => {
      throw error.error;
    },
  });

  type EmittedMessage = Awaited<ReturnType<typeof runner.emitContext>>[number];
  type EmittedCustomMessage = Extract<EmittedMessage, { role: "custom" }>;
  const contextMessage = (
    messages: Awaited<ReturnType<typeof runner.emitContext>>,
  ): EmittedCustomMessage | undefined =>
    messages.find(
      (message): message is EmittedCustomMessage =>
        message.role === "custom" && message.customType === "pi-norm-spec-context",
    );

  let messages = await runner.emitContext([
    { role: "user", content: "inspect the root first", timestamp: Date.now() },
  ]);
  let injected = contextMessage(messages);
  assert.ok(injected, "the first provider turn must inject the root-only context");
  assert.equal((injected.details as { target: string }).target, ".");
  assert.deepEqual((injected.details as { conventionPaths: string[] }).conventionPaths, [
    ".norm",
  ]);

  await runner.emitToolCall({
    type: "tool_call",
    toolCallId: "rescoping-read",
    toolName: "read",
    input: { path: "sub/guide.md" },
  });
  messages = await runner.emitContext(messages);
  injected = contextMessage(messages);
  assert.ok(injected, "the follow-up provider turn must inject the subdirectory context");
  assert.equal(
    (injected.details as { target: string }).target,
    "sub",
    "read must re-scope the target to the file's parent directory",
  );
  assert.deepEqual((injected.details as { conventionPaths: string[] }).conventionPaths, [
    "sub/.norm",
    ".norm",
  ]);
  assert.equal(statuses.get("pi-norm-spec"), "norm: 2 @ sub");

  await runner.emitToolCall({
    type: "tool_call",
    toolCallId: "rescoping-read-sibling",
    toolName: "read",
    input: { path: "sub/other.md" },
  });
  messages = await runner.emitContext(messages);
  injected = contextMessage(messages);
  assert.ok(injected);
  assert.equal(
    (injected.details as { target: string }).target,
    "sub",
    "a sibling file in the same directory must not churn the target",
  );
  assert.deepEqual((injected.details as { conventionPaths: string[] }).conventionPaths, [
    "sub/.norm",
    ".norm",
  ]);
} finally {
  if (session) {
    await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
    session.dispose();
  }
  await rm(agentDir, { recursive: true, force: true });
  await rm(project, { recursive: true, force: true });
}

console.log(
  "Real pi host passed subdirectory re-scoping: root-only context, parent-directory target after read, and no sibling-file churn.",
);
