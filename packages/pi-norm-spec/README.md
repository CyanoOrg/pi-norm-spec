# pi-norm-spec

Rust-backed `.norm` context and validation feedback for pi.

This root package contains the thin pi ExtensionAPI adapter, the pi-specific
Skill, and a launcher for the verified bundled `norm` runtime. Its exact-version
optional dependencies select one supported native runtime package. It does not
parse or validate `.norm` files itself and never searches `PATH` for a fallback.

The checked-in manifest is a candidate-assembly input. The current
`0.1.0-alpha.1` development identity is not authorized for publication.

See <https://github.com/CyanoOrg/pi-norm-spec> for source, support boundaries,
and release evidence.
