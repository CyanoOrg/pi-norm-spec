# pi-norm-spec

A hybrid Rust + TypeScript pi adapter for the canonical norm-spec engine.

Rust evaluates normalized conventions and exposes a versioned bridge;
TypeScript provides the minimal pi ExtensionAPI entry point. This repository
does not implement the `.norm` parser or validator.

> Status: `0.1.0-alpha.1` bootstrap. Gate B and Gate C are complete on all four
> native hosted targets. The session-scoped JSONL bridge, request cancellation,
> thin TypeScript client, ExtensionAPI lifecycle, and exact public payload path
> are hosted-green. Gate D path-scoped injection is next. Enforcement,
> validation feedback, the pi-specific Skill, and npm platform packages remain
> incomplete.

See `AGENTS.md`, `docs/ARCHITECTURE.md`, and
`docs/planning/v0.1-execution.md` before contributing.

## License

MIT © 2026 Wade
