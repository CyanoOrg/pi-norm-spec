import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

export const PACKAGE_RELEASE_API = "pi-norm-spec/package-release/v1";
export const PACKAGE_RUNTIME_API = "pi-norm-spec/package-runtime/v1";
export const PLATFORM_RUNTIME_API = "pi-norm-spec/platform-runtime/v1";

const MAX_MANIFEST_BYTES = 64 * 1024;
const SHA_256 = /^[0-9a-f]{64}$/u;
const SOURCE_REVISION = /^[0-9a-f]{40}$/u;

/** @typedef {"glibc" | "unknown"} LinuxLibc */
/**
 * @typedef {object} PlatformDefinition
 * @property {string} packageName
 * @property {string} platformKey
 * @property {string} target
 * @property {string} os
 * @property {string} cpu
 * @property {LinuxLibc | undefined} libc
 */

/** @type {Readonly<Record<string, PlatformDefinition>>} */
export const PLATFORM_DEFINITIONS = Object.freeze({
  "darwin-arm64": Object.freeze({
    packageName: "pi-norm-spec-darwin-arm64",
    platformKey: "darwin-arm64",
    target: "aarch64-apple-darwin",
    os: "darwin",
    cpu: "arm64",
    libc: undefined,
  }),
  "darwin-x64": Object.freeze({
    packageName: "pi-norm-spec-darwin-x64",
    platformKey: "darwin-x64",
    target: "x86_64-apple-darwin",
    os: "darwin",
    cpu: "x64",
    libc: undefined,
  }),
  "linux-x64-glibc": Object.freeze({
    packageName: "pi-norm-spec-linux-x64",
    platformKey: "linux-x64-glibc",
    target: "x86_64-unknown-linux-gnu",
    os: "linux",
    cpu: "x64",
    libc: "glibc",
  }),
  "win32-x64": Object.freeze({
    packageName: "pi-norm-spec-win32-x64",
    platformKey: "win32-x64",
    target: "x86_64-pc-windows-msvc",
    os: "win32",
    cpu: "x64",
    libc: undefined,
  }),
});

export class PackageRuntimeError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {string | undefined} [manifestPath]
   */
  constructor(code, message, manifestPath) {
    super(message);
    this.name = "PackageRuntimeError";
    this.code = code;
    this.path = manifestPath;
  }
}

/**
 * Resolve the current platform package, release identities, and executable paths.
 *
 * @param {{
 *   platform?: NodeJS.Platform,
 *   arch?: string,
 *   libc?: LinuxLibc,
 *   report?: unknown,
 *   rootReleasePath?: string,
 *   resolvePackagePath?: (specifier: string) => string,
 * }} [options]
 */
export async function resolvePackageRuntime(options = {}) {
  const definition = selectPlatformRuntime(
    options.platform ?? process.platform,
    options.arch ?? process.arch,
    options.libc ?? detectLinuxLibc(options.report),
  );
  const rootReleasePath =
    options.rootReleasePath ?? fileURLToPath(new URL("../release.json", import.meta.url));
  const rootRelease = parseRootReleaseManifest(
    await readManifest(rootReleasePath, "pi-norm-spec/runtime/root-release-invalid"),
    rootReleasePath,
  );

  const resolvePackagePath =
    options.resolvePackagePath ?? createRequire(import.meta.url).resolve;
  let locatorPath;
  try {
    locatorPath = resolvePackagePath(`${definition.packageName}/runtime.json`);
  } catch {
    throw new PackageRuntimeError(
      "pi-norm-spec/runtime/package-unavailable",
      `required platform runtime package is unavailable: ${definition.packageName}`,
    );
  }

  const packageRoot = path.dirname(locatorPath);
  const platformReleasePath = path.join(packageRoot, "release.json");
  const platformRelease = parsePlatformReleaseManifest(
    await readManifest(platformReleasePath, "pi-norm-spec/runtime/platform-release-invalid"),
    platformReleasePath,
  );
  matchReleaseIdentity(rootRelease, platformRelease, definition);

  const locator = /** @type {{apiVersion: string, bridge: string, payload: string}} */ (
    parseRuntimeLocator(
      await readManifest(locatorPath, "pi-norm-spec/runtime/locator-invalid"),
      locatorPath,
    )
  );
  const payloadPath = resolvePortablePath(packageRoot, locator.payload, "payload");
  const executableSuffix = definition.os === "win32" ? ".exe" : "";
  return {
    definition,
    rootRelease,
    platformRelease,
    bridgePath: resolvePortablePath(packageRoot, locator.bridge, "bridge"),
    payloadPath,
    normPath: path.join(payloadPath, "bin", `norm${executableSuffix}`),
    conformancePath: path.join(
      payloadPath,
      "bin",
      `norm-spec-conformance${executableSuffix}`,
    ),
  };
}

