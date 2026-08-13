# Development Status

## Resume here

- Stage: `0.1.0-alpha.1`; Gate A and Gate B are complete. Gate C implementation
  is locally complete and awaits exact-candidate hosted verification.
- Current objective: push the Gate C candidate and confirm its Rust server,
  TypeScript child lifecycle, and public payload path on all four hosted
  targets before closing the gate.
- D005 fixes the upstream boundary as `norm` CLI subprocesses. D006 fixes the
  first distribution path as verified platform-specific optional packages with
  the complete runtime/conformance payload. D007 fixes one pi-specific Skill
  and a non-destructive, one-notice cold start.
- `package.json` records the exact product, format, machine API, suite,
  case-count, digest, and bridge identities. The Rust engine now embeds the
  corresponding release tag, exact source revision, four public asset names,
  and four SHA-256 values.
- The Rust bridge resolves only a sealed payload: it verifies exact inventory,
  every payload byte, the retained release checksum line, release manifest,
  source revision, contract lock, and every locked contract file before process
  execution. There is no `PATH` or sibling-checkout fallback.
- The production bridge now exposes bounded JSONL frames, unique request IDs,
  one active semantic operation, targeted cancellation, typed startup/fatal
  events, and acknowledged shutdown. The thin TypeScript client owns one child
  per ExtensionAPI session, rejects pending work on malformed output or crash,
  and never silently restarts or falls back.
- The platform resolver recognizes four versioned optional-package locators,
  but the platform packages themselves remain Gate E work. Their current
  absence is a visible runtime startup failure rather than a `PATH` fallback.
- The private GitHub repository, initial `main` push, and first hosted Actions
  run are complete and green.
- GitHub repository bootstrap is complete; public visibility remains a
  maintainer checkpoint after the initial functional slice.
- Injection, enforcement, validation feedback, npm platform packages, and the
  pi-specific Skill are not implemented.
- The local `.opencode/skills/norm-spec/` adoption-rehearsal copy is ignored and
  is not a product resource.

## Verification

Gate C local implementation verification on 2026-08-13:

- implementation candidate
  `1de1ba2f306400eb691d97083e4a06e161d81512` contains D008, the Rust server,
  thin TypeScript client, ExtensionAPI lifecycle, and four-platform CI lanes;
- `cargo fmt --check`, strict workspace Clippy, 16 Rust tests, and rustdoc with
  warnings denied passed; cancellation tests terminate only the target child;
- a clean `npm ci --ignore-scripts` installed 148 packages and audited 149 with
  zero vulnerabilities; TypeScript typecheck and all eight Node tests passed;
- Node tests prove exact ready/request/shutdown correlation, AbortSignal
  cancellation, startup failure, malformed output, pending-work rejection on
  child exit, UI/status visibility, and no silent restart;
- a real TypeScript client used the sealed public macOS arm64 payload, observed
  exact `v0.1.0-rc.1` readiness, collected both applicable `.norm` files,
  cancelled validation by request ID, and reached `stopped` after shutdown;
- the full native release check again passed checksum, safe extraction, sealed
  identity, 82/82 conformance, collect, validate, ready, targeted cancellation,
  and graceful shutdown without a sibling checkout or `PATH` fallback;
- CI now runs the Node 24 client/lifecycle suite together with the native Rust
  and public-payload checks on Linux x64, macOS arm64/x64, and Windows x64.

This is local implementation evidence only. Gate C remains open until the
hosted run for the docs-inclusive candidate is complete and green on all jobs.

Gate C lifecycle measurement on 2026-08-13:

- a temporary spike used the sealed public `v0.1.0-rc.1` macOS arm64 payload
  bound to source revision `5c781964b6d9b11c52f29e5b6e2bbe13c25a5ee0`;
- after warm-up, 24 equivalent one-shot collect operations measured 41.18 ms
  median / 45.08 ms p95, while one initialized child measured 4.69 ms median /
  5.28 ms p95 for 24 JSONL requests;
- forced child termination was visible in 1.41 ms, replacement handshake to
  ready took 36.90 ms, and acknowledged graceful shutdown took 0.70 ms;
- D008 therefore selects a session-scoped child with explicit readiness,
  request IDs, targeted cancellation, fail-closed crash visibility, and no
  silent restart or one-shot fallback. D005's per-operation `norm` CLI process
  boundary remains unchanged.

Gate B local verification on 2026-08-13:

- the embedded upstream pin identifies tag `v0.1.0-rc.1`, source revision
  `5c781964b6d9b11c52f29e5b6e2bbe13c25a5ee0`, exact compatibility identity,
  and immutable checksums for all four native GitHub Release archives;
