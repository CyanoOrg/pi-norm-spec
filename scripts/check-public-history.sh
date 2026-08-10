#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

scan_file="$(mktemp)"
trap 'rm -f "$scan_file"' EXIT
found=0

secret_pattern="(AKIA[A-Z0-9]{16}|ASIA[A-Z0-9]{16}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|sk-(proj-)?[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----|(api[_-]?key|client[_-]?secret|access[_-]?token|password|passwd)[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9/+_.=-]{12,})"
local_path_pattern='(/Users/[A-Za-z0-9._-]+/|/home/[A-Za-z0-9._-]+/|127[.]0[.]0[.]1:3000/CyanoWork)'
sensitive_path_pattern='(^|/)([.]env|id_rsa|id_ed25519|[^/]+[.](pem|key|p12|pfx))$'

scan_content() {
  local label="$1"
  local pattern="$2"
  : >"$scan_file"

  if git grep --cached -I -l -E "$pattern" -- . >>"$scan_file"; then
    :
  else
    local status=$?
    if [[ $status -ne 1 ]]; then
      echo "failed to scan the current index for $label" >&2
      exit "$status"
    fi
  fi

  while IFS= read -r commit; do
    if git grep -I -l -E "$pattern" "$commit" -- . >>"$scan_file"; then
      :
    else
      local status=$?
      if [[ $status -ne 1 ]]; then
        echo "failed to scan commit $commit for $label" >&2
        exit "$status"
      fi
    fi
  done < <(git rev-list --all)

  sort -u "$scan_file" -o "$scan_file"
  if [[ -s "$scan_file" ]]; then
    echo "$label detected in the following commit/path entries:" >&2
    cat "$scan_file" >&2
    found=1
  fi
}

scan_paths() {
  : >"$scan_file"
  if git ls-files --cached | grep -E "$sensitive_path_pattern" >>"$scan_file"; then
    :
  else
    local status=$?
    if [[ $status -ne 1 ]]; then
      echo "failed to scan current tracked paths" >&2
      exit "$status"
    fi
  fi

  while IFS= read -r commit; do
    if git ls-tree -r --name-only "$commit" | grep -E "$sensitive_path_pattern" | sed "s#^#$commit:#" >>"$scan_file"; then
      :
    else
      local status=$?
      if [[ $status -ne 1 ]]; then
        echo "failed to scan paths in commit $commit" >&2
        exit "$status"
      fi
    fi
  done < <(git rev-list --all)

  sort -u "$scan_file" -o "$scan_file"
  if [[ -s "$scan_file" ]]; then
    echo "sensitive filenames detected:" >&2
    cat "$scan_file" >&2
    found=1
  fi
}

scan_content "high-confidence secret material" "$secret_pattern"
scan_content "private machine paths or internal Gitea endpoints" "$local_path_pattern"
scan_paths

if [[ $found -ne 0 ]]; then
  exit 1
fi

echo "Public-history scan passed for the current index and all reachable commits."
