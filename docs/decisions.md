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
