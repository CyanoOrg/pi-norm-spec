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

- [x] Host-verified candidate from CI on the exact release commit: five
      archives, five checksums, aggregate inventory (push-event run
      40074403212 on a6e1ba8; five sha256 checks green; inventory revision
      bound to a6e1ba8).
- [x] npm publish: four native packages first, then root, under the `beta`
      dist-tag (maintainer-executed with browser 2FA; `beta` moved to
      0.1.0-beta.2, `latest` intentionally unchanged at 0.1.0-beta.1).
- [x] Signed tag `v0.1.0-beta.2` on the exact release commit (verified).
- [x] GitHub Release with the five artifacts and checksums (plus the
      aggregate candidate inventory; eleven assets).
- [x] Post-publication smoke through the real
      `pi install npm:@cyanoorg/pi-norm-spec@0.1.0-beta.2` path (fresh
      managed install, platform package restored, strict fixture
      validation, marker token returned verbatim through a new pi
      process).

## Post-script (2026-10-24): operational lessons

Two registry mechanics surfaced during this publication; both are now part
of the working procedure for the next release.

1. **Candidate artifacts must come from the push-event run.** A
   `pull_request`-event run shares the PR head SHA but its `GITHUB_SHA` is
   GitHub's ephemeral merge commit (`refs/pull/N/merge`), so the aggregate
   inventory it emits binds a revision that does not exist on `main`. The
   first downloaded set was rejected exactly here: inventory revision
   `bc4ae96f` versus the release commit `a6e1ba8`. Always select the
   `push`-event run on `main` and re-verify the inventory's bound revision.

2. **Stale packuments propagate per package, and npm silently skips
   unresolvable optional dependencies.** After publication, the five
   packuments became visible at different times (rounds of minutes). An
   install executed inside that window resolved the root package but hit
   `ETARGET` on the still-stale platform packument — and because platform
   packages are `optionalDependencies`, npm skipped it silently, producing
   a "successful" install with no runtime. Procedure: during the
   propagation window, refresh every packument
   (`npm view <pkg> versions --prefer-online` for root and all four
   platform packages) before installing, and verify the platform package
   directory and its `upstream/bin/norm` exist before declaring an
   install good.
