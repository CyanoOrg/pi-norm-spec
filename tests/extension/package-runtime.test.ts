import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runLauncher } from "../../runtime/launcher.js";
import {
  PACKAGE_RELEASE_API,
  PACKAGE_RUNTIME_API,
  PLATFORM_DEFINITIONS,
  PackageRuntimeError,
  detectLinuxLibc,
  parsePlatformReleaseManifest,
  parseRootReleaseManifest,
  resolvePackageRuntime,
  selectPlatformRuntime,
} from "../../runtime/package-runtime.js";
import {
  createPlatformReleaseManifest,
  createRootReleaseManifest,
  loadPackageReleaseInputs,
} from "../../scripts/package-release.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourceRevision = "1".repeat(40);

test("publish inputs define one exact root and four bounded native packages", async () => {
  const inputs = await loadPackageReleaseInputs(repoRoot);
  const rootSource = JSON.parse(
    await readFile(path.join(repoRoot, "packages", "root", "package.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(inputs.rootManifest.name, "@cyanoorg/pi-norm-spec");
  assert.equal(inputs.rootManifest.version, "0.1.0-alpha.1");
  assert.equal(inputs.platformManifests.size, 4);
  assert.deepEqual(inputs.rootManifest.optionalDependencies, {
    "@cyanoorg/pi-norm-spec-linux-x64": "0.1.0-alpha.1",
    "@cyanoorg/pi-norm-spec-darwin-arm64": "0.1.0-alpha.1",
    "@cyanoorg/pi-norm-spec-darwin-x64": "0.1.0-alpha.1",
    "@cyanoorg/pi-norm-spec-win32-x64": "0.1.0-alpha.1",
  });
  assert.equal("scripts" in rootSource, false, "publish root must not run lifecycle scripts");
  assert.deepEqual(rootSource.files, ["bin", "extensions", "runtime", "skills", "release.json"]);
  assert.deepEqual(rootSource.bin, { "pi-norm-spec": "bin/pi-norm-spec.js" });

  for (const definition of Object.values(PLATFORM_DEFINITIONS)) {
    const file = path.join(
      repoRoot,
      "packages",
      definition.packageName.replace("@cyanoorg/pi-norm-spec-", ""),
      "package.json",
    );
    const manifest = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    assert.equal(manifest.name, definition.packageName);
    assert.equal(manifest.version, inputs.rootManifest.version);
    assert.equal("scripts" in manifest, false, `${definition.packageName} must not run lifecycle scripts`);
    assert.deepEqual(manifest.os, [definition.os]);
    assert.deepEqual(manifest.cpu, [definition.cpu]);
    if (definition.libc) assert.deepEqual(manifest.libc, [definition.libc]);
    else assert.equal("libc" in manifest, false);
    assert.deepEqual(manifest.files, ["bin", "upstream", "runtime.json", "release.json"]);
  }
});

test("release builders bind exact source, package, host, and upstream identities", async () => {
  const inputs = await loadPackageReleaseInputs(repoRoot);
  const root = createRootReleaseManifest(inputs, sourceRevision);
  const platform = createPlatformReleaseManifest(
    inputs,
    sourceRevision,
    "aarch64-apple-darwin",
  );

  assert.equal(root.apiVersion, PACKAGE_RELEASE_API);
  assert.equal(root.kind, "root");
  assert.deepEqual(root.source, {
    repository: "https://github.com/CyanoOrg/pi-norm-spec",
    revision: sourceRevision,
  });
  assert.deepEqual(root.host, {
    package: "@earendil-works/pi-coding-agent",
    version: "0.84.1",
  });
  assert.equal((root.packages as unknown[]).length, 4);
  assert.equal((root.upstream as { sourceRevision: string }).sourceRevision, "5c781964b6d9b11c52f29e5b6e2bbe13c25a5ee0");
  assert.deepEqual(platform.product, root.product);
  assert.deepEqual(platform.source, root.source);
  assert.deepEqual(platform.apis, root.apis);
  assert.deepEqual(platform.host, root.host);
  assert.deepEqual(platform.upstream, root.upstream);
});

test("release parsers reject undeclared fields and malformed immutable identities", async () => {
  const inputs = await loadPackageReleaseInputs(repoRoot);
  const root = createRootReleaseManifest(inputs, sourceRevision);
  const extra = structuredClone(root);
  extra.unexpected = true;
  assert.throws(
    () => parseRootReleaseManifest(extra),
    (error) =>
      error instanceof PackageRuntimeError && error.code === "pi-norm-spec/runtime/release-invalid",
  );

  const platform = createPlatformReleaseManifest(
    inputs,
    sourceRevision,
    "aarch64-apple-darwin",
  );
  (platform.source as Record<string, unknown>).revision = "short";
  assert.throws(
    () => parsePlatformReleaseManifest(platform),
    (error) =>
      error instanceof PackageRuntimeError && error.code === "pi-norm-spec/runtime/release-invalid",
  );
});

test("runtime resolver accepts one matching package and returns only bundled paths", async (context) => {
  const fixture = await stageRuntimeFixture("aarch64-apple-darwin");
  context.after(() => fixture.cleanup());
  const runtime = await fixture.resolve({ platform: "darwin", arch: "arm64" });

  assert.equal(runtime.definition.packageName, "@cyanoorg/pi-norm-spec-darwin-arm64");
  assert.equal(runtime.definition.target, "aarch64-apple-darwin");
  assert.equal(runtime.bridgePath, path.join(fixture.packageRoot, "bin", "pi-norm-bridge"));
  assert.equal(runtime.payloadPath, path.join(fixture.packageRoot, "upstream"));
  assert.equal(runtime.normPath, path.join(fixture.packageRoot, "upstream", "bin", "norm"));
  assert.equal(
    runtime.conformancePath,
    path.join(fixture.packageRoot, "upstream", "bin", "norm-spec-conformance"),
  );
});

test("runtime resolver rejects unknown libc, absent packages, unsafe paths, and identity drift", async (context) => {
  assert.throws(
    () => selectPlatformRuntime("linux", "x64", "unknown"),
    (error) =>
      error instanceof PackageRuntimeError &&
      error.code === "pi-norm-spec/runtime/unsupported-platform",
  );
  assert.equal(
    detectLinuxLibc({ header: { glibcVersionRuntime: "2.35" } }),
    "glibc",
  );
  assert.equal(detectLinuxLibc({ header: {} }), "unknown");

  const fixture = await stageRuntimeFixture("x86_64-unknown-linux-gnu");
  context.after(() => fixture.cleanup());
  await assert.rejects(
    fixture.resolve({ platform: "linux", arch: "x64", libc: "glibc", unavailable: true }),
    (error) =>
      error instanceof PackageRuntimeError &&
      error.code === "pi-norm-spec/runtime/package-unavailable",
  );

  await writeJson(path.join(fixture.packageRoot, "runtime.json"), {
    apiVersion: "pi-norm-spec/platform-runtime/v1",
    bridge: "../pi-norm-bridge",
    payload: "upstream",
  });
  await assert.rejects(
    fixture.resolve({ platform: "linux", arch: "x64", libc: "glibc" }),
    (error) =>
      error instanceof PackageRuntimeError && error.code === "pi-norm-spec/runtime/locator-unsafe",
  );

  await fixture.restoreLocator();
  const platformRelease = JSON.parse(
    await readFile(path.join(fixture.packageRoot, "release.json"), "utf8"),
  ) as { source: { revision: string } };
  platformRelease.source.revision = "2".repeat(40);
  await writeJson(path.join(fixture.packageRoot, "release.json"), platformRelease);
  await assert.rejects(
    fixture.resolve({ platform: "linux", arch: "x64", libc: "glibc" }),
    (error) =>
      error instanceof PackageRuntimeError &&
      error.code === "pi-norm-spec/runtime/identity-mismatch",
  );
});

test("launcher emits versioned identity and forwards argv without a shell", async () => {
  const inputs = await loadPackageReleaseInputs(repoRoot);
  const rootRelease = createRootReleaseManifest(inputs, sourceRevision);
  const platformRelease = createPlatformReleaseManifest(
    inputs,
    sourceRevision,
    "aarch64-apple-darwin",
  );
  const runtime = {
    definition: PLATFORM_DEFINITIONS["darwin-arm64"],
    rootRelease,
    platformRelease,
    bridgePath: "/package/bin/pi-norm-bridge",
    payloadPath: "/package/upstream",
    normPath: "/package/upstream/bin/norm",
    conformancePath: "/package/upstream/bin/norm-spec-conformance",
  };
  let stdout = "";
  let stderr = "";
  const identity = await runLauncher(["runtime"], {
    resolveRuntime: async () => runtime,
    stdout: capture((chunk) => (stdout += chunk)),
    stderr: capture((chunk) => (stderr += chunk)),
  });
  assert.deepEqual(identity, { code: 0, signal: null });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout) as Record<string, unknown>;
  assert.equal(output.apiVersion, PACKAGE_RUNTIME_API);
  assert.equal(output.operation, "runtime");
  assert.equal(output.status, "ok");

  let invocation: { command: string; args: string[]; options: Record<string, unknown> } | undefined;
  const spawnProcess = ((command: string, args: string[], options: Record<string, unknown>) => {
    invocation = { command, args, options };
    const child = new EventEmitter();
    setImmediate(() => child.emit("close", 7, null));
    return child;
  }) as never;
  const result = await runLauncher(["norm", "validate", "--root", "a path"], {
    resolveRuntime: async () => runtime,
    spawnProcess,
    stdout: capture(() => undefined),
    stderr: capture(() => undefined),
  });
  assert.deepEqual(result, { code: 7, signal: null });
  assert.deepEqual(invocation, {
    command: runtime.normPath,
    args: ["validate", "--root", "a path"],
    options: { shell: false, stdio: "inherit", windowsHide: true },
  });
});

async function stageRuntimeFixture(target: string) {
  const root = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-runtime-"));
  const packageRoot = path.join(root, "node_modules", packageNameForTarget(target));
  await mkdir(packageRoot, { recursive: true });
  const inputs = await loadPackageReleaseInputs(repoRoot);
  await writeJson(path.join(root, "release.json"), createRootReleaseManifest(inputs, sourceRevision));
  await writeJson(
    path.join(packageRoot, "release.json"),
    createPlatformReleaseManifest(inputs, sourceRevision, target),
  );
  const locator = {
    apiVersion: "pi-norm-spec/platform-runtime/v1",
    bridge: `bin/pi-norm-bridge${target.includes("windows") ? ".exe" : ""}`,
    payload: "upstream",
  };
  const locatorPath = path.join(packageRoot, "runtime.json");
  await writeJson(locatorPath, locator);
  return {
    packageRoot,
    cleanup: () => rm(root, { recursive: true, force: true }),
    restoreLocator: () => writeJson(locatorPath, locator),
    resolve: (options: {
      platform: NodeJS.Platform;
      arch: string;
      libc?: "glibc" | "unknown";
      unavailable?: boolean;
    }) =>
      resolvePackageRuntime({
        platform: options.platform,
        arch: options.arch,
        libc: options.libc,
        rootReleasePath: path.join(root, "release.json"),
        resolvePackagePath: (specifier) => {
          if (options.unavailable) throw new Error("missing");
          assert.equal(specifier, `${packageNameForTarget(target)}/runtime.json`);
          return locatorPath;
        },
      }),
  };
}

function packageNameForTarget(target: string): string {
  const definition = Object.values(PLATFORM_DEFINITIONS).find(
    (candidate) => candidate.target === target,
  );
  assert.ok(definition);
  return definition.packageName;
}

function capture(write: (chunk: string) => void): NodeJS.WritableStream {
  return { write: (chunk: string | Uint8Array) => (write(String(chunk)), true) } as NodeJS.WritableStream;
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
