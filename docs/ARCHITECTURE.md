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
      │
      ▼
pi-norm-engine                policy evaluation over normalized data
      │
      ▼
norm-spec                     parser, collect, validation, format authority
```

## `pi-norm-engine`

Consumes normalized, versioned norm-spec data and calculates active prompt
summaries and enforceable policy decisions. It does not parse YAML or traverse
`.norm` inheritance itself.

## `pi-norm-bridge`

Provides versioned JSON/JSONL framing between Node.js and Rust. It owns request
correlation, protocol errors, cancellation, and process-level diagnostics. It
must not turn failures into empty convention sets.

## TypeScript extension

Registers pi events and commands, projects event inputs into bridge requests,
and renders structured responses. It never parses `.norm` or duplicates policy
logic. The adapter remains replaceable if pi later exposes a native plugin ABI.

## Process model

Bootstrap uses a short-lived bridge command for identity. Before injection is
implemented, choose between a persistent child process and an embedded native
binding using measured latency, packaging, crash-isolation, and upgrade data.
That selection requires a decision record.

## Security properties

- A bridge failure is visible and disables enforcement explicitly.
- Blocking decisions include stable codes and actionable reasons.
- Any escape flag is explicit, observable, and tested.
- Untrusted `.norm` content never becomes a shell command.
- Paths are canonicalized by the upstream engine before policy evaluation.
