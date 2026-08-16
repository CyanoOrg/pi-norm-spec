#!/usr/bin/env bash
set -euo pipefail

script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_root/.." && pwd -P)"
cd "$repo_root"

target="${1:-}"
candidate_output="${2:-}"
if [[ "$#" -gt 2 ]]; then
  echo "usage: scripts/check-upstream-release.sh [rust-target] [candidate-output-directory]" >&2
  exit 2
fi
if [[ -z "$target" ]]; then
  target="$(rustc -vV | sed -n 's/^host: //p')"
fi
if [[ -z "$target" ]]; then
  echo "could not determine the native Rust target" >&2
  exit 1
fi

case "$target" in
  x86_64-unknown-linux-gnu)
    exe_suffix=""
    platform_package="@cyanoorg/pi-norm-spec-linux-x64"
    ;;
  aarch64-apple-darwin)
    exe_suffix=""
    platform_package="@cyanoorg/pi-norm-spec-darwin-arm64"
    ;;
  x86_64-apple-darwin)
    exe_suffix=""
    platform_package="@cyanoorg/pi-norm-spec-darwin-x64"
    ;;
  x86_64-pc-windows-msvc)
    exe_suffix=".exe"
    platform_package="@cyanoorg/pi-norm-spec-win32-x64"
    ;;
  *)
    echo "unsupported upstream release target: $target" >&2
    exit 1
    ;;
esac

sha256_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    echo "sha256sum or shasum is required" >&2
    return 1
  fi
}

source_revision="$(git rev-parse HEAD)"
if [[ ! "$source_revision" =~ ^[0-9a-f]{40}$ ]]; then
  echo "package rehearsal requires a full source revision" >&2
  exit 1
fi
package_version="$(node -p "JSON.parse(require('node:fs').readFileSync('package.json', 'utf8')).version")"
if [[ -z "$package_version" || "$package_version" == *[!0-9A-Za-z.+-]* ]]; then
  echo "package rehearsal requires a safe package version" >&2
  exit 1
fi
if [[ -n "$candidate_output" ]]; then
  if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
    echo "retained package candidates require a clean tracked and untracked worktree" >&2
    exit 1
  fi
  if [[ -e "$candidate_output" && ! -d "$candidate_output" ]] || [[ -L "$candidate_output" ]]; then
    echo "candidate output must be a real directory: $candidate_output" >&2
    exit 2
  fi
  mkdir -p "$candidate_output"
  candidate_output="$(cd "$candidate_output" && pwd -P)"
  cargo build --quiet --release --locked --target "$target" -p pi-norm-bridge
else
  cargo build --quiet -p pi-norm-bridge
fi
target_root="${CARGO_TARGET_DIR:-$repo_root/target}"
if [[ "$target_root" != /* ]]; then
  target_root="$repo_root/$target_root"
fi
if [[ -n "$candidate_output" ]]; then
  bridge="$target_root/$target/release/pi-norm-bridge$exe_suffix"
else
  bridge="$target_root/debug/pi-norm-bridge$exe_suffix"
fi
if [[ ! -f "$bridge" ]]; then
  echo "pi-norm-bridge was not built at the expected path: $bridge" >&2
  exit 1
fi

pin="$($bridge upstream-pin --target "$target")"
asset="$(printf '%s\n' "$pin" | sed -n 's/.*"name":"\([^"]*\)".*/\1/p')"
expected_sha="$(printf '%s\n' "$pin" | sed -n 's/.*"sha256":"\([0-9a-f]*\)".*/\1/p')"
url="$(printf '%s\n' "$pin" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')"
if [[ -z "$asset" || ! "$expected_sha" =~ ^[0-9a-f]{64}$ || -z "$url" ]]; then
  echo "compiled upstream asset pin could not be read" >&2
  exit 1
fi

check_root="$(mktemp -d)"
cleanup() {
  if [[ -n "${check_root:-}" && -d "$check_root" ]]; then
    rm -rf -- "$check_root"
  fi
}
trap cleanup EXIT

archive="$check_root/$asset"
checksum="$archive.sha256"
download() {
  local source_url="$1"
  local destination="$2"
  local partial="$destination.partial"

  curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
    --connect-timeout 20 \
    --max-time 180 \
    --retry 4 \
    --retry-all-errors \
    --retry-delay 2 \
    --retry-max-time 180 \
    "$source_url" --output "$partial"
  mv "$partial" "$destination"
}

download "$url" "$archive"
download "$url.sha256" "$checksum"

checksum_line="$(tr -d '\r\n' <"$checksum")"
if [[ "$checksum_line" != "$expected_sha  $asset" ]]; then
  echo "public checksum asset differs from the compiled upstream pin" >&2
  exit 1
fi

actual_sha="$(sha256_file "$archive")"
if [[ "$actual_sha" != "$expected_sha" ]]; then
  echo "downloaded upstream archive checksum mismatch" >&2
  exit 1
fi

archive_stem="${asset%.tar.gz}"
inventory="$check_root/archive.inventory"
tar -tzf "$archive" >"$inventory"
while IFS= read -r entry; do
  case "$entry" in
    "$archive_stem"|"$archive_stem/"|"$archive_stem/"*) ;;
    *)
      echo "upstream archive contains a path outside its single root: $entry" >&2
      exit 1
      ;;
  esac
  case "/$entry/" in
    *"/../"*)
      echo "upstream archive contains parent traversal: $entry" >&2
      exit 1
      ;;
  esac
