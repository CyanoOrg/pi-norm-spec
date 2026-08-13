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
