use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DocumentKind {
    Pdf,
    FatturaPaXml,
    Image,
    Text,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EncodingFormat {
    Der,
    BerIndefinite,
    Base64Pem,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IntegrityStatus {
    VerifiedLocal,
    DigestMismatch,
    SignatureInvalid,
    DetachedSignature,
    UnsupportedAlgo,
    ParseWarning,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RevocationStatus {
    NotCheckedOffline,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SignerSummary {
    pub common_name: String,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub given_name: Option<String>,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub surname: Option<String>,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fiscal_code: Option<String>,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub organization: Option<String>,
    pub issuer_cn: String,
    pub serial_number_hex: String,
    pub valid_from_iso: String,
    pub valid_to_iso: String,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declared_signing_time_iso: Option<String>,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timestamp_iso: Option<String>,
    pub digest_algorithm: String,
    pub integrity: IntegrityStatus,
    pub revocation: RevocationStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SignatureLayer {
    pub depth: u32,
    pub encoding_detected: EncodingFormat,
    pub signers: Vec<SignerSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct P7MInspectionReport {
    pub session_id: String,
    pub original_file_name: String,
    pub extracted_file_name: String,
    pub payload_size_bytes: usize,
    pub mime_type: String,
    pub document_kind: DocumentKind,
    pub layers: Vec<SignatureLayer>,
    pub warnings: Vec<String>,
}
