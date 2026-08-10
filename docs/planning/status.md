# Development Status

## Resume here

- Stage: `0.1.0-alpha.1`; upstream-contract and bridge-model work are next.
- Integration branch: `main`; Node 24 CI maintenance is verified and ready to
  integrate.
- Current objective: pin the canonical upstream contract and measure the bridge
  process model without duplicating `.norm` semantics.
- The private GitHub repository, initial `main` push, and first hosted Actions
  run are complete and green.
- GitHub repository bootstrap is complete; public visibility remains a
  maintainer checkpoint after the initial functional slice.
- Injection, enforcement, and validation feedback are not implemented.

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

- [ ] Connect to a pinned canonical norm-spec Rust contract.
- [ ] Decide persistent process versus native binding.
- [ ] Implement bridge request/response framing and cancellation.
- [ ] Implement path-scoped ephemeral injection.
- [ ] Implement hard policy decisions and escape behavior.
- [ ] Implement post-edit validation feedback.
- [ ] Package platform binaries with the pi package.
- [ ] Verify real pi end-to-end behavior.
