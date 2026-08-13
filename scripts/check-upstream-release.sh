#!/usr/bin/env bash
set -euo pipefail

script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_root/.." && pwd -P)"
cd "$repo_root"

target="${1:-}"
if [[ -z "$target" ]]; then
  target="$(rustc -vV | sed -n 's/^host: //p')"
fi
if [[ -z "$target" ]]; then
  echo "could not determine the native Rust target" >&2
  exit 1
fi

case "$target" in
  x86_64-unknown-linux-gnu|aarch64-apple-darwin|x86_64-apple-darwin)
    exe_suffix=""
    ;;
  x86_64-pc-windows-msvc)
    exe_suffix=".exe"
    ;;
  *)
    echo "unsupported upstream release target: $target" >&2
    exit 1
    ;;
esac

cargo build --quiet -p pi-norm-bridge
target_root="${CARGO_TARGET_DIR:-$repo_root/target}"
if [[ "$target_root" != /* ]]; then
  target_root="$repo_root/$target_root"
fi
bridge="$target_root/debug/pi-norm-bridge$exe_suffix"
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
  if [[ "${server_pid:-}" =~ ^[0-9]+$ ]] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if [[ -n "${check_root:-}" && -d "$check_root" ]]; then
    rm -rf -- "$check_root"
  fi
}
trap cleanup EXIT

archive="$check_root/$asset"
checksum="$archive.sha256"
curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
  "$url" --output "$archive"
curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
  "$url.sha256" --output "$checksum"

checksum_line="$(tr -d '\r\n' <"$checksum")"
if [[ "$checksum_line" != "$expected_sha  $asset" ]]; then
  echo "public checksum asset differs from the compiled upstream pin" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  actual_sha="$(sha256sum "$archive" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  actual_sha="$(shasum -a 256 "$archive" | awk '{print $1}')"
else
  echo "sha256sum or shasum is required" >&2
  exit 1
fi
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

server_input="$check_root/bridge.stdin"
server_output="$check_root/bridge.stdout"
mkfifo "$server_input" "$server_output"
"$bridge" serve --payload "$payload" <"$server_input" >"$server_output" &
server_pid=$!
exec 7>"$server_input"
exec 8<"$server_output"
if ! read -r -t 30 -u 8 server_ready \
  || [[ "$server_ready" != *'"type":"event"'* \
  || "$server_ready" != *'"event":"ready"'* \
  || "$server_ready" != *'"apiVersion":"norm-spec/compatibility/v1"'* \
  || "$server_ready" != *'"sourceRevision":"5c781964b6d9b11c52f29e5b6e2bbe13c25a5ee0"'* ]]; then
  echo "persistent bridge did not emit the exact ready identity" >&2
  exit 1
fi

printf '%s\n' \
  '{"apiVersion":"pi-norm-spec/bridge/v1","type":"request","id":"collect-1","method":"collect","params":{"root":".","target":"docs/planning/status.md"}}' \
  >&7
if ! read -r -t 30 -u 8 server_collection \
  || [[ "$server_collection" != *'"id":"collect-1"'* \
  || "$server_collection" != *'"status":"ok"'* \
  || "$server_collection" != *'"apiVersion":"norm-spec/collect/v1"'* \
  || "$server_collection" != *'"path":"docs/.norm"'* \
  || "$server_collection" != *'"path":".norm"'* ]]; then
  echo "persistent bridge collection did not preserve the exact upstream result" >&2
  exit 1
fi

printf '%s\n' \
  '{"apiVersion":"pi-norm-spec/bridge/v1","type":"request","id":"validate-cancelled","method":"validate","params":{"root":"."}}' \
  '{"apiVersion":"pi-norm-spec/bridge/v1","type":"request","id":"cancel-1","method":"cancel","params":{"requestId":"validate-cancelled"}}' \
  >&7
if ! read -r -t 30 -u 8 cancellation_ack \
  || ! read -r -t 30 -u 8 cancellation_result; then
  echo "persistent bridge cancellation did not produce two terminal responses" >&2
  exit 1
fi
combined_cancellation="$cancellation_ack$cancellation_result"
if [[ "$combined_cancellation" != *'"id":"cancel-1","status":"ok"'* \
  || "$combined_cancellation" != *'"accepted":true'* \
  || "$combined_cancellation" != *'"id":"validate-cancelled","status":"cancelled"'* ]]; then
  echo "persistent bridge did not cancel the targeted request" >&2
  exit 1
fi

printf '%s\n' \
  '{"apiVersion":"pi-norm-spec/bridge/v1","type":"request","id":"shutdown-1","method":"shutdown"}' \
  >&7
if ! read -r -t 30 -u 8 shutdown_ack \
  || [[ "$shutdown_ack" != *'"id":"shutdown-1","status":"ok"'* ]]; then
  echo "persistent bridge did not acknowledge graceful shutdown" >&2
  exit 1
fi
exec 7>&-
exec 8<&-
if ! wait "$server_pid"; then
  echo "persistent bridge did not exit successfully after shutdown" >&2
  exit 1
fi
server_pid=""

echo "Pinned upstream release passed checksum, sealing, identity, 82-case conformance, collect, validate, and persistent bridge lifecycle."
