# pi-norm-spec

A hybrid Rust + TypeScript pi adapter for the canonical norm-spec engine.

Rust evaluates normalized conventions and exposes a versioned bridge;
TypeScript provides the minimal pi ExtensionAPI entry point. This repository
does not implement the `.norm` parser or validator.

> Status: `0.1.0-alpha.1` bootstrap. Gate B's Rust runtime path pins and verifies
> the complete public norm-spec `0.1.0-rc.1` payload, consumes compatibility,
> collect, and validate machine responses, and executes all 82 conformance cases.
> Four-target hosted closure is pending; pi injection, enforcement, validation
> feedback, and npm platform packaging remain incomplete.

See `AGENTS.md`, `docs/ARCHITECTURE.md`, and
`docs/planning/v0.1-execution.md` before contributing.

## License

MIT © 2026 Wade
