# Beta.2 Release Review

Scope, evidence, and publication checklist for `v0.1.0-beta.2` (2026-10-24).

## Scope

- D017 host line: release manifests bind pi `1.2.0`; advisory peer range
  `>=0.84.1 <2`.
- D018 Phase 2: engine-side merge/projection adopted from
  `norm-adapter-engine` `=0.1.0`; `pi-norm-spec/prompt-context/v1` output
  byte-for-byte unchanged.
- Dependency hygiene: dev-scope `undici` `8.12.3` (six advisories cleared),
  dependabot rules for host bumps and `@types/node` majors, `@types/node`
  `22.20.5` on the engines-floor line.

## Evidence

- Local gates: fmt, clippy `-D warnings`, tests, doc; TypeScript 55/55.
- `scripts/check-upstream-release.sh` end to end green under the SDK swap
  (PR #18): checksum, sealing, identity, 82-case conformance, collect,
  validate, persistent bridge, real pi Alpha host, production-shaped
  installation, real package-manager path, bundled launcher.
- Byte identity: dual-identity golden fixtures locked at
  `norm-adapter-engine` 0.1.0 plus the live per-turn injection rendered by
  the SDK path throughout the working session.

## Publication checklist

- [ ] Host-verified candidate from CI on the exact release commit: five
      archives, five checksums, aggregate inventory.
- [ ] npm publish: four native packages first, then root, under the `beta`
      dist-tag.
- [ ] Signed tag `v0.1.0-beta.2` on the exact release commit.
- [ ] GitHub Release with the five artifacts and checksums.
- [ ] Post-publication smoke through the real
      `pi install npm:@cyanoorg/pi-norm-spec@0.1.0-beta.2` path.
