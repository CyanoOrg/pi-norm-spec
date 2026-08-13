# Bridge contract

Fixtures in this directory define stable Node/Rust protocol identities and,
later, request/response behavior. They do not define the `.norm` format; that
contract belongs to norm-spec.

A protocol mismatch or unavailable bridge is a failure. Tests must never turn
those conditions into a successful skip or an empty ruleset.

Gate B and Gate C additionally run `scripts/check-upstream-release.sh`. It
downloads the exact native archive selected by the compiled upstream pin,
verifies the pinned release checksum before safe extraction, seals every
extracted byte in a local payload lock, and then exercises compatibility, all
82 conformance cases, collect, and strict validation. It then uses the
production TypeScript client to drive the persistent JSONL bridge through exact
readiness, prompt-context rendering, targeted cancellation, and acknowledged
shutdown. No
sibling checkout, `PATH` fallback, POSIX FIFO, or custom file descriptor is
used.

The language-neutral frame contract is documented in
`docs/BRIDGE-PROTOCOL.md`. Rust tests enforce framing limits, protocol and ID
validation, startup failure events, request-scoped parameter errors, and
cross-platform child cancellation. TypeScript tests use an isolated fake child
to prove ready/request/shutdown correlation, exact AbortSignal cancellation,
startup failure, malformed output, crash visibility, ExtensionAPI lifecycle
hooks, and the absence of silent restart.
