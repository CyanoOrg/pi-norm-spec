import assert from "node:assert/strict";
import { chmod, copyFile, cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const [stagingRoot, repoRoot, bridge, payload, target] = process.argv.slice(2);
if (!stagingRoot || !repoRoot || !bridge || !payload || !target) {
  throw new Error(
    "usage: stage-package-rehearsal.ts <staging-root> <repo-root> <bridge> <payload> <target>",
  );
}

const platforms: Readonly<
  Record<string, { packageName: string; os: string; cpu: string; executable: string }>
> = {
  "x86_64-unknown-linux-gnu": {
    packageName: "pi-norm-spec-linux-x64",
    os: "linux",
    cpu: "x64",
    executable: "pi-norm-bridge",
  },
  "aarch64-apple-darwin": {
    packageName: "pi-norm-spec-darwin-arm64",
    os: "darwin",
    cpu: "arm64",
    executable: "pi-norm-bridge",
  },
  "x86_64-apple-darwin": {
    packageName: "pi-norm-spec-darwin-x64",
    os: "darwin",
    cpu: "x64",
    executable: "pi-norm-bridge",
  },
  "x86_64-pc-windows-msvc": {
    packageName: "pi-norm-spec-win32-x64",
    os: "win32",
    cpu: "x64",
    executable: "pi-norm-bridge.exe",
  },
};

const platform = platforms[target];
assert.ok(platform, `unsupported package rehearsal target: ${target}`);
assert.ok((await stat(bridge)).isFile(), `bridge is not a file: ${bridge}`);
assert.ok((await stat(payload)).isDirectory(), `payload is not a directory: ${payload}`);

const rootManifest = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8")) as {
  name?: unknown;
  version?: unknown;
};
assert.equal(rootManifest.name, "pi-norm-spec");
assert.equal(typeof rootManifest.version, "string");

const platformRoot = path.join(stagingRoot, "platform-package");
const platformBin = path.join(platformRoot, "bin");
const consumerRoot = path.join(stagingRoot, "consumer");
await mkdir(platformBin, { recursive: true });
await mkdir(consumerRoot, { recursive: true });

const installedBridge = path.join(platformBin, platform.executable);
await copyFile(bridge, installedBridge);
if (platform.os !== "win32") await chmod(installedBridge, 0o755);
await cp(payload, path.join(platformRoot, "upstream"), {
  recursive: true,
  force: false,
  errorOnExist: true,
});

await writeJson(path.join(platformRoot, "package.json"), {
  name: platform.packageName,
  version: rootManifest.version,
  description: `Native pi-norm-spec runtime rehearsal package for ${target}`,
  license: "MIT",
  os: [platform.os],
  cpu: [platform.cpu],
  files: ["bin", "upstream", "runtime.json"],
});
await writeJson(path.join(platformRoot, "runtime.json"), {
  apiVersion: "pi-norm-spec/platform-runtime/v1",
  bridge: `bin/${platform.executable}`,
  payload: "upstream",
});
await writeJson(path.join(consumerRoot, "package.json"), {
  name: "pi-norm-spec-package-rehearsal",
  version: "0.0.0",
  private: true,
});

console.log(
  JSON.stringify({
    packageName: platform.packageName,
    version: rootManifest.version,
    platformRoot,
    consumerRoot,
  }),
);

async function writeJson(file: string, value: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
