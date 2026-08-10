//! Bootstrap process entry point for the pi-norm bridge.

use std::{env, process::ExitCode};

const BOOTSTRAP_MESSAGE: &str =
    "pi-norm-bridge is in bootstrap; runtime requests are not implemented yet";

fn main() -> ExitCode {
    let mut args = env::args().skip(1);
    match args.next().as_deref() {
        Some("--version" | "-V") => {
            let identity = pi_norm_engine::runtime_identity();
            println!("pi-norm-bridge {}", identity.package_version);
            ExitCode::SUCCESS
        }
        Some("identity") => {
            let identity = pi_norm_engine::runtime_identity();
            println!(
                r#"{{"bridgeApiVersion":"{}","expectedNormCollectApi":"{}","packageVersion":"{}"}}"#,
                identity.bridge_api_version,
                identity.expected_norm_collect_api,
                identity.package_version
            );
            ExitCode::SUCCESS
        }
        Some(_) | None => {
            eprintln!("{BOOTSTRAP_MESSAGE}");
            ExitCode::from(2)
        }
    }
}
