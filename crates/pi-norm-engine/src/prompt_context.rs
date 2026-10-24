//! pi prompt-context identity over the shared family engine.

pub use norm_adapter_engine::{
    AdapterIdentity, MAX_PROMPT_CONTEXT_BYTES, PromptContext, PromptContextError,
};

/// pi-norm-spec compile-time identity for the shared engine (D018).
pub const PI_IDENTITY: AdapterIdentity = AdapterIdentity {
    product: "pi-norm-spec",
    prompt_context_api: "pi-norm-spec/prompt-context/v1",
    prompt_context_multi_api: "pi-norm-spec/prompt-context-multi/v1",
    layout_index_api: "pi-norm-spec/layout-index/v1",
    context_marker: "PI_NORM_SPEC_CONTEXT_V1",
    context_multi_marker: "PI_NORM_SPEC_CONTEXT_MULTI_V1",
    layout_index_marker: "PI_NORM_LAYOUT_INDEX_V1",
};

/// Machine API identifier for an ephemeral prompt-context result.
pub const PROMPT_CONTEXT_API_VERSION: &str = PI_IDENTITY.prompt_context_api;

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{PI_IDENTITY, PROMPT_CONTEXT_API_VERSION, PromptContext};
    use crate::{NormCollectResponse, NormCollectedConvention};

    #[test]
    fn identity_carries_the_pi_strings() {
        assert_eq!(PI_IDENTITY.product, "pi-norm-spec");
        assert_eq!(PROMPT_CONTEXT_API_VERSION, "pi-norm-spec/prompt-context/v1");
        assert_eq!(PI_IDENTITY.context_marker, "PI_NORM_SPEC_CONTEXT_V1");
        assert_eq!(
            PI_IDENTITY.context_multi_marker,
            "PI_NORM_SPEC_CONTEXT_MULTI_V1"
        );
        assert_eq!(PI_IDENTITY.layout_index_marker, "PI_NORM_LAYOUT_INDEX_V1");
    }

    #[test]
    fn shared_engine_renders_the_pi_wire_identity() {
        let context = PromptContext::from_collection(
            &PI_IDENTITY,
            NormCollectResponse {
                api_version: "norm-spec/collect/v1".to_owned(),
                root: ".".to_owned(),
                target: "docs".to_owned(),
                norms: vec![NormCollectedConvention {
                    path: "docs/.norm".to_owned(),
                    frontmatter: json!({"metadata": {"layer": "documentation"}}),
                    body: "# Documentation".to_owned(),
                }],
            },
        )
        .unwrap_or_else(|error| panic!("pi identity should render: {error}"));
        let prompt = context
            .prompt
            .unwrap_or_else(|| panic!("non-empty collection renders"));
        assert!(prompt.starts_with("PI_NORM_SPEC_CONTEXT_V1\n"));
        assert!(prompt.ends_with("\nEND_PI_NORM_SPEC_CONTEXT_V1"));
        assert!(prompt.contains("\"apiVersion\":\"pi-norm-spec/prompt-context/v1\""));
    }
}
