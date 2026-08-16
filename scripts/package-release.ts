import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PACKAGE_RELEASE_API,
  PACKAGE_RUNTIME_API,
  PLATFORM_DEFINITIONS,
  PLATFORM_RUNTIME_API,
  parsePlatformReleaseManifest,
  parseRootReleaseManifest,
} from "../runtime/package-runtime.js";

const SOURCE_REVISION = /^[0-9a-f]{40}$/u;

interface PublishManifest {
  name: string;
  version: string;
  repository: string;
  normSpec?: Record<string, unknown>;
  optionalDependencies?: Record<string, string>;
}

interface UpstreamPin {
  repository: string;
  tag: string;
  sourceRevision: string;
  compatibility: Record<string, unknown>;
  assets: Array<{ target: string; name: string; sha256: string }>;
}

export interface PackageReleaseInputs {
  rootManifest: PublishManifest;
  platformManifests: ReadonlyMap<string, PublishManifest>;
  upstreamPin: UpstreamPin;
  piHostVersion: string;
}

export async function loadPackageReleaseInputs(repoRoot: string): Promise<PackageReleaseInputs> {
  /** Directory under packages/ holding one platform publish manifest. */
function platformDir(definition: { packageName: string }): string {
  return definition.packageName.replace("@cyanoorg/pi-norm-spec-", "");
}

const development = await readJson<{
    version?: unknown;
    normSpec?: unknown;
    devDependencies?: Record<string, unknown>;
  }>(path.join(repoRoot, "package.json"));
  const rootManifest = await readPublishManifest(
    path.join(repoRoot, "packages", "root", "package.json"),
  );
  assert.equal(rootManifest.version, development.version, "development and publish versions differ");
  assert.deepEqual(rootManifest.normSpec, development.normSpec, "development and publish API identities differ");

  const piHostVersion = development.devDependencies?.["@earendil-works/pi-coding-agent"];
  if (typeof piHostVersion !== "string") throw new Error("tested pi host version is missing");

  const platformManifests = new Map<string, PublishManifest>();
  for (const definition of Object.values(PLATFORM_DEFINITIONS)) {
    const manifest = await readPublishManifest(
      path.join(repoRoot, "packages", platformDir(definition), "package.json"),
    );
    assert.equal(manifest.name, definition.packageName);
    assert.equal(manifest.version, rootManifest.version);
    platformManifests.set(definition.packageName, manifest);
  }

  const expectedDependencies = Object.fromEntries(
    [...platformManifests.values()].map((manifest) => [manifest.name, manifest.version]),
  );
  assert.deepEqual(
    rootManifest.optionalDependencies,
    expectedDependencies,
    "root optional dependencies must equal every exact platform package version",
  );

  const upstreamPin = await readJson<UpstreamPin>(
    path.join(repoRoot, "crates", "pi-norm-engine", "assets", "norm-spec-v0.1.0-rc.1.json"),
  );
  assert.equal(upstreamPin.assets.length, 4, "upstream pin must contain four assets");
  return { rootManifest, platformManifests, upstreamPin, piHostVersion };
}

export function createRootReleaseManifest(
  inputs: PackageReleaseInputs,
  sourceRevision: string,
): Record<string, unknown> {
  const common = createCommonRelease(inputs, sourceRevision);
  const packages = Object.values(PLATFORM_DEFINITIONS)
    .map((definition) => ({
      packageName: definition.packageName,
      version: inputs.rootManifest.version,
      platformKey: definition.platformKey,
      target: definition.target,
    }))
    .sort((left, right) => left.packageName.localeCompare(right.packageName));
  const manifest = { ...common, kind: "root", packages };
  parseRootReleaseManifest(manifest);
  return manifest;
}

export function createPlatformReleaseManifest(
  inputs: PackageReleaseInputs,
  sourceRevision: string,
  target: string,
): Record<string, unknown> {
  const definition = Object.values(PLATFORM_DEFINITIONS).find(
    (candidate) => candidate.target === target,
  );
  assert.ok(definition, `unsupported package target: ${target}`);
  const platformManifest = inputs.platformManifests.get(definition.packageName);
  assert.ok(platformManifest, `publish manifest is missing: ${definition.packageName}`);
  const manifest = {
    ...createCommonRelease(inputs, sourceRevision),
    kind: "platform",
    package: {
      packageName: definition.packageName,
      version: platformManifest.version,
      platformKey: definition.platformKey,
      target: definition.target,
    },
  };
  parsePlatformReleaseManifest(manifest);
  return manifest;
}

function createCommonRelease(
  inputs: PackageReleaseInputs,
  sourceRevision: string,
): Record<string, unknown> {
  assert.match(sourceRevision, SOURCE_REVISION, "source revision must be a full lowercase Git SHA");
  const normSpec = inputs.rootManifest.normSpec;
  assert.ok(normSpec, "root publish manifest normSpec identity is missing");
  const api = (name: string): string => {
    const value = normSpec[name];
    if (typeof value !== "string") throw new Error(`normSpec.${name} must be a string`);
    return value;
  };
  assert.equal(api("platformRuntimeApi"), PLATFORM_RUNTIME_API);
  assert.equal(api("packageReleaseApi"), PACKAGE_RELEASE_API);
  assert.equal(api("packageRuntimeApi"), PACKAGE_RUNTIME_API);

  return {
    apiVersion: PACKAGE_RELEASE_API,
    product: { name: inputs.rootManifest.name, version: inputs.rootManifest.version },
    source: { repository: inputs.rootManifest.repository, revision: sourceRevision },
    apis: {
      bridge: api("bridgeApi"),
      promptContext: api("promptContextApi"),
      platformRuntime: api("platformRuntimeApi"),
      packageRelease: api("packageReleaseApi"),
      packageRuntime: api("packageRuntimeApi"),
    },
    host: {
      package: "@earendil-works/pi-coding-agent",
      version: inputs.piHostVersion,
    },
    upstream: {
      repository: inputs.upstreamPin.repository,
      tag: inputs.upstreamPin.tag,
      sourceRevision: inputs.upstreamPin.sourceRevision,
      compatibility: inputs.upstreamPin.compatibility,
      assets: inputs.upstreamPin.assets.map(({ target, name, sha256 }) => ({ target, name, sha256 })),
    },
  };
}

async function readPublishManifest(file: string): Promise<PublishManifest> {
  const manifest = await readJson<Partial<PublishManifest>>(file);
  assert.equal(typeof manifest.name, "string", `package name is missing: ${file}`);
  assert.equal(typeof manifest.version, "string", `package version is missing: ${file}`);
  assert.equal(typeof manifest.repository, "string", `package repository is missing: ${file}`);
  return manifest as PublishManifest;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}
