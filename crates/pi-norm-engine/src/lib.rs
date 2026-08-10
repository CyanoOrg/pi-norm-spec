//! Framework-neutral policy engine for pi-norm-spec.
//!
//! Bootstrap code exposes protocol identity only. Policy evaluation is added
//! after the canonical norm-spec Rust contract is pinned.

#![forbid(unsafe_code)]

/// Machine API identifier for the Node/Rust bridge.
pub const BRIDGE_API_VERSION: &str = "pi-norm-spec/bridge/v1";

/// Upstream collect protocol expected by the bootstrap.
pub const EXPECTED_NORM_COLLECT_API: &str = "norm-spec/collect/v1";

/// Runtime identity returned during bridge negotiation.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RuntimeIdentity {
    /// Bridge protocol implemented by this runtime.
    pub bridge_api_version: &'static str,
    /// Canonical norm-spec collect protocol required by this runtime.
    pub expected_norm_collect_api: &'static str,
    /// Rust package version.
    pub package_version: &'static str,
}

/// Return the compile-time runtime identity.
#[must_use]
pub const fn runtime_identity() -> RuntimeIdentity {
    RuntimeIdentity {
        bridge_api_version: BRIDGE_API_VERSION,
        expected_norm_collect_api: EXPECTED_NORM_COLLECT_API,
        package_version: env!("CARGO_PKG_VERSION"),
    }
}

#[cfg(test)]
mod tests {
    use super::{BRIDGE_API_VERSION, EXPECTED_NORM_COLLECT_API, runtime_identity};

    #[test]
    fn identity_declares_both_protocols() {
        let identity = runtime_identity();
        assert_eq!(identity.bridge_api_version, BRIDGE_API_VERSION);
        assert_eq!(
            identity.expected_norm_collect_api,
            EXPECTED_NORM_COLLECT_API
        );
        assert_eq!(identity.package_version, "0.1.0-alpha.1");
    }
}
