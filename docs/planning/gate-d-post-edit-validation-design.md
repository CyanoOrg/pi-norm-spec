# Gate D Post-Edit Validation Design

> Status: Accepted on 2026-08-13 through D011. Implementation and hosted
> evidence remain pending.

## Goal

After a supported file mutation completes, run canonical strict `.norm`
validation and return actionable findings as explicitly soft feedback. This
slice does not block, roll back, or claim that the mutation complied with
project policy.

## Pinned host evidence

For `@earendil-works/pi-coding-agent@0.84.1`:

- `tool_result` fires after tool execution and before `tool_execution_end` and
  the final tool-result message;
- a handler may patch `content`, `details`, `isError`, or `usage`;
- handlers are awaited and chain in extension load order;
- parallel results arrive in completion order and may interleave;
- `ctx.signal` is available for cancellation-aware nested work.

The existing bridge already exposes `validate`, which runs the sealed upstream
`norm validate --all --strict --json` contract. Exit `1` is a completed result
with findings; runtime, containment, protocol, and cancellation failures remain
separate typed outcomes.

## Trigger matrix

| Event | Validate | Reason |
|---|---:|---|
| successful built-in `write` | yes | known filesystem mutation contract |
| successful built-in `edit` | yes | known filesystem mutation contract |
| failed `write` or `edit` | no | no successful mutation is established |
| `read`, `grep`, `find`, or `ls` | no | non-mutating built-ins |
| `bash` or user shell | no | command text is not parsed or guessed |
| custom tool | no | no generic path or mutation contract exists |

The validation root is the session `cwd`. The path still updates D009's active
context target through the existing `tool_call` handler, but it is not used to
replace canonical whole-project validation with a downstream path walk.

## Execution and concurrency

The TypeScript lifecycle owns a session-local FIFO queue:

1. a supported successful `tool_result` enters the queue;
2. when prior validation has settled, the adapter confirms that the same
   session generation and ready bridge are still active;
3. it requests `validate` with `{ root: ctx.cwd }` and `ctx.signal`;
4. it validates the exact `norm-spec/validate/v1` envelope;
5. it returns no patch for green state or a content-only patch for feedback.

The queue never sends two semantic requests concurrently. It does not coalesce
edits: each successful supported result receives one validation attempt. In
parallel mode queue order is tool completion order, not assistant source order.
Sibling mutations may still occur while validation reads the filesystem, so a
result is an observation, not a snapshot or an enforcement receipt. A later
queued validation observes the later state available to it.

Session replacement or shutdown invalidates queued work through the lifecycle
generation. Bridge cancellation is not reported as success or as a validation
finding.

## Response validation

The adapter accepts only `norm-spec/validate/v1` with:

- a string root;
- deterministically ordered result entries;
- `ok`, `warning`, or `error` status;
- string path, code, and message values;
- string-or-null field and suggestion values;
- non-negative integer file, error, and warning counts.

TypeScript validates and renders this normalized response; it does not parse
YAML, apply profile rules, recount filesystem contents, or reinterpret policy.
An invalid envelope is an adapter protocol failure, not an empty or green
validation.

## Presentation contract

- Zero findings: return no tool-result patch; set `norm: valid (<n> files)` or
  `norm: empty` transient status.
- Findings: append one text item to the existing content, preserve all other
  result fields, set an error/warning summary status, and show a UI notice.
- Runtime/protocol failure: append a distinct unavailable-feedback text item,
  preserve the original tool result, set `norm: validation failed`, and show a
  UI error.
- Cancellation: return no patch and no error notice.

Finding text is deterministic: upstream result order, errors before warnings
within each file, stable code/message/field/suggestion labels. It includes at
most eight diagnostics and is capped at 8 KiB of UTF-8. A truncation marker and
the command needed for complete details remain visible.

Findings and unavailable-feedback text intentionally become part of the final
tool result and session history so the model can repair the completed edit.
Green results do not add history. This differs from D009 convention injection,
which remains ephemeral and is removed from the next context projection.

## Failure boundary

Post-edit validation never:

- changes `isError` on the original tool result;
- returns `block`, `terminate`, or an escape prompt;
- rolls back or performs another project write;
- treats a validation failure as a policy deny;
- hides runtime/protocol failure as zero findings;
- claims to validate arbitrary project-file compliance;
- parses shell commands or custom-tool inputs.

## Verification

- TypeScript tests cover the trigger matrix, green and finding responses,
  malformed and operational failures, cancellation, bounds, and concurrent
  result serialization.
- The real pi `0.84.1` host invokes `emitToolResult` against the sealed public
  payload for green and invalid `.norm` projects.
- Package-shaped installation repeats the real-host path through the default
  runtime resolver.
- Hosted Linux, macOS ARM/Intel, and Windows native payload jobs must pass the
  exact implementation candidate before this slice closes.
