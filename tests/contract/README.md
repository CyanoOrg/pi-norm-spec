# Bridge contract

Fixtures in this directory define stable Node/Rust protocol identities and,
later, request/response behavior. They do not define the `.norm` format; that
contract belongs to norm-spec.

A protocol mismatch or unavailable bridge is a failure. Tests must never turn
those conditions into a successful skip or an empty ruleset.

Gate B additionally runs `scripts/check-upstream-release.sh`. It downloads the
exact native archive selected by the compiled upstream pin, verifies the pinned
release checksum before safe extraction, seals every extracted byte in a local
payload lock, and then exercises compatibility, all 82 conformance cases,
collect, and strict validation. No sibling checkout or `PATH` fallback is used.
