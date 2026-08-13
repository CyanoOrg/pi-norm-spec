# Development Status

## Resume here

- Stage: `0.1.0-alpha.1`; Gate A, Gate B, and Gate C are complete. Gate D's
  functional Alpha checkpoint is complete at exact package-inclusive candidate
  `f080395` with all four native hosted targets green.
- D010 closes the enforcement-scope checkpoint: the pinned A1
  hard-enforcement subset is empty. No blocking `tool_call` handler is
  authorized for the current contracts. The approved future escape is
  exact-call only and requires final-input integrity from pi.
- D011 accepts serialized post-edit `.norm` validation as bounded soft
  feedback for successful built-in `write` and `edit` results. Exact candidate
  `e74c4e1` passed the TypeScript suite and full release-derived
  real-host/package paths on all four native hosted targets. The decision does
  not authorize blocking, rollback, shell parsing, or project-compliance
  claims.
- Current objective: land the completed D011 slice, then prepare the remaining
  Gate E distribution work while tracking the norm-spec typed operation-policy
  and pi host prerequisites independently. This does not authorize enforcement
  or production/publication yet.
- `docs/planning/pi-final-tool-input-request.md` turns the pi prerequisite into
  a minimal non-transforming admission-hook request. The request was posted on
  pi issue #7092 on 2026-08-13 and accepts source-ordered clearance followed by
  concurrent dispatch. The issue remains auto-closed; no maintainer acceptance
  or released host capability is recorded.
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
- D009 adds `pi-norm-spec/prompt-context/v1`. Rust renders every normalized
  convention without loss or reordering and fails above 256 KiB instead of
  truncating. Pi's `context` event recollects before every provider turn and
  appends one hidden custom message only to the event copy; built-in tool paths
  select the next target.
- The adapter registers one pi-specific Skill. A compatible zero-`.norm`
  project receives one session-bounded onboarding notice and no project write;
  runtime and collection failures remain distinct visible errors.
- The platform resolver recognizes four versioned optional-package locators,
  but the platform packages themselves remain Gate E work. Their current
  absence is a visible runtime startup failure rather than a `PATH` fallback.
- The Gate D rehearsal creates unpublished temporary root/platform tarballs,
  installs them into an isolated consumer, and deletes them afterward. It does
  not establish production optional-dependency manifests or publishable native
  package assembly.
- The private GitHub repository, initial `main` push, and first hosted Actions
  run are complete and green.
- GitHub repository bootstrap is complete; public visibility remains a
  maintainer checkpoint after the initial functional slice.
- Hard enforcement and escape are intentionally not implemented under D010.
  D011 post-edit validation is complete without blocking or rollback;
  production npm platform packages are not implemented. The current Skill
  truthfully defers bundled-CLI invocation details to the future installed
  platform package.
- The local `.opencode/skills/norm-spec/` adoption-rehearsal copy is ignored and
  is not a product resource.

## Verification

Gate D enforcement-scope decision on 2026-08-13:

- the maintainer approved D010's empty hard-enforcement subset and exact-call
  future escape boundary;
- the decision rejects blocking based on prose, private downstream `.norm`
  fields, shell parsing, custom-tool path inference, and broad bypass flags;
- hard enforcement remains gated on both an upstream typed operation-policy
  contract and pi final-input/parallel-mutation guarantees.

Pi host-prerequisite discussion on 2026-08-13:

- pi-norm-spec posted a focused consumer follow-up on existing issue #7092:
  <https://github.com/earendil-works/pi/issues/7092#issuecomment-5280143858>;
- the request asks for a non-transforming admission phase after argument
  transforms and revalidation, while keeping policy semantics downstream;
- a batch-wide barrier is not required; documented source-ordered clearance
  followed by concurrent dispatch is acceptable;
- the issue is still auto-closed and has no maintainer response, so D010's
  current empty hard-enforcement subset is unchanged.

Gate D post-edit validation decision on 2026-08-13:

- D011 limits automatic validation to successful built-in `write` and `edit`
  results and reuses the sealed bridge `validate` operation;
- requests are serialized in session-local completion order so the bridge's
  one-active-operation contract remains intact;
- findings and operational failures become bounded tool-result feedback, while
  green results remain transient and the original tool result is preserved;
- the result is not a filesystem snapshot, enforcement decision, rollback, or
  proof that an arbitrary project mutation complied with `.norm` guidance.

