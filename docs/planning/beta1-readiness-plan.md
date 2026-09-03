# Beta.1 Readiness Plan: Tracking Normalization, E3, E4, First Public Beta

Planning input from the cross-repository review on 2026-09-03, after
dsh-norm-spec's post-0.1.0 runtime review (its target-context plan) and
norm-spec's adoption of batch collect as decision D020. This document
re-sequences the road to the first public `0.1.0-beta.1` around one
fact: that beta is the second RC-soak leg gating norm-spec's stable
promotion, so the fastest correct path to beta.1 is the family's
critical path. Decision records precede each workstream per the
repository update order.

## Findings (audited 2026-09-03 against pi-coding-agent 0.84.1)

### F1 — Field-name tracking is correct for pi (no defect)

- The adapter reads `input.path`
  (`extensions/norm-context.ts::updateTarget`), and pi's built-in
  `read`, `edit`, and `write` tool schemas all declare `path` as the
  argument field (`dist/core/tools/read.js:17`, `edit.js:18`,
  `write.js:12`). Unlike the dsh defect (its adapter read `path`
  while DSH rc.6 tools send `file_path`), adapter and host agree here.
- Optional hardening: accept `file_path` as a harmless alias; the
  write tool's renderer already tolerates both spellings.

### F2 — Tracking test gap (the same gap that let the dsh defect ship)

- `updateTarget` has no test coverage (one definition, one call site)
  and no E2E asserts target re-scoping. The dsh defect passed every
  0.1.0 gate through exactly this gap.

### F3 — File-grained targets churn the context message

- read/edit track the file path itself, and the target string is
  embedded in the `pi-norm-spec/prompt-context/v1` content.
  Alternating files in one directory rewrites functionally identical
  context. Directory normalization is information-preserving (upstream
  collect treats a file target as its parent directory) and removes
  the churn.

### Boundary — timing posture unchanged

- pi's `context` event recollects before every provider turn: the
  first touch of a directory still happens without that directory's
  conventions (one uninformed action), matching the recorded host
  boundary posture. No change planned.

## Approved direction

- **D-A (normalization + evidence, beta-blocking).** Normalize
  read/edit tracking to the parent directory; extract `updateTarget`
  into a pure, unit-tested function; add the re-scoping assertion the
  dsh case showed to be missing. Decision record first.
- **D-B (beta.1 scope freeze).** beta.1 carries only D-A plus the
  already-planned E3/E4. Multi-target context, a layout index, and any
  SDK extraction are post-beta: beta.1's mission is a public usable
  artifact and unblocking norm-spec's soak gate, not feature parity
  with dsh-norm-spec.

## Workstreams

### WS-A — Normalization and tests (first; small)

1. Decision record: directory normalization, the `file_path` alias
   policy, and the F1 audit evidence.
2. Pure `updateTarget` plus a unit matrix (tools × fields × ignored
   inputs).
3. E2E: read a file under a subdirectory that declares its own
   `.norm`; assert the context message reflects the subdirectory
   chain.
4. CHANGELOG entry under the beta preparation.

### WS-B — E3 real-install gate (already the current objective)

1. Version-pinned real `pi install` on all four native targets,
   including injection and post-edit feedback without blocking.

### WS-C — E4 review and beta checkpoints

1. Release/security review; stop at the human beta checkpoints:
   signed tag `v0.1.0-beta.1`, GitHub pre-release, npm ownership
   recheck, five-package publication.

### WS-D — Post-beta track (sequenced, not beta-blocking)

1. Host Adapter SDK convergence with dsh-norm-spec (its precondition
   "pi E3/E4 complete" is met at beta.1): extract the shared
   engine-side merge/projection rather than forking it.
2. Multi-target context mirroring norm-spec decision D020 semantics
   through the converged SDK.
3. Layout-index analog riding the context seam, backed by a real
   `scan` bridge method over upstream `norm scan`.
4. Standing watch: pi issue #7092 final-input prerequisite gates only
   hard enforcement (D010 reopen), none of the above.

### WS-E — collect/v2 adoption (after norm-spec 0.2.0)

Migrate the WS-D merge upstream when norm-spec ships batch collect;
bump `productCompat` deliberately (`=0.1.0-rc.1` today).

## Sequencing

WS-A → WS-B → WS-C → beta.1 → WS-D → WS-E. WS-A is hours of work and
prevents shipping a silent scoping defect; WS-B and WS-C are the
existing E3/E4 road. Every workstream writes its decision record
before implementation and runs the full applicable gates.

## Non-goals

- No hard enforcement or escape implementation (D010; issue #7092).
- No multi-target, layout-index, or SDK work inside beta.1 (D-B).
- No upstream norm-spec changes (the rc.1 payload is verified live;
  the upstream contract is frozen until stable promotion).
