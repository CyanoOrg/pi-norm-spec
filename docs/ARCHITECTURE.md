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
logic. The adapter remains replaceable if pi later exposes a native plugin ABI.

## Process model

Bootstrap uses a short-lived pi bridge command for identity. Before injection
is implemented, Gate C measures a short-lived versus persistent pi bridge child
using latency, cancellation, crash-isolation, and shutdown evidence. D005 has
already fixed the downstream norm-spec boundary as CLI subprocesses; Gate C
must not replace it with a native norm-spec binding without a superseding
decision.

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
