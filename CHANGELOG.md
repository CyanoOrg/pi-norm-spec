# Changelog

All notable changes are documented here under `[Unreleased]` until release
preparation.

## [Unreleased]

### Added

- Hybrid Rust engine/bridge and thin TypeScript extension architecture.
- Repository governance and protocol-contract foundation.
- Independent public `0.1` product line and canonical GitHub repository policy.
- Security and community contribution policies and issue templates.
- Reproducible public-history checks and commit-pinned CI actions.
- Exact norm-spec `0.1.0-rc.1` release pin with four native archive checksums.
- Sealed payload verification, compatibility discovery, collect, validate, and
  complete 82-case upstream conformance through the Rust bridge.
- Native hosted payload verification for Linux x64, macOS Apple Silicon/Intel,
  and Windows x64.
- Session-scoped JSONL bridge lifecycle with exact readiness identity,
  bounded framing, request correlation, targeted child cancellation, typed
  startup/fatal failures, and acknowledged graceful shutdown.
- Thin TypeScript bridge client and ExtensionAPI session lifecycle with
  platform-runtime resolution, AbortSignal cancellation, visible startup/crash
  failures, and no automatic fallback or restart.
- Versioned `pi-norm-spec/prompt-context/v1` rendering with complete normalized
  conventions, deterministic ordering, a typed empty state, and fail-closed
  size limits.
- Per-provider-turn path-scoped injection through pi's non-persistent `context`
  event, with built-in tool target tracking and visible recoverable failures.
- One pi-specific Skill, bounded zero-`.norm` onboarding without project writes,
  and a real pi `0.84.1` AgentSession/ExtensionRunner Alpha gate.
- A single installed extension entry, bounded root-package contents, and a
  package-shaped isolated install gate using a native runtime tarball and the
  sealed upstream payload.
- Serialized post-edit strict validation for successful built-in `write` and
  `edit` results, with bounded model-visible findings, distinct runtime failure
  feedback, cancellation, and no blocking or rollback claim.
- Source-controlled manifests and package documentation for one root plus four
  exact-version native optional packages, including Linux x64 glibc metadata.
- Strict `pi-norm-spec/package-release/v1` generation and root/platform
  identity matching before bridge launch, with no runtime or `PATH` fallback.
- A shared package resolver and `pi-norm-spec/package-runtime/v1` launcher for
  explicit bundled `norm` and conformance execution without a shell.
- Clean-revision root/native package candidate assembly with final tarball
  checksums, raw hosted artifacts, sealed-payload verification, and a versioned
  five-package aggregate inventory without publication credentials.
