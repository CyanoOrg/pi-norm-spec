# Architecture

## Boundary

pi-norm-spec is a hybrid package because pi loads TypeScript/JavaScript
extensions. Rust owns computation; TypeScript owns host adaptation.

```text
pi ExtensionAPI
      │
      ▼
extensions/norm-context.ts    event mapping, cancellation, UI
      │ JSON/JSONL
      ▼
pi-norm-bridge                process protocol and lifecycle
      ├──────────────────────► bundled norm executable
      │                        collect, validate, compatibility
      │                                  │
      │                                  │ normalized machine responses
      ▼                                  ▼
pi-norm-engine                summaries and policy decisions
```

## `pi-norm-engine`

Consumes normalized, versioned norm-spec data and calculates active prompt
summaries and enforceable policy decisions. It does not parse YAML or traverse
`.norm` inheritance itself.

For Gate D it produces `pi-norm-spec/prompt-context/v1`: a deterministic,
bounded projection containing the complete normalized frontmatter and Markdown
body for every collected convention. It preserves upstream ordering and fails
instead of truncating or performing a lossy natural-language summary.

## `pi-norm-bridge`

Provides versioned JSON/JSONL framing between Node.js and Rust. It owns request
correlation, protocol errors, cancellation, and process-level diagnostics. It
must not turn failures into empty convention sets. It invokes the verified
upstream CLI rather than linking norm-spec crates or discovering a sibling
checkout.

## Upstream runtime

The adapter consumes norm-spec through the CLI machine boundary selected in
D005. Compatibility discovery is mandatory before collect or validate output
is trusted. Product SemVer alone is insufficient: the pinned format, machine
APIs, suite, case count, and contract digest must all match.

The initial distribution follows D006. A platform package carries the matching
pi bridge and a release-derived norm-spec payload with both executables, the
exact contract bundle, manifest, license, and provenance metadata. The adapter
does not fall back to an arbitrary `norm` on `PATH`.

## TypeScript extension

Registers pi events and commands, projects event inputs into bridge requests,
and renders structured responses. It never parses `.norm` or duplicates policy
logic. A platform resolver selects only the exact optional package for the
current Node platform and architecture, validates its versioned `runtime.json`,
and passes explicit bridge and payload paths to the client; it does not search
`PATH`. The adapter remains replaceable if pi later exposes a native plugin ABI.

D009 maps pi's `context` event to a fresh `promptContext` bridge request before
every provider turn. The adapter appends one hidden custom message only to the
event's returned message copy, so conventions do not enter session history.
Path-bearing built-in tool calls select the next target; shell text and custom
tool fields are not guessed. TypeScript validates the bridge result envelope
but does not parse, reorder, summarize, or classify conventions.

## Process model

D008 selects one persistent pi bridge child per active pi session. The adapter
starts it on `session_start`, waits for a versioned `ready` event, and requests
an acknowledged shutdown on `session_shutdown`. Requests and responses use
newline-delimited JSON, explicit frame kinds, unique IDs, and terminal
`ok`/`error`/`cancelled` states. Cancellation targets one request rather than
terminating the bridge.

The initialized bridge caches sealed-payload verification and the exact
compatibility handshake only. Each collect, prompt-context, or validate
operation still runs the verified `norm` CLI selected by D005. Unexpected EOF,
malformed output, or a non-zero bridge exit rejects all pending requests and
leaves the adapter in a visible failed state; there is no silent one-shot
fallback or automatic restart. A later explicit session start may create a
fresh child. The exact frame and method contract is defined in
`docs/BRIDGE-PROTOCOL.md`.

## Skill and cold start

Only the pi-specific Skill from D007 is registered with the host. It delegates
format work to the bundled engine and references upstream documentation instead
of copying canonical prose. A compatible runtime with zero collected `.norm`
files produces one onboarding notice and no project mutation. Runtime absence,
identity mismatch, and invalid conventions remain explicit failures.

## Security properties

- A bridge failure is visible and disables enforcement explicitly.
- Blocking decisions include stable codes and actionable reasons.
- Any escape flag is explicit, observable, and tested.
- Untrusted `.norm` content never becomes a shell command.
- Paths are canonicalized by the upstream engine before policy evaluation.
