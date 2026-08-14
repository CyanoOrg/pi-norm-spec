# Gate E Distribution Design

> Status: Accepted on 2026-08-14 through D012. Implementation, public
> visibility, tagging, and publication remain separate checkpoints.

## Goal

Turn Gate D's package-shaped rehearsal into a self-contained, auditable public
beta distribution. One user-facing package must install the exact native bridge
and sealed norm-spec payload for the current platform, while keeping the
single-engine boundary and all existing failure guarantees.

This gate delivers distribution, not new `.norm` semantics or hard enforcement.

## Baseline

The exact `79d040e` main line already proves:

- the public norm-spec `0.1.0-rc.1` pin, four release checksums, payload sealing,
  compatibility discovery, and 82/82 conformance;
- one persistent bridge per pi session, targeted cancellation, shutdown, and
  visible crash/protocol failures;
- real pi `0.84.1` Skill discovery, root/path injection, zero-`.norm`
  onboarding, and bounded post-edit validation feedback;
- temporary root and native npm tarballs installed into an isolated consumer on
  Linux x64, macOS arm64/x64, and Windows x64.

That rehearsal is not production assembly. It writes temporary manifests,
installs one explicitly supplied platform tarball, retains no release
artifacts, and does not prove npm registry or `pi install` behavior.

## Non-goals

- Do not add parser, collector, Schema, validation, or conformance semantics.
- Do not use a `norm` or bridge executable discovered on `PATH`.
- Do not reopen D010 hard enforcement or implement escape.
- Do not claim Linux musl, Linux arm64, Windows arm64, or another target.
- Do not grant CI tag, GitHub Release, visibility, or npm publication authority.
- Do not publish the existing private `0.1.0-alpha.1` development identity.

## Package topology

All packages use one exact pi-norm-spec SemVer.

| Package | Selector | Contents |
|---|---|---|
| `pi-norm-spec` | all supported hosts | extension, pi Skill, launcher, root release manifest, docs, license, exact optional dependencies |
| `pi-norm-spec-linux-x64` | `os=linux`, `cpu=x64`, `libc=glibc` | bridge, sealed Linux x64 norm-spec payload, runtime/release manifests, docs, license |
| `pi-norm-spec-darwin-arm64` | `os=darwin`, `cpu=arm64` | bridge, sealed Apple Silicon payload, runtime/release manifests, docs, license |
| `pi-norm-spec-darwin-x64` | `os=darwin`, `cpu=x64` | bridge, sealed Intel macOS payload, runtime/release manifests, docs, license |
| `pi-norm-spec-win32-x64` | `os=win32`, `cpu=x64` | bridge executable, sealed Windows x64 payload, runtime/release manifests, docs, license |

The root manifest pins every platform package to the identical version. It uses
`optionalDependencies` so npm selects the current host without making foreign
native packages installation failures. No caret, tilde, tag, or `latest` range
is permitted.

The five names were absent from the public npm registry when D012 was recorded.
That check does not reserve them. The maintainer must reconfirm ownership and
availability immediately before the release-preparation identity is committed.

## Source layout and manifests

The repository root remains the Rust/TypeScript development workspace. Gate E
adds source-controlled publish manifests and package documentation under a
dedicated package source tree. Binaries and upstream payload bytes remain build
outputs and are never committed.

A deterministic staging tool copies the bounded root resources or one native
runtime into a fresh candidate directory. It may inject only values bound to
the exact candidate, such as the full source revision and reviewed release
version. It must not invent dependency ranges, resource entries, package names,
targets, or metadata that are absent from the source-controlled inputs.

The root release manifest uses a versioned
`pi-norm-spec/package-release/v1` envelope and records at least:

- product name and exact version;
- full pi-norm-spec source revision;
- bridge, prompt-context, platform-runtime, and package-release APIs;
- tested pi host version;
- exact norm-spec product/tag/source revision, archive target/checksums,
  contract suite, case count, and digest;
- all four exact optional package names and versions.

Each platform release manifest uses the same envelope and repeats the common
identity plus its Rust target and upstream archive checksum. `runtime.json`
continues to contain portable package-relative bridge and payload paths. The
resolver checks the root/platform release identities and target before launch;
the bridge then independently seals and handshakes the payload.

## Supported runtime selection

The production resolver supports exactly:

- `linux-x64-glibc`;
- `darwin-arm64`;
- `darwin-x64`;
- `win32-x64`.

Linux runtime selection must distinguish glibc from musl before package
resolution. An unsupported or unidentifiable libc is an explicit
`unsupported-platform` failure, not a missing-package retry or `PATH` fallback.
Package omission, unsafe locator paths, mismatched package/source versions, and
invalid release manifests retain separate typed startup errors.

## Bundled executable access

Ordinary pi use starts the bridge through the extension and does not require a
global binary. Advanced users and CI still need a stable explicit path.

The root package therefore exposes a small Node launcher with these operations:

```text
pi-norm-spec runtime
pi-norm-spec norm <arguments...>
pi-norm-spec conformance <arguments...>
```

`runtime` prints versioned machine-readable package/runtime identity. `norm`
and `conformance` pass argv directly to the corresponding verified bundled
executable and preserve its stdout, stderr, and exit code. The launcher performs
package and locator resolution only. It never invokes a shell, parses `.norm`,
walks inheritance, downgrades failures, or searches `PATH`.

