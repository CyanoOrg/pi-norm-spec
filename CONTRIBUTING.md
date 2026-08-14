# Contributing

Read `AGENTS.md` before opening a change.

A contribution must preserve the core boundary: format parsing and validation
belong upstream in norm-spec; pi event adaptation belongs here.

External contributors should fork the public repository, create one
purpose-focused branch, and open a pull request. Commits must be signed and use
Conventional Commit prefixes. The protected `main` branch requires linear
history, passing CI, one approving review, and resolved review threads.
Workflows from external contributors require explicit maintainer approval.

Run before review:

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
cargo doc --workspace --no-deps
npm ci
npm run typecheck
npm test
bash scripts/check-public-history.sh
```

Changes to enforcement, escape behavior, bridge framing, or pi event handling
require integration or end-to-end coverage.
