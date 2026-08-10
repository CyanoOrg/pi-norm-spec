## Summary

Describe the problem and the resulting pi behavior.

## Boundary and security impact

- [ ] TypeScript remains limited to pi host adaptation.
- [ ] No `.norm` parser, inheritance, schema validation, or private format field
      is implemented here.
- [ ] Enforcement, escape, bridge, or lifecycle changes include appropriate
      integration or end-to-end coverage.

## Verification

List the commands and real pi scenarios you ran.

- [ ] `cargo fmt --check`
- [ ] `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- [ ] `cargo test --workspace --all-features`
- [ ] `RUSTDOCFLAGS=-Dwarnings cargo doc --workspace --no-deps`
- [ ] `npm ci && npm run typecheck && npm test`
- [ ] `bash scripts/check-public-history.sh`
- [ ] Documentation and changelog are updated when needed.
