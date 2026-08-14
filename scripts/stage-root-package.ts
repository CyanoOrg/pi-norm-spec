import { mkdir } from "node:fs/promises";
import path from "node:path";

import { stageRootPackage } from "./package-staging.ts";

const [stagingRoot, repoRoot, sourceRevision] = process.argv.slice(2);
if (!stagingRoot || !repoRoot || !sourceRevision) {
  throw new Error(
    "usage: stage-root-package.ts <staging-root> <repo-root> <source-revision>",
  );
}

await mkdir(stagingRoot, { recursive: true });
const result = await stageRootPackage({
  repoRoot,
  packageRoot: path.join(stagingRoot, "root-package"),
  sourceRevision,
});
console.log(JSON.stringify(result));
