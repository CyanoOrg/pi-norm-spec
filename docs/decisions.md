# Decision Records

Decision records are append-only. Reversals are new records referencing the
decision they replace.

## D001 — Use a Rust engine with a thin TypeScript pi adapter

**Decision.** Implement policy evaluation and bridge behavior in Rust while
retaining the minimum TypeScript required to register pi ExtensionAPI events.

**Context.** pi packages load `.ts` and `.js` extension files; a pure Rust
package cannot directly register the required event handlers.

**Rationale.** The hybrid boundary preserves direct pi compatibility without
recreating format semantics in TypeScript.

## D002 — norm-spec remains the only format authority

**Decision.** pi-norm-spec consumes versioned norm-spec output. It does not
parse YAML, implement inheritance, validate schemas, or add private `.norm`
fields.

**Context.** The earlier TypeScript fallback duplicated parsing and collection,
creating a parity burden and allowing failures to degrade into empty results.

**Rationale.** One upstream engine makes failures explicit and keeps all
consumers aligned.

## D003 — Version the bridge independently

**Decision.** The Node/Rust process contract uses an explicit identifier such
as `pi-norm-spec/bridge/v1`, independent from the npm package, Rust crate, and
norm-spec format versions.

**Context.** Package releases and process-message compatibility change for
different reasons.

**Rationale.** Explicit protocol negotiation permits controlled upgrades and
clear incompatibility errors.

## D004 — Start an independent public hybrid product line

**Decision.** This repository begins the public pi-norm-spec product at
`0.1.0-alpha.1` with its own Git history. It does not import prototype commits,
branches, tags, or package versions. The future `CyanoOrg/pi-norm-spec`
repository is the canonical public collaboration and release authority; any
Gitea copy is a mirror or separately named legacy archive.

**Context.** An earlier private TypeScript proof of concept validated basic pi
integration, but it was not published as a public package or GitHub project.
Carrying that product lineage into the hybrid implementation would imply a
public release history that does not exist.

**Rationale.** A clean `0.1` line lets the package version describe this
implementation's maturity. Useful behavior is captured as self-contained
protocol and end-to-end fixtures rather than inherited Git ancestry.

## D005 — Consume norm-spec through its CLI machine protocols

**Decision.** The Rust bridge invokes a separately versioned `norm` executable
and consumes its machine-readable compatibility, collect, and validate
responses. It does not link the norm-spec Rust facade or treat a sibling source
checkout as a runtime dependency. Startup must compare every required identity,
including product, format, machine APIs, conformance suite, case count, and
contract digest, and fail closed on absence or mismatch.

**Context.** norm-spec `0.1.0-rc.1` publishes a compiled CLI, explicit machine
protocols, and compatibility discovery. Linking the facade would force every
upstream upgrade through a pi bridge rebuild and would couple the two products'
release cadence more tightly than their independent SemVer permits.

**Rationale.** A subprocess boundary uses the contract norm-spec deliberately
publishes for adapters, keeps format semantics in one engine, and makes the
actual runtime identity observable. Gate C still measures the lifetime of the
pi bridge process; it does not reopen the upstream CLI-versus-library decision.

## D006 — Distribute a verified, platform-specific upstream payload

**Decision.** The initial npm/pi distribution uses platform-specific optional
packages and does not rely on a `norm` found on `PATH`. Each platform package
must be assembled from one exact norm-spec GitHub Release asset and retain the
complete verification payload needed by this adapter: `norm`,
`norm-spec-conformance`, the exact contract bundle, release manifest, license,
and provenance/checksum metadata. It also carries the matching
`pi-norm-bridge` executable. Package production verifies the release checksum,
manifest source revision, compatibility identities, and complete conformance
suite before publication.

**Context.** Bundling only two executables would leave
`norm-spec-conformance` unusable without its exact contract directory. Looking
up an arbitrary executable on `PATH` would also make installation dependent on
a separate Rust/toolchain workflow and would weaken provenance.

**Rationale.** A complete release-derived payload gives JavaScript ecosystem
users a self-contained install while preserving the upstream release's
identity and conformance evidence. A future explicit override may be decided
separately; the first delivery path has one resolver and one failure mode.

## D007 — Provide one pi-specific Skill and a non-destructive cold start

**Decision.** pi-norm-spec exposes one Skill owned by this repository. It
explains pi-specific injection, status, escape, and authoring workflows, then
delegates format authoring and validation to the bundled `norm` CLI and links
to upstream canonical documentation; it does not copy or surface the upstream
canonical Skill as a second product Skill. The bundled upstream payload may
retain canonical files for provenance, but they are not registered as pi
resources.

When a compatible runtime finds no `.norm` files, the adapter treats that as a
valid project state: it emits one bounded onboarding notice, surfaces the
pi-specific Skill, and never creates project files without an explicit user
action. Missing or incompatible runtime components remain errors and must not
be presented as the same empty-project state. Ordinary pi use does not require
`norm` on `PATH`; distribution documentation must still provide an explicit
way for advanced users and CI to invoke the bundled executable.

**Context.** A project-local `.opencode/skills/norm-spec/` copy was useful for
the upstream adoption rehearsal but is an untracked byte-for-byte duplicate
that would drift if promoted into this product. Projects without conventions
also need discoverable onboarding without turning absence into either a silent
no-op or an error.

**Rationale.** One adapter-owned cognitive surface avoids competing Skills,
keeps host behavior downstream, and preserves norm-spec as the only authoring
authority. A notice rather than automatic initialization keeps repository
mutation under user control.

## D008 — Keep one observable bridge child per active pi session

**Decision.** The TypeScript adapter starts one persistent `pi-norm-bridge`
child for an active pi session and stops it during `session_shutdown`. The
child verifies the sealed payload and completes the exact compatibility
handshake before emitting a versioned `ready` event. Subsequent requests use
newline-delimited JSON with explicit frame kinds and request IDs. Cancellation
targets an individual request; graceful shutdown acknowledges the control
request before exiting. A malformed frame, startup failure, unexpected EOF, or
non-zero child exit rejects pending work and becomes visible adapter state. The
adapter does not silently start a second runtime, fall back to one-shot mode,
or return an empty convention set.

The persistent pi bridge continues to invoke the verified `norm` executable as
a subprocess for each semantic operation. This decision caches only sealed
payload verification and the compatibility handshake; it does not cache
project conventions or move format behavior across the D005 boundary.

**Context.** A 2026-08-13 lifecycle spike used the sealed public
`v0.1.0-rc.1` macOS arm64 payload and repeated the same collection against this
repository. After warm-up, 24 one-shot bridge collections had a 41.18 ms
median and 45.08 ms p95; 24 requests through one initialized child had a
4.69 ms median and 5.28 ms p95. Forced child termination became observable in
1.41 ms, a replacement reached `ready` in 36.90 ms, and acknowledged graceful
shutdown completed in 0.70 ms. The spike remained outside product history.
Both models package the same executable and verified payload, so lifecycle
does not change the platform-package inventory selected in D006.

**Rationale.** A session-scoped child removes repeated payload hashing and
compatibility discovery from turn and tool paths while retaining process-level
fault isolation. Explicit readiness, request correlation, targeted
cancellation, and fail-closed exit handling make the longer lifetime
observable instead of hiding it behind adapter state.
