---
name: pi-norm-spec
description: Use when pi needs to inspect, author, validate, or diagnose project .norm conventions and their automatic path-scoped context.
---

# pi-norm-spec

Use this Skill for the pi-specific workflow around canonical `.norm`
conventions. `norm-spec` remains the format, collection, and validation
authority; this adapter does not implement an alternative parser or validator.

## Runtime behavior

- Before each provider turn, pi-norm-spec recollects conventions for one active
  project path through the verified bundled Rust runtime.
- The context is ordered most-specific first and injected only into that
  provider call. It is not added to session history.
- Built-in read/edit/write/search/list paths select the next active target.
  Shell commands and custom-tool fields are not guessed for paths.
- Natural-language conventions are prompt guidance. Do not claim that a rule
  was mechanically enforced unless pi-norm-spec reports a typed enforcement
  decision.

Run `/norm-status` to inspect runtime identity, the most recent target, the
number of collected conventions, or a visible failure.

## Cold start

No `.norm` files is a valid project state. The adapter shows one notice and
does not create or modify files. Ask the user before initializing conventions.

When the user chooses to add conventions, select a canonical profile and use
the bundled `norm` CLI's explicit `init`, `collect`, and `validate` workflows.
Do not substitute an arbitrary executable found on `PATH`. The installed
platform package's documented CLI path is the runtime source of truth.

## Canonical authoring and diagnosis

Consult the exact upstream release documentation rather than reproducing its
schema or profile rules here:

- [Format specification](https://github.com/CyanoOrg/norm-spec/blob/v0.1.0-rc.1/docs/SPEC.md)
- [Profile guide](https://github.com/CyanoOrg/norm-spec/blob/v0.1.0-rc.1/docs/PROFILE-GUIDE.md)
- [Installation and upgrade](https://github.com/CyanoOrg/norm-spec/blob/v0.1.0-rc.1/docs/INSTALLATION.md)

For diagnosis:

1. Run `/norm-status`; runtime or identity failures are not an empty project.
2. Collect for the exact file or directory being operated on and preserve the
   returned most-specific-first order.
3. Run strict validation after authoring or editing conventions.
4. Report stable machine codes and paths. Never replace an error with an empty
   ruleset, a hand-written YAML parse, or a successful skip.
