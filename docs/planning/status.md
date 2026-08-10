# Development Status

## Resume here

- Stage: `0.1.0-alpha.1` bootstrap.
- Branch: `docs/v0.1-public-line`.
- Current objective: establish the Rust engine/bridge boundary, thin TypeScript
  entry, protocol fixtures, and CI.
- Injection, enforcement, and validation feedback are not implemented.

## Verification

Bootstrap verification on 2026-08-10:

- `cargo fmt --check` → green.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings` → green.
- `cargo test --workspace --all-features` → 3 tests passed.
- `RUSTDOCFLAGS=-Dwarnings cargo doc --workspace --no-deps` → green.
- `npm ci --ignore-scripts` → 147 packages audited, 0 vulnerabilities.
- `npm run typecheck` and `npm test` → green.

## Open work

- [ ] Connect to a pinned canonical norm-spec Rust contract.
- [ ] Decide persistent process versus native binding.
- [ ] Implement bridge request/response framing and cancellation.
- [ ] Implement path-scoped ephemeral injection.
- [ ] Implement hard policy decisions and escape behavior.
- [ ] Implement post-edit validation feedback.
- [ ] Package platform binaries with the pi package.
- [ ] Verify real pi end-to-end behavior.
