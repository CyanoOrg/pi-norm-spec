import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  createAgentSession,
  loadSkills,
  type ExtensionUIContext,
} from "@earendil-works/pi-coding-agent";

const [bridge, payload, rootArchive, platformArchive, projectRoot, packageVersion] =
  process.argv.slice(2);
if (!bridge || !payload || !rootArchive || !platformArchive || !projectRoot || !packageVersion) {
  throw new Error(
    "usage: check-pi-install.ts <bridge> <payload> <root-archive> <platform-archive> <project-root> <package-version>",
  );
}

const ROOT_PACKAGE = "@cyanoorg/pi-norm-spec";

interface Observation {
  statuses: Map<string, string | undefined>;
  notifications: Array<{ message: string; level: string }>;
}

/** Locate the real npm CLI deterministically: prefer npm bundled with node. */
function npmInvocation(): { command: string; args: string[]; shell: boolean } {
  const execDir = path.dirname(process.execPath);
  const candidates =
    process.platform === "win32"
      ? [path.join(execDir, "node_modules", "npm", "bin", "npm-cli.js")]
      : [path.join(execDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")];
  for (const cli of candidates) {
    if (existsSync(cli)) {
      return { command: process.execPath, args: [cli], shell: false };
    }
  }
  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: [],
    shell: process.platform === "win32",
  };
}

/**
 * Seed pi's managed user-scope npm install root exactly the way
 * `pi install npm:<spec>` does: real npm, `--prefix <agentDir>/npm`,
 * `--legacy-peer-deps`, and a private install-root project.
 */
function seedManagedNpmRoot(agentDir: string, archives: string[]): void {
  const installRoot = path.join(agentDir, "npm");
  mkdirSync(installRoot, { recursive: true });
  const project = path.join(installRoot, "package.json");
  if (!existsSync(project)) {
    writeFileSync(project, '{"private":true}\n', "utf8");
  }
  const npm = npmInvocation();
  const result = spawnSync(
    npm.command,
    [...npm.args, "install", ...archives, "--prefix", installRoot, "--legacy-peer-deps", "--no-audit", "--no-fund"],
    { stdio: "inherit", shell: npm.shell },
  );
  if (result.status !== 0) {
    throw new Error(`managed npm seed failed with exit code ${result.status ?? "signal"}`);
  }
}

/** Isolated agent dir with version-pinned package settings, like a user install. */
async function createIsolatedAgentDir(
  archives: string[],
  pinnedVersion: string,
): Promise<string> {
  const agentDir = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-agent-"));
  seedManagedNpmRoot(agentDir, archives);
  await writeFile(
    path.join(agentDir, "settings.json"),
    `${JSON.stringify({ packages: [`npm:${ROOT_PACKAGE}@${pinnedVersion}`] }, null, 2)}\n`,
    "utf8",
  );
  return agentDir;
}

interface HostSession {
  observation: Observation;
  runner: Awaited<ReturnType<typeof createAgentSession>>["session"]["extensionRunner"];
  session: Awaited<ReturnType<typeof createAgentSession>>["session"];
}

/** Boot the real session stack against an isolated agent dir; no factories. */
async function withPiSession<T>(
  cwd: string,
  agentDir: string,
  run: (host: HostSession) => Promise<T>,
): Promise<T> {
  const settingsManager = SettingsManager.create(cwd, agentDir);
  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
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
    const observation: Observation = { statuses: new Map(), notifications: [] };
    const created = await createAgentSession({
      cwd,
      agentDir,
      model,
      modelRuntime,
      noTools: "all",
      resourceLoader,
      settingsManager,
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
    return await run({ observation, runner: session.extensionRunner, session });
  } finally {
    if (session) {
      await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
      session.dispose();
    }
  }
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

type EmittedMessage = Awaited<
  ReturnType<HostSession["runner"]["emitContext"]>
>[number];
type EmittedCustomMessage = Extract<EmittedMessage, { role: "custom" }>;

function contextMessage(
  messages: Awaited<ReturnType<HostSession["runner"]["emitContext"]>>,
): EmittedCustomMessage | undefined {
  return messages.find(
    (message): message is EmittedCustomMessage =>
      message.role === "custom" && message.customType === "pi-norm-spec-context",
  );
}

// Positive path: real managed install, version-pinned settings, real boot.
const agentDir = await createIsolatedAgentDir([rootArchive, platformArchive], packageVersion);
try {
  const resourceLoader = new DefaultResourceLoader({
    cwd: projectRoot,
    agentDir,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();
  const extensions = resourceLoader.getExtensions();
  assert.deepEqual(extensions.errors, []);
  assert.equal(extensions.extensions.length, 1, "exactly one extension must load");
  assert.equal(
    path.resolve(extensions.extensions[0]?.resolvedPath ?? ""),
    path.join(agentDir, "npm", "node_modules", ROOT_PACKAGE, "extensions", "norm-context.ts"),
    "the extension must load from pi's managed npm install root",
  );

  await withPiSession(projectRoot, agentDir, async ({ observation, runner }) => {
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
    assert.ok(injected, "the root context must inject through the managed install");
    assert.equal((injected.details as { target: string }).target, ".");

    await runner.emitToolCall({
      type: "tool_call",
      toolCallId: "install-read",
      toolName: "read",
      input: { path: "docs/planning/status.md" },
    });
    messages = await runner.emitContext(messages);
    injected = contextMessage(messages);
    assert.ok(injected);
    assert.equal(
      (injected.details as { target: string }).target,
      "docs/planning",
      "read must re-scope to the parent directory through the managed install",
    );
    assert.deepEqual((injected.details as { conventionPaths: string[] }).conventionPaths, [
      "docs/.norm",
      ".norm",
    ]);

    const green = await runner.emitToolResult({
      type: "tool_result",
      toolCallId: "install-write-green",
      toolName: "write",
      input: { path: "docs/planning/status.md", content: "unchanged fixture" },
      content: [{ type: "text", text: "write completed" }],
      details: undefined,
      isError: false,
    });
    assert.equal(green, undefined, "green post-edit validation must not patch the result");
    assert.equal(observation.statuses.get("pi-norm-spec"), "norm: valid (2 files)");
  });

  // Cold start in a zero-.norm project sharing the same user install.
  const emptyRoot = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-empty-project-"));
  try {
    await withPiSession(emptyRoot, agentDir, async ({ observation, runner }) => {
      const messages = await runner.emitContext([
        { role: "user", content: "start a project", timestamp: Date.now() },
      ]);
      assert.equal(contextMessage(messages), undefined);
      assert.equal(observation.notifications.length, 1);
      assert.equal(observation.notifications[0]?.level, "info");
    });
    assert.deepEqual(await readdir(emptyRoot), [], "cold start must not create project files");
  } finally {
    await rm(emptyRoot, { recursive: true, force: true });
  }
} finally {
  await rm(agentDir, { recursive: true, force: true });
}

// Negative path A: the platform optional package is absent; resolution must
// fail visibly instead of falling back.
const partialAgentDir = await createIsolatedAgentDir([rootArchive], packageVersion);
try {
  await withPiSession(projectRoot, partialAgentDir, async ({ observation, runner }) => {
    assert.match(
      observation.statuses.get("pi-norm-spec") ?? "",
      /failed/,
      "a missing platform package must fail visibly",
    );
    assert.ok(
      observation.notifications.some(
        (notice) => notice.level === "error" && notice.message.includes("pi-norm-spec runtime failed"),
      ),
    );
    const messages = await runner.emitContext([
      { role: "user", content: "inspect this project", timestamp: Date.now() },
    ]);
    assert.equal(contextMessage(messages), undefined, "a failed runtime must not inject context");
  });
} finally {
  await rm(partialAgentDir, { recursive: true, force: true });
}

// Negative path B: a version-pinned settings entry that does not match the
// installed package must not silently load the stale one.
const staleAgentDir = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-agent-"));
seedManagedNpmRoot(staleAgentDir, [rootArchive, platformArchive]);
await writeFile(
  path.join(staleAgentDir, "settings.json"),
  `${JSON.stringify({ packages: [`npm:${ROOT_PACKAGE}@0.0.0-e3-missing`] }, null, 2)}\n`,
  "utf8",
);
try {
  const resourceLoader = new DefaultResourceLoader({
    cwd: projectRoot,
    agentDir: staleAgentDir,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();
  const extensions = resourceLoader.getExtensions();
  assert.equal(
    extensions.extensions.length,
    0,
    "a mismatched pinned version must not silently load the installed package",
  );
} catch (error) {
  // A visible discovery failure (for example a registry 404 for the missing
  // version) is the other acceptable outcome; silence is not.
  assert.ok(error instanceof Error);
} finally {
  await rm(staleAgentDir, { recursive: true, force: true });
}

console.log(
  "Real pi package-manager path passed: version-pinned managed install, boot autoload, Skill, injection with re-scoping, post-edit feedback, zero-.norm onboarding, and visible missing-platform and stale-version failures.",
);
