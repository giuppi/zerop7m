//! OpenCAdES cryptographic engine for ZeroP7M (.p7m reader).

#![forbid(unsafe_code)]

pub mod detect;
pub mod error;
pub mod model;
pub mod normalize;
pub mod unwrap;
pub mod verify;
pub mod x509;

pub use detect::{clean_p7m_file_name, detect_content};
pub use error::*;
pub use model::*;
pub use normalize::{MAX_INPUT_BYTES, normalize_p7m_input};
pub use unwrap::{MAX_NESTING_DEPTH, UnwrappedCms, unwrap_cms};
pub use x509::normalize_fiscal_code;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InspectOutput {
    pub report: P7MInspectionReport,
    pub payload: Vec<u8>,
}

fn generate_session_id(content: &[u8]) -> String {
    use sha2::Digest;
    let mut hash = sha2::Sha256::digest(content);
    // UUID v4 format: 8-4-4-4-12 hex characters
    // Set version to 4 (0100xxxx) and variant to RFC 4122 (10xxxxxx)
    hash[6] = (hash[6] & 0x0F) | 0x40;
    hash[8] = (hash[8] & 0x3F) | 0x80;
    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        hash[0],
        hash[1],
        hash[2],
        hash[3],
        hash[4],
        hash[5],
        hash[6],
        hash[7],
        hash[8],
        hash[9],
        hash[10],
        hash[11],
        hash[12],
        hash[13],
        hash[14],
        hash[15]
    )
}

/// Inspect and extract payload and signature metadata from a .p7m file.
pub fn inspect_p7m(file_name: &str, bytes: &[u8]) -> Result<InspectOutput, P7MError> {
    let norm = normalize_p7m_input(bytes)?;
    let unwrapped = unwrap_cms(&norm.bytes, norm.format)?;
    let (document_kind, mime_type) = detect_content(&unwrapped.payload);
    let extracted_file_name = clean_p7m_file_name(file_name);
    let session_id = generate_session_id(bytes);

    let report = P7MInspectionReport {
        session_id,
        original_file_name: file_name.to_string(),
        extracted_file_name,
        payload_size_bytes: unwrapped.payload.len(),
        mime_type,
        document_kind,
        layers: unwrapped.layers,
        warnings: unwrapped.warnings,
    };

    Ok(InspectOutput {
        report,
        payload: unwrapped.payload,
    })
}

#[doc(hidden)]
pub mod _dependencies {
    pub use base64 as _base64;
    pub use infer as _infer;
    pub use num_bigint as _num_bigint;
    pub use num_traits as _num_traits;
    pub use rasn as _rasn;
    pub use rasn_cms as _rasn_cms;
    pub use rasn_pkix as _rasn_pkix;
    #[cfg(not(target_arch = "wasm32"))]
    pub use rustix as _rustix;
    pub use sha1 as _sha1;
    pub use sha2 as _sha2;
}
