import assert from "node:assert/strict";
import { chmod, copyFile, cp, lstat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PLATFORM_DEFINITIONS } from "../runtime/package-runtime.js";
import {
  createPlatformReleaseManifest,
  createRootReleaseManifest,
  loadPackageReleaseInputs,
  type PackageReleaseInputs,
} from "./package-release.ts";

export interface RootPackageStageOptions {
  repoRoot: string;
  packageRoot: string;
  sourceRevision: string;
  inputs?: PackageReleaseInputs;
}

export interface PlatformPackageStageOptions extends RootPackageStageOptions {
  bridge: string;
  payload: string;
  target: string;
}

export interface PackageStageResult {
  packageName: string;
  version: string;
  packageRoot: string;
}

export async function stageRootPackage(
  options: RootPackageStageOptions,
): Promise<PackageStageResult> {
  const inputs = options.inputs ?? (await loadPackageReleaseInputs(options.repoRoot));
  await mkdir(options.packageRoot);
  for (const directory of ["bin", "extensions", "runtime", "skills"]) {
    await cp(
      path.join(options.repoRoot, directory),
      path.join(options.packageRoot, directory),
      { recursive: true, force: false, errorOnExist: true },
    );
  }
  await copyPackageSource(options.repoRoot, inputs.rootManifest.name, options.packageRoot);
  await chmod(path.join(options.packageRoot, "bin", "pi-norm-spec.js"), 0o755);
  await writeJson(
    path.join(options.packageRoot, "release.json"),
    createRootReleaseManifest(inputs, options.sourceRevision),
  );
  return {
    packageName: inputs.rootManifest.name,
    version: inputs.rootManifest.version,
    packageRoot: options.packageRoot,
  };
}

export async function stagePlatformPackage(
  options: PlatformPackageStageOptions,
): Promise<PackageStageResult> {
  const inputs = options.inputs ?? (await loadPackageReleaseInputs(options.repoRoot));
  const definition = Object.values(PLATFORM_DEFINITIONS).find(
    (candidate) => candidate.target === options.target,
  );
  assert.ok(definition, `unsupported package target: ${options.target}`);
  const bridgeStat = await lstat(options.bridge);
  assert.ok(
    bridgeStat.isFile() && !bridgeStat.isSymbolicLink(),
    `bridge is not a regular file: ${options.bridge}`,
  );
  const payloadStat = await lstat(options.payload);
  assert.ok(
    payloadStat.isDirectory() && !payloadStat.isSymbolicLink(),
    `payload is not a regular directory: ${options.payload}`,
  );

  const executable = `pi-norm-bridge${definition.os === "win32" ? ".exe" : ""}`;
  const binRoot = path.join(options.packageRoot, "bin");
  await mkdir(options.packageRoot);
  await mkdir(binRoot);
  const installedBridge = path.join(binRoot, executable);
  await copyFile(options.bridge, installedBridge);
  if (definition.os !== "win32") await chmod(installedBridge, 0o755);
  await cp(options.payload, path.join(options.packageRoot, "upstream"), {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
  await copyPackageSource(options.repoRoot, definition.packageName, options.packageRoot);
  await writeJson(path.join(options.packageRoot, "runtime.json"), {
    apiVersion: "pi-norm-spec/platform-runtime/v1",
    bridge: `bin/${executable}`,
    payload: "upstream",
  });
  await writeJson(
    path.join(options.packageRoot, "release.json"),
    createPlatformReleaseManifest(inputs, options.sourceRevision, options.target),
  );
  return {
    packageName: definition.packageName,
    version: inputs.rootManifest.version,
    packageRoot: options.packageRoot,
  };
}

async function copyPackageSource(
  repoRoot: string,
  packageName: string,
  packageRoot: string,
): Promise<void> {
  const sourceRoot = path.join(repoRoot, "packages", packageName);
  await copyFile(path.join(sourceRoot, "package.json"), path.join(packageRoot, "package.json"));
  await copyFile(path.join(sourceRoot, "README.md"), path.join(packageRoot, "README.md"));
  await copyFile(path.join(repoRoot, "LICENSE"), path.join(packageRoot, "LICENSE"));
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
