# pi-norm-spec

A hybrid Rust + TypeScript pi adapter for the canonical norm-spec engine.

Rust evaluates normalized conventions and exposes a versioned bridge;
TypeScript provides the minimal pi ExtensionAPI entry point. This repository
does not implement the `.norm` parser or validator.

> Status: `0.1.0-alpha.1` bootstrap. Gate B and Gate C are complete on all four
> native hosted targets. Gate D path-scoped ephemeral injection, the single
> pi-specific Skill, and non-destructive zero-`.norm` onboarding passed the
> real pi `0.84.1` host on all four native targets at `0e7e46d`. A
> package-shaped isolated install is green locally; the package-inclusive
> candidate still needs four-platform hosted verification. Enforcement,
> post-edit validation, and production npm platform packages remain incomplete.

See `AGENTS.md`, `docs/ARCHITECTURE.md`, and
`docs/planning/v0.1-execution.md` before contributing.

## License

MIT © 2026 Wade
