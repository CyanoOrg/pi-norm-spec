# Gate D Ephemeral Context Design

## Scope of this slice

This Gate D slice implements path-scoped convention collection and ephemeral
prompt injection. It does not implement tool blocking, escape behavior,
post-edit validation, platform-package production, or automatic project
mutation.

D005 remains the semantic boundary: the bridge invokes the sealed `norm`
executable for collection. D008 remains the lifecycle boundary: one verified
bridge child serves the active pi session. D009 defines how pi host paths become
per-turn prompt context.

## Event and data flow

1. `session_start` creates and verifies one bridge child. The active target is
   reset to `.` for the new session instance.
2. Before every provider call, pi emits `context` with a deep copy of the
   current messages.
3. The adapter requests bridge method `promptContext` with `root = ctx.cwd`
   and the current active target. The request uses `ctx.signal` for targeted
   cancellation.
4. The bridge executes canonical upstream collect, then asks
   `pi-norm-engine` to construct `pi-norm-spec/prompt-context/v1`.
5. When conventions are present, the adapter removes any prior
   `pi-norm-spec-context` custom message from the event copy and appends the
   returned prompt as one hidden custom message. No session API is called.
6. Path-bearing built-in `tool_call` events update the target used by the next
   provider call. They do not block or modify the tool.

This means the first provider call uses project-root conventions. After an
assistant selects a concrete built-in file or directory path, every subsequent
provider turn is recollected for that path until another supported path event
changes it.

## Active-target mapping

| pi tool | Target for the next provider turn |
|---|---|
| `read` | `input.path` |
| `edit` | `input.path` |
| `write` | parent of `input.path`, or `.` |
| `grep` | `input.path`, or `.` when omitted |
| `find` | `input.path`, or `.` when omitted |
| `ls` | `input.path`, or `.` when omitted |
| `bash` | unchanged; commands are not parsed |
| custom tool | unchanged; arbitrary fields are not guessed |

The adapter does not canonicalize or test containment. It passes the explicit
root and mapped target to norm-spec, whose path protocol rejects missing,
outside-root, and otherwise invalid targets. New-file writes use the parent so
collection does not require the destination to exist.

## Prompt-context contract

The bridge method is additive within `pi-norm-spec/bridge/v1`:

```json
{
  "apiVersion": "pi-norm-spec/bridge/v1",
  "type": "request",
  "id": "request-1",
  "method": "promptContext",
  "params": { "root": "/project", "target": "docs/guide.md" }
}
```

Its successful result is:

```json
{
  "apiVersion": "pi-norm-spec/prompt-context/v1",
  "target": "docs/guide.md",
  "conventionPaths": ["docs/.norm", ".norm"],
  "prompt": "PI_NORM_SPEC_CONTEXT_V1..."
}
```

`conventionPaths` and the prompt payload preserve upstream
most-specific-first ordering. The prompt contains a deterministic JSON
projection of the complete normalized conventions. It does not omit unknown
future fields, rewrite Markdown, or classify natural language as enforceable
policy.

For zero conventions, `conventionPaths` is empty and `prompt` is `null`. This
is distinct from a bridge or collection failure. A non-empty rendered prompt
larger than 256 KiB returns `pi-norm-spec/context/too-large`; truncation is not
allowed.

## Failure and recovery

- A cancelled pi operation cancels only its active prompt-context request and
  does not produce an error notice.
- A request-scoped bridge error leaves the process alive, marks context
  injection unavailable, and emits a bounded visible notification.
- Repeating the same failure does not spam identical notifications.
- A later successful request restores the ready status and injects only the
  newly collected context.
- Process failure continues to use D008's terminal failed state and rejects all
  pending work.
- No failure path appends an empty convention message or reuses an older
  collected prompt.

## Required evidence

- Rust unit tests prove exact ordering/content, typed zero state, deterministic
  rendering, and oversize rejection.
- Bridge tests prove method parameter validation, serialization, cancellation,
  and unchanged single-active-operation behavior.
- TypeScript tests prove root-first injection, built-in target mapping,
  context-only message insertion, no persistent-message hook, cancellation,
  visible failure, and recovery.
- The sealed public payload test proves the production client can request and
  receive a real prompt context on every native hosted target.
