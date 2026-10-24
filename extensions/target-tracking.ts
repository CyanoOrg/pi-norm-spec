//! Pure tool-call tracking decision for the next active collection target.
//!
//! Semantics are fixed by decision D016: `read`, `edit`, and `write` select
//! the input path's parent directory (directory normalization), `grep`,
//! `find`, and `ls` select the observed path as-is with a `.` fallback, and
//! every other tool leaves the active target unchanged. `file_path` is a
//! harmless alias of `path`; the first non-empty string wins.

import { dirname } from "node:path";

/** Fallback target for scope tools that observed no usable path. */
const DEFAULT_TARGET = ".";

/** Maximum tracked directories in the recency set (D019). */
export const MAX_TRACKED_TARGETS = 4;

function resolveInputPath(input: Readonly<Record<string, unknown>>): string | undefined {
  for (const field of ["file_path", "path"] as const) {
    const value = input[field];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/** Return the active collection target after one observed tool call. */
export function nextActiveTarget(
  current: string,
  toolName: string,
  input: Readonly<Record<string, unknown>>,
): string {
  const inputPath = resolveInputPath(input);
  switch (toolName) {
    case "read":
    case "edit":
    case "write":
      return inputPath ? dirname(inputPath) : current;
    case "grep":
    case "find":
    case "ls":
      return inputPath ?? DEFAULT_TARGET;
    default:
      return current;
  }
}

/**
 * Return the recency-ordered target set after one observed tool call (D019):
 * the head is the most recent target, duplicates collapse toward the front,
 * and the set never exceeds {@link MAX_TRACKED_TARGETS} entries.
 */
export function nextTargetSet(
  current: readonly string[],
  toolName: string,
  input: Readonly<Record<string, unknown>>,
): string[] {
  const head = current.length > 0 ? current[0] : DEFAULT_TARGET;
  const next = nextActiveTarget(head, toolName, input);
  if (next === head) return [...current];
  return [next, ...current.filter((target) => target !== next)].slice(0, MAX_TRACKED_TARGETS);
}

/** Return the resolved file path a mutation tool would touch, if any. */
export function mutationPath(input: Readonly<Record<string, unknown>>): string | undefined {
  return resolveInputPath(input);
}
