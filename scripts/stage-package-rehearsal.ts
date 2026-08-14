import assert from "node:assert/strict";
import { chmod, copyFile, cp, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createPlatformReleaseManifest,
  createRootReleaseManifest,
  loadPackageReleaseInputs,
} from "./package-release.ts";
import { PLATFORM_DEFINITIONS } from "../runtime/package-runtime.js";

const [stagingRoot, repoRoot, bridge, payload, target, sourceRevision] = process.argv.slice(2);
if (!stagingRoot || !repoRoot || !bridge || !payload || !target || !sourceRevision) {
  throw new Error(
    "usage: stage-package-rehearsal.ts <staging-root> <repo-root> <bridge> <payload> <target> <source-revision>",
  );
}

const definition = Object.values(PLATFORM_DEFINITIONS).find(
  (candidate) => candidate.target === target,
);
assert.ok(definition, `unsupported package rehearsal target: ${target}`);
const platform = {
  packageName: definition.packageName,
  os: definition.os,
  executable: `pi-norm-bridge${definition.os === "win32" ? ".exe" : ""}`,
};
assert.ok((await stat(bridge)).isFile(), `bridge is not a file: ${bridge}`);
assert.ok((await stat(payload)).isDirectory(), `payload is not a directory: ${payload}`);

const inputs = await loadPackageReleaseInputs(repoRoot);
const rootPackageRoot = path.join(stagingRoot, "root-package");
const platformRoot = path.join(stagingRoot, "platform-package");
const platformBin = path.join(platformRoot, "bin");
const consumerRoot = path.join(stagingRoot, "consumer");
await mkdir(rootPackageRoot, { recursive: true });
await mkdir(platformBin, { recursive: true });
await mkdir(consumerRoot, { recursive: true });

for (const directory of ["bin", "extensions", "runtime", "skills"]) {
  await cp(path.join(repoRoot, directory), path.join(rootPackageRoot, directory), {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
}
await copyFile(
  path.join(repoRoot, "packages", "pi-norm-spec", "package.json"),
  path.join(rootPackageRoot, "package.json"),
);
await copyFile(
  path.join(repoRoot, "packages", "pi-norm-spec", "README.md"),
  path.join(rootPackageRoot, "README.md"),
);
await copyFile(path.join(repoRoot, "LICENSE"), path.join(rootPackageRoot, "LICENSE"));
await chmod(path.join(rootPackageRoot, "bin", "pi-norm-spec.js"), 0o755);
await writeJson(
  path.join(rootPackageRoot, "release.json"),
  createRootReleaseManifest(inputs, sourceRevision),
);

const installedBridge = path.join(platformBin, platform.executable);
await copyFile(bridge, installedBridge);
if (platform.os !== "win32") await chmod(installedBridge, 0o755);
await cp(payload, path.join(platformRoot, "upstream"), {
  recursive: true,
  force: false,
  errorOnExist: true,
});
await copyFile(
  path.join(repoRoot, "packages", platform.packageName, "package.json"),
  path.join(platformRoot, "package.json"),
);
await copyFile(
  path.join(repoRoot, "packages", platform.packageName, "README.md"),
  path.join(platformRoot, "README.md"),
);
await copyFile(path.join(repoRoot, "LICENSE"), path.join(platformRoot, "LICENSE"));
await writeJson(path.join(platformRoot, "runtime.json"), {
  apiVersion: "pi-norm-spec/platform-runtime/v1",
  bridge: `bin/${platform.executable}`,
  payload: "upstream",
});
await writeJson(
  path.join(platformRoot, "release.json"),
  createPlatformReleaseManifest(inputs, sourceRevision, target),
);
await writeJson(path.join(consumerRoot, "package.json"), {
  name: "pi-norm-spec-package-rehearsal",
  version: "0.0.0",
  private: true,
});

console.log(
  JSON.stringify({
    packageName: platform.packageName,
    version: inputs.rootManifest.version,
    rootPackageRoot,
    platformRoot,
    consumerRoot,
  }),
);

async function writeJson(file: string, value: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
