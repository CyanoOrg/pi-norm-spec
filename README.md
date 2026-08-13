# pi-norm-spec

A hybrid Rust + TypeScript pi adapter for the canonical norm-spec engine.

Rust evaluates normalized conventions and exposes a versioned bridge;
TypeScript provides the minimal pi ExtensionAPI entry point. This repository
does not implement the `.norm` parser or validator.

> Status: `0.1.0-alpha.1` bootstrap. Gate B and Gate C are complete on all four
> native hosted targets. Gate D path-scoped ephemeral injection, the single
> pi-specific Skill, and non-destructive zero-`.norm` onboarding are green
> locally with the real pi `0.84.1` host and sealed public payload; the exact
> candidate still needs four-platform hosted verification. Enforcement,
> post-edit validation, and npm platform packages remain incomplete.

See `AGENTS.md`, `docs/ARCHITECTURE.md`, and
`docs/planning/v0.1-execution.md` before contributing.

## License

MIT © 2026 Wade
