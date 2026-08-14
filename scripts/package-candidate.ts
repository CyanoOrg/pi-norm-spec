import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  PACKAGE_RELEASE_API,
  PLATFORM_DEFINITIONS,
  parsePlatformReleaseManifest,
  parseRootReleaseManifest,
  parseRuntimeLocator,
} from "../runtime/package-runtime.js";
import {
  createPlatformReleaseManifest,
  createRootReleaseManifest,
  loadPackageReleaseInputs,
} from "./package-release.ts";

export const PACKAGE_CANDIDATE_API = "pi-norm-spec/package-candidate/v1";

const execFileAsync = promisify(execFile);
const SOURCE_REVISION = /^[0-9a-f]{40}$/u;
const SHA_256 = /^[0-9a-f]{64}$/u;
const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;

export interface VerifiedPackageArchive {
  packageName: string;
  version: string;
  kind: "root" | "platform";
  target: string | null;
  archive: { file: string; sha256: string; bytes: number };
  release: Record<string, unknown>;
}

export async function verifyPackageArchive(
  repoRoot: string,
  archive: string,
  expectedSourceRevision: string,
): Promise<VerifiedPackageArchive> {
  assert.match(expectedSourceRevision, SOURCE_REVISION);
  const archiveStat = await lstat(archive);
  assert.ok(archiveStat.isFile() && !archiveStat.isSymbolicLink(), `unsafe archive: ${archive}`);
  assert.ok(archiveStat.size > 0 && archiveStat.size <= MAX_ARCHIVE_BYTES, `archive size is outside bounds: ${archive}`);

  const members = (await runTar(archive, ["-tzf"]))
    .split(/\r?\n/u)
    .filter((member) => member.length > 0)
    .map((member) => member.replace(/^\.\//u, ""));
  assert.ok(members.length > 0, "package archive is empty");
  for (const member of members) {
    assert.equal(isSafeMember(member), true, `package archive contains unsafe path: ${member}`);
    assert.equal(member === "package" || member.startsWith("package/"), true, `package archive escaped its root: ${member}`);
  }
  const verbose = await runTar(archive, ["-tvzf"]);
  assert.equal(
    verbose.split(/\r?\n/u).some((line) => /^[lh]/u.test(line.trimStart())),
    false,
    "package archive contains a symbolic or hard link",
  );

  const packageManifest = await readTarJson(archive, "package/package.json");
  assert.ok(isRecord(packageManifest));
  if (typeof packageManifest.name !== "string" || typeof packageManifest.version !== "string") {
    throw new Error("packed package identity must contain string name and version");
  }
  const packageName = packageManifest.name;
  const version = packageManifest.version;
  assert.equal(path.basename(archive), `${packageName}-${version}.tgz`, "archive name differs from package identity");

  const inputs = await loadPackageReleaseInputs(repoRoot);
  assert.equal(version, inputs.rootManifest.version);
  const sourceManifest = JSON.parse(
    await readFile(path.join(repoRoot, "packages", packageName, "package.json"), "utf8"),
  ) as unknown;
  assert.deepEqual(packageManifest, sourceManifest, "packed package.json differs from source input");

  const release = await readTarJson(archive, "package/release.json");
  const definition = Object.values(PLATFORM_DEFINITIONS).find(
    (candidate) => candidate.packageName === packageName,
  );
  if (packageName === inputs.rootManifest.name) {
    parseRootReleaseManifest(release);
    assert.deepEqual(
      release,
      createRootReleaseManifest(inputs, expectedSourceRevision),
      "root release manifest differs from the exact source candidate",
    );
    verifyRootInventory(members);
  } else {
    assert.ok(definition, `unsupported platform package: ${packageName}`);
    parsePlatformReleaseManifest(release);
    assert.deepEqual(
      release,
      createPlatformReleaseManifest(inputs, expectedSourceRevision, definition.target),
      "platform release manifest differs from the exact source candidate",
    );
    parseRuntimeLocator(await readTarJson(archive, "package/runtime.json"));
    verifyPlatformInventory(members, definition.os === "win32" ? ".exe" : "");
    await verifyBundledPayload(archive, members, inputs.upstreamPin, definition.target);
  }

  return {
    packageName,
    version,
    kind: packageName === inputs.rootManifest.name ? "root" : "platform",
    target: definition?.target ?? null,
    archive: {
      file: path.basename(archive),
      sha256: await sha256File(archive),
      bytes: archiveStat.size,
    },
    release: release as Record<string, unknown>,
  };
}

async function verifyBundledPayload(
  archive: string,
  members: readonly string[],
  upstreamPin: Awaited<ReturnType<typeof loadPackageReleaseInputs>>["upstreamPin"],
  target: string,
): Promise<void> {
  const asset = upstreamPin.assets.find((candidate) => candidate.target === target);
  assert.ok(asset, `upstream pin omitted target: ${target}`);
  const compatibility = upstreamPin.compatibility as {
    apiVersion?: unknown;
    product?: unknown;
    conformance?: unknown;
  };
  assert.ok(isRecord(compatibility.product), "upstream product identity is malformed");
  assert.ok(isRecord(compatibility.conformance), "upstream conformance identity is malformed");
  const conformance = compatibility.conformance;
  const windows = target === "x86_64-pc-windows-msvc";
  const releaseManifest = await readTarJson(
    archive,
    "package/upstream/release-manifest.json",
  );
  assert.deepEqual(releaseManifest, {
    apiVersion: "norm-spec/release-artifact/v1",
    product: compatibility.product,
    target,
    sourceRevision: upstreamPin.sourceRevision,
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
  }, "bundled upstream release manifest differs from the exact pin");

  const lock = await readTarJson(
    archive,
    "package/upstream/pi-norm-spec-payload.lock.json",
  );
  assert.ok(isRecord(lock), "bundled upstream payload lock is malformed");
  assert.deepEqual(
    Object.keys(lock).sort(),
    ["apiVersion", "asset", "files", "repository", "sourceRevision", "tag"],
    "bundled upstream payload lock has an unexpected shape",
  );
  assert.equal(lock.apiVersion, "pi-norm-spec/upstream-payload/v1");
  assert.equal(lock.repository, upstreamPin.repository);
  assert.equal(lock.tag, upstreamPin.tag);
  assert.equal(lock.sourceRevision, upstreamPin.sourceRevision);
  assert.deepEqual(lock.asset, asset);
  assert.ok(Array.isArray(lock.files) && lock.files.length > 0, "payload lock files are empty");

  const lockedFiles = new Map<string, string>();
  for (const value of lock.files) {
    assert.ok(isRecord(value), "payload lock file entry is malformed");
    if (typeof value.path !== "string" || typeof value.sha256 !== "string") {
      throw new Error("payload lock file identity is malformed");
    }
    const lockedPath = value.path;
    const lockedSha256 = value.sha256;
    assert.equal(isSafeMember(lockedPath), true, `payload lock path is unsafe: ${lockedPath}`);
    assert.match(lockedSha256, SHA_256, `payload lock digest is malformed: ${lockedPath}`);
    assert.equal(lockedFiles.has(lockedPath), false, `payload lock path is duplicated: ${lockedPath}`);
    lockedFiles.set(lockedPath, lockedSha256);
  }
  for (const required of [
    "archive.sha256",
    "contract/bundle.lock.json",
    `bin/norm${windows ? ".exe" : ""}`,
    `bin/norm-spec-conformance${windows ? ".exe" : ""}`,
    "release-manifest.json",
    "skills/norm-spec/SKILL.md",
  ]) {
    assert.equal(lockedFiles.has(required), true, `payload lock omitted ${required}`);
  }

  const payloadPrefix = "package/upstream/";
  const actualPayloadFiles = members
    .filter((member) => member.startsWith(payloadPrefix) && !member.endsWith("/"))
    .map((member) => member.slice(payloadPrefix.length))
    .sort();
  const expectedPayloadFiles = [
    ...lockedFiles.keys(),
    "pi-norm-spec-payload.lock.json",
  ].sort();
  assert.deepEqual(
    actualPayloadFiles,
    expectedPayloadFiles,
    "bundled upstream inventory differs from the sealed payload lock",
  );
  for (const [file, sha256] of lockedFiles) {
    const content = await readTarBuffer(archive, `${payloadPrefix}${file}`);
    assert.equal(
      createHash("sha256").update(content).digest("hex"),
      sha256,
      `bundled upstream file differs from its payload lock: ${file}`,
    );
  }
  assert.equal(
    (await readTarBuffer(archive, `${payloadPrefix}archive.sha256`)).toString("utf8"),
    `${asset.sha256}  ${asset.name}\n`,
    "bundled upstream archive checksum differs from the exact pin",
  );
}

export async function verifyPackageCandidateSet(
  repoRoot: string,
  artifactRoot: string,
  expectedSourceRevision: string,
  output: string,
): Promise<Record<string, unknown>> {
  assert.match(expectedSourceRevision, SOURCE_REVISION);
  const inputs = await loadPackageReleaseInputs(repoRoot);
  const packageNames = [inputs.rootManifest.name, ...inputs.platformManifests.keys()].sort();
  const expectedFiles = packageNames
    .flatMap((packageName) => [
      `${packageName}-${inputs.rootManifest.version}.tgz`,
      `${packageName}-${inputs.rootManifest.version}.tgz.sha256`,
    ])
    .sort();
  const actualFiles = (await readdir(artifactRoot)).sort();
  assert.deepEqual(actualFiles, expectedFiles, "candidate directory must contain exactly five archives and five checksums");

  const verified = [];
  for (const packageName of packageNames) {
    const archiveFile = `${packageName}-${inputs.rootManifest.version}.tgz`;
    const checksumFile = `${archiveFile}.sha256`;
    const archivePath = path.join(artifactRoot, archiveFile);
    const checksumPath = path.join(artifactRoot, checksumFile);
    const archive = await verifyPackageArchive(repoRoot, archivePath, expectedSourceRevision);
    const checksumStat = await lstat(checksumPath);
    assert.ok(checksumStat.isFile() && !checksumStat.isSymbolicLink(), `unsafe checksum: ${checksumPath}`);
    const checksumSource = await readFile(checksumPath, "utf8");
    assert.equal(
      checksumSource,
      `${archive.archive.sha256}  ${archiveFile}\n`,
      `checksum content differs from archive: ${archiveFile}`,
    );
    verified.push({
      packageName: archive.packageName,
      version: archive.version,
      kind: archive.kind,
      target: archive.target,
      archive: archive.archive,
      checksum: {
        file: checksumFile,
        sha256: await sha256File(checksumPath),
        bytes: checksumStat.size,
      },
    });
  }

  verified.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "root" ? -1 : 1;
    return left.packageName.localeCompare(right.packageName);
  });
  const rootRelease = createRootReleaseManifest(inputs, expectedSourceRevision);
  const candidate = {
    apiVersion: PACKAGE_CANDIDATE_API,
    product: rootRelease.product,
    source: rootRelease.source,
    packageReleaseApi: PACKAGE_RELEASE_API,
    upstream: rootRelease.upstream,
    artifacts: verified,
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(candidate, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return candidate;
}

function verifyRootInventory(members: readonly string[]): void {
  for (const required of [
    "package/LICENSE",
    "package/README.md",
    "package/package.json",
    "package/release.json",
    "package/bin/pi-norm-spec.js",
    "package/extensions/norm-context.ts",
    "package/runtime/launcher.js",
    "package/runtime/package-runtime.js",
    "package/skills/pi-norm-spec/SKILL.md",
  ]) {
    assert.equal(members.includes(required), true, `root package omitted ${required}`);
  }
  assert.equal(members.length <= 32, true, "root package inventory is unexpectedly large");
  assert.equal(
    members.some((member) => /^package\/(crates|node_modules|packages|scripts|target|tests)(\/|$)/u.test(member)),
    false,
    "root package contains development-only directories",
  );
}

function verifyPlatformInventory(members: readonly string[], executableSuffix: string): void {
  for (const required of [
    "package/LICENSE",
    "package/README.md",
    "package/package.json",
    "package/release.json",
    "package/runtime.json",
    `package/bin/pi-norm-bridge${executableSuffix}`,
    "package/upstream/release-manifest.json",
    "package/upstream/pi-norm-spec-payload.lock.json",
  ]) {
    assert.equal(members.includes(required), true, `platform package omitted ${required}`);
  }
  assert.equal(members.length <= 2_048, true, "platform package inventory is unexpectedly large");
  assert.equal(
    members.some((member) => /^package\/(crates|node_modules|packages|scripts|src|target|tests)(\/|$)/u.test(member)),
    false,
    "platform package contains development-only directories",
  );
}

function isSafeMember(member: string): boolean {
  return !(
    member.length === 0 ||
    member.startsWith("/") ||
    member.startsWith("../") ||
    member.includes("/../") ||
    member.endsWith("/..") ||
    member.includes("\\") ||
    path.posix.isAbsolute(member) ||
    path.win32.isAbsolute(member)
  );
}

async function readTarJson(archive: string, member: string): Promise<unknown> {
  return JSON.parse(await runTar(archive, ["-xOzf", member]));
}

async function readTarBuffer(archive: string, member: string): Promise<Buffer> {
  const invocation = tarInvocation(archive, ["-xOzf", member]);
  const { stdout } = await execFileAsync("tar", invocation.args, {
    cwd: invocation.cwd,
    encoding: "buffer",
    maxBuffer: MAX_ARCHIVE_BYTES,
  });
  return stdout;
}

async function runTar(archive: string, args: readonly string[]): Promise<string> {
  const invocation = tarInvocation(archive, args);
  const { stdout } = await execFileAsync("tar", invocation.args, {
    cwd: invocation.cwd,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout;
}

function tarInvocation(archive: string, args: readonly string[]): {
  cwd: string;
  args: string[];
} {
  const [operation, ...members] = args;
  assert.ok(operation, "tar operation is required");
  // GNU tar treats a Windows drive-letter colon as remote archive syntax.
  return {
    cwd: path.dirname(archive),
    args: [operation, path.basename(archive), ...members],
  };
}

async function sha256File(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
