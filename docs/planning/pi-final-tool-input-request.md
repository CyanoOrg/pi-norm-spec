# Pi Tool Admission Hook Discussion

> Status: Consumer requirement accepted by D010 on 2026-08-13. A focused
> upstream discussion was posted on `earendil-works/pi` issue #7092 the same
> day. The issue remains auto-closed and no maintainer acceptance or host
> capability is recorded yet.

## Public discussion

- Existing issue: <https://github.com/earendil-works/pi/issues/7092>
- pi-norm-spec follow-up:
  <https://github.com/earendil-works/pi/issues/7092#issuecomment-5280143858>

The follow-up asks whether pi would expose a non-transforming
`authorize_tool` or `admit_tool` extension phase at the Harness tool-clearance
point. It deliberately leaves policy semantics in the extension and accepts
source-ordered clearance followed by concurrent dispatch in parallel mode.
Posting the question does not satisfy D010's host prerequisite.

## Consumer problem

Pi `0.84.1` exposes a mutable `tool_call` event that can block execution. Its
public contract also permits later handlers to mutate `event.input` and states
that no validation occurs after mutation. Handlers execute in extension load
order and a deny short-circuits the remaining handlers.

This is sufficient for an extension to block the input it currently sees. It
is not sufficient for an extension to attest that an allowed input is the
exact input that will execute: a later extension may still change it. Loading
the policy extension last is installation convention, not a host guarantee.

Parallel mode creates an ordering question but does not require a batch-wide
barrier. A policy needs documented per-call clearance and dispatch semantics;
it does not need sibling results or serialization of successful calls.

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

## Minimal host contract

An acceptable additive contract provides these guarantees:

1. A non-transforming admission phase observes tool name, tool-call ID, and
   arguments after all supported argument transforms and final host
   revalidation have completed.
2. The host owns the admitted value, and it is exactly the value passed to the
   tool when admission succeeds.
3. Admission cannot replace arguments. A block or admission error prevents the
   exact call from executing and remains visibly attributable.
4. No documented hook can mutate the value after admission. Any host-side
   replacement requires revalidation and a new admission decision.
5. Parallel behavior is explicit. Source-ordered clearance followed by
   concurrent dispatch is acceptable as long as each call is admitted before
   that same call executes.
6. The phase belongs to the shared execution Harness. Mode-specific rendering
   of a blocked call is outside this request.

## Possible API shape

The API shape is intentionally negotiable. One additive option is:

```ts
pi.on("tool_admission", async (event, ctx) => {
  // event.args is a host-owned view of the exact validated value that executes.
  return { block: true, reason: "policy code and actionable reason" };
});
```

Equivalent solutions include `authorize_tool`, `admit_tool`, or a documented
final non-transforming phase at the Harness clearance point. The lifecycle
guarantee matters more than the event name.

## Acceptance evidence

- A normal handler mutates an input; admission observes the validated result.
- The admitted value is deeply equal to the value received by the tool.
- No supported extension handler mutates the value after admission.
- An invalid mutation fails validation before admission or execution.
- Extension load order does not weaken final-input identity.
- In parallel mode, each call completes admission before its own dispatch;
  successful sibling calls may still execute concurrently.
- A block or admission error prevents the exact call from executing through
  the shared Harness.

## Trust boundary

This is a host lifecycle-integrity guarantee for cooperative extensions, not a
sandbox or an adversarial same-process security boundary. Pi extensions run
with host privileges and can use capabilities outside the documented hook
pipeline. pi-norm-spec must not claim otherwise.

## Consumer activation

pi-norm-spec will use this boundary only after norm-spec independently defines
typed operation-policy semantics. Rust will evaluate the admitted input and
return a versioned policy decision; the TypeScript extension will only adapt
that decision and any exact-call human dialog to pi.

## Non-goals

- defining `.norm` fields or policy semantics in pi;
- adding grants, classifiers, fingerprints, or a policy subsystem to pi core;
- parsing shell commands or guessing custom-tool path fields;
- requiring a batch-wide admission barrier or sequential successful execution;
- defending against a malicious installed extension;
- adding a global permission bypass or policy-specific UI to pi core.

## Follow-up

Wait for maintainer direction on #7092. Do not open a duplicate issue or submit
an implementation PR without the contribution flow's required maintainer
signal. A reply, reopen, or design discussion is evidence of engagement, not
evidence that the released host contract has changed.