done <"$inventory"
if tar -tvzf "$archive" | awk 'substr($1, 1, 1) == "l" || substr($1, 1, 1) == "h" { found=1 } END { exit found ? 0 : 1 }'; then
  echo "upstream archive contains a symbolic or hard link" >&2
  exit 1
fi

tar -xzf "$archive" -C "$check_root"
payload="$check_root/$archive_stem"
cp "$checksum" "$payload/archive.sha256"

sealed="$($bridge upstream-seal --payload "$payload")"
for identity in \
  '"operation":"upstream.seal"' \
  '"status":"ok"' \
  "\"target\":\"$target\"" \
  "\"assetSha256\":\"$expected_sha\""; do
  if [[ "$sealed" != *"$identity"* ]]; then
    echo "sealed payload response omitted identity: $identity" >&2
    exit 1
  fi
done

verified="$($bridge upstream-verify --payload "$payload")"
for identity in \
  '"operation":"upstream.verify"' \
  '"status":"ok"' \
  '"apiVersion":"norm-spec/compatibility/v1"' \
  '"apiVersion":"norm-spec/conformance/v1"' \
  '"complete":true' \
  '"declared":82' \
  '"executed":82' \
  '"passed":82' \
  '"failed":0' \
  '"notExecuted":0'; do
  if [[ "$verified" != *"$identity"* ]]; then
    echo "upstream verification omitted exact result: $identity" >&2
    exit 1
  fi
done

collected="$($bridge upstream-collect \
  --payload "$payload" \
  --root "$repo_root" \
  --target docs/planning/status.md)"
for result in \
  '"operation":"upstream.collect"' \
  '"apiVersion":"norm-spec/collect/v1"' \
  '"path":"docs/.norm"' \
  '"path":".norm"'; do
  if [[ "$collected" != *"$result"* ]]; then
    echo "upstream collection omitted exact result: $result" >&2
    exit 1
  fi
done

validated="$($bridge upstream-validate --payload "$payload" --root "$repo_root")"
for result in \
  '"operation":"upstream.validate"' \
  '"apiVersion":"norm-spec/validate/v1"' \
  '"files":2' \
  '"errors":0' \
  '"warnings":0'; do
  if [[ "$validated" != *"$result"* ]]; then
    echo "upstream validation omitted exact result: $result" >&2
    exit 1
  fi
done

empty_root="$check_root/empty-project"
mkdir "$empty_root"
empty_collection="$($bridge upstream-collect \
  --payload "$payload" \
  --root "$empty_root" \
  --target .)"
if [[ "$empty_collection" != *'"status":"ok"'* \
  || "$empty_collection" != *'"norms":[]'* ]]; then
  echo "zero-.norm collection was not preserved as a valid empty result" >&2
  exit 1