/**
 * @param {NodeJS.Platform} platform
 * @param {string} arch
 * @param {LinuxLibc} libc
 * @returns {PlatformDefinition}
 */
export function selectPlatformRuntime(platform, arch, libc) {
  const key = platform === "linux" ? `${platform}-${arch}-${libc}` : `${platform}-${arch}`;
  const definition = PLATFORM_DEFINITIONS[key];
  if (!definition) {
    throw new PackageRuntimeError(
      "pi-norm-spec/runtime/unsupported-platform",
      `pi-norm-spec has no runtime package for ${key}`,
    );
  }
  return definition;
}

/**
 * Treat only a positive Node process-report glibc identity as supported.
 *
 * @param {unknown} [providedReport]
 * @returns {LinuxLibc}
 */
export function detectLinuxLibc(providedReport) {
  let report = providedReport;
  if (report === undefined) {
    try {
      report = process.report?.getReport();
    } catch {
      return "unknown";
    }
  }
  if (!isRecord(report) || !isRecord(report.header)) return "unknown";
  return typeof report.header.glibcVersionRuntime === "string" &&
    report.header.glibcVersionRuntime.length > 0
    ? "glibc"
    : "unknown";
}

/**
 * @param {unknown} value
 * @param {string | undefined} [manifestPath]
 */
export function parseRootReleaseManifest(value, manifestPath) {
  requireRecord(value, "root release manifest", manifestPath);
  requireExactKeys(
    value,
    ["apiVersion", "kind", "product", "source", "apis", "host", "upstream", "packages"],
    "root release manifest",
    manifestPath,
  );
  requireLiteral(value.apiVersion, PACKAGE_RELEASE_API, "apiVersion", manifestPath);
  requireLiteral(value.kind, "root", "kind", manifestPath);
  parseCommonRelease(value, manifestPath);
  const packages = requireRecordArray(value.packages, "packages", manifestPath);
  if (packages.length !== Object.keys(PLATFORM_DEFINITIONS).length) {
    invalidRelease("packages must contain exactly four platform entries", manifestPath);
  }
  const product = /** @type {Record<string, unknown>} */ (value.product);
  const seen = new Set();
  for (const entry of packages) {
    parsePackageIdentity(entry, "packages entry", manifestPath);
    const key = `${entry.packageName}:${entry.platformKey}:${entry.target}`;
    if (seen.has(key)) invalidRelease("packages contains a duplicate entry", manifestPath);
    seen.add(key);
    const definition = Object.values(PLATFORM_DEFINITIONS).find(
      (candidate) => candidate.packageName === entry.packageName,
    );
    if (
      !definition ||
      entry.platformKey !== definition.platformKey ||
      entry.target !== definition.target ||
      entry.version !== product.version
    ) {
      invalidRelease("packages contains an unsupported or mismatched platform identity", manifestPath);
    }
  }
  return value;
}

/**
 * @param {unknown} value
 * @param {string | undefined} [manifestPath]
 */
export function parsePlatformReleaseManifest(value, manifestPath) {
  requireRecord(value, "platform release manifest", manifestPath);
  requireExactKeys(
    value,
    ["apiVersion", "kind", "product", "source", "apis", "host", "upstream", "package"],
    "platform release manifest",
    manifestPath,
  );
  requireLiteral(value.apiVersion, PACKAGE_RELEASE_API, "apiVersion", manifestPath);
  requireLiteral(value.kind, "platform", "kind", manifestPath);
  parseCommonRelease(value, manifestPath);
  requireRecord(value.package, "package", manifestPath);
  parsePackageIdentity(value.package, "package", manifestPath);
  return value;
}

/**
 * @param {unknown} value
 * @param {string | undefined} [manifestPath]
 */
