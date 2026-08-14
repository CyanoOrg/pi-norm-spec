import path from "node:path";

import { verifyPackageCandidateSet } from "./package-candidate.ts";

const [artifactRoot, sourceRevision, output] = process.argv.slice(2);
if (!artifactRoot || !sourceRevision || !output) {
  throw new Error(
    "usage: check-package-candidate-set.ts <artifact-root> <source-revision> <output>",
  );
}

const result = await verifyPackageCandidateSet(
  process.cwd(),
  path.resolve(artifactRoot),
  sourceRevision,
  path.resolve(output),
);
console.log(JSON.stringify({
  apiVersion: result.apiVersion,
  output: path.resolve(output),
  artifacts: Array.isArray(result.artifacts) ? result.artifacts.length : 0,
}));
