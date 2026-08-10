# Contributing

Read `AGENTS.md` before opening a change.

A contribution must preserve the core boundary: format parsing and validation
belong upstream in norm-spec; pi event adaptation belongs here.

Run before review:

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
cargo doc --workspace --no-deps
npm ci
npm run typecheck
npm test
```

Changes to enforcement, escape behavior, bridge framing, or pi event handling
require integration or end-to-end coverage.