fi

invalid_root="$check_root/invalid-project"
mkdir "$invalid_root"
printf '%s\n' \
  '---' \
  'metadata:' \
  '  layer: invalid' \
  '  scope: ./' \
  '  version: "1.0"' \
  'unexpected: true' \
  '---' \
  '' \
  '# Invalid fixture' >"$invalid_root/.norm"
invalid_validation="$($bridge upstream-validate --payload "$payload" --root "$invalid_root")"
if [[ "$invalid_validation" != *'"status":"ok"'* \
  || "$invalid_validation" != *'"files":1'* \
  || "$invalid_validation" != *'"errors":1'* ]]; then
  echo "completed invalid validation was not preserved as typed findings" >&2
  exit 1
fi

set +e
missing_collection="$($bridge upstream-collect \
  --payload "$payload" \
  --root "$empty_root" \
  --target missing 2>&1)"
missing_status=$?
set -e
if [[ "$missing_status" -eq 0 \
  || "$missing_collection" != *'"status":"error"'* \
  || "$missing_collection" != *'"code":"pi-norm-spec/upstream/command-failed"'* ]]; then
  echo "missing collect target did not fail with a stable bridge error" >&2
  exit 1
fi

node --experimental-strip-types scripts/check-persistent-bridge.ts \
  "$bridge" \
  "$payload" \
  "$repo_root" \
  "$target" \
  "5c781964b6d9b11c52f29e5b6e2bbe13c25a5ee0"

node --experimental-strip-types scripts/check-pi-alpha.ts \
  "$bridge" \
  "$payload" \
  "$repo_root"

package_rehearsal="$check_root/package-rehearsal"
tarball_root="$package_rehearsal/tarballs"
npm_cache="$package_rehearsal/npm-cache"
mkdir -p "$tarball_root"
node --experimental-strip-types scripts/stage-package-rehearsal.ts \
  "$package_rehearsal" \
  "$repo_root" \
  "$bridge" \
  "$payload" \
  "$target" \
  "$source_revision"

npm pack "$package_rehearsal/root-package" \
  --ignore-scripts \
  --pack-destination "$tarball_root" \
  --cache "$npm_cache"
npm pack "$package_rehearsal/platform-package" \
  --ignore-scripts \
  --pack-destination "$tarball_root" \
  --cache "$npm_cache"

root_package_archive="$tarball_root/cyanoorg-pi-norm-spec-$package_version.tgz"
platform_tarball_prefix="${platform_package#@}"
platform_tarball_prefix="${platform_tarball_prefix//\//-}"
platform_package_archive="$tarball_root/$platform_tarball_prefix-$package_version.tgz"
if [[ ! -f "$root_package_archive" || ! -f "$platform_package_archive" ]]; then
  echo "package rehearsal did not produce the expected root and platform tarballs" >&2
  exit 1
fi

root_package_inventory="$package_rehearsal/root-package.inventory"
tar -tzf "$root_package_archive" >"$root_package_inventory"
for expected_entry in \
  package/package.json \
  package/release.json \
  package/bin/pi-norm-spec.js \
  package/extensions/norm-context.ts \
  package/extensions/runtime-resolver.ts \
  package/extensions/bridge-client.ts \
  package/runtime/launcher.js \
  package/runtime/package-runtime.js \
  package/skills/pi-norm-spec/SKILL.md; do
  if ! grep -Fxq "$expected_entry" "$root_package_inventory"; then
    echo "root package omitted required runtime entry: $expected_entry" >&2
    exit 1
  fi
done
if grep -Eq '^package/(crates|packages|scripts|tests)/' "$root_package_inventory"; then
  echo "root package included development-only crates, package inputs, scripts, or tests" >&2
  exit 1
fi

platform_package_inventory="$package_rehearsal/platform-package.inventory"
tar -tzf "$platform_package_archive" >"$platform_package_inventory"
for expected_entry in \
  package/package.json \
  package/release.json \
  package/runtime.json \
  "package/bin/pi-norm-bridge$exe_suffix" \
  package/upstream/release-manifest.json \
  package/upstream/pi-norm-spec-payload.lock.json; do
  if ! grep -Fxq "$expected_entry" "$platform_package_inventory"; then
    echo "platform package omitted required runtime entry: $expected_entry" >&2
    exit 1
  fi
