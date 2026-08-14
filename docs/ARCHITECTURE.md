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
pi-norm-engine                prompt context; future typed policy
```

## `pi-norm-engine`

Consumes normalized, versioned norm-spec data and calculates active prompt
context. It may calculate enforceable policy decisions only after the D010
upstream and host prerequisites exist. It does not parse YAML or traverse
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

D012 fixes the production package topology as one root adapter plus four exact,
same-version native optional packages. Linux x64 is explicitly glibc-only.
Source-controlled publish manifests and versioned root/platform release
manifests bind the pi source revision, package/APIs, target, and exact upstream
Release asset before the existing sealed-payload handshake runs. Candidate CI
produces review tarballs but has no publication authority.

## TypeScript extension

Registers pi events and commands, projects event inputs into bridge requests,
and renders structured responses. It never parses `.norm` or duplicates policy
logic. The shared package resolver selects only the exact optional package for
the current Node platform, architecture, and supported libc; matches strict
root/platform release identities; validates its versioned `runtime.json`; and
passes explicit bridge and payload paths to the client. It does not search
`PATH`. The adapter remains replaceable if pi later exposes a native plugin ABI.

D009 maps pi's `context` event to a fresh `promptContext` bridge request before
every provider turn. The adapter appends one hidden custom message only to the
event's returned message copy, so conventions do not enter session history.
Path-bearing built-in tool calls select the next target; shell text and custom
tool fields are not guessed. TypeScript validates the bridge result envelope
but does not parse, reorder, summarize, or classify conventions.

## Post-edit validation feedback

D011 maps successful built-in `write` and `edit` results to the existing
bridge `validate` method. The adapter serializes these requests in session-local
FIFO order so the persistent bridge retains its one-active-operation contract.
In pi's parallel mode this follows tool completion order. A validation observes
the filesystem state present when it runs; it is not a transactional snapshot.

Green validation updates transient UI status only. Findings or validation
runtime/protocol failures append bounded text to the completed tool result for
model-visible, session-persistent feedback, while preserving the original
result's error state, details, and usage. Cancellation does not become a false
validation result. Bash, user shell, custom tools, failed edits, and non-mutating
built-ins do not trigger this path.

This validates `.norm` declarations through the canonical upstream engine. It
does not decide whether an arbitrary file mutation complied with free-form
conventions, block or revert effects, or satisfy D010's hard-enforcement
prerequisites.

## Enforcement boundary

D010 records an empty hard-enforcement subset for the currently pinned A1 and
pi contracts. No blocking `tool_call` handler is registered. Existing prompt
context is guidance, and convention validation is not presented as proof that
an arbitrary project mutation is policy-compliant.

Enforcement requires two external contract changes: norm-spec must own a
closed, typed operation-policy declaration, and pi must expose a final
host-owned input or an equivalent non-transforming admission/revalidation
guarantee with defined per-call parallel clearance and dispatch behavior. Only
then may Rust emit a versioned policy decision and the
TypeScript layer adapt it to pi. Shell parsing, custom-tool field inference, and
private downstream `.norm` fields remain outside this architecture.

A future human escape is bound to one denied call, its evaluated-input digest,
and its policy collection. It requires a visible, non-empty human reason and is
recorded as a non-LLM session entry. No environment, startup, session, project,
or global bypass is permitted. The escape is not implemented while the hard
subset is empty.

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

Gate D rehearses the distribution boundary with unpublished temporary
tarballs: npm installs the bounded root package and one native runtime package
into an isolated consumer, then pi discovers the installed extension from its
manifest and the adapter resolves the sibling runtime package normally. This
is installation evidence, not production package assembly or publication;
those remain Gate E.

Gate E adds a non-semantic Node launcher in the root package for explicit
bundled `norm` and conformance access. A thin executable wrapper calls the same
package resolver used by the extension; it does not depend on symlink or
realpath equivalence. The launcher passes argv without a shell, preserves
process streams and exit status, and cannot parse `.norm` or search `PATH`.
Real installation evidence uses pi's package manager with an isolated
`PI_CODING_AGENT_DIR`; it does not mutate maintainer settings.

## Security properties

- A bridge failure is visible and never becomes an empty convention set.
- The current empty hard-enforcement subset is explicit; prompt guidance is not
  labeled as blocking protection.
- Future blocking requires upstream-owned stable codes and actionable reasons.
- Future escape is exact-call, visible, auditable, and has no broad bypass.
- Untrusted `.norm` content never becomes a shell command.
- Paths are canonicalized by the upstream engine before policy evaluation.
