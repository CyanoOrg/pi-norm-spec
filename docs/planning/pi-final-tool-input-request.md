# Pi Final Tool Input Guard Request

> Status: Consumer requirement accepted by D010 on 2026-08-13. This is a draft
> upstream request for `earendil-works/pi`; it has not been filed externally.

## Suggested issue title

Add an immutable final tool-call guard for security policy extensions

## Problem

Pi `0.84.1` exposes a mutable `tool_call` event that can block execution. Its
public contract also permits later handlers to mutate `event.input` and states
that no validation occurs after mutation. Handlers execute in extension load
order and a deny short-circuits the remaining handlers.

This is sufficient for an extension to block the input it currently sees. It
is not sufficient for a security policy extension to attest that an allowed
input is the exact input that will execute: a later extension may still change
it. Loading the policy extension last is installation convention, not a host
guarantee.

The default parallel mode creates a second contract question. Sibling calls
are preflighted sequentially and then execute concurrently, and a handler is
not guaranteed to observe sibling results. A policy needs defined batch
semantics even when it does not require sibling results.

## Evidence in the pinned package

- `packages/coding-agent/src/core/extensions/types.ts` declares mutable
  `event.input`, later-handler visibility, and no post-mutation validation.
- `packages/coding-agent/src/core/extensions/runner.ts` visits extensions and
  handlers in load order and returns immediately on `block`.
- `packages/coding-agent/docs/extensions.md` documents sequential sibling
  preflight followed by concurrent execution and the absence of sibling-result
  visibility.

The installed package used for this assessment is
`@earendil-works/pi-coding-agent@0.84.1`.

## Required outcome

Please provide an additive host contract with all of these guarantees:

1. A final guard observes tool name, tool-call ID, and arguments only after all
   mutable `tool_call` handlers and host argument validation have completed.
2. The observed arguments are immutable and are exactly the arguments passed
   to the tool when the guard allows execution.
3. No later mutation is possible. If pi must change the arguments, it must
   validate again and rerun the final guards against the new immutable value.
4. For one assistant tool-call batch, every final guard completes before any
   sibling begins execution. The event identifies execution mode and stable
   batch position; it does not need to expose sibling results.
5. A guard can return the existing structured block result. A thrown guard
   error remains fail-safe and visibly attributable to that guard rather than
   becoming an allow.
6. TUI, RPC, print, and JSON modes share the same execution guarantee even when
   their presentation of a blocked call differs.

## Possible API shape

The API shape is intentionally negotiable. One additive option is a new event:

```ts
pi.on("tool_call_final", async (event, ctx) => {
  // event.input is deeply readonly and is the exact value that will execute.
  // event.batch describes mode, ID, source-order index, and batch size.
  return { block: true, reason: "policy code and actionable reason" };
});
```

Equivalent solutions include a documented last-guard priority plus mandatory
post-mutation validation, or revalidation that reruns policy handlers. The
security property matters more than the event name.

## Acceptance tests

- A normal handler mutates an input; the final guard observes the mutation.
- The immutable value observed by an allowing final guard is deeply equal to
  the value received by the tool implementation.
- No handler can mutate the input after an allowing final guard.
- An invalid mutation fails validation before execution and cannot bypass the
  final guard.
- Extension load order does not weaken the immutable-final-input guarantee.
- In a parallel batch, all final guards finish before the first sibling tool
  starts; stable batch metadata reflects assistant source order.
- A block or guard error prevents that call from executing in every mode.

## Consumer use

pi-norm-spec will use this boundary only after norm-spec independently defines
typed operation-policy semantics. Rust will evaluate the immutable input and
return a versioned policy decision; the TypeScript extension will only adapt
that decision and any exact-call human dialog to pi.

## Non-goals

- defining `.norm` fields or policy semantics in pi;
- parsing shell commands or guessing custom-tool path fields;
- requiring sequential tool execution after successful final preflight;
- adding a global permission bypass or policy-specific UI to pi core.
