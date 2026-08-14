import path from "node:path";

import { verifyPackageArchive } from "./package-candidate.ts";

const [archive, sourceRevision] = process.argv.slice(2);
if (!archive || !sourceRevision) {
  throw new Error("usage: check-package-archive.ts <archive> <source-revision>");
}

const result = await verifyPackageArchive(process.cwd(), path.resolve(archive), sourceRevision);
console.log(JSON.stringify(result));
