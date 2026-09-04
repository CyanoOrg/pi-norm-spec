# pi-norm-spec

A hybrid Rust + TypeScript pi adapter for the canonical norm-spec engine:
per-session `.norm` convention injection and soft post-edit
convention validation. Rust evaluates normalized conventions and exposes a
versioned bridge; TypeScript provides the minimal pi ExtensionAPI entry
point. This repository does not implement the `.norm` parser or
validator — format semantics stay upstream in
[norm-spec](https://github.com/CyanoOrg/norm-spec).

## Why

Conventions only matter if they reach the agent while it works. A validated
`.norm` tree on disk is inert by itself; the common workaround — an
always-resident instruction file — spends tokens re-establishing the same
ambiguity while its effectiveness decays with distance and competing
context.

This adapter delivers convention knowledge the way a cache wants it:

> Page the conventions that apply to the current working directory into
> the agent's perception at action time, and check edits against them
> afterward.

Delivery is host-specific. pi's `context` event fires before each
provider turn with a copy of the message list, so the injection is truly
**ephemeral**: the freshly collected conventions ride the tail of the
current turn and never enter the session log — next turn collects and
renders again from disk. Nothing accumulates, nothing goes stale. The same
format and semantics run under a different host in
[dsh-norm-spec](https://github.com/CyanoOrg/dsh-norm-spec) — the delivery
layer is the host-specific part, and that boundary is the point.

**Status: `0.1.0-beta.1` release preparation. The GitHub repository
is public and protected; no npm package is published yet. Gate B through E3
are complete (see `docs/planning/status.md` for the execution state);
E4 — the first public beta — awaits its release checkpoints.**

## What it does

- Starts one verified Rust bridge per session against a sealed,
  checksum-pinned upstream norm-spec payload (no `PATH` fallback).
- On each `context` event, collects the conventions for the active
  project path and appends them to the returned message copy as one hidden
  custom message — the prior turn's injection is stripped first, so exactly
  one fresh reminder is present per turn (D009).
- After successful built-in `write`/`edit` results, appends bounded
  soft validation feedback (D011); green results stay silent and the
  original tool result is preserved.
- Registers one pi-specific Skill and a `norm-status` slash command
  (human-facing) for convention inspection; enforcement stays outside the
  current contract (D010).

## Documentation

- `AGENTS.md`, `docs/ARCHITECTURE.md` — boundaries and the Rust/TypeScript split
- `docs/decisions.md` — decision records D001+ with rationale
- `docs/planning/v0.1-execution.md`, `docs/planning/status.md` — gates,
  execution state, and exact-candidate evidence
- `ROADMAP.md` — milestone plan (beta via E3/E4, then stable)

## License

MIT © 2026 Wade
