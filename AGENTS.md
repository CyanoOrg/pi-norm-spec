# AGENTS.md

Entry point for humans and agents working on pi-norm-spec.

## Purpose

pi-norm-spec is the pi runtime adapter for the canonical Rust norm-spec engine.
It provides per-turn convention injection and is the downstream home for future
typed tool-call policy without becoming a second `.norm` implementation.

pi loads TypeScript/JavaScript extensions. This repository is therefore
intentionally hybrid:

- Rust owns policy evaluation and the bridge protocol.
- TypeScript owns pi ExtensionAPI events and UI adaptation.
- norm-spec owns parsing, collection, schema validation, and format semantics.

## Current state

Version `0.1.0-alpha.1` is a bootstrap. Gate A, Gate B, and Gate C are complete.
The Rust runtime pins all four public norm-spec `0.1.0-rc.1` archive checksums,
verifies a sealed release-derived payload, executes compatibility, collect,
validate, and all 82 conformance cases, and is verified on all four native
hosted targets. Gate D's path-scoped prompt context, context-only pi injection,
single pi-specific Skill, and non-destructive zero-`.norm` onboarding are
implemented. Gate D's functional Alpha checkpoint is complete: exact
package-inclusive candidate `f080395` passed the real pi `0.84.1` host and
package-shaped isolated installation on all four native targets. D010 records
that the current hard-enforcement subset is empty; blocking and escape are
intentionally absent until both external prerequisites exist. D011 post-edit
validation is complete: exact candidate `e74c4e1` passed the real pi and
package-shaped paths on all four native hosted targets. Production npm
platform packages are not implemented.

Read first:

- `docs/planning/status.md` for live state.
- `docs/planning/v0.1-execution.md` for the active plan.
- `docs/planning/gate-d-design.md` for the active ephemeral-context design.
- `docs/planning/gate-d-enforcement-design.md` for the accepted D010 hard-policy
  and future exact-call escape boundary.
- `docs/planning/gate-d-post-edit-validation-design.md` for D011's soft
  post-edit feedback contract.
- `docs/planning/pi-final-tool-input-request.md` for the public pi admission-hook
  discussion and still-pending host prerequisite.
- `docs/ARCHITECTURE.md` for the Rust/TypeScript boundary.
- `docs/BRIDGE-PROTOCOL.md` for the process and platform-locator contracts.
- `docs/decisions.md` for immutable decisions.

## Common commands

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
cargo doc --workspace --no-deps
npm ci
npm run typecheck
npm test
bash scripts/check-public-history.sh
bash scripts/check-upstream-release.sh
```

## Sources of truth

| Concern | Source of truth |
|---|---|
| project workflow and quality gates | `AGENTS.md` |
| adapter architecture | `docs/ARCHITECTURE.md` |
| TypeScript/Rust process protocol | `docs/BRIDGE-PROTOCOL.md` |
| rationale | `docs/decisions.md` |
| milestones | `ROADMAP.md` |
| shipped changes | `CHANGELOG.md` |
| in-flight state | `docs/planning/status.md` |
| bridge protocol verification | `tests/contract/` and bridge tests |
| `.norm` format and semantics | upstream `norm-spec` |

## Work loop

plan → decide → implement → test → review → merge → archive → release review → release.

Non-trivial scope, protocol, enforcement, security, or distribution decisions
require a decision record before implementation.

## Branching and commits

Use trunk-based development. `main` stays releasable. Use short-lived
`feat/*`, `fix/*`, `docs/*`, `refactor/*`, `test/*`, and `chore/*` branches.
Do not create `develop` or long-lived release branches.

Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
`chore:`, `perf:`, `build:`, and `ci:`. Each commit has one semantic purpose.
Stage explicitly, never with `git add -A`, and run `git diff --cached --check`.

## Versioning and releases

pi-norm-spec has independent Semantic Versioning and begins its public product
line at `0.1.0-alpha.1`. Earlier prototype histories and package versions are
not part of this repository.

- Release tag: `vX.Y.Z` on `main`.
- Rust workspace and npm package versions must match in a release commit.
- Commit both `Cargo.lock` and `package-lock.json`.
- Pin the Rust development toolchain and define MSRV before public alpha.
- Declare compatible norm-spec product and machine protocol ranges explicitly.
- Promote `[Unreleased]` only during release preparation.

## Rust rules

- Forbid unsafe code workspace-wide unless an explicit audited decision says
  otherwise.
- `pi-norm-engine` owns framework-neutral policy decisions over normalized
  upstream data.
- `pi-norm-bridge` owns JSON/JSONL framing and process lifecycle.
- Libraries do not exit the process, write terminal output, or hide failures.
- Production code avoids `unwrap` and `expect` for recoverable failures.
- Structured outputs are versioned and deterministic.

## TypeScript rules

- Keep `extensions/` thin: event registration, input projection, bridge calls,
  cancellation, and user-facing messages only.
- Do not parse YAML, walk `.norm` inheritance, validate schemas, or duplicate
  policy evaluation in TypeScript.
- Use strict TypeScript with no implicit `any`.
- Never swallow bridge errors or convert them into an empty active ruleset.
- Treat future tool-call blocking as a host lifecycle-integrity boundary:
  reasons and escape behavior require tests, and documentation must not present
  it as isolation from malicious same-process extensions.

## Testing

Use Rust unit/integration tests for engine and bridge behavior, TypeScript tests
for event adaptation, and real pi end-to-end tests for injection and any future
typed blocking. An unavailable bridge, upstream fixture, or pi runtime fails
the applicable test; it must not be reported as a successful skip.

## Documentation

English is primary for repository materials; keep `README.zh-CN.md` aligned.
Decisions are append-only. Planning and status documents are mutable working
records. Upstream format changes are proposed in norm-spec, never documented as
private pi fields here.

## `.norm` awareness

Before operating in a directory, collect `.norm` files to the repository root
and honor them through the canonical Rust CLI. Verify `norm compatibility`, use
`norm collect` for inheritance, and use `norm validate` for validation. Do not
replace a missing or incompatible engine with a manual filesystem walk, parser,
or empty convention set; the upstream specification and contract bundle remain
the format authority.
