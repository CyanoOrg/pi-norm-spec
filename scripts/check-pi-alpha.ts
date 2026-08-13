import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  createAgentSession,
  loadSkills,
  type ExtensionUIContext,
} from "@earendil-works/pi-coding-agent";

import { registerNormContext } from "../extensions/norm-context.ts";

const [bridge, payload, projectRoot] = process.argv.slice(2);
if (!bridge || !payload || !projectRoot) {
  throw new Error("usage: check-pi-alpha.ts <bridge> <payload> <project-root>");
}

interface Observation {
  statuses: Map<string, string | undefined>;
  notifications: Array<{ message: string; level: string }>;
}

async function withPiHost<T>(cwd: string, run: (host: PiHost) => Promise<T>): Promise<T> {
  const agentDir = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-agent-"));
  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    extensionFactories: [
      {
        name: "pi-norm-spec-alpha-e2e",
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
  let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | undefined;
  try {
    await resourceLoader.reload();
    const modelRuntime = await ModelRuntime.create({
      allowModelNetwork: false,
      modelsPath: null,
      refreshOnCreate: false,
    });
    const model = modelRuntime.getModels()[0];
    if (!model) throw new Error("pi model catalog unexpectedly had no static model");
    const observation: Observation = {
      statuses: new Map(),
      notifications: [],
    };
    const created = await createAgentSession({
      cwd,
      agentDir,
      model,
      modelRuntime,
      noTools: "all",
      resourceLoader,
      sessionManager: SessionManager.inMemory(cwd),
      sessionStartEvent: { type: "session_start", reason: "startup" },
    });
    session = created.session;
    await session.bindExtensions({
      uiContext: createUi(observation),
      mode: "print",
      onError: (error) => {
        throw error.error;
      },
    });
    return await run({
      agentDir,
      observation,
      runner: session.extensionRunner,
    });
  } finally {
    if (session) {
      await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
      session.dispose();
    }
    await rm(agentDir, { recursive: true, force: true });
  }
}

interface PiHost {
  agentDir: string;
  observation: Observation;
  runner: Awaited<ReturnType<typeof createAgentSession>>["session"]["extensionRunner"];
}

function createUi(observation: Observation): ExtensionUIContext {
  return {
    notify(message: string, level: string) {
      observation.notifications.push({ message, level });
    },
    setStatus(key: string, value: string | undefined) {
      observation.statuses.set(key, value);
    },
  } as unknown as ExtensionUIContext;
}

type EmittedMessage = Awaited<ReturnType<PiHost["runner"]["emitContext"]>>[number];
type EmittedCustomMessage = Extract<EmittedMessage, { role: "custom" }>;

function contextMessage(
  messages: Awaited<ReturnType<PiHost["runner"]["emitContext"]>>,
): EmittedCustomMessage | undefined {
  return messages.find(
    (message): message is EmittedCustomMessage =>
      message.role === "custom" && message.customType === "pi-norm-spec-context",
  );
}

await withPiHost(projectRoot, async ({ agentDir, observation, runner }) => {
  const resources = await runner.emitResourcesDiscover(projectRoot, "startup");
  assert.equal(resources.skillPaths.length, 1);
  const skills = loadSkills({
    cwd: projectRoot,
    agentDir,
    skillPaths: resources.skillPaths.map((resource) => resource.path),
    includeDefaults: false,
  });
  assert.deepEqual(skills.diagnostics, []);
  assert.deepEqual(
    skills.skills.map((skill) => skill.name),
    ["pi-norm-spec"],
  );

  let messages = await runner.emitContext([
    { role: "user", content: "inspect this project", timestamp: Date.now() },
  ]);
  let injected = contextMessage(messages);
  assert.ok(injected);
  assert.equal(injected.display, false);
  assert.equal((injected.details as { target: string }).target, ".");

  await runner.emitToolCall({
    type: "tool_call",
    toolCallId: "alpha-read",
    toolName: "read",
    input: { path: "docs/planning/status.md" },
  });
  messages = await runner.emitContext(messages);
  injected = contextMessage(messages);
  assert.ok(injected);
  assert.equal((injected.details as { target: string }).target, "docs/planning/status.md");
  assert.deepEqual((injected.details as { conventionPaths: string[] }).conventionPaths, [
    "docs/.norm",
    ".norm",
  ]);
  assert.equal(observation.statuses.get("pi-norm-spec"), "norm: 2 @ docs/planning/status.md");
});

const emptyRoot = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-empty-project-"));
try {
  await withPiHost(emptyRoot, async ({ observation, runner }) => {
    const messages = await runner.emitContext([
      { role: "user", content: "start a project", timestamp: Date.now() },
    ]);
    assert.equal(contextMessage(messages), undefined);
    assert.deepEqual(observation.notifications, [
      {
        message:
          "pi-norm-spec found no .norm conventions. The pi-norm-spec Skill can guide an explicit setup; no project files were created.",
        level: "info",
      },
    ]);
  });
  assert.deepEqual(await readdir(emptyRoot), [], "cold start must not create project files");
} finally {
  await rm(emptyRoot, { recursive: true, force: true });
}

console.log(
  "Real pi Alpha host passed session lifecycle, Skill loading, root and path-scoped ephemeral context, and zero-.norm onboarding.",
);
