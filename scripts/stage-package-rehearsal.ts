import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadPackageReleaseInputs } from "./package-release.ts";
import { stagePlatformPackage, stageRootPackage } from "./package-staging.ts";

const [stagingRoot, repoRoot, bridge, payload, target, sourceRevision] = process.argv.slice(2);
if (!stagingRoot || !repoRoot || !bridge || !payload || !target || !sourceRevision) {
  throw new Error(
    "usage: stage-package-rehearsal.ts <staging-root> <repo-root> <bridge> <payload> <target> <source-revision>",
  );
}

const inputs = await loadPackageReleaseInputs(repoRoot);
const root = await stageRootPackage({
  repoRoot,
  packageRoot: path.join(stagingRoot, "root-package"),
  sourceRevision,
  inputs,
});
const platform = await stagePlatformPackage({
  repoRoot,
  packageRoot: path.join(stagingRoot, "platform-package"),
  sourceRevision,
  inputs,
  bridge,
  payload,
  target,
});
const consumerRoot = path.join(stagingRoot, "consumer");
await mkdir(consumerRoot);
await writeFile(
  path.join(consumerRoot, "package.json"),
  `${JSON.stringify(
    { name: "pi-norm-spec-package-rehearsal", version: "0.0.0", private: true },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify({
    packageName: platform.packageName,
    version: root.version,
    rootPackageRoot: root.packageRoot,
    platformRoot: platform.packageRoot,
    consumerRoot,
  }),
);
