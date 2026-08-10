# Bridge contract

Fixtures in this directory define stable Node/Rust protocol identities and,
later, request/response behavior. They do not define the `.norm` format; that
contract belongs to norm-spec.

A protocol mismatch or unavailable bridge is a failure. Tests must never turn
those conditions into a successful skip or an empty ruleset.