Gate D post-edit validation local implementation on 2026-08-13:

- `6697b09` registers successful built-in `write`/`edit` result handling,
  session-local FIFO validation, exact response validation, bounded feedback,
  cancellation, and distinct failure presentation;
- `193aa48` expands the extension suite to 23 passing tests covering the
  trigger matrix, green/findings, preservation, malformed/operational failure,
  cancellation, eight-finding/8 KiB bounds, and concurrent-result FIFO order;
- the full local `aarch64-apple-darwin` release-derived gate passed checksum,
  sealing, exact identities, 82/82 conformance, persistent bridge lifecycle,
  direct real-pi green/finding feedback, and the same behavior after installing
  the packed root plus native runtime packages;
- the local candidate is not the hosted closure point; Linux, macOS ARM/Intel,
  and Windows must pass the final branch commit before this slice closes.

Gate D post-edit validation hosted verification on 2026-08-13:

- GitHub Actions run `31707315003` completed successfully and is bound to exact
  implementation/status candidate
  `e74c4e170623093b58394a9dac88c46a685610c3`;
- `rust-quality` passed public-history scanning, formatting, strict Clippy, all
  21 Rust tests, and rustdoc; `extension-quality` passed clean npm installation,
  TypeScript typechecking, and all 23 extension tests;
- Linux x64, macOS arm64, macOS x64, and Windows x64 each passed the TypeScript
  bridge lifecycle, all Rust tests, and the exact native upstream release
  payload gate;
- every native job therefore retained checksum and sealing verification, exact
  identities, 82/82 conformance, persistent bridge lifecycle, the real pi
  Alpha host, green/finding post-edit feedback, and package-shaped installation.

This closes D011. The follow-up closure commit changes documentation only; the
tested implementation, extension, tests, and release-derived gate remain
exactly those from `e74c4e1`.

Gate D functional Alpha verification on 2026-08-13:

- GitHub Actions run `31684071321` passed at exact commit
  `0e7e46d710c2d3c1e9218b9999d50bae635399b1`: Rust quality, extension quality,
  Linux x64, macOS arm64, macOS x64, and Windows x64 all succeeded;
- every native job completed the sealed public payload step, including all 82
  conformance cases, persistent bridge lifecycle, and the real pi Alpha host;
- `19ee72f` narrows the root tarball to eight runtime/documentation files and
  declares only `extensions/norm-context.ts` as the pi extension entry;
- `2b8f8ca` stages an unpublished native runtime package from the verified
  bridge and complete sealed payload, packs both packages, rejects root-package
  development files, and installs the tarballs into an isolated consumer;
- the real pi package manager discovered exactly one extension from the
  installed root package. Its default resolver found the installed sibling
  native package, after which handshake, Skill loading, root/path injection,
  cold start, and the no-project-write assertion all passed.

GitHub Actions run `31685170165` then passed at exact package-inclusive commit
`f0803952ffb25827e84110afa171b39f6d05a755`. All six jobs succeeded. Linux x64,
macOS arm64, macOS x64, and Windows x64 each emitted the installed-package and
package-shaped-install success markers after completing the sealed payload,
82-case conformance, persistent bridge, real pi host, package discovery, default
runtime resolution, Skill, injection, and cold-start checks. This closes the
Gate D functional Alpha checkpoint without claiming production packages.

Gate D local Alpha verification on 2026-08-13:

- D009 and `docs/planning/gate-d-design.md` bind the implementation to pi
  `0.84.1`'s actual lifecycle: `context` runs before each provider turn, while
  `before_agent_start` does not provide per-turn ephemeral injection;
- implementation commits `cf61b08`, `fbd4f33`, and `6321532` add Rust-owned
  prompt rendering, TypeScript path-scoped context injection, the single Skill,
  and non-destructive cold start; `4f0cc53` adds the real pi Alpha host gate and
  `0c96c6a` proves that cold start leaves the project directory untouched;
- Rust tests cover exact content/order, deterministic rendering, typed empty
  state, 256 KiB fail-closed behavior, bridge parameters, and existing process
  guarantees; all 21 workspace tests pass;
- all 15 Node tests pass and cover root injection, path mapping, replacement of
  prior ephemeral messages, cancellation, visible/recoverable failures,
  notification deduplication, one-notice empty state, and single-Skill resource
  discovery;
