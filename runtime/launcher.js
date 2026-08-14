import { spawn } from "node:child_process";
import process from "node:process";

import {
  PACKAGE_RUNTIME_API,
  PackageRuntimeError,
  resolvePackageRuntime,
} from "./package-runtime.js";

/**
 * @param {readonly string[]} argv
 * @param {{
 *   resolveRuntime?: typeof resolvePackageRuntime,
 *   spawnProcess?: typeof spawn,
 *   stdout?: NodeJS.WritableStream,
 *   stderr?: NodeJS.WritableStream,
 * }} [dependencies]
 */
export async function runLauncher(argv, dependencies = {}) {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const operation = argv[0];
  if (!operation || !["runtime", "norm", "conformance"].includes(operation)) {
    stderr.write("usage: pi-norm-spec <runtime|norm|conformance> [arguments...]\n");
    return { code: 2, signal: null };
  }
  if (operation === "runtime" && argv.length !== 1) {
    stderr.write("pi-norm-spec runtime does not accept arguments\n");
    return { code: 2, signal: null };
  }

  try {
    const runtime = await (dependencies.resolveRuntime ?? resolvePackageRuntime)();
    if (operation === "runtime") {
      stdout.write(
        `${JSON.stringify({
          apiVersion: PACKAGE_RUNTIME_API,
          operation: "runtime",
          status: "ok",
          result: {
            product: runtime.rootRelease.product,
            source: runtime.rootRelease.source,
            package: runtime.platformRelease.package,
            apis: runtime.rootRelease.apis,
            host: runtime.rootRelease.host,
            upstream: runtime.rootRelease.upstream,
          },
        })}\n`,
      );
      return { code: 0, signal: null };
    }

    const command = operation === "norm" ? runtime.normPath : runtime.conformancePath;
    return await spawnAndWait(dependencies.spawnProcess ?? spawn, command, argv.slice(1));
  } catch (error) {
    const code = error instanceof PackageRuntimeError ? error.code : "pi-norm-spec/launcher/failed";
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`pi-norm-spec failed [${code}]: ${message}\n`);
    return { code: 1, signal: null };
  }
}

/**
 * @param {typeof spawn} spawnProcess
 * @param {string} command
 * @param {readonly string[]} args
 * @returns {Promise<{code: number, signal: NodeJS.Signals | null}>}
 */
function spawnAndWait(spawnProcess, command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, [...args], {
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code: code ?? 1, signal }));
  });
}
