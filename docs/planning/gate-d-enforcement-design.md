# Gate D Enforcement and Escape Design

> Status: Proposed on 2026-08-13. This document is a review artifact, not an
> accepted decision. Escape semantics are a maintainer checkpoint. Do not
> implement blocking or append a decision record until that checkpoint is
> approved.

## Question

Which normalized `.norm` declarations can pi-norm-spec enforce as hard
`tool_call` decisions without interpreting prose, duplicating norm-spec, or
claiming control over inputs that another extension may still mutate?

For the exact `norm-spec/a1` and pi `0.84.1` contracts currently pinned by this
repository, the proposed answer is: **none**. The initial hard-enforcement
subset is empty. Prompt guidance and validation remain useful, but they must
not be relabeled as hard enforcement.

## Evidence reviewed

- norm-spec `v0.1.0-rc.1` `docs/SPEC.md`, `schema/norm-schema.json`, normalized
  `norm-spec/collect/v1`, and Rust semantic validation;
- pi `0.84.1` `ToolCallEvent`, `ToolCallEventResult`, `ExtensionRunner`, and the
  documented handler ordering, mutation, parallel-preflight, and mode rules;
- this repository's D005, D008, and D009 boundaries plus the completed
  functional Alpha evidence.

The older prototype plan named `required_files`, `naming_convention`, and
`reference_policy.target_must_exist` as possible hard constraints. That list is
not carried forward because the current public contracts do not give those
fields the required operation semantics.

## Current A1 enforceability

| Declaration | What the public contract says | Hard tool decision |
|---|---|---|
| `template.required_files`, `required_directories` | Paths that must exist | No built-in write/edit call removes a path. Parsing arbitrary shell deletion is unsafe. Overwriting an existing required file still satisfies existence. |
| `template.naming_convention` | Array of human-readable naming rules | No closed grammar, matcher, precedence, or stable violation code exists. |
| `template.single_source_of_truth` | One source path for a described domain | The domain is prose and a tool call does not declare which domain it changes. The source is not declared immutable. |
| `agent_rules.update_order` | Ordered prose steps | The host exposes one tool call, not a typed workflow step or completed-order state. |
| `agent_rules.document_lifecycle` | Typed state graph; transition requirements remain prose | The current document state and its storage format are consumer-owned and are not present in the collect response. A generic write/edit cannot prove a transition. |
| `agent_rules.reference_policy` | Validation rules for `cross_references` and `strong_references` in `.norm` | It does not protect ordinary referenced files. Prospective `.norm` content would still need canonical upstream parsing and validation. |
| `agent_rules.no_test_results`, `no_development_hooks` | Boolean declarations | The schema does not define a machine classifier for either artifact kind. |
| `scope`, references, Markdown body, and open objects | Boundaries or guidance containing free-form values | No generic operation-to-rule mapping exists. |

The upstream validator can reject malformed or semantically inconsistent
`.norm` declarations. That is validation of the convention file, not evidence
that an arbitrary project mutation violates a hard runtime policy.

## Host enforcement boundary

Pi's `tool_call` event can return `{ block: true, reason, terminate }`, but the
same public contract also states:

- handlers run in extension load order;
- later handlers see and may mutate earlier inputs;
- pi performs no validation after mutation;
- sibling calls are preflighted sequentially and then may execute concurrently;
- a preflight is not guaranteed to observe sibling results.

A pi-norm-spec allow decision therefore cannot attest to the parameters that
will finally execute unless pi supplies a final immutable pre-execution view or
an equivalent ordering and revalidation guarantee. Blocking a known deny is
safe because it short-circuits later handlers, but a complete hard-policy claim
requires both deny and allow integrity.

`bash` and custom tools remain outside the generic subset. Shell text is not a
typed filesystem transaction, and arbitrary custom-tool fields cannot be
guessed. A command parser or substring matcher would create a second,
platform-sensitive language engine and is explicitly rejected.

## Proposed decision

1. The hard-enforcement subset for the current pinned contracts is empty.
2. Do not register a blocking `tool_call` handler merely to simulate
   enforcement of free-form fields.
3. Do not add private `.norm` fields in this repository. Missing operation
   semantics must be proposed to norm-spec and versioned there.
4. Do not parse `bash` or infer custom-tool paths.
5. Keep prompt context explicitly labeled as guidance. Post-edit `norm
   validate` may provide soft feedback in its separately planned slice.
6. Reopen hard enforcement only when both prerequisites below are satisfied.

### Upstream format prerequisite

norm-spec must define a closed, typed operation-policy declaration with at
least:

- an operation kind and target selector;
- exact matching and inheritance/precedence rules;
- stable allow/deny semantics and violation codes;
- no prose-dependent classification;
- fixtures that make cross-consumer behavior testable.

The field name and schema belong to an upstream norm-spec decision. This
repository may describe requirements but must not create the format privately.

### Pi host prerequisite

Pi must provide a final immutable pre-execution input, handler priority with a
last-guard guarantee, or revalidation after all mutations. The contract must
also define how a policy observes or serializes parallel sibling mutations.

## Proposed future decision protocol

When the prerequisites exist, Rust should own a versioned policy result such
as `pi-norm-spec/policy-decision/v1`. Each result must bind:

- the exact normalized convention paths and policy identity;
- the tool kind, normalized target, and a digest of the evaluated input;
- one of `allow`, `deny`, or `notApplicable`;
- stable rule/violation codes, source convention, reason, and actionable fix;
- whether the result is eligible for a one-call human escape.

TypeScript may adapt that result to pi's event shape. It must not classify
content, reinterpret policy, or replace an evaluation error with `allow`.

## Proposed escape semantics

The escape is deliberately narrower than the prototype's proposed
`--no-norm-enforce` flag:

1. Only an exact typed deny that declares itself escapable may offer escape.
2. TUI or RPC asks the human to choose `Block` or `Allow once`, displays the
   stable rule code, source `.norm`, target, reason, and fix, and requires a
   non-empty human reason for `Allow once`.
3. The approval binds to one tool-call ID and the evaluated input digest. It is
   invalid after any input mutation and is never reused for a sibling call,
   later turn, resumed session, or changed policy collection.
4. The adapter appends a versioned, non-LLM session entry recording the one-call
   escape and shows a visible notification/status. It does not write project
   files.
5. Print/JSON modes and any mode without dialog-capable UI fail closed for a
   covered deny. They do not accept an environment variable or startup flag as
   a silent substitute for a person.
6. Runtime, protocol, containment, or evaluation errors are not policy denies
   and cannot be escaped through the policy dialog. Once enforcement exists,
   an error blocks only the mutating operation kinds declared covered by that
   policy version and remains visibly diagnosable.
7. No session-wide, project-wide, or global disable switch is part of the
   initial enforcement contract.

These semantics cannot be implemented safely until pi can prove that the
approved input is the final input that executes.

## Acceptance path

1. Maintainer approves, rejects, or amends this proposed empty-subset and
   exact-call escape boundary.
2. If approved, append D010 to `docs/decisions.md` and update architecture and
   status without adding a blocking handler.
3. Record the missing typed-policy requirement in norm-spec through its own
   decision process; coordinate dependency sequencing outside either product
   roadmap.
4. Verify or request the required final-input guarantee from pi.
5. Only then design the Rust policy protocol and implementation fixtures.