- the public `aarch64-apple-darwin` archive and sibling checksum were downloaded
  into an isolated temporary directory; the archive SHA matched
  `a51712eac951aaf1e543548a000ebce62174f3038e5b45606ba7f5b3a5f82dee`;
- safe single-root extraction, no link entries, exact release inventory,
  manifest/source/contract identity, every contract file digest, and sealed
  full-payload inventory/digests passed;
- `norm compatibility` matched the exact compiled pin and
  `norm-spec-conformance` returned pass/complete with 82 declared, 82 executed,
  82 passed, zero failed, and zero not executed;
- bridge collect returned `docs/.norm` then `.norm`; strict validation returned
  two files, zero errors, and zero warnings;
- a zero-`.norm` project returned a valid empty collection, an invalid project
  returned a completed typed validation response with findings, and a missing
  target returned a stable bridge error rather than an empty ruleset;
- unit/black-box coverage rejects checksum drift, post-seal payload changes,
  incompatible identities, missing payloads, and unsupported commands.

Gate B hosted verification on 2026-08-13:

- GitHub Actions run `31671215142` is a completed successful push run bound to
  exact implementation/status candidate
  `28fb61016f55ca9121df82b59bc4c844ff6fb161`;
- `rust-quality` passed public-history, fmt, strict Clippy, all workspace tests,
  and rustdoc with warnings denied;
- `extension-quality` passed clean npm installation, TypeScript typecheck, and
  the extension test command;
- all four native jobs passed workspace tests and the exact
  `Verify the exact native upstream release payload` step:
  Ubuntu 22.04 / `x86_64-unknown-linux-gnu`, macOS 15 /
  `aarch64-apple-darwin`, macOS 15 Intel / `x86_64-apple-darwin`, and Windows
  2022 / `x86_64-pc-windows-msvc`;
- every native payload job downloaded its own pinned public RC archive and
  proved checksum, safe extraction, sealed provenance and content, exact
  compatibility, complete 82/82 conformance, collection, strict validation,
  zero-`.norm` behavior, typed validation findings, and stable missing-target
  failure without a `PATH` or sibling-checkout fallback.

This closes Gate B. The follow-up closure commit changes documentation only;
the tested implementation, upstream asset pins, CI workflow, and protocol
fixtures remain exactly those from `28fb610`.

Bootstrap verification on 2026-08-10:

- `cargo fmt --check` → green.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings` → green.
- `cargo test --workspace --all-features` → 3 tests passed.
- `RUSTDOCFLAGS=-Dwarnings cargo doc --workspace --no-deps` → green.
- `npm ci --ignore-scripts` → 147 packages audited, 0 vulnerabilities.
- `npm run typecheck` and `npm test` → green.
- `bash scripts/check-public-history.sh` → green across the current index and
  all reachable commits.
- The Node 24 GitHub-hosted verification run was green across Rust, extension,
  Linux, macOS, and Windows jobs with no annotations.

## Open-source readiness

- [x] Independent public `0.1` history and product identity.
- [x] Security policy, code of conduct, and structured issue/PR templates.
- [x] High-confidence secret, sensitive filename, and private-path history scan.
- [x] GitHub Actions references pinned to full commit SHAs.
- [x] Private GitHub repository creation, initial `main` push, and first hosted
      Actions run.
- [x] Node 24 Action pins verified green on GitHub without annotations.
- [ ] Configure `main` protection when repository visibility or the
      organization plan permits it.

## Open work

- [x] Resolve and locally verify the exact platform payload for norm-spec
      `0.1.0-rc.1`.
- [x] Implement compatibility, collect, and validate machine-protocol handling.
- [x] Exercise the complete 82-case upstream conformance bundle without skips.
- [x] Confirm the exact candidate's four native hosted payload jobs.
- [x] Measure and decide short-lived versus persistent pi bridge lifecycle
      (D008).
- [x] Implement bridge request/response framing, cancellation, graceful
      shutdown, and TypeScript crash visibility.
- [ ] Confirm the exact Gate C candidate on all four hosted targets.
- [ ] Implement path-scoped ephemeral injection.
- [ ] Implement the pi-specific Skill and zero-`.norm` onboarding notice.
- [ ] Define the machine-evaluable enforcement subset before implementing hard
      policy decisions and escape behavior.
- [ ] Implement post-edit validation feedback.
- [ ] Package the bridge and verified upstream payload for each supported
      platform.
- [ ] Verify real pi end-to-end behavior.
