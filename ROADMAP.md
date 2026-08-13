# Roadmap

## 0.1 — Initial Rust-backed runtime adapter

### Alpha

- Governance, architecture, and bridge contracts.
- Rust engine consumes canonical norm-spec output.
- Thin TypeScript extension starts and reports bridge identity.
- Session-scoped bridge lifecycle, targeted cancellation, and crash visibility.
- Path-scoped ephemeral injection works end to end.

### Beta

- Post-edit validation feedback.
- Linux, macOS, and Windows packaging.
- Track D010's upstream policy and pi host prerequisites. Typed tool-call
  enforcement and exact-call escape are not `0.1` gates while either is absent.

### Stable

- npm/pi package distribution includes or reliably obtains the Rust binary.
- Real pi end-to-end gates are green.
- The adapter consumes versioned upstream contracts without duplicating format
  parsing or validation.
