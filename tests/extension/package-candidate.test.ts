import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

import { PLATFORM_DEFINITIONS } from "../../runtime/package-runtime.js";
import {
  PACKAGE_CANDIDATE_API,
  verifyPackageCandidateSet,
} from "../../scripts/package-candidate.ts";
import { loadPackageReleaseInputs } from "../../scripts/package-release.ts";
import {
  stagePlatformPackage,
  stageRootPackage,
} from "../../scripts/package-staging.ts";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourceRevision = "1".repeat(40);

test("candidate assembly verifies five archives, ten checksummed files, and one source identity", async (context) => {
  const fixture = await stageCandidateSet();
  context.after(() => fixture.cleanup());
  const inventoryFile = path.join(fixture.root, "inventory", "candidate.json");
  const candidate = await verifyPackageCandidateSet(
    repoRoot,
    fixture.artifactRoot,
    sourceRevision,
    inventoryFile,
  );

  assert.equal(candidate.apiVersion, PACKAGE_CANDIDATE_API);
  assert.deepEqual(candidate.source, {
    repository: "https://github.com/CyanoOrg/pi-norm-spec",
    revision: sourceRevision,
  });
  const artifacts = candidate.artifacts as Array<Record<string, unknown>>;
  assert.equal(artifacts.length, 5);
  assert.equal(artifacts[0]?.kind, "root");
  assert.equal(artifacts.filter((artifact) => artifact.kind === "platform").length, 4);
  assert.equal((await readdir(fixture.artifactRoot)).length, 10);
  assert.deepEqual(
    JSON.parse(await readFile(inventoryFile, "utf8")),
    candidate,
  );

  const archive = artifacts[0]?.archive as { file: string; sha256: string; bytes: number };
  const checksum = artifacts[0]?.checksum as { file: string; sha256: string; bytes: number };
  assert.match(archive.sha256, /^[0-9a-f]{64}$/u);
  assert.ok(archive.bytes > 0);
  assert.match(checksum.sha256, /^[0-9a-f]{64}$/u);
  assert.ok(checksum.bytes > 0);
});

test("candidate assembly rejects a checksum that is not bound to its archive", async (context) => {
  const fixture = await stageCandidateSet();
  context.after(() => fixture.cleanup());
  const checksum = path.join(
    fixture.artifactRoot,
    "cyanoorg-pi-norm-spec-0.1.0-alpha.1.tgz.sha256",
  );
  await writeFile(checksum, `${"0".repeat(64)}  cyanoorg-pi-norm-spec-0.1.0-alpha.1.tgz\n`, "utf8");

  await assert.rejects(
    verifyPackageCandidateSet(
      repoRoot,
      fixture.artifactRoot,
      sourceRevision,
      path.join(fixture.root, "inventory", "invalid.json"),
    ),
    /checksum content differs from archive/u,
  );
});

