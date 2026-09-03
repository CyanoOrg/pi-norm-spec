import assert from "node:assert/strict";
import test from "node:test";

import { nextActiveTarget } from "../../extensions/target-tracking.ts";

interface MatrixCase {
  name: string;
  current: string;
  toolName: string;
  input: Readonly<Record<string, unknown>>;
  expected: string;
}

const readEditWrite: MatrixCase[] = [
  {
    name: "read normalizes a file target to its parent directory",
    current: ".",
    toolName: "read",
    input: { path: "docs/guide.md" },
    expected: "docs",
  },
  {
    name: "edit normalizes a file target to its parent directory",
    current: ".",
    toolName: "edit",
    input: { path: "docs/guide.md" },
    expected: "docs",
  },
  {
    name: "write keeps its existing parent-directory normalization",
    current: ".",
    toolName: "write",
    input: { path: "crates/engine/lib.rs" },
    expected: "crates/engine",
  },
  {
    name: "read of a bare filename normalizes to the root",
    current: "docs",
    toolName: "read",
    input: { path: "AGENTS.md" },
    expected: ".",
  },
  {
    name: "file_path alias normalizes like path for read",
    current: ".",
    toolName: "read",
    input: { file_path: "docs/guide.md" },
    expected: "docs",
  },
  {
    name: "file_path alias normalizes like path for edit",
    current: ".",
    toolName: "edit",
    input: { file_path: "docs/guide.md" },
    expected: "docs",
  },
  {
    name: "file_path alias normalizes like path for write",
    current: ".",
    toolName: "write",
    input: { file_path: "crates/new.rs" },
    expected: "crates",
  },
  {
    name: "file_path wins when both spellings are present",
    current: ".",
    toolName: "read",
    input: { file_path: "docs/a.md", path: "src/b.rs" },
    expected: "docs",
  },
  {
    name: "an empty file_path falls through to path",
    current: ".",
    toolName: "read",
    input: { file_path: "", path: "docs/b.md" },
    expected: "docs",
  },
  {
    name: "a non-string file_path falls through to path",
    current: ".",
    toolName: "edit",
    input: { file_path: 42, path: "docs/b.md" },
    expected: "docs",
  },
  {
    name: "an empty path leaves the active target unchanged",
    current: "docs",
    toolName: "read",
    input: { path: "" },
    expected: "docs",
  },
  {
    name: "a non-string path leaves the active target unchanged",
    current: "docs",
    toolName: "edit",
    input: { path: ["docs"] },
    expected: "docs",
  },
  {
    name: "a missing path field leaves the active target unchanged",
    current: "docs",
    toolName: "write",
    input: {},
    expected: "docs",
  },
];

const ignoredTools: MatrixCase[] = [
  {
    name: "an unknown tool never changes the active target",
    current: "docs",
    toolName: "bash",
    input: { path: ".norm" },
    expected: "docs",
  },
  {
    name: "an unknown mutation-looking tool is ignored even with file_path",
    current: "docs",
    toolName: "custom_mutator",
    input: { file_path: "docs/guide.md" },
    expected: "docs",
  },
];

const scopeTools: MatrixCase[] = [
  {
    name: "grep keeps the observed path as-is",
    current: "docs",
    toolName: "grep",
    input: { path: "src" },
    expected: "src",
  },
  {
    name: "grep falls back to the root without a usable path",
    current: "docs",
    toolName: "grep",
    input: { pattern: "Gate D" },
    expected: ".",
  },
  {
    name: "grep falls back to the root on a non-string path",
    current: "docs",
    toolName: "grep",
    input: { path: 7 },
    expected: ".",
  },
  {
    name: "grep accepts the file_path alias",
    current: ".",
    toolName: "grep",
    input: { file_path: "docs" },
    expected: "docs",
  },
  {
    name: "find keeps the observed path as-is",
    current: ".",
    toolName: "find",
    input: { path: "docs/planning" },
    expected: "docs/planning",
  },
  {
    name: "find falls back to the root without a path",
    current: "docs",
    toolName: "find",
    input: {},
    expected: ".",
  },
  {
    name: "ls keeps the observed path as-is",
    current: ".",
    toolName: "ls",
    input: { path: "docs" },
    expected: "docs",
  },
  {
    name: "ls falls back to the root without a path",
    current: "docs",
    toolName: "ls",
    input: {},
    expected: ".",
  },
];

for (const cases of [readEditWrite, ignoredTools, scopeTools]) {
  for (const matrixCase of cases) {
    test(`${cases === readEditWrite ? "read/edit/write" : cases === ignoredTools ? "ignored" : "scope"}: ${matrixCase.name}`, () => {
      assert.equal(
        nextActiveTarget(matrixCase.current, matrixCase.toolName, matrixCase.input),
        matrixCase.expected,
      );
    });
  }
}

test("alternating files in one directory no longer churns the target", () => {
  const first = nextActiveTarget(".", "read", { path: "docs/a.md" });
  const second = nextActiveTarget(first, "read", { path: "docs/b.md" });
  const third = nextActiveTarget(second, "edit", { file_path: "docs/c.md" });
  assert.deepEqual([first, second, third], ["docs", "docs", "docs"]);
});