The public CI path is version-pinned, for example:

```bash
npx --yes pi-norm-spec@0.1.0-beta.1 norm compatibility --pretty
```

## Candidate assembly and evidence

An exact clean candidate produces:

- one root `.tgz` plus checksum;
- four native `.tgz` files plus checksums;
- one machine-readable aggregate inventory binding all ten files to the full
  source revision and package/upstream identities.

The root artifact is constructed once. Each native job builds the bridge for
its declared Rust target, downloads the exact norm-spec Release asset, verifies
its public checksum and manifest, seals it, executes 82/82 conformance, stages
the platform package, and packs it without lifecycle scripts.

Every tarball gate checks:

- exact name and shared version;
- README, license, repository, and supported platform metadata;
- bounded inventory with no source, tests, local paths, credentials, or build
  directories;
- root optional-dependency equality and platform release-manifest equality;
- bridge `identity` package version and protocol IDs;
- upstream source revision, archive checksum, compatibility identity, sealed
  inventory, and complete conformance;
- tarball checksum after the final pack operation.

The candidate workflow uploads review artifacts with read-only repository
permissions. It has no npm token and cannot create tags, releases, or repository
visibility changes.

## Installation and real-host gates

Gate D's direct `npm install <root.tgz> <platform.tgz>` rehearsal remains a
lower-level package gate. Gate E adds the actual user path through the pinned pi
package manager.

Tests isolate `PI_CODING_AGENT_DIR` and the project directory under temporary
roots. They never reuse or modify maintainer settings. For each native target:

1. install the version-pinned root package through `pi install npm:<spec>` from
   an isolated test registry or the maintainer-authorized public registry;
2. prove npm selected exactly one matching native optional package;
3. run real pi discovery, session lifecycle, Skill loading, compatibility,
   root/path injection, and zero-`.norm` onboarding;
4. exercise green and finding post-edit validation while preserving original
   tool-result state;
5. run the root launcher for compatibility, collect/validate, and full
   conformance where applicable;
6. prove unsupported platform/libc, absent runtime, tampered manifest/payload,
   incompatible identity, and bridge failure remain visible.

No Gate E test expects a blocking `tool_call` handler. The required enforcement
assertion is that the package does not claim or surface hard enforcement while
D010's prerequisites remain absent.

The pinned beta certification covers pi `0.84.1` with its default npm installer.
Configured bun/pnpm wrappers and later pi versions are not silently added to the
support matrix; they require explicit compatibility evidence.

## Public and publication checkpoints

The first public distribution rehearsal is `0.1.0-beta.1`. Release preparation
updates the Rust workspace, internal Rust dependency, development/root publish
manifests, package lock, fixtures, changelog, and user documentation in one
exact identity commit. Stable `v0.1.0` is not part of this gate.

Before publication the maintainer must separately authorize:

1. full reachable-history and retained Actions log/artifact review;
2. changing `CyanoOrg/pi-norm-spec` from private to public;
3. immediate `main` and immutable `v*` rulesets after visibility permits them;
4. npm ownership for all five exact package names;
5. the exact hosted-green beta candidate and its ten tarball/checksum assets;
6. signed tag, GitHub Pre-release, and npm publication.

Publication uses already reviewed tarballs; it never repacks after tagging.
Publish the four platform packages one at a time, waiting until each exact
version resolves from the registry. Publish the root package only after all
four are public and match the reviewed digests. Never use `--no-verify`.

If a platform upload succeeds and a later artifact is wrong, preserve the
immutable public version, do not publish the root version, and repair forward
with a new beta. A transient retry may reuse only the exact reviewed tarball.
If the root version becomes public, the five-package set is treated as one
released product and all repairs use a new version.

## Implementation batches

### E1 — Production package contract

- add source-controlled root/platform publish manifests and package docs;
- add versioned root/platform release manifests and strict parsers;
- add libc-aware runtime selection and bounded launcher behavior;
- permanently test names, versions, dependency equality, identity, and
  inventories.

### E2 — Native candidate artifacts

- replace one-off rehearsal manifests with the production staging path;
- build five tarballs and checksums from one exact source revision;
- upload review artifacts from fixed native runners;
- add aggregate cross-artifact verification without publication credentials.

### E3 — Real pi installation

- exercise isolated version-pinned `pi install` and selected optional package;
- repeat the real-host injection, onboarding, Skill, failure, and post-edit
  paths on all four native targets;
- verify the launcher and unsupported-target behavior.

### E4 — Release review and beta rehearsal

- complete package, dependency, security, documentation, and history review;
- prepare exact `0.1.0-beta.1` identity without feature work;
- stop at each visibility, ruleset, tag, GitHub Release, and npm checkpoint;
- validate the public install and recovery paths before considering stable.

## Exit criteria

Gate E is complete only when an exact candidate has five internally consistent
tarballs, four native hosted install paths, the real pi and bundled-CLI user
paths, negative package/identity evidence, and a completed release-quality
review. Public beta publication is a subsequent maintainer action recorded
against that exact candidate; green implementation CI alone is not publication.
