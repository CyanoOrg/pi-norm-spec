# Development Status

## Resume here

- Stage: `0.1.0-alpha.1` bootstrap.
- Integration branch: `main`; the open-source-readiness batch is complete.
- Current objective: establish the Rust engine/bridge boundary, thin TypeScript
  entry, protocol fixtures, and CI.
- Maintainer checkpoint: create and configure the GitHub repository, then push
  `main`; public visibility may follow after the initial functional slice.
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

## Open-source readiness

- [x] Independent public `0.1` history and product identity.
- [x] Security policy, code of conduct, and structured issue/PR templates.
- [x] High-confidence secret, sensitive filename, and private-path history scan.
- [x] GitHub Actions references pinned to full commit SHAs.
- [ ] GitHub repository creation, rules, and initial push (maintainer checkpoint).

## Open work

- [ ] Connect to a pinned canonical norm-spec Rust contract.
- [ ] Decide persistent process versus native binding.
- [ ] Implement bridge request/response framing and cancellation.
- [ ] Implement path-scoped ephemeral injection.
- [ ] Implement hard policy decisions and escape behavior.
- [ ] Implement post-edit validation feedback.
- [ ] Package platform binaries with the pi package.
- [ ] Verify real pi end-to-end behavior.
