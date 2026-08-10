# Roadmap

## 0.1 — Initial Rust-backed runtime adapter

### Alpha

- Governance, architecture, and bridge contracts.
- Rust engine consumes canonical norm-spec output.
- Thin TypeScript extension starts and reports bridge identity.
- Path-scoped ephemeral injection works end to end.

### Beta

- Immediate tool-call enforcement with structured fix hints.
- Post-edit validation feedback.
- Bridge lifecycle, cancellation, and crash recovery.
- Linux, macOS, and Windows packaging.

### Stable

- npm/pi package distribution includes or reliably obtains the Rust binary.
- Real pi end-to-end gates are green.
- The adapter consumes versioned upstream contracts without duplicating format
  parsing or validation.
