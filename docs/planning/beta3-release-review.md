# Beta.3 Release Review

Scope, evidence, and publication checklist for `v0.1.0-beta.3` (2026-10-24).

## Scope

- D019: multi-target prompt context (bridge `promptContextMulti`, recency
  set of at most four directories, shared-content-once merge through the
  family SDK) and the layout index (bridge `scan` and `layoutIndex`; the
  cached layout block prefixes the context message, refreshed at session
  start and after successful `.norm` edits). Client-side request
  serialization respects the bridge's one-active-operation rule.
- D017 H4 host re-verification: release manifests bind pi `1.4.0` (was
  `1.2.0`). The 1.3.0/1.4.0 changelogs were scanned full-text: zero overlap
  with the consumed surface (the only extension-affecting change,
  `before_provider_headers` attribution, is an event this adapter does not
  use), so no adaptation was required.

## Evidence

- H4 full re-verification under the `1.4.0` SDK identity: typecheck,
  TypeScript 59/59, cargo fmt/clippy/test/doc, and
  `scripts/check-upstream-release.sh` end to end green — 82-case
  conformance, persistent bridge with the three-method assertions, real
  pi Alpha host, production-shaped installation, and the real
  package-manager path.
- Live confirmation: the maintainer upgraded to pi `1.4.0` (new managed
  install location) and the published `0.1.0-beta.2` extension continued
  byte-identical injection in the resumed session.

## Publication checklist

- [ ] Host-verified candidate from CI on the exact release commit: five
      archives, five checksums, aggregate inventory (**push-event run**;
      see the beta.2 post-script).
- [ ] npm publish: four native packages first, then root, under the `beta`
      dist-tag (browser 2FA).
- [ ] Signed tag `v0.1.0-beta.3` on the exact release commit.
- [ ] GitHub Release (pre-release) with the five artifacts and checksums.
- [ ] Post-publication smoke through the real
      `pi install npm:@cyanoorg/pi-norm-spec@0.1.0-beta.3` path on the
      pi `1.4.0` binary, verifying the multi-target dual-block format in a
      fresh session.