done
if grep -Eq '^package/(crates|node_modules|scripts|src|target|tests)/' "$platform_package_inventory"; then
  echo "platform package included development-only source or build directories" >&2
  exit 1
fi

node --experimental-strip-types scripts/check-package-archive.ts \
  "$platform_package_archive" \
  "$source_revision" >/dev/null
platform_package_sha="$(sha256_file "$platform_package_archive")"
platform_package_checksum="$platform_package_archive.sha256"
printf '%s  %s\n' \
  "$platform_package_sha" \
  "$(basename "$platform_package_archive")" >"$platform_package_checksum"

npm install \
  --prefix "$package_rehearsal/consumer" \
  --ignore-scripts \
  --legacy-peer-deps \
  --no-audit \
  --no-fund \
  --package-lock=false \
  --cache "$npm_cache" \
  "$root_package_archive" \
  "$platform_package_archive"

installed_package="$package_rehearsal/consumer/node_modules/@cyanoorg/pi-norm-spec"
node --experimental-strip-types scripts/check-pi-alpha.ts \
  "$bridge" \
  "$payload" \
  "$repo_root" \
  "$installed_package"

launcher="$installed_package/bin/pi-norm-spec.js"
launcher_runtime="$(node "$launcher" runtime)"
for identity in \
  '"apiVersion":"pi-norm-spec/package-runtime/v1"' \
  '"operation":"runtime"' \
  '"status":"ok"' \
  '"name":"@cyanoorg/pi-norm-spec"' \
  "\"revision\":\"$source_revision\"" \
  "\"packageName\":\"$platform_package\"" \
  "\"target\":\"$target\""; do
  if [[ "$launcher_runtime" != *"$identity"* ]]; then
    echo "installed launcher runtime omitted exact identity: $identity" >&2
    exit 1
  fi
done

launcher_compatibility="$(node "$launcher" norm compatibility)"
for identity in \
  '"apiVersion":"norm-spec/compatibility/v1"' \
  '"suite":"norm-spec/a1-cli/v1"' \
  '"caseCount":82'; do
  if [[ "$launcher_compatibility" != *"$identity"* ]]; then
    echo "installed launcher compatibility omitted exact identity: $identity" >&2
    exit 1
  fi
done

installed_platform="$package_rehearsal/consumer/node_modules/$platform_package"
installed_norm="$installed_platform/upstream/bin/norm$exe_suffix"
installed_contract="$installed_platform/upstream/contract"
launcher_conformance="$(node "$launcher" conformance \
  --candidate "$installed_norm" \
  --contract-dir "$installed_contract")"
for result in \
  '"apiVersion":"norm-spec/conformance/v1"' \
  '"status":"pass"' \
  '"complete":true' \
  '"declared":82' \
  '"executed":82' \
  '"passed":82' \
  '"failed":0' \
  '"notExecuted":0'; do
  if [[ "$launcher_conformance" != *"$result"* ]]; then
    echo "installed launcher conformance omitted exact result: $result" >&2
    exit 1
  fi
done

if [[ -n "$candidate_output" ]]; then
  retained_archive="$candidate_output/$(basename "$platform_package_archive")"
  retained_checksum="$candidate_output/$(basename "$platform_package_checksum")"
  if [[ -e "$retained_archive" || -e "$retained_checksum" ]]; then
    echo "refusing to overwrite an existing platform package candidate" >&2
    exit 1
  fi
  cp "$platform_package_archive" "$retained_archive.partial"
  cp "$platform_package_checksum" "$retained_checksum.partial"
  mv "$retained_archive.partial" "$retained_archive"
  mv "$retained_checksum.partial" "$retained_checksum"
  echo "Retained exact platform candidate: $retained_archive"
fi

echo "Pinned upstream release passed checksum, sealing, identity, 82-case conformance, collect, validate, persistent bridge lifecycle, the real pi Alpha host, production-shaped installation, and bundled launcher."
