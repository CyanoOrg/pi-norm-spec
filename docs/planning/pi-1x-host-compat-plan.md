# pi 1.x Host Compatibility Plan: Verification, Pinning, and the WS-D Precondition

Planning input from the 2026-10-23 host-upgrade response session. The
maintainer's pi host moved from `0.84.1` to `1.2.0` (a major bump) with
the 2026-10-14 configuration migration. This document sequences the
adapter's response: verify the published beta against the 1.x host
line, move development identity to the verified line, and only then
start the WS-D SDK convergence already approved in
`docs/planning/beta1-readiness-plan.md`. Decision D017 precedes
implementation per the repository update order.

## Findings (audited 2026-10-23)

### F1 — The maintainer-environment failure is a configuration defect, not a product regression

- Post-migration user settings pointed `packages` at the source
  checkout (`~/Tuatara/RustPrjs/pi-norm-spec`). pi 1.2.0 loaded it as a
  package; `runtime/package-runtime.js` then failed by design at the
  missing root `release.json`
  (`pi-norm-spec/runtime/root-release-invalid`).
- The pre-migration settings referenced a stale nonexistent path
  (`~/Tuatara/pi-norm-spec`), so the extension had been silently absent
  before the upgrade, not working.
- The D006/D012 sealed-payload boundary stands: no source-checkout
  fallback will be added. The environment fix — executed 2026-10-23 —
  is `pi install npm:@cyanoorg/pi-norm-spec@0.1.0-beta.1` plus removal
  of the source path from settings; the managed install was verified
  structurally (root and platform release manifests, locator, sealed
  payload, bridge executable).

### F2 — No recorded verification against any pi 1.x

- The E3 alpha checkpoint and the E3/E4 install gates ran against pi
  `0.84.1`; the devDependency is still `0.84.1`. The host is now
  `1.2.0`.
- Static check 2026-10-23: the installed 1.2.0 still exports the SDK
  surface consumed by `scripts/check-pi-install.ts`
  (`DefaultResourceLoader`, `createAgentSession`, `SessionManager`,
  `SettingsManager`, `loadSkills`), and the extension loads under 1.2.0
  far enough to reach runtime resolution (TypeScript loading, event
  registration, and skill discovery are intact). The behavioral surface
  — `context` event semantics, `tool_result` content patching,
  `ui.setStatus` presentation — has no 1.x evidence.

### F3 — Registry `latest` dist-tag reality diverges from the E4-era record

- `npm view` shows `dist-tags = { beta: 0.1.0-beta.1, latest:
  0.1.0-beta.1 }` on the root package and the same map on the platform
  packages, while `docs/planning/status.md` recorded "`latest`
  intentionally unset". The registry assigns `latest` at a package's
  first publication and it cannot be unset, so the recorded intent was
  not representable; the operative rule — installs pin the exact
  version or `@beta` — stands. The status record is corrected
  alongside this plan.
- Follow-up rule for future pre-release publications: keep publishing
  with `--tag beta`, and re-check the full tag map during release
  review so `latest` is only ever moved by a deliberate stable
  promotion.

## Workstreams

### H1 — Development identity on the 1.x SDK (first; small)

1. Bump devDependency `@earendil-works/pi-coding-agent` from `0.84.1`
   to `1.2.0` in the workspace `package.json`; `npm ci`;
   `npm run typecheck`; `npm test`.
2. Fix compile-level breakage only; no behavior redesign in this step.
3. The published package's host range is H3's scope, not this one.

### H2 — Full gate re-run under the 1.x host line

1. `cargo fmt --check`; `cargo clippy --workspace --all-targets
   --all-features -- -D warnings`; `cargo test --workspace
   --all-features`; `cargo doc --workspace --no-deps`.
2. `bash scripts/check-upstream-release.sh` end to end, including the
   real-host E2E legs (alpha checkpoint, persistent bridge, target
   re-scoping, package-manager install) driven through the 1.2.0 SDK.
3. Real-host smoke with the actual `pi` `1.2.0` binary: fresh session
   in a `.norm` fixture project, `/norm-status` green, per-turn
   injection observed, post-edit feedback observed.

### H3 — Host identity declaration (after H1 and H2 are green)

1. Narrow `peerDependencies` from `*` to the verified envelope —
   recommended `>=0.84.1 <2` — in both the workspace and
   `packages/root/package.json`. pi installs run `--legacy-peer-deps`,
   so the range is advisory identity, not enforcement.
2. Record the exact chosen range in D017's implementation notes and in
   the next release review checklist.

### H4 — Standing watch (unchanged)

- Re-verify the applicable gates on every pi minor or major release
  until hard enforcement lands; pi issue #7092 remains the D010-reopen
  prerequisite only and gates nothing in this plan.

## Sequencing

H1 → H2 → H3, then WS-D. H1 and H2 are the precondition for WS-D's SDK
convergence work; no WS-D implementation starts before H2 is green.

## Non-goals

- No runtime fallback for source-checkout loading (D006/D012
  sealed-payload boundary).
- No enforcement, escape, or blocking work (D010).
- No upstream re-pin: norm-spec `v0.1.0-rc.1` is still the newest tag
  (audited 2026-10-23; upstream `main` moved docs and planning only).
  Stable-promotion watch is a separate trigger.
- No feature work; this plan only restores a verified host baseline.
