# Development Status

## Resume here

- Stage: `0.1.0-alpha.1`; Gate A is complete and Gate B implementation is next.
- Current objective: consume public norm-spec `0.1.0-rc.1` through its CLI
  machine protocols, verify the exact release-derived payload, and fail closed
  on incompatible identity without duplicating `.norm` semantics.
- D005 fixes the upstream boundary as `norm` CLI subprocesses. D006 fixes the
  first distribution path as verified platform-specific optional packages with
  the complete runtime/conformance payload. D007 fixes one pi-specific Skill
  and a non-destructive, one-notice cold start.
- `package.json` now records the exact product, format, machine API, suite,
  case-count, digest, and bridge identities to be enforced by Gate B. This is a
  declared contract, not evidence that the handshake is implemented.
- The private GitHub repository, initial `main` push, and first hosted Actions
  run are complete and green.
- GitHub repository bootstrap is complete; public visibility remains a
  maintainer checkpoint after the initial functional slice.
- Injection, enforcement, validation feedback, platform payloads, and the
  pi-specific Skill are not implemented.
- The local `.opencode/skills/norm-spec/` adoption-rehearsal copy is ignored and
  is not a product resource.

## Verification

Bootstrap verification on 2026-08-10:

- `cargo fmt --check` → green.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings` → green.
- `cargo test --workspace --all-features` → 3 tests passed.
- `RUSTDOCFLAGS=-Dwarnings cargo doc --workspace --no-deps` → green.
- `npm ci --ignore-scripts` → 147 packages audited, 0 vulnerabilities.
- `npm run typecheck` and `npm test` → green.
- `bash scripts/check-public-history.sh` → green across the current index and
  all reachable commits.
- The Node 24 GitHub-hosted verification run was green across Rust, extension,
  Linux, macOS, and Windows jobs with no annotations.

## Open-source readiness

- [x] Independent public `0.1` history and product identity.
- [x] Security policy, code of conduct, and structured issue/PR templates.
- [x] High-confidence secret, sensitive filename, and private-path history scan.
- [x] GitHub Actions references pinned to full commit SHAs.
- [x] Private GitHub repository creation, initial `main` push, and first hosted
      Actions run.
- [x] Node 24 Action pins verified green on GitHub without annotations.
- [ ] Configure `main` protection when repository visibility or the
      organization plan permits it.

## Open work

- [ ] Resolve and verify the exact platform payload for norm-spec `0.1.0-rc.1`.
- [ ] Implement compatibility, collect, and validate machine-protocol handling.
- [ ] Exercise the complete 82-case upstream conformance bundle without skips.
- [ ] Measure and decide short-lived versus persistent pi bridge lifecycle.
- [ ] Implement bridge request/response framing and cancellation.
- [ ] Implement path-scoped ephemeral injection.
- [ ] Implement the pi-specific Skill and zero-`.norm` onboarding notice.
- [ ] Define the machine-evaluable enforcement subset before implementing hard
      policy decisions and escape behavior.
- [ ] Implement post-edit validation feedback.
- [ ] Package the bridge and verified upstream payload for each supported
      platform.
- [ ] Verify real pi end-to-end behavior.