async function stageCandidateSet(): Promise<{
  root: string;
  artifactRoot: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(path.join(tmpdir(), "pi-norm-spec-candidate-"));
  const artifactRoot = path.join(root, "artifacts");
  const stagingRoot = path.join(root, "staging");
  const payloadRoot = path.join(root, "payloads");
  const bridgeRoot = path.join(root, "bridges");
  const npmCache = path.join(root, "npm-cache");
  await mkdir(artifactRoot);
  await mkdir(stagingRoot);
  await mkdir(payloadRoot);
  await mkdir(bridgeRoot);
  const inputs = await loadPackageReleaseInputs(repoRoot);

  const rootPackage = path.join(stagingRoot, "root");
  await stageRootPackage({
    repoRoot,
    packageRoot: rootPackage,
    sourceRevision,
    inputs,
  });
  await npmPack(rootPackage, artifactRoot, npmCache);

  for (const definition of Object.values(PLATFORM_DEFINITIONS)) {
    const payload = path.join(payloadRoot, definition.platformKey);
    const bridge = path.join(
      bridgeRoot,
      `pi-norm-bridge${definition.os === "win32" ? ".exe" : ""}`,
    );
    await writeFile(bridge, `bridge:${definition.target}\n`, "utf8");
    await stagePayload(payload, definition.target, inputs);
    const packageRoot = path.join(stagingRoot, definition.platformKey);
    await stagePlatformPackage({
      repoRoot,
      packageRoot,
      sourceRevision,
      bridge,
      payload,
      target: definition.target,
      inputs,
    });
    await npmPack(packageRoot, artifactRoot, npmCache);
  }

  for (const file of await readdir(artifactRoot)) {
    if (!file.endsWith(".tgz")) continue;
    const archive = path.join(artifactRoot, file);
    const sha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
    await writeFile(`${archive}.sha256`, `${sha256}  ${file}\n`, "utf8");
  }
  return {
    root,
    artifactRoot,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

async function stagePayload(
  payload: string,
  target: string,
  inputs: Awaited<ReturnType<typeof loadPackageReleaseInputs>>,
): Promise<void> {
  const asset = inputs.upstreamPin.assets.find((candidate) => candidate.target === target);
  assert.ok(asset);
  const compatibility = inputs.upstreamPin.compatibility;
  const conformance = compatibility.conformance as Record<string, unknown>;
  const windows = target === "x86_64-pc-windows-msvc";
  const files = new Map<string, string>([
    ["archive.sha256", `${asset.sha256}  ${asset.name}\n`],
    ["contract/bundle.lock.json", "{}\n"],
    [`bin/norm${windows ? ".exe" : ""}`, "norm\n"],
    [`bin/norm-spec-conformance${windows ? ".exe" : ""}`, "conformance\n"],
    ["skills/norm-spec/SKILL.md", "# norm-spec\n"],
  ]);
  const releaseManifest = {
    apiVersion: "norm-spec/release-artifact/v1",
    product: compatibility.product,
    target,
    sourceRevision: inputs.upstreamPin.sourceRevision,
    executables: {
      norm: `bin/norm${windows ? ".exe" : ""}`,
      conformance: `bin/norm-spec-conformance${windows ? ".exe" : ""}`,
    },
    compatibilityApi: compatibility.apiVersion,
    contract: {
      path: "contract",
      bundleApi: conformance.bundleApi,
      reportApi: conformance.reportApi,
      suite: conformance.suite,
      caseCount: conformance.caseCount,
      contractDigest: conformance.contractDigest,
    },
    skill: { path: "skills/norm-spec" },
  };
  files.set("release-manifest.json", `${JSON.stringify(releaseManifest, null, 2)}\n`);

  for (const [file, source] of files) {
    const destination = path.join(payload, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, source, "utf8");
  }
  const lock = {
    apiVersion: "pi-norm-spec/upstream-payload/v1",
    repository: inputs.upstreamPin.repository,
    tag: inputs.upstreamPin.tag,
    sourceRevision: inputs.upstreamPin.sourceRevision,
    asset,
    files: [...files.entries()].map(([file, source]) => ({
      path: file,
      sha256: createHash("sha256").update(source).digest("hex"),
    })),
  };
  await writeFile(
    path.join(payload, "pi-norm-spec-payload.lock.json"),
    `${JSON.stringify(lock, null, 2)}\n`,
    "utf8",
  );
}

async function npmPack(
  packageRoot: string,
  artifactRoot: string,
  npmCache: string,
): Promise<void> {
  const npmExecPath = process.env.npm_execpath;
  if (process.platform === "win32" && npmExecPath === undefined) {
    throw new Error("npm_execpath is required to run package candidate tests on Windows");
  }
  const command = npmExecPath === undefined ? "npm" : process.execPath;
  const args = npmExecPath === undefined ? [] : [npmExecPath];
  await execFileAsync(
    command,
    [
      ...args,
      "pack",
      packageRoot,
      "--ignore-scripts",
      "--pack-destination",
      artifactRoot,
      "--cache",
      npmCache,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    },
  );
}
