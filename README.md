# pi-norm-spec

A hybrid Rust + TypeScript pi adapter for the canonical norm-spec engine.

Rust evaluates normalized conventions and exposes a versioned bridge;
TypeScript provides the minimal pi ExtensionAPI entry point. This repository
does not implement the `.norm` parser or validator.

> Status: `0.1.0-alpha.1` bootstrap. Gate B is complete on all four native
> hosted targets. Gate C's session-scoped JSONL bridge, request cancellation,
> thin TypeScript client, and ExtensionAPI lifecycle are green locally; the
> exact Gate C candidate still needs hosted verification. Pi injection,
> enforcement, validation feedback, the pi-specific Skill, and npm platform
> packages remain incomplete.

See `AGENTS.md`, `docs/ARCHITECTURE.md`, and
`docs/planning/v0.1-execution.md` before contributing.

## License

MIT © 2026 Wade
