//! Typed consumer models re-exported from the shared family engine (D018).

pub use norm_adapter_engine::{
    NormCollectResponse, NormCollectedConvention, NormCompatibility, NormConformanceCandidate,
    NormConformanceFailure, NormConformanceIdentity, NormConformanceIssue, NormConformanceReport,
    NormConformanceSuite, NormConformanceSummary, NormDiagnostic, NormErrorDetail,
    NormErrorResponse, NormProductIdentity, NormRustApiIdentity, NormScanCoverage, NormScanNaming,
    NormScanRecurringFilename, NormScanResponse, NormScanSymlink, NormScanSymlinkAction,
    NormScanSymlinkKind, NormScannedDirectory, NormValidateResponse, NormValidationResult,
    NormValidationStatus, NormValidationSummary,
};