- the production client and new bridge method passed against the sealed public
  macOS arm64 `v0.1.0-rc.1` payload with both applicable conventions in exact
  most-specific-first order;
- the pinned real `@earendil-works/pi-coding-agent` host loaded the extension
  through `DefaultResourceLoader`, bound an `AgentSession`, emitted the actual
  ExtensionRunner lifecycle, parsed exactly one Skill, injected root context,
  recollected `docs/.norm` then `.norm` after a read target, and produced one
  zero-`.norm` notice without creating project files;
- the same run retained checksum, sealing, exact identity, complete 82/82
  conformance, strict validation, targeted cancellation, and graceful shutdown.

This is the underlying implementation evidence. The package-inclusive hosted
run above satisfies the remaining functional Alpha condition.

Gate C local implementation verification on 2026-08-13:

- implementation candidate
  `9099547ba41533cec0e99e64555241c8b8cf2920` contains D008, the Rust server,
  thin TypeScript client, ExtensionAPI lifecycle, four-platform CI lanes, and
  the cross-platform real-payload driver;
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
- the real-payload lifecycle check now reuses the production TypeScript
  `BridgeClient`; it has no POSIX FIFO or custom file-descriptor dependency and
  remains included in TypeScript typechecking;
- CI now runs the Node 24 client/lifecycle suite together with the native Rust
  and public-payload checks on Linux x64, macOS arm64/x64, and Windows x64.

Gate C hosted verification on 2026-08-13:

- GitHub Actions run `31677206007` completed successfully and is bound to exact
  implementation/status candidate
  `b95b67ac812a1c538c2e28c75f849ab56942c1c7`;
- `rust-quality` passed public-history scanning, formatting, strict Clippy, all
  16 Rust tests, and rustdoc with warnings denied;
- `extension-quality` passed clean npm installation, TypeScript typechecking,
  and all eight Node lifecycle tests;
- Linux x64, macOS arm64, macOS x64, and Windows x64 each passed the Node 24
  client lifecycle, all Rust tests, and its exact native public-payload step;
- every native payload job emitted both the production-client lifecycle result
  and the full payload result: exact readiness, collection, targeted
  cancellation, graceful shutdown, checksum, sealing, identity, 82-case
  conformance, strict validation, and stable failure behavior all passed;
- the Windows job therefore supplies the missing evidence from failed attempt
  `31676354440`: the corrected driver ran the real Windows executable and
  payload successfully without a FIFO or custom descriptor.

This closes Gate C. The follow-up closure commit changes documentation only;
the tested implementation, bridge client, CI workflow, and payload driver
remain exactly those from `b95b67a`.

Gate C hosted attempt on 2026-08-13:

- GitHub Actions run `31676354440` was bound to exact candidate
  `0a26e76b7b3082008e72f4b14a6688481bc403cf`;
- `rust-quality`, `extension-quality`, Linux x64, macOS arm64, and macOS x64
  completed successfully; the Windows job also passed the Node lifecycle suite
  and all 16 Rust tests;
- the Windows native-payload step exited `141` without emitting a payload or
  bridge assertion. The same step passed on all three Unix runners. The failed
  candidate's lifecycle driver was the only part using POSIX `mkfifo` and
  custom descriptors, so this run does not establish Windows persistent-payload
  behavior and does not identify a Rust protocol or upstream identity failure;
- `9099547` removes that Git Bash FIFO/descriptor path and drives the exact
  sealed payload through the production TypeScript client. The replacement
  passed locally together with checksum, sealing, 82/82 conformance, collect,
  validate, targeted cancellation, and graceful shutdown. Hosted confirmation
  of the corrected exact candidate remains required.

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
- [x] Confirm the exact Gate C candidate on all four hosted targets.
- [x] Implement path-scoped ephemeral injection.
- [x] Implement the pi-specific Skill and zero-`.norm` onboarding notice.
- [x] Define the current machine-evaluable hard-enforcement subset as empty and
      approve the future exact-call escape boundary (D010).
- [ ] Coordinate the norm-spec operation-policy and pi final-input prerequisites
      before reopening typed hard enforcement and escape implementation.
- [x] Implement post-edit validation feedback locally (D011).
- [x] Confirm the final D011 candidate's real-host/package path on all four
      native hosted targets.
- [ ] Package the bridge and verified upstream payload for each supported
      platform.
- [ ] Verify real pi end-to-end behavior.
