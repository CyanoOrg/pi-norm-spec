# WS-D SDK Convergence Plan: Family Extraction of the Engine Side

Execution plan for D018. Both adapters approved convergence during the
norm-spec soak window (pi-norm-spec WS-D item 1, 2026-09-05; dsh-norm-spec
ROADMAP 0.2). The 2026-10-23 audit anchors the scope: the shared
`norm_protocol.rs` and `prompt_context.rs` differ only in identity strings,
and dsh-norm-spec `0.2.1` additionally carries the operating
`multi_prompt_context.rs`, `layout_index.rs`, and scan wire-format mirror.
Every phase runs the full applicable gates before the next starts.

## Phase 0 — Decision and scope (this record)

- [x] D018 appended to `docs/decisions.md` with the extraction boundary,
  identity-parameterization contract, exact-pinning policy, and
  extraction source (dsh-norm-spec `0.2.1`, cross-checked against this
  repository's identity-only diff).
- [x] Maintainer approval of D018 (PR #14, merged 2026-10-23).

## Phase 1 — SDK repository skeleton and extraction

- [x] Create `CyanoOrg/norm-adapter-sdk` with the D014-style governance
      pattern: protected `main` (integrity, quality, review layers),
      immutable `v*` tags, read-only CI token, organization teams.
- [x] Extract from dsh-norm-spec `0.2.1`: `norm_protocol.rs` (collect,
      validate, scan mirrors), `prompt_context.rs`,
      `multi_prompt_context.rs`, `layout_index.rs`.
- [x] Parameterize the three D001 identity points (machine API strings,
      prompt header/footer markers, error-code prefixes); no other
      host-specific behavior enters the SDK.
- [x] SDK's own gates: fmt, clippy `-D warnings`, tests, doc; golden
      output fixtures proving both hosts' identity sets render
      byte-identically to each adapter's current output.
- [x] SDK `0.1.0` on crates.io under the exact-pin policy; repository
      name and crate label reviewed with the maintainer before the first
      publication.

## Phase 2 — pi-norm-spec swap (unreleased main)

- [x] Replace `pi-norm-engine` internals with the SDK dependency
      (`=0.1.0`); keep module re-exports so the bridge and tests see an
      unchanged surface.
- [x] Byte-identical `pi-norm-spec/prompt-context/v1` output: golden
      comparison against the pre-swap output on the full conformance
      corpus; 82-case conformance, collect, validate unchanged.
- [x] Full local gates plus `scripts/check-upstream-release.sh` end to
      end; real-host smoke with the current verified pi line.
- [x] Update `docs/ARCHITECTURE.md` for the engine-side provenance
      change in the same commit as the swap.

## Phase 3 — Multi-target and layout index through the SDK

- [x] Decision record for the pi-side wiring (D019, this phase's first
      step; awaiting maintainer approval).
- [ ] Multi-target context (WS-D item 2) per D019: bridge
      `promptContextMulti`, recency-set tracking, multi block on the
      context seam.
- [ ] Real `scan` bridge method and the layout-index block per D019
      (WS-D item 3): bridge `scan` and `layoutIndex`, cached prefix block
      refreshed at session start and after `.norm` edits.
- [ ] dsh-norm-spec swaps onto the same SDK version on its own track;
      cross-adapter coordination happens through SDK SemVer, never
      direct dependency.

## Non-goals

- No bridge, sealing, distribution, upstream-pin, or host-injection
  convergence: those stay adapter-local (D018 boundary).
- No enforcement, escape, or blocking work (D010 stands).
- No upstream changes to norm-spec; no `collect/v2` adoption ahead of
  WS-E.
- No release of pi-norm-spec carries the SDK before Phase 2 gates are
  green and reviewed.

## Standing watch

- pi issue #7092 remains the D010-reopen prerequisite only and gates
  nothing in this plan.
