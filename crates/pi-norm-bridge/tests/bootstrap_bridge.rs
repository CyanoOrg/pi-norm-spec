//! Black-box bootstrap tests for the Rust bridge process.

use std::process::{Command, Output};

fn run_bridge(args: &[&str]) -> Output {
    match Command::new(env!("CARGO_BIN_EXE_pi-norm-bridge"))
        .args(args)
        .output()
    {
        Ok(output) => output,
        Err(error) => panic!("failed to execute bridge: {error}"),
    }
}

#[test]
fn identity_is_versioned_and_machine_readable() {
    let output = run_bridge(&["identity"]);
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains(r#""bridgeApiVersion":"pi-norm-spec/bridge/v1""#));
    assert!(stdout.contains(r#""expectedNormCollectApi":"norm-spec/collect/v1""#));
}

#[test]
fn unsupported_runtime_requests_fail_explicitly() {
    let output = run_bridge(&["serve"]);
    assert_eq!(output.status.code(), Some(2));
    assert!(String::from_utf8_lossy(&output.stderr).contains("not implemented yet"));
}