export function parseRuntimeLocator(value, manifestPath) {
  requireRecord(value, "platform runtime locator", manifestPath, "locator");
  requireExactKeys(value, ["apiVersion", "bridge", "payload"], "platform runtime locator", manifestPath, "locator");
  if (
    value.apiVersion !== PLATFORM_RUNTIME_API ||
    typeof value.bridge !== "string" ||
    typeof value.payload !== "string"
  ) {
    invalidLocator("platform runtime locator has an unexpected schema or API", manifestPath);
  }
  return value;
}

/**
 * @param {string} root
 * @param {string} relative
 * @param {string} field
 */
export function resolvePortablePath(root, relative, field) {
  const segments = relative.split("/");
  if (
    relative.length === 0 ||
    relative.includes("\\") ||
    path.posix.isAbsolute(relative) ||
    path.win32.isAbsolute(relative) ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new PackageRuntimeError(
      "pi-norm-spec/runtime/locator-unsafe",
      `platform runtime ${field} path is not safe and relative`,
    );
  }
  return path.join(root, ...segments);
}

/**
 * @param {Record<string, unknown>} rootRelease
 * @param {Record<string, unknown>} platformRelease
 * @param {PlatformDefinition} definition
 */
function matchReleaseIdentity(rootRelease, platformRelease, definition) {
  for (const field of ["product", "source", "apis", "host", "upstream"]) {
    if (!isDeepStrictEqual(rootRelease[field], platformRelease[field])) {
      identityMismatch(`root and platform release ${field} identities differ`);
    }
  }
  const product = /** @type {Record<string, unknown>} */ (rootRelease.product);
  if (product.name !== "pi-norm-spec") {
    identityMismatch("root release product name is not pi-norm-spec");
  }
  const packages = /** @type {Array<Record<string, unknown>>} */ (rootRelease.packages);
  const selected = packages.filter((entry) => entry.packageName === definition.packageName);
  if (selected.length !== 1) {
    identityMismatch(`root release does not select exactly one ${definition.packageName}`);
  }
  const platformPackage = /** @type {Record<string, unknown>} */ (platformRelease.package);
  if (!isDeepStrictEqual(selected[0], platformPackage)) {
    identityMismatch("root and platform package identities differ");
  }
  if (
    platformPackage.platformKey !== definition.platformKey ||
    platformPackage.target !== definition.target ||
    platformPackage.version !== product.version
  ) {
    identityMismatch("platform release target or version differs from the selected runtime");
  }
  const upstream = /** @type {Record<string, unknown>} */ (rootRelease.upstream);
  const assets = /** @type {Array<Record<string, unknown>>} */ (upstream.assets);
  if (assets.filter((asset) => asset.target === definition.target).length !== 1) {
    identityMismatch("upstream release does not contain exactly one selected target asset");
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {string | undefined} manifestPath
 */
function parseCommonRelease(value, manifestPath) {
  requireRecord(value.product, "product", manifestPath);
  requireExactKeys(value.product, ["name", "version"], "product", manifestPath);
  requireNonEmptyString(value.product.name, "product.name", manifestPath);
  requireNonEmptyString(value.product.version, "product.version", manifestPath);

  requireRecord(value.source, "source", manifestPath);
  requireExactKeys(value.source, ["repository", "revision"], "source", manifestPath);
  requireNonEmptyString(value.source.repository, "source.repository", manifestPath);
  requirePattern(value.source.revision, SOURCE_REVISION, "source.revision", manifestPath);

  requireRecord(value.apis, "apis", manifestPath);
  requireExactKeys(
    value.apis,
    ["bridge", "promptContext", "platformRuntime", "packageRelease", "packageRuntime"],
    "apis",
    manifestPath,
  );
  requireNonEmptyString(value.apis.bridge, "apis.bridge", manifestPath);
  requireNonEmptyString(value.apis.promptContext, "apis.promptContext", manifestPath);
  requireNonEmptyString(value.apis.platformRuntime, "apis.platformRuntime", manifestPath);
  requireLiteral(value.apis.packageRelease, PACKAGE_RELEASE_API, "apis.packageRelease", manifestPath);
  requireLiteral(value.apis.packageRuntime, PACKAGE_RUNTIME_API, "apis.packageRuntime", manifestPath);

  requireRecord(value.host, "host", manifestPath);
  requireExactKeys(value.host, ["package", "version"], "host", manifestPath);
  requireNonEmptyString(value.host.package, "host.package", manifestPath);
  requireNonEmptyString(value.host.version, "host.version", manifestPath);

  parseUpstream(value.upstream, manifestPath);
}

/**
 * @param {unknown} value
 * @param {string | undefined} manifestPath
 */
function parseUpstream(value, manifestPath) {
  requireRecord(value, "upstream", manifestPath);
  requireExactKeys(
    value,
    ["repository", "tag", "sourceRevision", "compatibility", "assets"],
    "upstream",
    manifestPath,
  );
  requireNonEmptyString(value.repository, "upstream.repository", manifestPath);
  requireNonEmptyString(value.tag, "upstream.tag", manifestPath);
  requirePattern(value.sourceRevision, SOURCE_REVISION, "upstream.sourceRevision", manifestPath);

  requireRecord(value.compatibility, "upstream.compatibility", manifestPath);
  requireExactKeys(
    value.compatibility,
    ["apiVersion", "product", "formats", "rustApi", "machineApis", "conformance"],
    "upstream.compatibility",
    manifestPath,
  );
  requireNonEmptyString(value.compatibility.apiVersion, "upstream.compatibility.apiVersion", manifestPath);
  requireRecord(value.compatibility.product, "upstream.compatibility.product", manifestPath);
  requireExactKeys(value.compatibility.product, ["name", "version"], "upstream.compatibility.product", manifestPath);
  requireNonEmptyString(value.compatibility.product.name, "upstream.compatibility.product.name", manifestPath);
  requireNonEmptyString(value.compatibility.product.version, "upstream.compatibility.product.version", manifestPath);
  requireStringArray(value.compatibility.formats, "upstream.compatibility.formats", manifestPath);
  requireRecord(value.compatibility.rustApi, "upstream.compatibility.rustApi", manifestPath);
  requireExactKeys(value.compatibility.rustApi, ["id", "package", "version"], "upstream.compatibility.rustApi", manifestPath);
  requireNonEmptyString(value.compatibility.rustApi.id, "upstream.compatibility.rustApi.id", manifestPath);
  requireNonEmptyString(value.compatibility.rustApi.package, "upstream.compatibility.rustApi.package", manifestPath);
  requireNonEmptyString(value.compatibility.rustApi.version, "upstream.compatibility.rustApi.version", manifestPath);
  requireStringArray(value.compatibility.machineApis, "upstream.compatibility.machineApis", manifestPath);
  requireRecord(value.compatibility.conformance, "upstream.compatibility.conformance", manifestPath);
  requireExactKeys(
    value.compatibility.conformance,
    ["bundleApi", "reportApi", "suite", "caseCount", "contractDigest"],
    "upstream.compatibility.conformance",
    manifestPath,
  );
  requireNonEmptyString(value.compatibility.conformance.bundleApi, "upstream.compatibility.conformance.bundleApi", manifestPath);
  requireNonEmptyString(value.compatibility.conformance.reportApi, "upstream.compatibility.conformance.reportApi", manifestPath);
  requireNonEmptyString(value.compatibility.conformance.suite, "upstream.compatibility.conformance.suite", manifestPath);
  if (
    typeof value.compatibility.conformance.caseCount !== "number" ||
    !Number.isSafeInteger(value.compatibility.conformance.caseCount) ||
    value.compatibility.conformance.caseCount <= 0
  ) {
    invalidRelease("upstream.compatibility.conformance.caseCount must be a positive integer", manifestPath);
  }
  requirePattern(
    value.compatibility.conformance.contractDigest,
    /^sha256:[0-9a-f]{64}$/u,
    "upstream.compatibility.conformance.contractDigest",
    manifestPath,
  );

  const assets = requireRecordArray(value.assets, "upstream.assets", manifestPath);
  if (assets.length !== Object.keys(PLATFORM_DEFINITIONS).length) {
    invalidRelease("upstream.assets must contain exactly four entries", manifestPath);
  }
  const targets = new Set();
  for (const asset of assets) {
    requireExactKeys(asset, ["target", "name", "sha256"], "upstream.assets entry", manifestPath);
    requireNonEmptyString(asset.target, "upstream.assets.target", manifestPath);
    requireNonEmptyString(asset.name, "upstream.assets.name", manifestPath);
    requirePattern(asset.sha256, SHA_256, "upstream.assets.sha256", manifestPath);
    if (targets.has(asset.target)) invalidRelease("upstream.assets contains a duplicate target", manifestPath);
    targets.add(asset.target);
  }
  const expectedTargets = Object.values(PLATFORM_DEFINITIONS)
    .map((definition) => definition.target)
    .sort();
  if (!isDeepStrictEqual([...targets].sort(), expectedTargets)) {
    invalidRelease("upstream.assets targets do not equal the supported runtime set", manifestPath);
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} label
 * @param {string | undefined} manifestPath
 */
function parsePackageIdentity(value, label, manifestPath) {
  requireExactKeys(value, ["packageName", "version", "platformKey", "target"], label, manifestPath);
  requireNonEmptyString(value.packageName, `${label}.packageName`, manifestPath);
  requireNonEmptyString(value.version, `${label}.version`, manifestPath);
  requireNonEmptyString(value.platformKey, `${label}.platformKey`, manifestPath);
  requireNonEmptyString(value.target, `${label}.target`, manifestPath);
}

/**
 * @param {string} manifestPath
 * @param {string} code
 */
async function readManifest(manifestPath, code) {
  try {
    const source = await readFile(manifestPath, "utf8");
    if (Buffer.byteLength(source, "utf8") > MAX_MANIFEST_BYTES) {
      throw new Error("manifest exceeds 64 KiB");
    }
    return JSON.parse(source);
  } catch (error) {
    throw new PackageRuntimeError(
      code,
      `package manifest could not be read: ${errorMessage(error)}`,
      manifestPath,
    );
  }
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {string} label
 * @param {string | undefined} manifestPath
 * @param {"release" | "locator"} [kind]
 * @returns {asserts value is Record<string, unknown>}
 */
function requireRecord(value, label, manifestPath, kind = "release") {
  if (!isRecord(value)) {
    if (kind === "locator") invalidLocator(`${label} must be an object`, manifestPath);
    invalidRelease(`${label} must be an object`, manifestPath);
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {readonly string[]} expected
 * @param {string} label
 * @param {string | undefined} manifestPath
 * @param {"release" | "locator"} [kind]
 */
function requireExactKeys(value, expected, label, manifestPath, kind = "release") {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    const message = `${label} has unexpected or missing fields`;
    if (kind === "locator") invalidLocator(message, manifestPath);
    invalidRelease(message, manifestPath);
  }
}

/**
 * @param {unknown} value
 * @param {string} expected
 * @param {string} label
 * @param {string | undefined} manifestPath
 */
function requireLiteral(value, expected, label, manifestPath) {
  if (value !== expected) invalidRelease(`${label} must equal ${expected}`, manifestPath);
}

/**
 * @param {unknown} value
 * @param {string} label
 * @param {string | undefined} manifestPath
 */
function requireNonEmptyString(value, label, manifestPath) {
  if (typeof value !== "string" || value.length === 0) {
    invalidRelease(`${label} must be a non-empty string`, manifestPath);
  }
}

/**
 * @param {unknown} value
 * @param {RegExp} pattern
 * @param {string} label
 * @param {string | undefined} manifestPath
 */
function requirePattern(value, pattern, label, manifestPath) {
  if (typeof value !== "string" || !pattern.test(value)) {
    invalidRelease(`${label} has an invalid value`, manifestPath);
  }
}

/**
 * @param {unknown} value
 * @param {string} label
 * @param {string | undefined} manifestPath
 */
function requireStringArray(value, label, manifestPath) {
  if (!Array.isArray(value) || value.length === 0 || !value.every((entry) => typeof entry === "string" && entry.length > 0)) {
    invalidRelease(`${label} must be a non-empty string array`, manifestPath);
  }
}

/**
 * @param {unknown} value
 * @param {string} label
 * @param {string | undefined} manifestPath
 * @returns {Array<Record<string, unknown>>}
 */
function requireRecordArray(value, label, manifestPath) {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    invalidRelease(`${label} must be an object array`, manifestPath);
  }
  return value;
}

/**
 * @param {string} message
 * @param {string | undefined} pathValue
 * @returns {never}
 */
function invalidRelease(message, pathValue) {
  throw new PackageRuntimeError(
    "pi-norm-spec/runtime/release-invalid",
    message,
    pathValue,
  );
}

/**
 * @param {string} message
 * @param {string | undefined} pathValue
 * @returns {never}
 */
function invalidLocator(message, pathValue) {
  throw new PackageRuntimeError(
    "pi-norm-spec/runtime/locator-invalid",
    message,
    pathValue,
  );
}

/** @param {string} message @returns {never} */
function identityMismatch(message) {
  throw new PackageRuntimeError("pi-norm-spec/runtime/identity-mismatch", message);
}

/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
