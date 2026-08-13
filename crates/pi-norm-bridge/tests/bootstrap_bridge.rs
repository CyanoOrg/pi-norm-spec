//! Black-box tests for one-shot bridge diagnostics.

use std::process::{Command, Output};

use serde_json::Value;

fn run_bridge(args: &[&str]) -> Output {
    match Command::new(env!("CARGO_BIN_EXE_pi-norm-bridge"))
        .args(args)
        .output()
    {
        Ok(output) => output,
        Err(error) => panic!("failed to execute bridge: {error}"),
    }
}

fn parse_stdout(output: &Output) -> Value {
    match serde_json::from_slice(&output.stdout) {
        Ok(value) => value,
        Err(error) => panic!("bridge stdout was not JSON: {error}"),
    }
}

#[test]
fn identity_matches_the_versioned_fixture() {
    let output = run_bridge(&["identity"]);
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let expected: Value = match serde_json::from_str(include_str!(
        "../../../tests/contract/expected/identity.json"
    )) {
        Ok(value) => value,
        Err(error) => panic!("identity fixture was invalid: {error}"),
    };
    assert_eq!(parse_stdout(&output), expected);
}

#[test]
fn unsupported_commands_fail_with_a_stable_machine_error() {
    let output = run_bridge(&["unsupported"]);
    assert_eq!(output.status.code(), Some(2));
    assert!(output.stderr.is_empty());
    let response = parse_stdout(&output);
    assert_eq!(response["apiVersion"], "pi-norm-spec/bridge/v1");
    assert_eq!(response["status"], "error");
    assert_eq!(response["error"]["code"], "pi-norm-spec/usage");
}

#[test]
fn server_startup_failure_is_a_typed_event() {
    let output = run_bridge(&["serve", "--payload", "missing-payload"]);
    assert_eq!(output.status.code(), Some(1));
    assert!(output.stderr.is_empty());
    let response = parse_stdout(&output);
    assert_eq!(response["apiVersion"], "pi-norm-spec/bridge/v1");
    assert_eq!(response["type"], "event");
    assert_eq!(response["event"], "startupFailed");
    assert_eq!(
        response["error"]["code"],
        "pi-norm-spec/payload/unavailable"
    );
}

#[test]
fn upstream_pin_exposes_the_exact_public_asset() {
    let output = run_bridge(&["upstream-pin", "--target", "aarch64-apple-darwin"]);
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let response = parse_stdout(&output);
    assert_eq!(response["operation"], "upstream.pin");
    assert_eq!(response["result"]["target"], "aarch64-apple-darwin");
    assert_eq!(
        response["result"]["sha256"],
        "a51712eac951aaf1e543548a000ebce62174f3038e5b45606ba7f5b3a5f82dee"
    );
}

#[test]
fn missing_payload_never_becomes_an_empty_success() {
    let output = run_bridge(&["upstream-verify", "--payload", "missing-payload"]);
    assert_eq!(output.status.code(), Some(1));
    assert!(output.stderr.is_empty());
    let response = parse_stdout(&output);
    assert_eq!(response["status"], "error");
    assert_eq!(
        response["error"]["code"],
        "pi-norm-spec/payload/unavailable"
    );
    assert!(response.get("result").is_none());
}
