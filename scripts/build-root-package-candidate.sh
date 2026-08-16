#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  echo "usage: scripts/build-root-package-candidate.sh <output-directory>" >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"
if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  echo "package candidates require a clean tracked and untracked worktree" >&2
  exit 1
fi

source_revision="$(git rev-parse HEAD)"
if [[ ! "$source_revision" =~ ^[0-9a-f]{40}$ ]]; then
  echo "failed to resolve a full lowercase Git source revision" >&2
  exit 1
fi
version="$(node -p "JSON.parse(require('node:fs').readFileSync('package.json', 'utf8')).version")"
if [[ -z "$version" || "$version" == *[!0-9A-Za-z.+-]* ]]; then
  echo "failed to resolve a safe package version" >&2
  exit 1
fi

output_dir="$1"
if [[ -e "$output_dir" && ! -d "$output_dir" ]] || [[ -L "$output_dir" ]]; then
  echo "candidate output must be a real directory: $output_dir" >&2
  exit 2
fi
mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd -P)"
archive="$output_dir/cyanoorg-pi-norm-spec-$version.tgz"
checksum="$archive.sha256"
if [[ -e "$archive" || -e "$checksum" ]]; then
  echo "refusing to overwrite an existing root package candidate" >&2
  exit 1
fi

stage_parent="$(mktemp -d "${TMPDIR:-/tmp}/pi-norm-root-stage.XXXXXX")"
cleanup() {
  case "$stage_parent" in
    "${TMPDIR:-/tmp}"/pi-norm-root-stage.*)
      if [[ -d "$stage_parent" && ! -L "$stage_parent" ]]; then
        rm -rf -- "${stage_parent:?}"
      fi
      ;;
    *) echo "refusing to remove unexpected root staging path: $stage_parent" >&2 ;;
  esac
}
trap cleanup EXIT

node --experimental-strip-types scripts/stage-root-package.ts \
  "$stage_parent" \
  "$repo_root" \
  "$source_revision" >/dev/null
npm pack "$stage_parent/root-package" \
  --ignore-scripts \
  --pack-destination "$output_dir" \
  --cache "$stage_parent/npm-cache" >/dev/null
if [[ ! -f "$archive" || -L "$archive" ]]; then
  echo "root package candidate was not produced at the expected path" >&2
  exit 1
fi
node --experimental-strip-types scripts/check-package-archive.ts \
  "$archive" \
  "$source_revision" >/dev/null

sha256_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    echo "no supported SHA-256 command is available" >&2
    return 1
  fi
}
archive_sha="$(sha256_file "$archive")"
printf '%s  %s\n' "$archive_sha" "$(basename "$archive")" >"$checksum"
printf '{"archive":"%s","checksum":"%s","sourceRevision":"%s"}\n' \
  "$archive" \
  "$checksum" \
  "$source_revision"
