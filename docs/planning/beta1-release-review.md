# Beta.1 Release Review — E4 Preparation

Working record for the `0.1.0-beta.1` first public beta rehearsal. The
reviewed identity is prepared on branch `chore/prepare-0.1.0-beta.1`; the
exact hosted-green candidate SHA is recorded below once CI confirms. This
review executes the E4 contract from `docs/planning/gate-e-distribution-design.md`
without performing any tag, GitHub Release, npm ownership, or publication
action.

## Reviewed identity

- Workspace and npm versions: `0.1.0-beta.1` everywhere — root `package.json`,
  `Cargo.toml` workspace plus both crates, all five `packages/*/package.json`
  manifests including the root's four exact-version optional dependencies,
  `Cargo.lock`, and `package-lock.json`.
- Machine identities unchanged: `productCompat` stays `=0.1.0-rc.1`;
  bridge, prompt-context, package-release, and package-runtime API versions
  are untouched; the upstream pin still binds norm-spec `v0.1.0-rc.1` with
  its four checksums and the 82-case contract digest.
- Test expectations follow the identity: the engine identity assertion, the
  bridge contract fixture `packageVersion`, and the package runtime/candidate
  synthetic versions all read `0.1.0-beta.1`.

## Package review

- The full local release-derived gate (`scripts/check-upstream-release.sh`)
  passed at the beta.1 identity: checksum, sealing, exact identities, 82/82
  conformance, collect, validate, persistent bridge, real pi Alpha host,
  production-shaped installation, the real pi package-manager install gate
  (E3), and the bundled launcher.
- Root and `darwin-arm64` rehearsal tarballs were produced, inventory-checked,
  and installed through both the consumer path and the managed-install path;
  tarball names now carry `cyanoorg-pi-norm-spec-0.1.0-beta.1`.
- No development-only source entered either package inventory; the root
  package still ships exactly one extension entry.

## Dependency review

- `npm audit` reports zero vulnerabilities in both the production and
  development trees.
- The runtime dependency surface is unchanged: the extension uses only Node
  built-ins plus the host-provided `@earendil-works/pi-coding-agent` peer
  (dev-pinned `0.84.1`); native packages ship only their staged runtime and
  sealed payload.
- `Cargo.lock` is committed and updated only for the workspace version bump;
  no third-party crate version moved.

## Security review

- `scripts/check-public-history.sh` passed for the current index and all
  reachable commits; no secrets, credentials, or private paths.
- GitHub Actions pins, read-only workflow tokens, external-contributor
  approval, private vulnerability reporting, secret scanning, and push
  protection are unchanged from their D013/D014 state.
- The E3 negative gates re-proved there is no `PATH` or filesystem fallback
  when the platform package is missing, and no silent stale-version load.
- Hard enforcement remains intentionally empty under D010; no published text
  claims blocking, isolation, or rollback.

## Documentation review

- `README.md` and `README.zh-CN.md` status sections are synchronized at the
  beta.1 preparation state (the English bold marker is now properly closed).
- `CHANGELOG.md` promotes the accumulated entries to
  `[0.1.0-beta.1] - 2026-09-04` and keeps a fresh `[Unreleased]` section.
- `AGENTS.md`, `docs/planning/status.md`, and `packages/root/README.md`
  state the release-preparation posture and the E4 checkpoint boundary.

## npm ownership recheck (2026-09-04)

- Direct registry requests for all five `@cyanoorg/pi-norm-spec*` names
  returned HTTP 404. This proves current absence only and grants no
  ownership; the recheck must be repeated immediately before publication at
  the E4 npm checkpoint, per D012.

## Human checkpoints (maintainer-only, in order)

1. Merge the hosted-green exact candidate to `main` (protected path).
2. Repeat the npm ownership recheck; confirm `@cyanoorg` organization scope.
3. Create the signed tag `v0.1.0-beta.1` on the exact `main` SHA.
4. Create the GitHub Pre-release from that tag, attaching the five retained
   tarballs, five checksums, and the aggregate candidate inventory from the
   hosted run.
5. Publish npm packages platform-first (four native), then the root package.
6. Post-publication smoke: `pi install npm:@cyanoorg/pi-norm-spec@0.1.0-beta.1`
   against the real registry, then the public install and recovery paths
   before any stable promotion decision.
